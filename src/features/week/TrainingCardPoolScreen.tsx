import { useState } from 'react'
import { getOpponentTier } from '../../domain/opponentTier'
import { learnableAbilitiesForPlayer, SPECIAL_ABILITY_LABELS, type SpecialAbilityKey } from '../../domain/specialAbilities'
import { primaryStyleForAttribute, STYLE_LABELS } from '../../domain/styleTag'
import {
  canSelectCards,
  cardCost,
  cardEffectTier,
  MAX_CARDS_PER_WEEK,
  MAX_EFFECT_TIER,
  type CardKind,
  type PoolCard,
  type TrainingCardPoolState,
} from '../../domain/trainingCardPool'
import type { CardSelection } from '../../domain/trainingCardResolution'
import { suggestTrainingCardSelections } from '../../domain/trainingCardSuggestion'
import { computeTeamFocusStyle, FOCUS_DISCOUNT } from '../../domain/trainingDirection'
import { ATTRIBUTE_LABELS, PERSONALITY_LABELS, type AttributeKey, type Player } from '../../domain/types'
import {
  attributeAffinityPersonalities,
  PRACTICE_OPPONENT_STRENGTH,
  PRACTICE_STRENGTHS,
  type PracticeStrength,
} from '../../domain/weeklyAction'
import './TrainingCardPoolScreen.css'

const KIND_LABELS: Record<CardKind, string> = {
  teamTraining: '全隊訓練',
  individualTraining: '個別訓練',
  practiceMatch: '練習賽',
  rest: '休養',
}

const STRENGTH_LABELS: Record<PracticeStrength, string> = {
  weak: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.weak),
  medium: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.medium),
  strong: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.strong),
}

function cardTitle(card: PoolCard): string {
  if (card.kind === 'teamTraining' && card.attribute) return ATTRIBUTE_LABELS[card.attribute]
  return KIND_LABELS[card.kind]
}

function isTrainable(player: Player): boolean {
  return player.injuryStatus === 'healthy' || player.injuryStatus === 'returning'
}

interface AffinityHint {
  personalityCount: number
  personalityLabel: string
  styleCount: number
  styleLabel: string
}

function computeAffinityHint(attribute: AttributeKey, players: Player[]): AffinityHint {
  const affinityPersonalities = attributeAffinityPersonalities(attribute)
  const trainable = players.filter(isTrainable)
  const personalityCount = trainable.filter((player) => affinityPersonalities.includes(player.personality)).length
  const style = primaryStyleForAttribute(attribute)
  const styleCount = style ? trainable.filter((player) => player.styleTag.primary === style).length : 0
  return {
    personalityCount,
    personalityLabel: affinityPersonalities.map((personality) => PERSONALITY_LABELS[personality]).join('／'),
    styleCount,
    styleLabel: style ? STYLE_LABELS[style] : '',
  }
}

export interface TrainingCardPoolScreenProps {
  pool: TrainingCardPoolState
  trainingPoints: number
  maxTrainingPoints: number
  players: Player[]
  reputation: number
  opponentNames: Record<PracticeStrength, string>
  onConfirm: (selections: CardSelection[]) => void
  /** 每週最多可選張數;省略時沿用 MAX_CARDS_PER_WEEK,學校資產「訓練館」解鎖時 +1。 */
  maxCardsPerWeek?: number
  /** 個別訓練可教學的特殊能力額外名額;省略時 0,學校資產「教練專精」解鎖時 +1。 */
  bonusAbilitySlots?: number
}

interface IndividualChoice {
  playerId?: string
  ability?: SpecialAbilityKey
}

export function TrainingCardPoolScreen({
  pool,
  trainingPoints,
  maxTrainingPoints,
  players,
  reputation,
  opponentNames,
  onConfirm,
  maxCardsPerWeek = MAX_CARDS_PER_WEEK,
  bonusAbilitySlots = 0,
}: TrainingCardPoolScreenProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [individualChoices, setIndividualChoices] = useState<Record<string, IndividualChoice>>({})
  const [strengthChoices, setStrengthChoices] = useState<Record<string, PracticeStrength>>({})

  const focusStyle = computeTeamFocusStyle(players)
  const selectedCards = pool.cards.filter((card) => selectedIds.includes(card.id))
  const remainingAfterSelection =
    trainingPoints - selectedCards.reduce((sum, card) => sum + cardCost(card, focusStyle), 0)

  function toggleCard(card: PoolCard) {
    setSelectedIds((prev) => {
      if (prev.includes(card.id)) return prev.filter((id) => id !== card.id)
      if (prev.length >= maxCardsPerWeek) return prev
      if (!canSelectCards([...selectedCards, card], trainingPoints, focusStyle, maxCardsPerWeek)) return prev
      return [...prev, card.id]
    })
  }

  /**
   * 快速選擇:不想每週細調時,一鍵套用依「效果強度/花費」性價比選出的組合,個別訓練/
   * 練習賽的子選項也一併給合理預設;套用後仍是一般的已選狀態,可以再手動調整或取消,
   * 不會直接送出。呼應陣容畫面既有的「一鍵建議陣容」設計。
   */
  function applyQuickPick() {
    const suggestions = suggestTrainingCardSelections(
      pool,
      players,
      trainingPoints,
      reputation,
      maxCardsPerWeek,
      bonusAbilitySlots,
    )
    setSelectedIds(suggestions.map((selection) => selection.card.id))
    const nextIndividualChoices: Record<string, IndividualChoice> = {}
    const nextStrengthChoices: Record<string, PracticeStrength> = {}
    for (const selection of suggestions) {
      if (selection.card.kind === 'individualTraining') {
        nextIndividualChoices[selection.card.id] = { playerId: selection.playerId, ability: selection.ability }
      }
      if (selection.card.kind === 'practiceMatch' && selection.strength) {
        nextStrengthChoices[selection.card.id] = selection.strength
      }
    }
    setIndividualChoices(nextIndividualChoices)
    setStrengthChoices(nextStrengthChoices)
  }

  const allSubChoicesFilled = selectedCards.every((card) => {
    if (card.kind === 'individualTraining') {
      const choice = individualChoices[card.id]
      return !!choice?.playerId && !!choice?.ability
    }
    if (card.kind === 'practiceMatch') return !!strengthChoices[card.id]
    return true
  })

  const canConfirm =
    selectedCards.length > 0 &&
    canSelectCards(selectedCards, trainingPoints, focusStyle, maxCardsPerWeek) &&
    allSubChoicesFilled

  function handleConfirm() {
    if (!canConfirm) return
    const selections: CardSelection[] = selectedCards.map((card) => {
      if (card.kind === 'individualTraining') {
        const choice = individualChoices[card.id]!
        return { card, playerId: choice.playerId, ability: choice.ability }
      }
      if (card.kind === 'practiceMatch') {
        return { card, strength: strengthChoices[card.id] }
      }
      return { card }
    })
    onConfirm(selections)
    setSelectedIds([])
    setIndividualChoices({})
    setStrengthChoices({})
  }

  return (
    <section className="training-card-pool">
      {focusStyle && (
        <p className="training-card-pool__focus">
          本月焦點:{STYLE_LABELS[focusStyle]}型 — 對應屬性的全隊訓練卡 -{FOCUS_DISCOUNT}點
        </p>
      )}

      <div className="training-card-pool__points-row">
        <p className="training-card-pool__points">
          訓練點數 {trainingPoints - selectedCards.reduce((sum, card) => sum + cardCost(card, focusStyle), 0)} /{' '}
          {maxTrainingPoints}
          {selectedCards.length > 0 && (
            <span className="training-card-pool__points-preview">(已選 {selectedCards.length} 張,剩餘 {remainingAfterSelection})</span>
          )}
        </p>
        <button type="button" className="training-card-pool__quick-pick" onClick={applyQuickPick}>
          快速選擇
        </button>
      </div>

      <ul className="training-card-pool__grid" role="group" aria-label="訓練卡池">
        {pool.cards.map((card) => {
          const selected = selectedIds.includes(card.id)
          const cost = cardCost(card, focusStyle)
          const baseCost = cardCost(card, null)
          const discounted = cost < baseCost
          const disabled = !selected && (selectedCards.length >= maxCardsPerWeek || cost > remainingAfterSelection)
          const effectTier = cardEffectTier(card)
          const affinity = card.kind === 'teamTraining' && card.attribute ? computeAffinityHint(card.attribute, players) : null
          return (
            <li key={card.id}>
              <button
                type="button"
                className={`training-card-pool__card${selected ? ' training-card-pool__card--selected' : ''}`}
                data-kind={card.kind}
                disabled={disabled}
                onClick={() => toggleCard(card)}
              >
                <span className="training-card-pool__card-kind">{KIND_LABELS[card.kind]}</span>
                <span className="training-card-pool__card-title">{cardTitle(card)}</span>
                <span className="training-card-pool__card-cost">
                  {discounted && <span className="training-card-pool__card-cost-original">{baseCost}</span>}
                  {cost} 點
                </span>
                <span className="training-card-pool__card-effect" aria-label={`效果強度 ${effectTier}/${MAX_EFFECT_TIER}`}>
                  {'●'.repeat(effectTier)}
                  {'○'.repeat(MAX_EFFECT_TIER - effectTier)}
                </span>
                {affinity && (affinity.personalityCount > 0 || affinity.styleCount > 0) && (
                  <span className="training-card-pool__card-affinity">
                    {affinity.personalityCount > 0 && (
                      <span title={`${affinity.personalityLabel}訓練此屬性效果更好`}>
                        ★{affinity.personalityLabel} {affinity.personalityCount}人
                      </span>
                    )}
                    {affinity.styleCount > 0 && (
                      <span title={`已是「${affinity.styleLabel}型」球風的球員,此屬性會強化既有優勢`}>
                        {affinity.styleLabel}型契合 {affinity.styleCount}人
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {selectedCards
        .filter((card) => card.kind === 'individualTraining')
        .map((card) => {
          const choice = individualChoices[card.id]
          const selectedPlayer = players.find((player) => player.id === choice?.playerId)
          const learnable = selectedPlayer ? learnableAbilitiesForPlayer(selectedPlayer, reputation, bonusAbilitySlots) : []
          return (
            <div key={card.id} className="training-card-pool__sub-choice">
              <p className="training-card-pool__sub-choice-label">個別訓練:選球員與要教的特殊能力</p>
              <select
                aria-label={`${card.id}-player`}
                value={choice?.playerId ?? ''}
                onChange={(e) =>
                  setIndividualChoices((prev) => ({ ...prev, [card.id]: { playerId: e.target.value } }))
                }
              >
                <option value="" disabled>
                  選球員
                </option>
                {players
                  .filter((player) => player.injuryStatus === 'healthy' || player.injuryStatus === 'returning')
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
              {selectedPlayer && (
                <div className="training-card-pool__attribute-picker" role="group" aria-label="個別訓練能力">
                  {learnable.length === 0 && (
                    <p className="training-card-pool__sub-choice-label">
                      {selectedPlayer.name}已經學會目前解鎖的所有特殊能力
                    </p>
                  )}
                  {learnable.map((ability) => (
                    <button
                      key={ability}
                      type="button"
                      className={`training-card-pool__attribute-button${choice?.ability === ability ? ' training-card-pool__attribute-button--selected' : ''}`}
                      onClick={() =>
                        setIndividualChoices((prev) => ({ ...prev, [card.id]: { ...prev[card.id], ability } }))
                      }
                    >
                      {SPECIAL_ABILITY_LABELS[ability]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      {selectedCards
        .filter((card) => card.kind === 'practiceMatch')
        .map((card) => (
          <div key={card.id} className="training-card-pool__sub-choice">
            <p className="training-card-pool__sub-choice-label">練習賽:選對手強度</p>
            <div className="training-card-pool__options">
              {PRACTICE_STRENGTHS.map((strength) => (
                <button
                  key={strength}
                  type="button"
                  className={`training-card-pool__option${strengthChoices[card.id] === strength ? ' training-card-pool__option--selected' : ''}`}
                  onClick={() => setStrengthChoices((prev) => ({ ...prev, [card.id]: strength }))}
                >
                  <span className="training-card-pool__option-label">{opponentNames[strength]}</span>
                  <span className="training-card-pool__option-rate">{STRENGTH_LABELS[strength]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

      <button type="button" className="button-primary" disabled={!canConfirm} onClick={handleConfirm}>
        確認本週訓練
      </button>
    </section>
  )
}

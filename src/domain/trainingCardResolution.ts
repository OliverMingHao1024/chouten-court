import { advancePlayerWeek, ATTRIBUTE_MAX, clamp, computeMatchWinProbability } from './matchEngine'
import { createSeededRng } from './rng'
import { attemptLearnAbility, learnableAbilitiesForPlayer, type SpecialAbilityKey } from './specialAbilities'
import { computeStyleTag } from './styleTag'
import { cardEffectMultiplier, comboAttributes, COMBO_BONUS_MULTIPLIER, type PoolCard } from './trainingCardPool'
import type { AttributeKey, Player } from './types'
import {
  computeTrainingRollGain,
  personalityBonusLabel,
  PRACTICE_LOAD,
  PRACTICE_LOSS_GROWTH,
  PRACTICE_OPPONENT_STRENGTH,
  PRACTICE_WIN_GROWTH,
  TEAM_REST_LOAD,
  TRAINING_LOAD,
  type PlayerRoll,
  type PracticeStrength,
} from './weeklyAction'

/**
 * 一張卡選中後需要的額外選擇:個別訓練要選球員+一項要嘗試教的特殊能力,練習賽要選強度;
 * 全隊訓練/休養不需要額外選擇,卡片本身(全隊訓練)或種類(休養)就已經決定好一切。
 */
export interface CardSelection {
  card: PoolCard
  playerId?: string
  attribute?: AttributeKey
  ability?: SpecialAbilityKey
  strength?: PracticeStrength
}

export interface ResolvedTeamTrainingCard {
  kind: 'teamTraining'
  attribute: AttributeKey
  comboBonus: boolean
  rolls: PlayerRoll[]
}

export interface ResolvedIndividualTrainingCard {
  kind: 'individualTraining'
  playerId: string
  ability: SpecialAbilityKey
  succeeded: boolean
  chance: number
}

export interface ResolvedPracticeMatchCard {
  kind: 'practiceMatch'
  strength: PracticeStrength
  outcome: 'win' | 'loss'
  beneficiaries: Array<{ playerId: string; attribute: AttributeKey; gain: number }>
}

export interface ResolvedRestCard {
  kind: 'rest'
}

export type ResolvedCard =
  | ResolvedTeamTrainingCard
  | ResolvedIndividualTrainingCard
  | ResolvedPracticeMatchCard
  | ResolvedRestCard

export interface CardResolutionResult {
  roster: Player[]
  resolvedCards: ResolvedCard[]
}

/**
 * 最多 3 張卡「同時」套用在同一週,但既有的 advancePlayerWeek 每呼叫一次就會扣一次體力恢復,
 * 呼叫兩次同一名球員就會恢復兩次。這裡先把每名球員這一週(可能來自多張卡)的負荷與成長
 * 累加起來,每人只呼叫一次 advancePlayerWeek,避免恢復量被重複計算。
 */
export interface CardResolutionOptions {
  /** 學校資產「教練專精」解鎖時傳入 1,個別訓練可教學的能力清單多解鎖一項。 */
  bonusAbilitySlots?: number
  /** 學校資產「恢復中心」解鎖時傳入固定加成,全隊每週體力恢復量增加。 */
  recoveryBonus?: number
}

export function resolveCardSelections(
  roster: Player[],
  selections: CardSelection[],
  seed: number,
  reputation: number,
  options: CardResolutionOptions = {},
): CardResolutionResult {
  const { bonusAbilitySlots = 0, recoveryBonus = 0 } = options
  const rng = createSeededRng(seed)
  const comboSet = new Set(comboAttributes(selections.map((selection) => selection.card)))

  const loadByPlayer = new Map<string, number>()
  const growthByPlayer = new Map<string, Array<{ attribute: AttributeKey; gain: number }>>()
  const learnedByPlayer = new Map<string, SpecialAbilityKey[]>()
  const matchWeekPlayers = new Set<string>()

  function addLoad(playerId: string, load: number) {
    loadByPlayer.set(playerId, (loadByPlayer.get(playerId) ?? 0) + load)
  }
  function addGrowth(playerId: string, attribute: AttributeKey, gain: number) {
    const list = growthByPlayer.get(playerId) ?? []
    list.push({ attribute, gain })
    growthByPlayer.set(playerId, list)
  }
  function addLearnedAbility(playerId: string, ability: SpecialAbilityKey) {
    const list = learnedByPlayer.get(playerId) ?? []
    list.push(ability)
    learnedByPlayer.set(playerId, list)
  }
  function isSidelined(player: Player) {
    return player.injuryStatus === 'minor' || player.injuryStatus === 'major'
  }

  const resolvedCards: ResolvedCard[] = []

  for (const selection of selections) {
    const { card } = selection
    const effectMultiplier = cardEffectMultiplier(card)

    if (card.kind === 'teamTraining') {
      if (!card.attribute) throw new Error('teamTraining card is missing its attribute')
      const attribute = card.attribute
      const comboMultiplier = comboSet.has(attribute) ? COMBO_BONUS_MULTIPLIER : 1
      const rolls: PlayerRoll[] = []
      for (const player of roster) {
        if (isSidelined(player)) continue
        const roll = Math.floor(rng() * 6) + 1
        const baseGain = computeTrainingRollGain(attribute, player.personality, roll)
        const gain = Math.round(baseGain * effectMultiplier * comboMultiplier)
        rolls.push({
          playerId: player.id,
          roll,
          succeeded: gain > 0,
          gain,
          bonusLabel: personalityBonusLabel(attribute, player.personality, roll),
        })
        addGrowth(player.id, attribute, gain)
        addLoad(player.id, TRAINING_LOAD)
      }
      resolvedCards.push({ kind: 'teamTraining', attribute, comboBonus: comboSet.has(attribute), rolls })
    } else if (card.kind === 'individualTraining') {
      if (!selection.playerId || !selection.ability) {
        throw new Error('individualTraining selection is missing playerId/ability')
      }
      const ability = selection.ability
      const player = roster.find((candidate) => candidate.id === selection.playerId)
      if (!player) throw new Error(`individualTraining target player not found: ${selection.playerId}`)
      if (!learnableAbilitiesForPlayer(player, reputation, bonusAbilitySlots).includes(ability)) {
        throw new Error(`${player.id} cannot currently learn ${ability} (locked or already known)`)
      }

      let succeeded = false
      let chance = 0
      if (!isSidelined(player)) {
        const attempt = attemptLearnAbility(player, ability, rng)
        succeeded = attempt.succeeded
        chance = attempt.chance
        if (succeeded) addLearnedAbility(player.id, ability)
        addLoad(player.id, TRAINING_LOAD)
      }
      resolvedCards.push({ kind: 'individualTraining', playerId: player.id, ability, succeeded, chance })
    } else if (card.kind === 'practiceMatch') {
      if (!selection.strength) throw new Error('practiceMatch selection is missing strength')
      const strength = selection.strength

      const opponentStrength = PRACTICE_OPPONENT_STRENGTH[strength]
      const winProbability = computeMatchWinProbability(roster, opponentStrength, rng)
      const outcome: 'win' | 'loss' = rng() < winProbability ? 'win' : 'loss'

      for (const player of roster) {
        addLoad(player.id, PRACTICE_LOAD[strength])
        matchWeekPlayers.add(player.id)
      }

      const rawGrowth = outcome === 'win' ? PRACTICE_WIN_GROWTH[strength] : PRACTICE_LOSS_GROWTH[strength]
      const growth = Math.round(rawGrowth * effectMultiplier)
      const beneficiaries: Array<{ playerId: string; attribute: AttributeKey; gain: number }> = []
      if (growth > 0) {
        // 簡化:資格以「這週開始前」的傷勢狀態判定,不等這週練習賽真正結算完傷勢再篩選,
        // 跟原本單一練習賽行動(applyPracticeMatch)略有差異,但本系統允許同週疊加多張卡,
        // 沒有一個「結算後」的中間狀態可以依賴。
        const eligible = roster.filter((player) => !isSidelined(player))
        const beneficiaryCount = Math.min(outcome === 'win' ? 2 : 1, eligible.length)
        const chosen = new Set<Player>()
        while (chosen.size < beneficiaryCount && chosen.size < eligible.length) {
          chosen.add(eligible[Math.floor(rng() * eligible.length)])
        }
        for (const player of chosen) {
          const attrKeys = Object.keys(player.attributes) as AttributeKey[]
          const attribute = attrKeys[Math.floor(rng() * attrKeys.length)]
          addGrowth(player.id, attribute, growth)
          beneficiaries.push({ playerId: player.id, attribute, gain: growth })
        }
      }
      resolvedCards.push({ kind: 'practiceMatch', strength, outcome, beneficiaries })
    } else {
      const load = Math.round(TEAM_REST_LOAD * effectMultiplier)
      for (const player of roster) addLoad(player.id, load)
      resolvedCards.push({ kind: 'rest' })
    }
  }

  const newRoster = roster.map((player) => {
    const growth = growthByPlayer.get(player.id) ?? []
    let grownPlayer = player
    if (growth.length > 0 && !isSidelined(player)) {
      let attributes = player.attributes
      for (const entry of growth) {
        attributes = { ...attributes, [entry.attribute]: clamp(attributes[entry.attribute] + entry.gain, 0, ATTRIBUTE_MAX) }
      }
      grownPlayer = { ...player, attributes, styleTag: computeStyleTag(attributes) }
    }
    const learned = learnedByPlayer.get(player.id)
    if (learned && learned.length > 0) {
      grownPlayer = { ...grownPlayer, specialAbilities: [...grownPlayer.specialAbilities, ...learned] }
    }
    const totalLoad = loadByPlayer.get(player.id) ?? 0
    return advancePlayerWeek(grownPlayer, totalLoad, rng, matchWeekPlayers.has(player.id), undefined, recoveryBonus)
  })

  return { roster: newRoster, resolvedCards }
}

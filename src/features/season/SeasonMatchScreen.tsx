import { useState } from 'react'
import { computeOverallGrade } from '../../domain/attributeGrade'
import { completeLineup, ROTATION_COUNT, STARTER_COUNT, type GameLineup } from '../../domain/lineup'
import { computeMatchPreview } from '../../domain/matchPreview'
import type { OfficialPhase } from '../../domain/officialMatch'
import type { OpponentAce } from '../../domain/opponentAce'
import {
  DEFAULT_TACTICS,
  DEFENSE_TACTICS,
  DEFENSE_TACTIC_LABELS,
  OFFENSE_TACTICS,
  OFFENSE_TACTIC_LABELS,
  type DefenseTactic,
  type GameTactics,
  type OffenseTactic,
} from '../../domain/tactics'
import { ATTRIBUTE_LABELS, type Player } from '../../domain/types'
import './SeasonMatchScreen.css'

export interface SeasonMatchScreenProps {
  gameNumber: number
  totalGamesInPhase: number
  opponentName: string
  phase: OfficialPhase
  opponentAce: OpponentAce
  players: Player[]
  lastResult: string | null
  onPlayGame: (tactics: GameTactics, lineup: GameLineup) => void
}

function describeWinChance(probability: number): string {
  if (probability >= 0.6) return '略佔優勢'
  if (probability <= 0.4) return '較為不利'
  return '勢均力敵'
}

function formatSigned(value: number): string {
  const rounded = Math.round(value)
  return rounded > 0 ? `+${rounded}` : `${rounded}`
}

export function SeasonMatchScreen({
  gameNumber,
  totalGamesInPhase,
  opponentName,
  phase,
  opponentAce,
  players,
  lastResult,
  onPlayGame,
}: SeasonMatchScreenProps) {
  const [offense, setOffense] = useState<OffenseTactic>(DEFAULT_TACTICS.offense)
  const [defense, setDefense] = useState<DefenseTactic>(DEFAULT_TACTICS.defense)
  const [starters, setStarters] = useState<string[]>([])
  const [rotation, setRotation] = useState<string[]>([])

  const availablePlayers = players.filter(
    (player) => player.injuryStatus !== 'minor' && player.injuryStatus !== 'major',
  )
  const availableIds = availablePlayers.map((player) => player.id)
  const previewLineup = completeLineup(availableIds, starters, rotation)
  const tactics: GameTactics = { offense, defense }
  const preview = computeMatchPreview(players, previewLineup, tactics, phase, opponentAce)

  function togglePlayer(playerId: string) {
    if (starters.includes(playerId)) {
      setStarters((current) => current.filter((id) => id !== playerId))
      if (rotation.length < ROTATION_COUNT) setRotation((current) => [...current, playerId])
      return
    }
    if (rotation.includes(playerId)) {
      setRotation((current) => current.filter((id) => id !== playerId))
      return
    }
    if (starters.length < STARTER_COUNT) {
      setStarters((current) => [...current, playerId])
    } else if (rotation.length < ROTATION_COUNT) {
      setRotation((current) => [...current, playerId])
    }
  }

  return (
    <section className="matchup-card">
      <p className="matchup-card__progress">
        第 {gameNumber} / {totalGamesInPhase} 戰
      </p>
      <div className="matchup-card__versus">
        <span className="matchup-card__side matchup-card__side--us">我方</span>
        <span className="matchup-card__vs">VS</span>
        <span className="matchup-card__side matchup-card__side--them">
          {opponentName}
          <span className="matchup-card__tier">{preview.opponentTier}</span>
        </span>
      </div>

      <p className="matchup-card__ace">
        對方王牌:{opponentAce.name}(得分 {opponentAce.scoring} / 三分 {opponentAce.shooting})
      </p>

      <div className="matchup-card__preview">
        <p>
          本場評估:{describeWinChance(preview.baselineWinProbability)}(基準勝率 約
          {Math.round(preview.baselineWinProbability * 100)}%)
        </p>
        <p>
          目前戰力 {preview.teamStrength.toFixed(1)}
          {preview.fatiguePenalty > 0 && `(疲勞折損 -${preview.fatiguePenalty.toFixed(1)})`}
        </p>
        <p>
          戰術強化:
          {preview.boostedAttributes.length > 0
            ? preview.boostedAttributes.map((key) => ATTRIBUTE_LABELS[key]).join('、')
            : '無'}
        </p>
        <p>
          預估疲勞變化:先發 {formatSigned(preview.roleFatigueDelta.starter)}・主要輪替{' '}
          {formatSigned(preview.roleFatigueDelta.rotation)}・未上場 {formatSigned(preview.roleFatigueDelta.bench)}
        </p>
        {preview.highRiskPlayerIds.length > 0 && (
          <p className="matchup-card__risk-warning">
            高受傷風險:
            {preview.highRiskPlayerIds
              .map((id) => players.find((player) => player.id === id)?.name)
              .filter(Boolean)
              .join('、')}
          </p>
        )}
      </div>

      <div className="matchup-card__lineup">
        <p className="matchup-card__lineup-hint">
          先發 {starters.length}/{STARTER_COUNT}・主要輪替 {rotation.length}/{ROTATION_COUNT}
          (未選滿會自動補上剩餘可上場球員)
        </p>
        <div className="matchup-card__lineup-grid" role="group" aria-label="先發與主要輪替">
          {availablePlayers.map((player) => {
            const role = starters.includes(player.id)
              ? 'starter'
              : rotation.includes(player.id)
                ? 'rotation'
                : 'bench'
            const highRisk = preview.highRiskPlayerIds.includes(player.id)
            return (
              <button
                key={player.id}
                type="button"
                className={`matchup-card__lineup-player matchup-card__lineup-player--${role}`}
                onClick={() => togglePlayer(player.id)}
              >
                <span className="matchup-card__lineup-player-name">{player.name}</span>
                <span className="matchup-card__lineup-player-meta">
                  {player.position}・高{player.grade}・{computeOverallGrade(player.attributes)}
                </span>
                <span className="matchup-card__lineup-player-meta">
                  疲勞 {player.fatigue}
                  {highRisk && ' ⚠'}
                </span>
                <span className="matchup-card__lineup-player-role">
                  {role === 'starter' ? '先發' : role === 'rotation' ? '輪替' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="matchup-card__tactics">
        <div className="matchup-card__tactic-group" role="group" aria-label="進攻節奏">
          {OFFENSE_TACTICS.map((tactic) => (
            <button
              key={tactic}
              type="button"
              className={`matchup-card__tactic-button${offense === tactic ? ' matchup-card__tactic-button--active' : ''}`}
              onClick={() => setOffense(tactic)}
            >
              {OFFENSE_TACTIC_LABELS[tactic]}
            </button>
          ))}
        </div>
        <div className="matchup-card__tactic-group" role="group" aria-label="防守策略">
          {DEFENSE_TACTICS.map((tactic) => (
            <button
              key={tactic}
              type="button"
              className={`matchup-card__tactic-button${defense === tactic ? ' matchup-card__tactic-button--active' : ''}`}
              onClick={() => setDefense(tactic)}
            >
              {DEFENSE_TACTIC_LABELS[tactic]}
            </button>
          ))}
        </div>
      </div>

      {lastResult && <p className="result-banner">{lastResult}</p>}
      <button
        className="button-primary"
        type="button"
        onClick={() => onPlayGame(tactics, previewLineup)}
      >
        開打
      </button>
    </section>
  )
}

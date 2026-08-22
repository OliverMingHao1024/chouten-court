import { useState } from 'react'
import { computeOverallGrade } from '../../domain/attributeGrade'
import {
  analyzeLineupComposition,
  completeLineup,
  ROTATION_COUNT,
  sanitizeLineup,
  STARTER_COUNT,
  suggestLineup,
  type GameLineup,
  type LineupSuggestionStrategy,
} from '../../domain/lineup'
import { computeMatchPreview } from '../../domain/matchPreview'
import type { OfficialPhase } from '../../domain/officialMatch'
import { describeAceWeakness, type OpponentAce } from '../../domain/opponentAce'
import {
  isOpponentScouted,
  OPPONENT_STYLE_LABELS,
  scoutedStrengthRange,
  type OpponentStyleKey,
} from '../../domain/opponentStyle'
import { MAX_PINNED_RIVALS, type RivalRecord } from '../../domain/rivals'
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
  opponentStyle: OpponentStyleKey
  /** 我方目前聲望;達到偵察門檻才顯示對手風格/戰力區間/王牌弱點等球探情資。 */
  reputation: number
  /** 已永久解鎖「影片分析室」時,不論聲望高低永遠視為已偵察。 */
  alwaysScouted: boolean
  players: Player[]
  /** 上一場正式賽使用的陣容,做為本場的預設起點;沒有上一場紀錄時為 null。 */
  initialLineup: GameLineup | null
  lastResult: string | null
  /** 已釘選的宿敵學校清單(跨屆保存);本場對手若剛好是其中之一,會顯示交手史。 */
  rivals: RivalRecord[]
  onPinRival: (name: string) => void
  onUnpinRival: (name: string) => void
  onPlayGame: (tactics: GameTactics, lineup: GameLineup) => void
}

const SUGGESTION_LABELS: Record<LineupSuggestionStrategy, string> = {
  bestStrength: '最佳戰力',
  lowFatigue: '低疲勞',
  developRookies: '培養新人',
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
  opponentStyle,
  reputation,
  alwaysScouted,
  players,
  initialLineup,
  lastResult,
  rivals,
  onPinRival,
  onUnpinRival,
  onPlayGame,
}: SeasonMatchScreenProps) {
  const [offense, setOffense] = useState<OffenseTactic>(DEFAULT_TACTICS.offense)
  const [defense, setDefense] = useState<DefenseTactic>(DEFAULT_TACTICS.defense)

  const availablePlayers = players.filter(
    (player) => player.injuryStatus !== 'minor' && player.injuryStatus !== 'major',
  )

  // 預設沿用上一場陣容(已受傷/不可上場的球員會被自動排除);只在掛載時計算一次,
  // 之後改由玩家手動調整或使用一鍵建議。
  const [lineupState, setLineupState] = useState(() => sanitizeLineup(initialLineup, availablePlayers))
  const { starters, rotation } = lineupState

  const previewLineup = completeLineup(availablePlayers, starters, rotation)
  const tactics: GameTactics = { offense, defense }
  const preview = computeMatchPreview(players, previewLineup, tactics, phase, opponentAce)
  const composition = analyzeLineupComposition(players, previewLineup)
  const hasVacancy = starters.length < STARTER_COUNT || rotation.length < ROTATION_COUNT

  function togglePlayer(playerId: string) {
    if (starters.includes(playerId)) {
      setLineupState((current) => {
        const nextStarters = current.starters.filter((id) => id !== playerId)
        if (current.rotation.length < ROTATION_COUNT) {
          return { starters: nextStarters, rotation: [...current.rotation, playerId] }
        }
        return { starters: nextStarters, rotation: current.rotation }
      })
      return
    }
    if (rotation.includes(playerId)) {
      setLineupState((current) => ({ ...current, rotation: current.rotation.filter((id) => id !== playerId) }))
      return
    }
    setLineupState((current) => {
      if (current.starters.length < STARTER_COUNT) {
        return { ...current, starters: [...current.starters, playerId] }
      }
      if (current.rotation.length < ROTATION_COUNT) {
        return { ...current, rotation: [...current.rotation, playerId] }
      }
      return current
    })
  }

  function applySuggestion(strategy: LineupSuggestionStrategy) {
    setLineupState(suggestLineup(availablePlayers, strategy))
  }

  const rival = rivals.find((entry) => entry.name === opponentName) ?? null

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

      {rival ? (
        <div className="matchup-card__rival">
          <p className="matchup-card__rival-record">
            ★宿敵・交手 {rival.wins}勝{rival.losses}敗
            {rival.biggestComebackMargin !== null && `・最大逆轉 ${rival.biggestComebackMargin} 分`}
          </p>
          <button type="button" className="matchup-card__rival-button" onClick={() => onUnpinRival(rival.name)}>
            取消宿敵
          </button>
        </div>
      ) : (
        rivals.length < MAX_PINNED_RIVALS && (
          <button
            type="button"
            className="matchup-card__rival-button"
            onClick={() => onPinRival(opponentName)}
          >
            釘選為宿敵
          </button>
        )
      )}

      <p className="matchup-card__ace">
        對方王牌:{opponentAce.name}(得分 {opponentAce.scoring} / 三分 {opponentAce.shooting})
      </p>

      {isOpponentScouted(reputation) || alwaysScouted ? (
        <p className="matchup-card__scouting">
          球探情資:{OPPONENT_STYLE_LABELS[opponentStyle]}・戰力區間 {scoutedStrengthRange(preview.opponentStrength).min}~
          {scoutedStrengthRange(preview.opponentStrength).max}・王牌弱點:{describeAceWeakness(opponentAce)}
        </p>
      ) : (
        <p className="matchup-card__scouting matchup-card__scouting--locked">
          球探情資:尚未偵察(聲望達到一定程度會自動解鎖)
        </p>
      )}

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
        {(preview.captainBonusActive || preview.clutchBonusActive) && (
          <p className="matchup-card__personality-status">
            {preview.captainBonusActive && '隊長效果生效中(先發含隊長型)。'}
            {preview.clutchBonusActive && '抗壓機制生效中(八強/四強階段)。'}
          </p>
        )}
      </div>

      <div className="matchup-card__lineup">
        <div className="matchup-card__suggestions" role="group" aria-label="一鍵建議陣容">
          {(Object.keys(SUGGESTION_LABELS) as LineupSuggestionStrategy[]).map((strategy) => (
            <button
              key={strategy}
              type="button"
              className="matchup-card__suggestion-button"
              onClick={() => applySuggestion(strategy)}
            >
              {SUGGESTION_LABELS[strategy]}
            </button>
          ))}
        </div>

        <p className="matchup-card__lineup-hint">
          先發 {starters.length}/{STARTER_COUNT}・主要輪替 {rotation.length}/{ROTATION_COUNT}
          {hasVacancy ? '(尚有空缺,開打時將自動補上可上場球員)' : ''}
        </p>
        {(composition.missingBallHandler || composition.missingInterior || composition.overconcentrated) && (
          <p className="matchup-card__composition-warning">
            {composition.missingBallHandler && '缺少主要持球者(PG)。'}
            {composition.missingInterior && '缺少內線球員(C/PF)。'}
            {composition.overconcentrated && '陣容位置過度集中。'}
          </p>
        )}
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
      <button className="button-primary" type="button" onClick={() => onPlayGame(tactics, previewLineup)}>
        開打
      </button>
    </section>
  )
}

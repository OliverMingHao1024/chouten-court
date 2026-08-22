import type { QuarterScore } from '../../domain/quarterSimulation'
import { ATTRIBUTE_LABELS, INJURY_STATUS_LABELS, type AttributeKey, type InjuryStatus } from '../../domain/types'
import { useResultDialog } from '../shared/useResultDialog'
import { deriveGameSummaryNextStep, deriveGameSummaryReasons } from './gameSummaryReasons'
import './GameSummaryDialog.css'

export interface GameSummaryPlayerEntry {
  playerId: string
  playerName: string
  role: 'starter' | 'rotation'
  fatigueBefore: number
  fatigueAfter: number
  grewAttribute: AttributeKey | null
  /** 個人數據(得分/籃板/助攻),依全隊官方比分與屬性分配而來,見 boxScoreStats.ts。 */
  points: number
  rebounds: number
  assists: number
}

export interface GameSummaryInjuryEntry {
  playerName: string
  status: Exclude<InjuryStatus, 'healthy' | 'returning'>
  weeksRemaining: number
  /** 受傷當下(賽前)的疲勞值,用於說明主要成因;非比賽中即時數值。 */
  fatigueBeforeGame: number
}

export interface GameSummaryResult {
  outcome: 'win' | 'loss'
  strengthBefore: number
  strengthAfter: number
  players: GameSummaryPlayerEntry[]
  newInjuries: GameSummaryInjuryEntry[]
  /** 逐節模擬產生的四節比分與最終比分,直接來自這場比賽真正的模擬結果。 */
  boxScore: { quarters: QuarterScore[]; final: QuarterScore }
}

export interface GameSummaryDialogProps {
  result: GameSummaryResult | null
  /** 玩家確認摘要後才呼叫,實際把這場比賽的結果套用到隊伍狀態、進入下一週。 */
  onConfirm: () => void
}

function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded > 0 ? `+${rounded}` : `${rounded}`
}

function GameSummaryContent({ result, onConfirm }: { result: GameSummaryResult; onConfirm: () => void }) {
  const reasons = deriveGameSummaryReasons(result)
  const nextStep = deriveGameSummaryNextStep(result)

  return (
    <div className="game-summary-dialog__content">
      <h2>{result.outcome === 'win' ? '本場獲勝' : '本場落敗'}</h2>
      <p className="game-summary-dialog__final-score">
        最終比分 {result.boxScore.final.us} - {result.boxScore.final.them}
      </p>
      <ul className="game-summary-dialog__quarters" aria-label="逐節比分">
        {result.boxScore.quarters.map((quarter, index) => (
          <li key={index}>
            <span className="game-summary-dialog__quarter-label">第{index + 1}節</span>
            <span className="game-summary-dialog__quarter-score">
              {quarter.us} - {quarter.them}
            </span>
          </li>
        ))}
      </ul>
      <p className="game-summary-dialog__strength">
        球隊有效戰力:{result.strengthBefore.toFixed(1)} → {result.strengthAfter.toFixed(1)}(
        {formatSigned(result.strengthAfter - result.strengthBefore)})
      </p>

      {reasons.length > 0 && (
        <>
          <h3>主要原因</h3>
          <ul className="game-summary-dialog__reasons">
            {reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </>
      )}

      <h3>先發與主要輪替</h3>
      <ul className="game-summary-dialog__players">
        {result.players.map((player) => (
          <li key={player.playerId}>
            <span className="game-summary-dialog__player-role">
              {player.role === 'starter' ? '先發' : '輪替'}
            </span>
            <span className="game-summary-dialog__player-name">{player.playerName}</span>
            <span className="game-summary-dialog__player-stats">
              {player.points}分 {player.rebounds}籃 {player.assists}助攻
            </span>
            <span className="game-summary-dialog__player-fatigue">
              疲勞 {player.fatigueBefore} → {player.fatigueAfter}
            </span>
            {player.grewAttribute && (
              <span className="game-summary-dialog__player-growth">{ATTRIBUTE_LABELS[player.grewAttribute]} +1</span>
            )}
          </li>
        ))}
      </ul>

      {result.newInjuries.length > 0 && (
        <>
          <h3>新發生的傷勢</h3>
          <ul className="game-summary-dialog__injuries">
            {result.newInjuries.map((injury, index) => (
              <li key={index}>
                {injury.playerName}:{INJURY_STATUS_LABELS[injury.status]}(預計缺賽 {injury.weeksRemaining} 週,受傷前疲勞值{' '}
                {injury.fatigueBeforeGame})
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="game-summary-dialog__next-step">下一步:{nextStep}</p>

      <button type="button" className="button-primary" onClick={onConfirm}>
        繼續
      </button>
    </div>
  )
}

export function GameSummaryDialog({ result, onConfirm }: GameSummaryDialogProps) {
  const { dialogRef, displayed } = useResultDialog(result)

  function confirm() {
    dialogRef.current?.close()
    onConfirm()
  }

  return (
    <dialog
      ref={dialogRef}
      className="game-summary-dialog"
      onClick={(e) => e.target === e.currentTarget && confirm()}
    >
      {displayed && <GameSummaryContent result={displayed} onConfirm={confirm} />}
    </dialog>
  )
}

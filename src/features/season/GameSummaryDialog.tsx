import { useEffect, useRef, useState } from 'react'
import { ATTRIBUTE_LABELS, INJURY_STATUS_LABELS, type AttributeKey, type InjuryStatus } from '../../domain/types'
import './GameSummaryDialog.css'

export interface GameSummaryPlayerEntry {
  playerId: string
  playerName: string
  role: 'starter' | 'rotation'
  fatigueBefore: number
  fatigueAfter: number
  grewAttribute: AttributeKey | null
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

export function GameSummaryDialog({ result, onConfirm }: GameSummaryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [displayed, setDisplayed] = useState<GameSummaryResult | null>(null)
  const [prevResult, setPrevResult] = useState<GameSummaryResult | null>(null)

  if (result !== prevResult) {
    setPrevResult(result)
    if (result) setDisplayed(result)
  }

  useEffect(() => {
    if (result) dialogRef.current?.showModal()
  }, [result])

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
      {displayed && (
        <div className="game-summary-dialog__content">
          <h2>{displayed.outcome === 'win' ? '本場獲勝' : '本場落敗'}</h2>
          <p className="game-summary-dialog__strength">
            球隊有效戰力:{displayed.strengthBefore.toFixed(1)} → {displayed.strengthAfter.toFixed(1)}(
            {formatSigned(displayed.strengthAfter - displayed.strengthBefore)})
          </p>

          <h3>先發與主要輪替</h3>
          <ul className="game-summary-dialog__players">
            {displayed.players.map((player) => (
              <li key={player.playerId}>
                <span className="game-summary-dialog__player-role">
                  {player.role === 'starter' ? '先發' : '輪替'}
                </span>
                <span className="game-summary-dialog__player-name">{player.playerName}</span>
                <span className="game-summary-dialog__player-fatigue">
                  疲勞 {player.fatigueBefore} → {player.fatigueAfter}
                </span>
                {player.grewAttribute && (
                  <span className="game-summary-dialog__player-growth">
                    {ATTRIBUTE_LABELS[player.grewAttribute]} +1
                  </span>
                )}
              </li>
            ))}
          </ul>

          {displayed.newInjuries.length > 0 && (
            <>
              <h3>新發生的傷勢</h3>
              <ul className="game-summary-dialog__injuries">
                {displayed.newInjuries.map((injury, index) => (
                  <li key={index}>
                    {injury.playerName}:{INJURY_STATUS_LABELS[injury.status]}(預計缺賽 {injury.weeksRemaining}{' '}
                    週,受傷前疲勞值 {injury.fatigueBeforeGame})
                  </li>
                ))}
              </ul>
            </>
          )}

          <button type="button" className="button-primary" onClick={confirm}>
            繼續
          </button>
        </div>
      )}
    </dialog>
  )
}

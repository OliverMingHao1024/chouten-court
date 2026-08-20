import { useEffect, useRef, useState } from 'react'
import './TrainingResultDialog.css'

const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export interface TrainingDieRoll {
  playerName: string
  roll: number
  succeeded: boolean
}

export interface TrainingRollResult {
  attributeLabel: string
  intensityLabel: string
  successCount: number
  totalPlayers: number
  totalGain: number
  rolls: TrainingDieRoll[]
}

export interface TrainingResultDialogProps {
  result: TrainingRollResult | null
}

export function TrainingResultDialog({ result }: TrainingResultDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [displayed, setDisplayed] = useState<TrainingRollResult | null>(null)
  const [prevResult, setPrevResult] = useState<TrainingRollResult | null>(null)

  if (result !== prevResult) {
    setPrevResult(result)
    if (result) setDisplayed(result)
  }

  useEffect(() => {
    if (result) dialogRef.current?.showModal()
  }, [result])

  return (
    <dialog
      ref={dialogRef}
      className="training-result-dialog"
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
    >
      {displayed && (
        <div className="training-result-dialog__content">
          <p className="training-result-dialog__intensity">{displayed.intensityLabel}</p>
          <ul className="training-result-dialog__dice-grid">
            {displayed.rolls.map((roll, index) => (
              <li
                key={index}
                className={`training-result-dialog__die${roll.succeeded ? ' training-result-dialog__die--success' : ''}`}
                title={`${roll.playerName}:${roll.roll} 點`}
              >
                <span aria-hidden="true">{DIE_FACES[roll.roll - 1]}</span>
                <span className="sr-only">
                  {roll.playerName} 擲出 {roll.roll} 點,{roll.succeeded ? '成功' : '失敗'}
                </span>
              </li>
            ))}
          </ul>
          <p className="training-result-dialog__count">
            {displayed.successCount} / {displayed.totalPlayers} 位球員練習成功
          </p>
          <p className="training-result-dialog__gain">
            {displayed.attributeLabel} 總計 +{displayed.totalGain}
          </p>
          <button type="button" className="button-primary" onClick={() => dialogRef.current?.close()}>
            關閉
          </button>
        </div>
      )}
    </dialog>
  )
}

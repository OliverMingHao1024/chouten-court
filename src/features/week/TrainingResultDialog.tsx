import { useEffect, useRef, useState } from 'react'
import './TrainingResultDialog.css'

export interface TrainingRollResult {
  attributeLabel: string
  intensityLabel: string
  successCount: number
  totalPlayers: number
  totalGain: number
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
          <p className="training-result-dialog__dice" aria-hidden="true">
            🎲
          </p>
          <p className="training-result-dialog__intensity">{displayed.intensityLabel}</p>
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

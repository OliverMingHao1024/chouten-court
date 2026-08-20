import { useEffect, useRef, useState } from 'react'
import { describeSeasonRecord, type SeasonSummaryResult } from '../../domain/seasonSummary'
import './SeasonSummaryDialog.css'

export type { SeasonSummaryResult }

export interface SeasonSummaryDialogProps {
  result: SeasonSummaryResult | null
}

export function SeasonSummaryDialog({ result }: SeasonSummaryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [displayed, setDisplayed] = useState<SeasonSummaryResult | null>(null)
  const [prevResult, setPrevResult] = useState<SeasonSummaryResult | null>(null)

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
      className="season-summary-dialog"
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
    >
      {displayed && (
        <div className="season-summary-dialog__content">
          <h2>單季總結</h2>
          <p className="season-summary-dialog__record">{describeSeasonRecord(displayed.record)}</p>
          <p className="season-summary-dialog__reputation">
            聲望 {displayed.reputationDelta >= 0 ? '+' : ''}
            {displayed.reputationDelta} → {displayed.reputationAfter}
          </p>
          <ul className="season-summary-dialog__awards">
            {displayed.awards.map((award) => (
              <li key={award.title}>
                {award.title}:{award.playerName}
              </li>
            ))}
          </ul>
          <button type="button" className="button-primary" onClick={() => dialogRef.current?.close()}>
            關閉
          </button>
        </div>
      )}
    </dialog>
  )
}

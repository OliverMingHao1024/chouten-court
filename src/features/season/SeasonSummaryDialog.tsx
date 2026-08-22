import { useEffect, useRef, useState } from 'react'
import { describeSeasonRecord, type SeasonSummaryResult } from '../../domain/seasonSummary'
import './SeasonSummaryDialog.css'

export type { SeasonSummaryResult }

export interface SeasonSummaryDialogProps {
  result: SeasonSummaryResult | null
  /**
   * 關閉時呼叫(選填,向下相容):讓呼叫端有機會把 result 清成 null,避免跟同時可能彈出的
   * 其他非阻斷式對話框(例如三年挑戰的 ChallengeDecisionDialog)疊在一起、兩層 backdrop
   * 同時開著。省略時行為跟過去完全相同(只在本地 <dialog> 關閉,不影響外部狀態)。
   */
  onClose?: () => void
}

export function SeasonSummaryDialog({ result, onClose }: SeasonSummaryDialogProps) {
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

  function close() {
    dialogRef.current?.close()
    onClose?.()
  }

  return (
    <dialog ref={dialogRef} className="season-summary-dialog" onClick={(e) => e.target === e.currentTarget && close()}>
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
          <button type="button" className="button-primary" onClick={close}>
            關閉
          </button>
        </div>
      )}
    </dialog>
  )
}

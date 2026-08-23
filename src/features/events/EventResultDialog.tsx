import { EVENT_RISK_LABELS, type EventRisk } from '../../domain/events'
import { ATTRIBUTE_LABELS, type AttributeKey } from '../../domain/types'
import { createRevealStagger, REVEAL_CLASS } from '../shared/reveal'
import { useResultDialog } from '../shared/useResultDialog'
import './EventResultDialog.css'

export interface EventRevealResult {
  cardTitle: string
  risk: EventRisk
  succeeded: boolean
  text: string
  attribute: AttributeKey | null
  attributeDelta: number
  fatigueDelta: number
  reputationDelta: number
}

export interface EventResultDialogProps {
  result: EventRevealResult | null
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

export function EventResultDialog({ result }: EventResultDialogProps) {
  const { dialogRef, displayed, version } = useResultDialog(result)

  return (
    <dialog
      ref={dialogRef}
      className="event-result-dialog"
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
    >
      {displayed &&
        (() => {
          const stagger = createRevealStagger()
          return (
            <div className="event-result-dialog__content" key={version}>
              <h2>{displayed.cardTitle}</h2>
              <p className={`event-result-dialog__verdict ${REVEAL_CLASS}`} style={stagger.next()}>
                {EVENT_RISK_LABELS[displayed.risk]} · {displayed.succeeded ? '成功' : '失敗'}
              </p>
              <p className={`event-result-dialog__text ${REVEAL_CLASS}`} style={stagger.next()}>
                {displayed.text}
              </p>

              {(displayed.attribute || displayed.fatigueDelta !== 0 || displayed.reputationDelta !== 0) && (
                <ul className="event-result-dialog__effects">
                  {displayed.attribute && displayed.attributeDelta !== 0 && (
                    <li className={REVEAL_CLASS} style={stagger.next()}>
                      {ATTRIBUTE_LABELS[displayed.attribute]} {formatSigned(displayed.attributeDelta)}
                    </li>
                  )}
                  {displayed.fatigueDelta !== 0 && (
                    <li className={REVEAL_CLASS} style={stagger.next()}>
                      疲勞 {formatSigned(displayed.fatigueDelta)}
                    </li>
                  )}
                  {displayed.reputationDelta !== 0 && (
                    <li className={REVEAL_CLASS} style={stagger.next()}>
                      聲望 {formatSigned(displayed.reputationDelta)}
                    </li>
                  )}
                </ul>
              )}

              <button type="button" className="button-primary" onClick={() => dialogRef.current?.close()}>
                關閉
              </button>
            </div>
          )
        })()}
    </dialog>
  )
}

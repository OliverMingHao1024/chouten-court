import { SPECIAL_ABILITY_LABELS } from '../../domain/specialAbilities'
import type { ResolvedCard } from '../../domain/trainingCardResolution'
import { ATTRIBUTE_LABELS } from '../../domain/types'
import { useResultDialog } from '../shared/useResultDialog'
import './TrainingCardResultDialog.css'

export interface TrainingCardWeekResult {
  resolvedCards: ResolvedCard[]
  playerNameById: Record<string, string>
}

export interface TrainingCardResultDialogProps {
  result: TrainingCardWeekResult | null
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function ResolvedCardSummary({ card, playerNameById }: { card: ResolvedCard; playerNameById: Record<string, string> }) {
  if (card.kind === 'teamTraining') {
    const trained = card.rolls.filter((roll) => roll.gain > 0)
    return (
      <li>
        全隊訓練·{ATTRIBUTE_LABELS[card.attribute]}:{trained.length} / {card.rolls.length} 位球員成長
        {card.comboBonus && <span className="training-card-result-dialog__combo">同類疊加加成</span>}
      </li>
    )
  }
  if (card.kind === 'individualTraining') {
    const playerName = playerNameById[card.playerId] ?? ''
    const abilityLabel = SPECIAL_ABILITY_LABELS[card.ability]
    return (
      <li>
        個別訓練:{playerName} {card.succeeded ? `學會了「${abilityLabel}」` : `嘗試學習「${abilityLabel}」失敗`}
      </li>
    )
  }
  if (card.kind === 'practiceMatch') {
    return (
      <li>
        練習賽:{card.outcome === 'win' ? '獲勝' : '落敗'}
        {card.beneficiaries.length > 0 && (
          <>
            ,
            {card.beneficiaries
              .map((b) => `${playerNameById[b.playerId] ?? ''} ${ATTRIBUTE_LABELS[b.attribute]} ${formatSigned(b.gain)}`)
              .join('、')}
          </>
        )}
      </li>
    )
  }
  return <li>全隊休養,體力恢復</li>
}

export function TrainingCardResultDialog({ result }: TrainingCardResultDialogProps) {
  const { dialogRef, displayed } = useResultDialog(result)

  return (
    <dialog
      ref={dialogRef}
      className="training-card-result-dialog"
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
    >
      {displayed && (
        <div className="training-card-result-dialog__content">
          <h2>本週訓練結果</h2>
          <ul className="training-card-result-dialog__list">
            {displayed.resolvedCards.map((card, index) => (
              <ResolvedCardSummary key={index} card={card} playerNameById={displayed.playerNameById} />
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

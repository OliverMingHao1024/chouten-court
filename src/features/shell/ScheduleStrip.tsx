import { PHASE_LABELS } from '../../domain/calendar'
import type { ScheduleSlot } from '../../domain/schedule'
import './ScheduleStrip.css'

export interface ScheduleStripProps {
  currentTotalWeek: number
  slots: ScheduleSlot[]
  weeksUntilNextMatch: number
}

function timingLabel(slot: ScheduleSlot, currentTotalWeek: number): string {
  const offset = slot.totalWeek - currentTotalWeek
  if (offset === 0) return '本週'
  if (offset === -1) return '上週'
  if (offset === 1) return '下週'
  return offset > 0 ? `+${offset} 週` : `${offset} 週`
}

/** 未來格只顯示行事曆早就固定的正式賽賽程,不提前算出訓練/事件等由玩家或 RNG 決定的內容。 */
function slotContent(slot: ScheduleSlot): string {
  if (slot.timing === 'future' && slot.gameNumber === null) return '未知'
  if (slot.gameNumber !== null) return `${PHASE_LABELS[slot.phase]} 第${slot.gameNumber}戰`
  return PHASE_LABELS[slot.phase]
}

export function ScheduleStrip({ currentTotalWeek, slots, weeksUntilNextMatch }: ScheduleStripProps) {
  return (
    <div className="schedule-strip">
      <p className="schedule-strip__next-match">
        {weeksUntilNextMatch === 0 ? '本週就是正式賽!' : `距離下一場正式賽 ${weeksUntilNextMatch} 週`}
      </p>
      <ul className="schedule-strip__slots">
        {slots.map((slot) => (
          <li key={slot.totalWeek} className={`schedule-strip__slot schedule-strip__slot--${slot.timing}`}>
            <span className="schedule-strip__slot-timing">{timingLabel(slot, currentTotalWeek)}</span>
            <span className="schedule-strip__slot-content">{slotContent(slot)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

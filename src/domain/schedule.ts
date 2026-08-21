import { getCalendarPosition, getSeasonPhase, WEEKS_PER_YEAR, type SeasonPhase } from './calendar'
import { getGameIndexForWeek, PHASE_GAME_COUNT, type OfficialPhase } from './officialMatch'

export type ScheduleTiming = 'past' | 'current' | 'future'

export interface ScheduleSlot {
  totalWeek: number
  timing: ScheduleTiming
  phase: SeasonPhase
  /** 該週在行事曆上第幾場正式賽(1-based),不是這週賽程就是 null。 */
  gameNumber: number | null
  totalGamesInPhase: number | null
}

function buildSlot(totalWeek: number, timing: ScheduleTiming): ScheduleSlot {
  const { weekOfYear } = getCalendarPosition(totalWeek)
  const phase = getSeasonPhase(weekOfYear)
  const gameIndex = getGameIndexForWeek(phase, weekOfYear)
  return {
    totalWeek,
    timing,
    phase,
    gameNumber: gameIndex === null ? null : gameIndex + 1,
    totalGamesInPhase: gameIndex === null ? null : PHASE_GAME_COUNT[phase as OfficialPhase],
  }
}

/**
 * 四格行程帶:前一週(已完成)、本週(現在)、之後兩週(未來)。未來格只揭露行事曆早就
 * 固定的正式賽賽程,不提前算出訓練/事件等由玩家選擇或 RNG 決定的內容,避免劇透。
 * currentTotalWeek 為 1 時沒有「前一週」,回傳的陣列會少一格(3 格)。
 */
export function computeScheduleStrip(currentTotalWeek: number): ScheduleSlot[] {
  const slots: ScheduleSlot[] = []
  if (currentTotalWeek > 1) slots.push(buildSlot(currentTotalWeek - 1, 'past'))
  slots.push(buildSlot(currentTotalWeek, 'current'))
  slots.push(buildSlot(currentTotalWeek + 1, 'future'))
  slots.push(buildSlot(currentTotalWeek + 2, 'future'))
  return slots
}

/** 距離下一場正式賽還有幾週;本週就是正式賽週時回傳 0。 */
export function weeksUntilNextOfficialMatch(currentTotalWeek: number): number {
  for (let delta = 0; delta <= WEEKS_PER_YEAR; delta++) {
    const totalWeek = currentTotalWeek + delta
    const { weekOfYear } = getCalendarPosition(totalWeek)
    const phase = getSeasonPhase(weekOfYear)
    if (getGameIndexForWeek(phase, weekOfYear) !== null) return delta
  }
  throw new Error(`no official match found within a year of week ${currentTotalWeek}`)
}

export const WEEKS_PER_YEAR = 48
export const OFFSEASON_WEEKS = 26
export const SEASON_WEEKS = WEEKS_PER_YEAR - OFFSEASON_WEEKS
export const PRACTICE_BLACKOUT_WEEKS = 3

export interface CalendarPosition {
  year: number
  weekOfYear: number
}

export function getCalendarPosition(totalWeek: number): CalendarPosition {
  const year = Math.floor((totalWeek - 1) / WEEKS_PER_YEAR) + 1
  const weekOfYear = ((totalWeek - 1) % WEEKS_PER_YEAR) + 1
  return { year, weekOfYear }
}

export type SeasonPhase = 'offseason' | 'qualifying' | 'preliminary' | 'group' | 'quarterfinal' | 'final4'

// HBL 甲級五階段的原創週數配置(尚未依實際賽程精細調校),依序佔滿賽季的 22 週。
const SEASON_PHASE_LENGTHS: Array<[Exclude<SeasonPhase, 'offseason'>, number]> = [
  ['qualifying', 4],
  ['preliminary', 4],
  ['group', 5],
  ['quarterfinal', 6],
  ['final4', 3],
]

export interface PhaseWeekRange {
  start: number
  end: number
}

export function getPhaseWeekRange(phase: Exclude<SeasonPhase, 'offseason'>): PhaseWeekRange {
  let cursor = OFFSEASON_WEEKS
  for (const [candidate, length] of SEASON_PHASE_LENGTHS) {
    const start = cursor + 1
    cursor += length
    if (candidate === phase) return { start, end: cursor }
  }
  throw new Error(`unknown season phase: ${phase}`)
}

export function getSeasonPhase(weekOfYear: number): SeasonPhase {
  if (weekOfYear < 1 || weekOfYear > WEEKS_PER_YEAR) {
    throw new RangeError(`weekOfYear must be within 1..${WEEKS_PER_YEAR}, got ${weekOfYear}`)
  }
  if (weekOfYear <= OFFSEASON_WEEKS) return 'offseason'

  let cursor = OFFSEASON_WEEKS
  for (const [phase, length] of SEASON_PHASE_LENGTHS) {
    cursor += length
    if (weekOfYear <= cursor) return phase
  }
  // Should be unreachable if SEASON_PHASE_LENGTHS sums to SEASON_WEEKS.
  return 'final4'
}

export function isPracticeMatchAllowed(weekOfYear: number): boolean {
  if (weekOfYear > OFFSEASON_WEEKS) return false
  return weekOfYear <= OFFSEASON_WEEKS - PRACTICE_BLACKOUT_WEEKS
}

const PRACTICE_MATCH_MONTH_LENGTH = 4

function monthIndexOf(weekOfYear: number): number {
  return Math.floor((weekOfYear - 1) / PRACTICE_MATCH_MONTH_LENGTH)
}

export function canScheduleAnotherPracticeMatch(
  weekOfYear: number,
  practiceMatchWeeksThisYear: number[],
): boolean {
  if (!isPracticeMatchAllowed(weekOfYear)) return false
  const currentMonth = monthIndexOf(weekOfYear)
  return !practiceMatchWeeksThisYear.some((week) => monthIndexOf(week) === currentMonth)
}

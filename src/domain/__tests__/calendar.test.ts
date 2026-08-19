import { describe, expect, it } from 'vitest'
import {
  getCalendarPosition,
  getSeasonPhase,
  isPracticeMatchAllowed,
  canScheduleAnotherPracticeMatch,
} from '../calendar'

describe('getCalendarPosition', () => {
  it('maps week 1 to year 1, week-of-year 1', () => {
    expect(getCalendarPosition(1)).toEqual({ year: 1, weekOfYear: 1 })
  })

  it('maps week 48 to year 1, week-of-year 48', () => {
    expect(getCalendarPosition(48)).toEqual({ year: 1, weekOfYear: 48 })
  })

  it('rolls over into year 2 at week 49', () => {
    expect(getCalendarPosition(49)).toEqual({ year: 2, weekOfYear: 1 })
  })

  it('rolls over into year 3 correctly', () => {
    expect(getCalendarPosition(97)).toEqual({ year: 3, weekOfYear: 1 })
  })
})

describe('getSeasonPhase', () => {
  it('treats weeks 1-26 as offseason', () => {
    expect(getSeasonPhase(1)).toBe('offseason')
    expect(getSeasonPhase(26)).toBe('offseason')
  })

  it('treats weeks 27-48 as season sub-phases, in order', () => {
    const phases = Array.from({ length: 22 }, (_, i) => getSeasonPhase(27 + i))
    expect(phases[0]).toBe('qualifying')
    expect(phases[phases.length - 1]).toBe('final4')
    // phases never go backwards (qualifying -> preliminary -> group -> quarterfinal -> final4)
    const order = ['qualifying', 'preliminary', 'group', 'quarterfinal', 'final4']
    let lastIndex = -1
    for (const phase of phases) {
      const index = order.indexOf(phase)
      expect(index).toBeGreaterThanOrEqual(lastIndex)
      lastIndex = index
    }
  })

  it('throws on an out-of-range week-of-year', () => {
    expect(() => getSeasonPhase(0)).toThrow()
    expect(() => getSeasonPhase(49)).toThrow()
  })
})

describe('isPracticeMatchAllowed', () => {
  it('allows practice matches early in the offseason', () => {
    expect(isPracticeMatchAllowed(1)).toBe(true)
    expect(isPracticeMatchAllowed(20)).toBe(true)
  })

  it('blocks practice matches in the 3 weeks right before the season starts', () => {
    expect(isPracticeMatchAllowed(24)).toBe(false)
    expect(isPracticeMatchAllowed(25)).toBe(false)
    expect(isPracticeMatchAllowed(26)).toBe(false)
  })

  it('blocks practice matches during the season itself', () => {
    expect(isPracticeMatchAllowed(27)).toBe(false)
    expect(isPracticeMatchAllowed(48)).toBe(false)
  })
})

describe('canScheduleAnotherPracticeMatch', () => {
  it('allows the first practice match of a month', () => {
    expect(canScheduleAnotherPracticeMatch(1, [])).toBe(true)
  })

  it('blocks a second practice match within the same 4-week month', () => {
    expect(canScheduleAnotherPracticeMatch(3, [1])).toBe(false)
  })

  it('allows a practice match in the next month after one was already used', () => {
    expect(canScheduleAnotherPracticeMatch(5, [1])).toBe(true)
  })

  it('also respects the offseason/blackout restriction', () => {
    expect(canScheduleAnotherPracticeMatch(30, [])).toBe(false)
  })
})

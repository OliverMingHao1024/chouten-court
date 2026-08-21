import { describe, expect, it } from 'vitest'
import { computeScheduleStrip, weeksUntilNextOfficialMatch } from '../schedule'

describe('computeScheduleStrip', () => {
  it('has no past slot on week 1 (there is no previous week yet)', () => {
    const slots = computeScheduleStrip(1)
    expect(slots.map((s) => s.timing)).toEqual(['current', 'future', 'future'])
    expect(slots.map((s) => s.totalWeek)).toEqual([1, 2, 3])
  })

  it('has a past, current, and two future slots for any other week', () => {
    const slots = computeScheduleStrip(10)
    expect(slots.map((s) => s.timing)).toEqual(['past', 'current', 'future', 'future'])
    expect(slots.map((s) => s.totalWeek)).toEqual([9, 10, 11, 12])
  })

  it('marks offseason weeks with no scheduled game', () => {
    const slots = computeScheduleStrip(10)
    slots.forEach((slot) => {
      expect(slot.phase).toBe('offseason')
      expect(slot.gameNumber).toBeNull()
      expect(slot.totalGamesInPhase).toBeNull()
    })
  })

  it('marks a future slot that lands on the season opener as a known scheduled match', () => {
    // week 25: past=24, current=25, future=26 (still offseason), future=27 (qualifying game 1)
    const slots = computeScheduleStrip(25)
    const openingWeek = slots.find((s) => s.totalWeek === 27)!
    expect(openingWeek.timing).toBe('future')
    expect(openingWeek.phase).toBe('qualifying')
    expect(openingWeek.gameNumber).toBe(1)
    expect(openingWeek.totalGamesInPhase).toBe(4)
  })

  it('gives the current slot its own game number when the current week is itself a match week', () => {
    const slots = computeScheduleStrip(28)
    const current = slots.find((s) => s.timing === 'current')!
    expect(current.phase).toBe('qualifying')
    expect(current.gameNumber).toBe(2)
  })
})

describe('weeksUntilNextOfficialMatch', () => {
  it('returns 0 when the current week is itself a match week', () => {
    expect(weeksUntilNextOfficialMatch(27)).toBe(0)
  })

  it('counts down through the offseason to the season opener', () => {
    expect(weeksUntilNextOfficialMatch(26)).toBe(1)
    expect(weeksUntilNextOfficialMatch(1)).toBe(26)
  })

  it('finds the next match even when the current phase has a spare bye week (e.g. after final4)', () => {
    // final4 is weeks 46-48 but only has 2 games (weeks 46-47); week 48 is a bye week
    // with no game, and the next game is the following year's qualifying opener (week 27+48=75).
    expect(weeksUntilNextOfficialMatch(48)).toBe(48 + 27 - 48)
  })
})

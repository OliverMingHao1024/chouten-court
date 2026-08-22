import { describe, expect, it } from 'vitest'
import {
  COMEBACK_WIN_MARGIN_THRESHOLD,
  isBackToBackFinal8,
  isComebackWin,
  isUndefeatedSeason,
  newlyUnlockedAchievements,
  unlockAchievement,
} from '../achievements'
import type { SeasonRecord } from '../seasonSummary'

function record(overrides: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    year: 1,
    wins: 4,
    losses: 0,
    finalPhaseReached: 'qualifying',
    placement: null,
    reputationAfter: 50,
    ...overrides,
  }
}

describe('isComebackWin', () => {
  it('is false when there was no deficit to come back from', () => {
    expect(isComebackWin(null)).toBe(false)
  })

  it('is false when the deficit was below the threshold', () => {
    expect(isComebackWin(COMEBACK_WIN_MARGIN_THRESHOLD - 1)).toBe(false)
  })

  it('is true once the deficit reaches the threshold', () => {
    expect(isComebackWin(COMEBACK_WIN_MARGIN_THRESHOLD)).toBe(true)
    expect(isComebackWin(COMEBACK_WIN_MARGIN_THRESHOLD + 10)).toBe(true)
  })
})

describe('isUndefeatedSeason', () => {
  it('is true for a season with wins and no losses', () => {
    expect(isUndefeatedSeason(record({ wins: 5, losses: 0 }))).toBe(true)
  })

  it('is false when there is at least one loss', () => {
    expect(isUndefeatedSeason(record({ wins: 3, losses: 1 }))).toBe(false)
  })

  it('is false for a season with zero games played', () => {
    expect(isUndefeatedSeason(record({ wins: 0, losses: 0 }))).toBe(false)
  })
})

describe('isBackToBackFinal8', () => {
  it('is false with fewer than two seasons on record', () => {
    expect(isBackToBackFinal8([])).toBe(false)
    expect(isBackToBackFinal8([record({ finalPhaseReached: 'final4' })])).toBe(false)
  })

  it('is false when only the most recent season reached quarterfinal or later', () => {
    const log = [record({ finalPhaseReached: 'qualifying' }), record({ finalPhaseReached: 'quarterfinal' })]
    expect(isBackToBackFinal8(log)).toBe(false)
  })

  it('is true when the two most recent seasons both reached quarterfinal or later', () => {
    const log = [record({ finalPhaseReached: 'quarterfinal' }), record({ finalPhaseReached: 'final4' })]
    expect(isBackToBackFinal8(log)).toBe(true)
  })

  it('only looks at the two most recent seasons', () => {
    const log = [
      record({ finalPhaseReached: 'quarterfinal' }),
      record({ finalPhaseReached: 'qualifying' }),
      record({ finalPhaseReached: 'quarterfinal' }),
      record({ finalPhaseReached: 'final4' }),
    ]
    expect(isBackToBackFinal8(log)).toBe(true)
  })
})

describe('unlockAchievement', () => {
  it('adds a new achievement', () => {
    expect(unlockAchievement([], 'undefeatedSeason')).toEqual(['undefeatedSeason'])
  })

  it('does not duplicate an already-unlocked achievement', () => {
    expect(unlockAchievement(['undefeatedSeason'], 'undefeatedSeason')).toEqual(['undefeatedSeason'])
  })
})

describe('newlyUnlockedAchievements', () => {
  it('returns achievements present after but not before', () => {
    expect(newlyUnlockedAchievements(['undefeatedSeason'], ['undefeatedSeason', 'comebackWin'])).toEqual([
      'comebackWin',
    ])
  })

  it('returns an empty array when nothing changed', () => {
    expect(newlyUnlockedAchievements(['undefeatedSeason'], ['undefeatedSeason'])).toEqual([])
  })
})

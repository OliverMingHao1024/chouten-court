import { describe, expect, it } from 'vitest'
import {
  generateOpponentStyle,
  isOpponentScouted,
  OPPONENT_STYLES,
  SCOUTING_REPUTATION_THRESHOLD,
  scoutedStrengthRange,
} from '../opponentStyle'

describe('generateOpponentStyle', () => {
  it('is deterministic for the same seed', () => {
    expect(generateOpponentStyle(42)).toBe(generateOpponentStyle(42))
  })

  it('always returns one of the documented styles', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(OPPONENT_STYLES).toContain(generateOpponentStyle(seed))
    }
  })
})

describe('isOpponentScouted', () => {
  it('is false below the threshold and true at/above it', () => {
    expect(isOpponentScouted(SCOUTING_REPUTATION_THRESHOLD - 1)).toBe(false)
    expect(isOpponentScouted(SCOUTING_REPUTATION_THRESHOLD)).toBe(true)
    expect(isOpponentScouted(100)).toBe(true)
  })
})

describe('scoutedStrengthRange', () => {
  it('brackets the true strength value symmetrically', () => {
    const range = scoutedStrengthRange(66)
    expect(range.min).toBeLessThan(66)
    expect(range.max).toBeGreaterThan(66)
    expect(66 - range.min).toBe(range.max - 66)
  })
})

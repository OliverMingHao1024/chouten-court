import { describe, expect, it } from 'vitest'
import { getOpponentTier } from '../opponentTier'

describe('getOpponentTier', () => {
  it.each([
    [50, '弱校'],
    [59, '弱校'],
    [60, '中堅'],
    [65, '中堅'],
    [74, '中堅'],
    [75, '名門'],
    [80, '名門'],
    [84, '名門'],
    [85, '籃球名校'],
    [88, '籃球名校'],
  ])('grades strength %i as %s', (strength, expected) => {
    expect(getOpponentTier(strength)).toBe(expected)
  })
})

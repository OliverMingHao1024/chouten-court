import { describe, expect, it } from 'vitest'
import { generateOpponentRoster, OPPONENT_ROSTER_SIZE } from '../opponentRoster'

describe('generateOpponentRoster', () => {
  it('generates OPPONENT_ROSTER_SIZE players by default', () => {
    expect(generateOpponentRoster(1)).toHaveLength(OPPONENT_ROSTER_SIZE)
  })

  it('is deterministic for the same seed', () => {
    expect(generateOpponentRoster(42)).toEqual(generateOpponentRoster(42))
  })

  it('produces a different roster for a different seed', () => {
    expect(generateOpponentRoster(1)).not.toEqual(generateOpponentRoster(2))
  })

  it('respects a custom size', () => {
    expect(generateOpponentRoster(1, 15)).toHaveLength(15)
  })
})

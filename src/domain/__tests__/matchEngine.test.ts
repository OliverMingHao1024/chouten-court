import { describe, expect, it } from 'vitest'
import { clamp, applyFatigueDelta, computeTeamStrength, computeWinProbability } from '../matchEngine'
import { createInitialRoster } from '../roster'

describe('clamp', () => {
  it('keeps values within range and clips outliers', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('applyFatigueDelta', () => {
  it('adds load and subtracts the baseline recovery, clamped to [0,100]', () => {
    const roster = createInitialRoster(1)
    const player = { ...roster[0], fatigue: 50 }
    expect(applyFatigueDelta(player, 20).fatigue).toBe(60) // 50 + 20 - 10
    expect(applyFatigueDelta({ ...player, fatigue: 0 }, 0).fatigue).toBe(0)
    expect(applyFatigueDelta({ ...player, fatigue: 95 }, 30).fatigue).toBe(100)
  })
})

describe('computeTeamStrength', () => {
  it('averages every player attribute into a single number', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
    }))
    expect(computeTeamStrength(roster)).toBe(60)
  })
})

describe('computeWinProbability', () => {
  it('returns 0.5 when team and opponent strength are equal', () => {
    expect(computeWinProbability(70, 70)).toBeCloseTo(0.5)
  })

  it('returns a higher probability when the team is stronger', () => {
    expect(computeWinProbability(90, 60)).toBeGreaterThan(0.5)
  })

  it('returns a lower probability when the team is weaker', () => {
    expect(computeWinProbability(50, 80)).toBeLessThan(0.5)
  })
})

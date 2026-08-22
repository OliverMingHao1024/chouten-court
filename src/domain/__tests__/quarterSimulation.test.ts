import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../rng'
import { simulateQuarters } from '../quarterSimulation'

describe('simulateQuarters', () => {
  it('is deterministic for the same inputs', () => {
    const a = simulateQuarters(70, 65, 4, createSeededRng(42))
    const b = simulateQuarters(70, 65, 4, createSeededRng(42))
    expect(a).toEqual(b)
  })

  it('always produces exactly 4 quarters', () => {
    expect(simulateQuarters(70, 65, 4, createSeededRng(1)).quarters).toHaveLength(4)
  })

  it('sums the quarters to the final score', () => {
    const result = simulateQuarters(60, 75, 5, createSeededRng(7))
    const usSum = result.quarters.reduce((sum, q) => sum + q.us, 0)
    const themSum = result.quarters.reduce((sum, q) => sum + q.them, 0)
    expect(result.final).toEqual({ us: usSum, them: themSum })
  })

  it('never lets the outcome contradict the final score', () => {
    for (let seed = 0; seed < 300; seed++) {
      const result = simulateQuarters(70, 65, 4, createSeededRng(seed))
      if (result.final.us > result.final.them) expect(result.outcome).toBe('win')
      if (result.final.us < result.final.them) expect(result.outcome).toBe('loss')
    }
  })

  it('never produces a negative quarter score', () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = simulateQuarters(20, 90, 4, createSeededRng(seed))
      for (const quarter of result.quarters) {
        expect(quarter.us).toBeGreaterThanOrEqual(0)
        expect(quarter.them).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('produces a much higher win rate for a large strength advantage than a large disadvantage', () => {
    const trials = 300
    let winsWhenAhead = 0
    let winsWhenBehind = 0
    for (let seed = 0; seed < trials; seed++) {
      if (simulateQuarters(90, 55, 4, createSeededRng(seed)).outcome === 'win') winsWhenAhead += 1
      if (simulateQuarters(55, 90, 4, createSeededRng(seed)).outcome === 'win') winsWhenBehind += 1
    }
    expect(winsWhenAhead).toBeGreaterThan(winsWhenBehind)
  })

  it('produces roughly even records for equal strength across many seeds', () => {
    const trials = 400
    let wins = 0
    for (let seed = 0; seed < trials; seed++) {
      if (simulateQuarters(70, 70, 4, createSeededRng(seed)).outcome === 'win') wins += 1
    }
    expect(wins / trials).toBeGreaterThan(0.35)
    expect(wins / trials).toBeLessThan(0.65)
  })
})

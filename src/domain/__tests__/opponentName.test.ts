import { describe, expect, it } from 'vitest'
import { generateOpponentName, REGIONS, SUFFIXES } from '../opponentName'

describe('generateOpponentName', () => {
  it('is deterministic for the same rng sequence', () => {
    expect(generateOpponentName(() => 0)).toBe(generateOpponentName(() => 0))
  })

  it('combines a region and a school suffix from the defined lists', () => {
    const name = generateOpponentName(() => 0.5)
    const matchedRegion = REGIONS.find((r) => name.startsWith(r))
    expect(matchedRegion).toBeDefined()
    const suffix = name.slice(matchedRegion!.length)
    expect(SUFFIXES).toContain(suffix)
  })

  it('varies across different rng values', () => {
    const names = new Set([0, 0.2, 0.4, 0.6, 0.8].map((v) => generateOpponentName(() => v)))
    expect(names.size).toBeGreaterThan(1)
  })
})

import { describe, expect, it } from 'vitest'
import { generateCoachName, SURNAMES, GIVEN_NAMES } from '../nameGenerator'

describe('generateCoachName', () => {
  it('is deterministic for the same rng sequence', () => {
    const rng = () => 0
    expect(generateCoachName(rng)).toBe(generateCoachName(() => 0))
  })

  it('combines a surname and a given name from the defined lists', () => {
    const name = generateCoachName(() => 0.5)
    const matchedSurname = SURNAMES.find((s) => name.startsWith(s))
    expect(matchedSurname).toBeDefined()
    const given = name.slice(matchedSurname!.length)
    expect(GIVEN_NAMES).toContain(given)
  })

  it('varies across different rng values', () => {
    const names = new Set([0, 0.2, 0.4, 0.6, 0.8].map((v) => generateCoachName(() => v)))
    expect(names.size).toBeGreaterThan(1)
  })
})

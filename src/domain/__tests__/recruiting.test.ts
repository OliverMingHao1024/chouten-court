import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_MAX } from '../matchEngine'
import { generateCandidatePool, signCandidates } from '../recruiting'
import { INITIAL_REPUTATION } from '../reputation'
import { ATTRIBUTE_KEYS } from '../types'

describe('generateCandidatePool', () => {
  it('is deterministic for the same seed', () => {
    const a = generateCandidatePool(INITIAL_REPUTATION, 10, 42)
    const b = generateCandidatePool(INITIAL_REPUTATION, 10, 42)
    expect(a).toEqual(b)
  })

  it('produces the requested pool size with unique ids', () => {
    const pool = generateCandidatePool(INITIAL_REPUTATION, 24, 1)
    expect(pool).toHaveLength(24)
    expect(new Set(pool.map((c) => c.id)).size).toBe(24)
  })

  it('keeps every attribute range within [0, ATTRIBUTE_MAX] and containing the true value', () => {
    const pool = generateCandidatePool(INITIAL_REPUTATION, 20, 7)
    for (const candidate of pool) {
      for (const key of ATTRIBUTE_KEYS) {
        const { min, max } = candidate.attributeRanges[key]
        const trueValue = candidate.trueAttributes[key]
        expect(min).toBeGreaterThanOrEqual(0)
        expect(max).toBeLessThanOrEqual(ATTRIBUTE_MAX)
        expect(min).toBeLessThanOrEqual(trueValue)
        expect(max).toBeGreaterThanOrEqual(trueValue)
      }
    }
  })

  it('shifts the pool towards higher attributes at higher reputation, without a hard floor/ceiling', () => {
    const averageTrueAttribute = (reputation: number) => {
      const pool = generateCandidatePool(reputation, 200, 99)
      const total = pool.reduce(
        (sum, c) => sum + ATTRIBUTE_KEYS.reduce((s, key) => s + c.trueAttributes[key], 0),
        0,
      )
      return total / (pool.length * ATTRIBUTE_KEYS.length)
    }

    expect(averageTrueAttribute(90)).toBeGreaterThan(averageTrueAttribute(10))
  })
})

describe('signCandidates', () => {
  it('converts only the selected candidates into fresh grade-1 players', () => {
    const pool = generateCandidatePool(INITIAL_REPUTATION, 5, 3)
    const selectedIds = [pool[0].id, pool[2].id]
    const signed = signCandidates(pool, selectedIds)

    expect(signed).toHaveLength(2)
    signed.forEach((player) => {
      expect(player.grade).toBe(1)
      expect(player.injuryStatus).toBe('healthy')
      expect(player.fatigue).toBe(0)
    })
    expect(signed.map((p) => p.name)).toEqual([pool[0].name, pool[2].name])
  })

  it('gives the signed player exactly the candidate true attributes', () => {
    const pool = generateCandidatePool(INITIAL_REPUTATION, 3, 3)
    const [signed] = signCandidates(pool, [pool[0].id])
    expect(signed.attributes).toEqual(pool[0].trueAttributes)
  })
})

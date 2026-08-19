import { describe, expect, it } from 'vitest'
import { createSeededRng, hashSeed } from '../rng'

describe('createSeededRng', () => {
  it('produces the same sequence for the same numeric seed', () => {
    const a = createSeededRng(42)
    const b = createSeededRng(42)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(1)
    const b = createSeededRng(2)
    expect(a()).not.toBe(b())
  })

  it('always returns a value in [0, 1)', () => {
    const rng = createSeededRng(7)
    for (let i = 0; i < 50; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('hashSeed', () => {
  it('deterministically maps the same string to the same number', () => {
    expect(hashSeed('chouten')).toBe(hashSeed('chouten'))
  })

  it('maps different strings to different numbers (no collision for these cases)', () => {
    expect(hashSeed('chouten')).not.toBe(hashSeed('court'))
  })
})

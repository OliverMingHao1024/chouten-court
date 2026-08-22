import { describe, expect, it } from 'vitest'
import { computeAceStrengthBonus, describeAceWeakness, generateOpponentAce, opponentAceEraIndex } from '../opponentAce'

describe('generateOpponentAce', () => {
  it('is deterministic for the same seed', () => {
    expect(generateOpponentAce(42)).toEqual(generateOpponentAce(42))
  })

  it('produces attributes within the documented ranges', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ace = generateOpponentAce(seed)
      expect(ace.scoring).toBeGreaterThanOrEqual(70)
      expect(ace.scoring).toBeLessThanOrEqual(99)
      expect(ace.shooting).toBeGreaterThanOrEqual(60)
      expect(ace.shooting).toBeLessThanOrEqual(95)
      expect(ace.name.length).toBeGreaterThan(0)
    }
  })
})

describe('computeAceStrengthBonus', () => {
  it('gives a stronger ace a larger bonus', () => {
    const weak = { name: 'weak', scoring: 70, shooting: 60 }
    const strong = { name: 'strong', scoring: 99, shooting: 95 }
    expect(computeAceStrengthBonus(strong)).toBeGreaterThan(computeAceStrengthBonus(weak))
  })
})

describe('describeAceWeakness', () => {
  it('flags scoring as the weakness when it is the lower of the two attributes', () => {
    expect(describeAceWeakness({ name: 'x', scoring: 70, shooting: 90 })).toBe('得分能力較弱')
  })

  it('flags shooting as the weakness when it is the lower (or equal) of the two attributes', () => {
    expect(describeAceWeakness({ name: 'x', scoring: 90, shooting: 70 })).toBe('三分準度較弱')
    expect(describeAceWeakness({ name: 'x', scoring: 80, shooting: 80 })).toBe('三分準度較弱')
  })
})

describe('opponentAceEraIndex', () => {
  it('stays the same for 3 consecutive career years, then advances', () => {
    expect(opponentAceEraIndex(1)).toBe(0)
    expect(opponentAceEraIndex(2)).toBe(0)
    expect(opponentAceEraIndex(3)).toBe(0)
    expect(opponentAceEraIndex(4)).toBe(1)
    expect(opponentAceEraIndex(5)).toBe(1)
    expect(opponentAceEraIndex(6)).toBe(1)
    expect(opponentAceEraIndex(7)).toBe(2)
  })
})

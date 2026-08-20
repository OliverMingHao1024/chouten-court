import { describe, expect, it } from 'vitest'
import { computeTacticAttributeWeights } from '../tactics'

describe('computeTacticAttributeWeights', () => {
  it('stacks offense and defense weight deltas on overlapping attributes', () => {
    const weights = computeTacticAttributeWeights({ offense: 'fast', defense: 'manToMan' })
    expect(weights.athletic).toBeCloseTo(1 + 0.3 + 0.2)
    expect(weights.pass).toBeCloseTo(1 + 0.2)
    expect(weights.defense).toBeCloseTo(1 + 0.3)
  })

  it('leaves attributes untouched by either tactic at the default weight of 1 (undefined)', () => {
    const weights = computeTacticAttributeWeights({ offense: 'halfcourt', defense: 'zone' })
    expect(weights.athletic).toBeUndefined()
    expect(weights.shooting).toBeCloseTo(1.2)
    expect(weights.rebound).toBeCloseTo(1.3)
  })
})

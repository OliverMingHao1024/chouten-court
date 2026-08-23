import { describe, expect, it } from 'vitest'
import { INITIAL_REPUTATION } from '../reputation'
import {
  STARTING_SCENARIO_ATTRIBUTE_SHIFT,
  STARTING_SCENARIO_REPUTATION,
  STARTING_SCENARIOS,
} from '../startingScenario'

describe('startingScenario', () => {
  it('defines a reputation and attribute shift for every scenario', () => {
    for (const scenario of STARTING_SCENARIOS) {
      expect(typeof STARTING_SCENARIO_REPUTATION[scenario]).toBe('number')
      expect(typeof STARTING_SCENARIO_ATTRIBUTE_SHIFT[scenario]).toBe('number')
    }
  })

  it('keeps the standard scenario identical to the pre-existing default difficulty', () => {
    expect(STARTING_SCENARIO_REPUTATION.standard).toBe(INITIAL_REPUTATION)
    expect(STARTING_SCENARIO_ATTRIBUTE_SHIFT.standard).toBe(0)
  })

  it('makes underdog strictly weaker and contender strictly stronger than standard', () => {
    expect(STARTING_SCENARIO_REPUTATION.underdog).toBeLessThan(STARTING_SCENARIO_REPUTATION.standard)
    expect(STARTING_SCENARIO_REPUTATION.contender).toBeGreaterThan(STARTING_SCENARIO_REPUTATION.standard)
    expect(STARTING_SCENARIO_ATTRIBUTE_SHIFT.underdog).toBeLessThan(STARTING_SCENARIO_ATTRIBUTE_SHIFT.standard)
    expect(STARTING_SCENARIO_ATTRIBUTE_SHIFT.contender).toBeGreaterThan(STARTING_SCENARIO_ATTRIBUTE_SHIFT.standard)
  })
})

import { describe, expect, it } from 'vitest'
import {
  applyReputationDelta,
  computeSeasonReputationDelta,
  INITIAL_REPUTATION,
  REPUTATION_MAX,
  REPUTATION_MIN,
} from '../reputation'

describe('computeSeasonReputationDelta', () => {
  it('is negative for an early elimination and positive for a deep run', () => {
    expect(computeSeasonReputationDelta('qualifying', null)).toBeLessThan(0)
    expect(computeSeasonReputationDelta('quarterfinal', null)).toBeGreaterThan(0)
  })

  it('grows the further the team advances', () => {
    const qualifying = computeSeasonReputationDelta('qualifying', null)
    const preliminary = computeSeasonReputationDelta('preliminary', null)
    const group = computeSeasonReputationDelta('group', null)
    const quarterfinal = computeSeasonReputationDelta('quarterfinal', null)
    expect(preliminary).toBeGreaterThan(qualifying)
    expect(group).toBeGreaterThan(preliminary)
    expect(quarterfinal).toBeGreaterThan(group)
  })

  it('gives a champion an extra bonus over any other final4 placement', () => {
    const champion = computeSeasonReputationDelta('final4', 'champion')
    const runnerUp = computeSeasonReputationDelta('final4', 'runnerUp')
    expect(champion).toBeGreaterThan(runnerUp)
  })
})

describe('applyReputationDelta', () => {
  it('clamps to the [0, 100] range', () => {
    expect(applyReputationDelta(REPUTATION_MAX - 2, 10)).toBe(REPUTATION_MAX)
    expect(applyReputationDelta(REPUTATION_MIN + 2, -10)).toBe(REPUTATION_MIN)
  })

  it('adds the delta within range', () => {
    expect(applyReputationDelta(INITIAL_REPUTATION, 5)).toBe(INITIAL_REPUTATION + 5)
  })
})

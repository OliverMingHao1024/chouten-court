import { describe, expect, it } from 'vitest'
import {
  applyTraining,
  applyPracticeMatch,
  computeTrainingSuccessGain,
  TRAINING_SUCCESS_RATE,
} from '../weeklyAction'
import { createInitialRoster } from '../roster'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'

function withUniformAttributes(roster: Player[], value: number): Player[] {
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as AttributeSet
  return roster.map((player) => ({ ...player, attributes }))
}

function totalAttributeValue(roster: Player[]): number {
  return roster.reduce(
    (sum, player) => sum + Object.values(player.attributes).reduce((s, v) => s + v, 0),
    0,
  )
}

describe('computeTrainingSuccessGain', () => {
  it('gives a bigger gain to a personality that favours the trained attribute', () => {
    const geniusGain = computeTrainingSuccessGain('moderate', 'three', 'genius')
    const steadyGain = computeTrainingSuccessGain('moderate', 'three', 'steady')
    expect(geniusGain).toBeGreaterThanOrEqual(steadyGain)
  })

  it('grows with intensity', () => {
    expect(computeTrainingSuccessGain('light', 'three', 'steady')).toBeLessThan(
      computeTrainingSuccessGain('moderate', 'three', 'steady'),
    )
    expect(computeTrainingSuccessGain('moderate', 'three', 'steady')).toBeLessThan(
      computeTrainingSuccessGain('intense', 'three', 'steady'),
    )
  })
})

describe('TRAINING_SUCCESS_RATE', () => {
  it('is higher for lower-risk intensities', () => {
    expect(TRAINING_SUCCESS_RATE.light).toBeGreaterThan(TRAINING_SUCCESS_RATE.moderate)
    expect(TRAINING_SUCCESS_RATE.moderate).toBeGreaterThan(TRAINING_SUCCESS_RATE.intense)
  })
})

describe('applyTraining', () => {
  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const a = applyTraining(roster, 'three', 'moderate', 42)
    const b = applyTraining(roster, 'three', 'moderate', 42)
    expect(a).toEqual(b)
  })

  it('never regresses the chosen attribute (failure = 0 growth, never negative)', () => {
    const roster = createInitialRoster(1)
    const before = roster.map((p) => p.attributes.three)
    const result = applyTraining(roster, 'three', 'intense', 999)
    result.roster.forEach((player, index) => {
      expect(player.attributes.three).toBeGreaterThanOrEqual(before[index])
    })
  })

  it('does not change attributes other than the chosen one', () => {
    const roster = createInitialRoster(1)
    const result = applyTraining(roster, 'three', 'moderate', 42)
    roster.forEach((player, index) => {
      expect(result.roster[index].attributes.shooting).toBe(player.attributes.shooting)
      expect(result.roster[index].attributes.iq).toBe(player.attributes.iq)
    })
  })

  it('reduces fatigue on light/moderate intensity (net recovery), but not on intense', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 40 }))
    const light = applyTraining(roster, 'three', 'light', 1)
    const moderate = applyTraining(roster, 'three', 'moderate', 1)
    const intense = applyTraining(roster, 'three', 'intense', 1)
    light.roster.forEach((player) => expect(player.fatigue).toBeLessThan(40))
    moderate.roster.forEach((player) => expect(player.fatigue).toBeLessThanOrEqual(40))
    intense.roster.forEach((player) => expect(player.fatigue).toBeGreaterThan(40))
  })

  it('fatigue load applies regardless of success or failure', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 40 }))
    // Fatigue delta only depends on intensity/load, not the success roll, across many seeds.
    const deltas = new Set(
      Array.from({ length: 10 }, (_, seed) => applyTraining(roster, 'three', 'intense', seed).roster[0].fatigue),
    )
    expect(deltas.size).toBe(1)
  })

  it('yields a higher average gain for higher-risk intensity across many rolls (higher EV)', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 40).map((p) => ({
      ...p,
      personality: 'steady' as const,
    }))
    const sampleSeeds = Array.from({ length: 200 }, (_, i) => i)

    const totalGain = (intensity: 'light' | 'intense') =>
      sampleSeeds.reduce((sum, seed) => sum + applyTraining(roster, 'three', intensity, seed).totalGain, 0)

    expect(totalGain('intense')).toBeGreaterThan(totalGain('light'))
  })

  it('reports successCount and totalGain consistent with the roster outcome', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 40).map((p) => ({
      ...p,
      personality: 'steady' as const,
    }))
    const result = applyTraining(roster, 'three', 'moderate', 7)

    const actualSuccessCount = result.roster.filter((p, i) => p.attributes.three > roster[i].attributes.three)
      .length
    const actualTotalGain = result.roster.reduce(
      (sum, p, i) => sum + (p.attributes.three - roster[i].attributes.three),
      0,
    )

    expect(result.successCount).toBe(actualSuccessCount)
    expect(result.totalGain).toBe(actualTotalGain)
    expect(result.totalPlayers).toBe(roster.length)
  })
})

describe('applyPracticeMatch', () => {
  it('returns a result with a win/loss outcome and updated roster', () => {
    const roster = createInitialRoster(1)
    const result = applyPracticeMatch(roster, 'medium', 7)
    expect(['win', 'loss']).toContain(result.outcome)
    expect(result.roster).toHaveLength(roster.length)
  })

  it('increases fatigue for every player (practice matches never net-recover)', () => {
    const roster = createInitialRoster(1)
    const result = applyPracticeMatch(roster, 'medium', 7)
    result.roster.forEach((player, index) => {
      expect(player.fatigue).toBeGreaterThan(roster[index].fatigue)
    })
  })

  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const a = applyPracticeMatch(roster, 'strong', 123)
    const b = applyPracticeMatch(roster, 'strong', 123)
    expect(a).toEqual(b)
  })

  it('caps fatigue at 100', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 95 }))
    const result = applyPracticeMatch(roster, 'strong', 7)
    result.roster.forEach((player) => {
      expect(player.fatigue).toBeLessThanOrEqual(100)
    })
  })

  it('grows the roster less on a loss than on a win, never more', () => {
    const strongRoster = withUniformAttributes(createInitialRoster(1), 95)
    const weakRoster = withUniformAttributes(createInitialRoster(1), 5)

    const winResult = applyPracticeMatch(strongRoster, 'weak', 1)
    const lossResult = applyPracticeMatch(weakRoster, 'strong', 1)

    expect(winResult.outcome).toBe('win')
    expect(lossResult.outcome).toBe('loss')

    const winGain = totalAttributeValue(winResult.roster) - totalAttributeValue(strongRoster)
    const lossGain = totalAttributeValue(lossResult.roster) - totalAttributeValue(weakRoster)

    expect(lossGain).toBeLessThan(winGain)
    expect(lossGain).toBeGreaterThanOrEqual(0)
  })

  it('still grants a little growth on a loss against a strong opponent (spec: 輸了成長少甚至小懲罰, not zero)', () => {
    const weakRoster = withUniformAttributes(createInitialRoster(1), 5)
    const lossResult = applyPracticeMatch(weakRoster, 'strong', 1)
    expect(lossResult.outcome).toBe('loss')

    const lossGain = totalAttributeValue(lossResult.roster) - totalAttributeValue(weakRoster)
    expect(lossGain).toBeGreaterThan(0)
  })
})

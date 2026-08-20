import { describe, expect, it } from 'vitest'
import {
  hasReachedInsuranceCap,
  INSURANCE_MAX_ERAS,
  isChampionRun,
  summarizeCareer,
} from '../career'
import type { SeasonRecord } from '../seasonSummary'

describe('isChampionRun', () => {
  it('is true only for a champion placement', () => {
    expect(isChampionRun('champion')).toBe(true)
    expect(isChampionRun('runnerUp')).toBe(false)
    expect(isChampionRun(null)).toBe(false)
  })
})

describe('hasReachedInsuranceCap', () => {
  it('is false below the cap and true at/above it', () => {
    expect(hasReachedInsuranceCap(INSURANCE_MAX_ERAS - 1)).toBe(false)
    expect(hasReachedInsuranceCap(INSURANCE_MAX_ERAS)).toBe(true)
    expect(hasReachedInsuranceCap(INSURANCE_MAX_ERAS + 1)).toBe(true)
  })
})

describe('summarizeCareer', () => {
  const records: SeasonRecord[] = [
    { year: 1, wins: 2, losses: 2, finalPhaseReached: 'qualifying', placement: null },
    { year: 2, wins: 4, losses: 1, finalPhaseReached: 'final4', placement: 'runnerUp' },
    { year: 3, wins: 5, losses: 2, finalPhaseReached: 'final4', placement: 'fourth' },
  ]

  it('totals wins and losses across every season', () => {
    const summary = summarizeCareer(records, 'insuranceCap')
    expect(summary.totalWins).toBe(11)
    expect(summary.totalLosses).toBe(5)
    expect(summary.totalSeasons).toBe(3)
  })

  it('picks the best final4 placement across seasons, ignoring seasons with none', () => {
    const summary = summarizeCareer(records, 'insuranceCap')
    expect(summary.bestPlacement).toBe('runnerUp')
  })

  it('reports null bestPlacement when no season ever reached final4', () => {
    const noFinal4: SeasonRecord[] = [
      { year: 1, wins: 1, losses: 3, finalPhaseReached: 'qualifying', placement: null },
    ]
    expect(summarizeCareer(noFinal4, 'insuranceCap').bestPlacement).toBeNull()
  })

  it('carries through the end reason', () => {
    expect(summarizeCareer(records, 'champion').reason).toBe('champion')
  })
})

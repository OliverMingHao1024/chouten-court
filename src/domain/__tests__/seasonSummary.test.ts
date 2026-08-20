import { describe, expect, it } from 'vitest'
import { createInitialRoster } from '../roster'
import { computeSeasonAwards, describeSeasonRecord, type SeasonRecord } from '../seasonSummary'
import type { AttributeSet, Player } from '../types'

function withAttributes(player: Player, overrides: Partial<AttributeSet>): Player {
  return { ...player, attributes: { ...player.attributes, ...overrides } }
}

describe('computeSeasonAwards', () => {
  it('gives each award to the player who leads that stat proxy', () => {
    const roster = createInitialRoster(1).map((p) => withAttributes(p, { shooting: 10, three: 10, rebound: 10, pass: 10, defense: 10 }))
    const scorer = withAttributes(roster[0], { shooting: 90, three: 90 })
    const rebounder = withAttributes(roster[1], { rebound: 95 })
    const passer = withAttributes(roster[2], { pass: 95 })
    const defender = withAttributes(roster[3], { defense: 95 })
    const tuned = [scorer, rebounder, passer, defender, ...roster.slice(4)]

    const awards = computeSeasonAwards(tuned)
    expect(awards.find((a) => a.title === '得分王')?.playerName).toBe(scorer.name)
    expect(awards.find((a) => a.title === '籃板王')?.playerName).toBe(rebounder.name)
    expect(awards.find((a) => a.title === '助攻王')?.playerName).toBe(passer.name)
    expect(awards.find((a) => a.title === '防守王')?.playerName).toBe(defender.name)
  })

  it('always returns exactly 4 awards', () => {
    const roster = createInitialRoster(1)
    expect(computeSeasonAwards(roster)).toHaveLength(4)
  })
})

describe('describeSeasonRecord', () => {
  it('mentions the phase and win/loss record', () => {
    const record: SeasonRecord = {
      year: 1,
      wins: 3,
      losses: 1,
      finalPhaseReached: 'qualifying',
      placement: null,
      reputationAfter: 44,
    }
    const text = describeSeasonRecord(record)
    expect(text).toContain('資格賽')
    expect(text).toContain('3勝1敗')
  })

  it('appends the final4 placement when present', () => {
    const record: SeasonRecord = {
      year: 1,
      wins: 5,
      losses: 1,
      finalPhaseReached: 'final4',
      placement: 'champion',
      reputationAfter: 70,
    }
    expect(describeSeasonRecord(record)).toContain('冠軍')
  })
})

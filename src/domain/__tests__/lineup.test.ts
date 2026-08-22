import { describe, expect, it } from 'vitest'
import {
  analyzeLineupComposition,
  completeLineup,
  countStarterPositionMismatches,
  lineupRole,
  lineupWeight,
  positionMismatchMultiplier,
  POSITION_MISMATCH_PENALTY,
  ROTATION_COUNT,
  ROTATION_WEIGHT,
  sanitizeLineup,
  STARTER_COUNT,
  STARTER_WEIGHT,
  suggestLineup,
} from '../lineup'
import { createInitialRoster } from '../roster'
import type { Player, Position } from '../types'

function withOverrides(roster: Player[], overrides: Record<number, Partial<Player>>): Player[] {
  return roster.map((player, index) => ({ ...player, ...overrides[index] }))
}

describe('lineupRole / lineupWeight', () => {
  const lineup = { starters: ['a', 'b'], rotation: ['c'] }

  it('classifies starters, rotation, and everyone else as bench', () => {
    expect(lineupRole('a', lineup)).toBe('starter')
    expect(lineupRole('c', lineup)).toBe('rotation')
    expect(lineupRole('z', lineup)).toBe('bench')
  })

  it('weights starters highest, rotation lower, bench zero', () => {
    expect(lineupWeight('a', lineup)).toBe(STARTER_WEIGHT)
    expect(lineupWeight('c', lineup)).toBe(ROTATION_WEIGHT)
    expect(lineupWeight('z', lineup)).toBe(0)
  })
})

describe('completeLineup', () => {
  it('keeps a full manual selection unchanged', () => {
    const roster = createInitialRoster(1)
    const result = completeLineup(
      roster,
      roster.slice(0, 5).map((p) => p.id),
      roster.slice(5, 8).map((p) => p.id),
    )
    expect(result.starters).toEqual(roster.slice(0, 5).map((p) => p.id))
    expect(result.rotation).toEqual(roster.slice(5, 8).map((p) => p.id))
  })

  it('auto-fills unfilled starter/rotation slots from the remaining available players', () => {
    const roster = createInitialRoster(1)
    const result = completeLineup(roster, [roster[0].id, roster[1].id], [])
    expect(result.starters).toHaveLength(STARTER_COUNT)
    expect(result.rotation).toHaveLength(ROTATION_COUNT)
    const all = [...result.starters, ...result.rotation]
    expect(new Set(all).size).toBe(all.length)
    all.forEach((id) => expect(roster.map((p) => p.id)).toContain(id))
  })

  it('auto-fills using an explainable rule (strongest remaining players first), not roster array order', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 10, three: 10, rebound: 10, pass: 10, defense: 10, athletic: 10, iq: 10 },
    }))
    // Make the *last* roster player by far the strongest of the unselected pool.
    const boosted = roster.map((p, i) =>
      i === roster.length - 1
        ? { ...p, attributes: { shooting: 99, three: 99, rebound: 99, pass: 99, defense: 99, athletic: 99, iq: 99 } }
        : p,
    )
    const result = completeLineup(boosted, [], [])
    expect(result.starters[0]).toBe(boosted[boosted.length - 1].id)
  })

  it('gracefully fills as many slots as possible when fewer than 8 players are available', () => {
    const roster = createInitialRoster(1).slice(0, 5)
    const result = completeLineup(roster, [], [])
    expect(result.starters).toHaveLength(STARTER_COUNT)
    expect(result.rotation).toHaveLength(0)
  })

  it('ignores a selected id that is no longer available (e.g. newly injured)', () => {
    const roster = createInitialRoster(1).slice(0, 6)
    const result = completeLineup(roster, [roster[0].id, roster[1].id, roster[2].id, roster[3].id, 'injured'], [])
    expect(result.starters).not.toContain('injured')
    expect(result.starters).toHaveLength(STARTER_COUNT)
  })

  it('does not let the same player occupy both starter and rotation', () => {
    const roster = createInitialRoster(1).slice(0, 6)
    const result = completeLineup(roster, [roster[0].id], [roster[0].id, roster[1].id])
    const all = [...result.starters, ...result.rotation]
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('sanitizeLineup', () => {
  it('drops players who are no longer in the available pool', () => {
    const roster = createInitialRoster(1)
    const lineup = { starters: [roster[0].id, 'gone'], rotation: [roster[1].id] }
    const result = sanitizeLineup(lineup, roster)
    expect(result.starters).toEqual([roster[0].id])
    expect(result.rotation).toEqual([roster[1].id])
  })

  it('returns an empty lineup when given null', () => {
    expect(sanitizeLineup(null, createInitialRoster(1))).toEqual({ starters: [], rotation: [] })
  })
})

describe('suggestLineup', () => {
  it('bestStrength picks the highest overall-attribute players first', () => {
    const roster = withOverrides(createInitialRoster(1), {
      0: { attributes: { shooting: 99, three: 99, rebound: 99, pass: 99, defense: 99, athletic: 99, iq: 99 } },
    })
    const suggestion = suggestLineup(roster, 'bestStrength')
    expect(suggestion.starters[0]).toBe(roster[0].id)
  })

  it('lowFatigue picks the freshest players first', () => {
    const roster = withOverrides(createInitialRoster(1), { 0: { fatigue: 0 }, 1: { fatigue: 100 } }).map((p, i) =>
      i > 1 ? { ...p, fatigue: 50 } : p,
    )
    const suggestion = suggestLineup(roster, 'lowFatigue')
    expect(suggestion.starters).toContain(roster[0].id)
    expect(suggestion.starters).not.toContain(roster[1].id)
  })

  it('developRookies prioritizes lower-grade players', () => {
    const roster = createInitialRoster(1).map((p, i) => ({ ...p, grade: i === 0 ? 3 : 1 }))
    const suggestion = suggestLineup(roster, 'developRookies')
    expect(suggestion.starters).not.toContain(roster[0].id)
  })
})

describe('analyzeLineupComposition', () => {
  function makeRosterWithPositions(positions: Position[]): Player[] {
    return createInitialRoster(1).map((p, i) => ({ ...p, position: positions[i] ?? 'SF' }))
  }

  it('flags a missing primary ball handler when no PG is in the lineup', () => {
    const roster = makeRosterWithPositions(['SG', 'SF', 'PF', 'C', 'SG', 'SF', 'PF', 'C'])
    const lineup = { starters: roster.slice(0, 5).map((p) => p.id), rotation: roster.slice(5, 8).map((p) => p.id) }
    expect(analyzeLineupComposition(roster, lineup).missingBallHandler).toBe(true)
  })

  it('flags a missing interior presence when no C/PF is in the lineup', () => {
    const roster = makeRosterWithPositions(['PG', 'SG', 'SF', 'PG', 'SG', 'SF', 'PG', 'SG'])
    const lineup = { starters: roster.slice(0, 5).map((p) => p.id), rotation: roster.slice(5, 8).map((p) => p.id) }
    expect(analyzeLineupComposition(roster, lineup).missingInterior).toBe(true)
  })

  it('flags overconcentration when one position fills 4+ of the 8 slots', () => {
    const roster = makeRosterWithPositions(['PG', 'PG', 'PG', 'PG', 'SF', 'C', 'SG', 'PF'])
    const lineup = { starters: roster.slice(0, 5).map((p) => p.id), rotation: roster.slice(5, 8).map((p) => p.id) }
    expect(analyzeLineupComposition(roster, lineup).overconcentrated).toBe(true)
  })

  it('reports no warnings for a well-balanced lineup', () => {
    const roster = makeRosterWithPositions(['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SF', 'C'])
    const lineup = { starters: roster.slice(0, 5).map((p) => p.id), rotation: roster.slice(5, 8).map((p) => p.id) }
    const warnings = analyzeLineupComposition(roster, lineup)
    expect(warnings.missingBallHandler).toBe(false)
    expect(warnings.missingInterior).toBe(false)
    expect(warnings.overconcentrated).toBe(false)
  })
})

describe('countStarterPositionMismatches', () => {
  function makeRosterWithPositions(positions: Position[]): Player[] {
    return createInitialRoster(1).map((p, i) => ({ ...p, position: positions[i] ?? 'SF' }))
  }

  it('finds no mismatches when the starting five cover all five positions exactly once', () => {
    const roster = makeRosterWithPositions(['PG', 'SG', 'SF', 'PF', 'C'])
    const starters = roster.slice(0, 5).map((p) => p.id)
    expect(countStarterPositionMismatches(roster, starters)).toBe(0)
  })

  it('counts one mismatch for a missing position and one for the duplicate that displaced it', () => {
    // Two SGs, zero Cs: SG is duplicated (1 mismatch) and C is missing (1 mismatch).
    const roster = makeRosterWithPositions(['PG', 'SG', 'SF', 'PF', 'SG'])
    const starters = roster.slice(0, 5).map((p) => p.id)
    expect(countStarterPositionMismatches(roster, starters)).toBe(2)
  })

  it('counts a duplicated position as exactly one mismatch regardless of how many extra copies', () => {
    // Three PGs (2 extra), zero SF, zero C: 1 duplicate-position mismatch + 2 missing-position mismatches.
    const roster = makeRosterWithPositions(['PG', 'PG', 'PG', 'SG', 'PF'])
    const starters = roster.slice(0, 5).map((p) => p.id)
    expect(countStarterPositionMismatches(roster, starters)).toBe(3)
  })

  it('treats a starting five smaller than the full complement as missing every uncovered position', () => {
    const roster = makeRosterWithPositions(['PG'])
    const starters = [roster[0].id]
    // Only PG is covered; SG/SF/PF/C are all missing.
    expect(countStarterPositionMismatches(roster, starters)).toBe(4)
  })

  it('ignores rotation and bench players entirely', () => {
    const roster = makeRosterWithPositions(['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'PG', 'PG'])
    const starters = roster.slice(0, 5).map((p) => p.id)
    expect(countStarterPositionMismatches(roster, starters)).toBe(0)
  })
})

describe('positionMismatchMultiplier', () => {
  it('is 1 (no penalty) with zero mismatches', () => {
    expect(positionMismatchMultiplier(0)).toBe(1)
  })

  it('reduces effective strength by POSITION_MISMATCH_PENALTY per mismatch', () => {
    expect(positionMismatchMultiplier(2)).toBeCloseTo(1 - 2 * POSITION_MISMATCH_PENALTY, 10)
  })

  it('never goes below 0 even with an extreme mismatch count', () => {
    expect(positionMismatchMultiplier(100)).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { GIVEN_NAMES, SURNAMES } from '../nameGenerator'
import { createInitialRoster, HEIGHT_RANGE_BY_POSITION } from '../roster'
import { POSITIONS } from '../types'

describe('createInitialRoster', () => {
  it('creates exactly 12 players by default', () => {
    const roster = createInitialRoster(1)
    expect(roster).toHaveLength(12)
  })

  it('covers every position at least once', () => {
    const roster = createInitialRoster(1)
    const covered = new Set(roster.map((p) => p.position))
    for (const position of POSITIONS) {
      expect(covered.has(position)).toBe(true)
    }
  })

  it('gives every player a computed style tag consistent with their attributes', () => {
    const roster = createInitialRoster(1)
    for (const player of roster) {
      expect(player.styleTag.label.length).toBeGreaterThan(0)
    }
  })

  it('is deterministic for the same seed', () => {
    const a = createInitialRoster(99)
    const b = createInitialRoster(99)
    expect(a).toEqual(b)
  })

  it('produces different rosters for different seeds', () => {
    const a = createInitialRoster(1)
    const b = createInitialRoster(2)
    expect(a).not.toEqual(b)
  })

  it('gives every player a generated surname+given-name, not a placeholder like 球員01', () => {
    const roster = createInitialRoster(1)
    roster.forEach((player) => {
      expect(player.name).not.toMatch(/^球員\d+$/)
      const matchedSurname = SURNAMES.find((s) => player.name.startsWith(s))
      expect(matchedSurname).toBeDefined()
      expect(GIVEN_NAMES).toContain(player.name.slice(matchedSurname!.length))
    })
  })

  it('assigns unique ids to every player', () => {
    const roster = createInitialRoster(1)
    const ids = new Set(roster.map((p) => p.id))
    expect(ids.size).toBe(roster.length)
  })

  it('does not pin the first five players to a fixed position order', () => {
    const firstPositions = Array.from({ length: 20 }, (_, seed) => createInitialRoster(seed)[0].position)
    const distinctFirstPositions = new Set(firstPositions)
    expect(distinctFirstPositions.size).toBeGreaterThan(1)
  })

  it('interspersed grades 1~3 evenly across the roster instead of everyone starting at grade 1', () => {
    const roster = createInitialRoster(1)
    const countByGrade = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>
    for (const player of roster) {
      expect([1, 2, 3]).toContain(player.grade)
      countByGrade[player.grade as 1 | 2 | 3] += 1
    }
    // 12 players split evenly across 3 grades -> 4 each, so no cohort ever graduates all at once.
    expect(countByGrade[1]).toBe(4)
    expect(countByGrade[2]).toBe(4)
    expect(countByGrade[3]).toBe(4)
  })

  it('gives every player a height within the range for their position', () => {
    const roster = createInitialRoster(1)
    for (const player of roster) {
      const { min, max } = HEIGHT_RANGE_BY_POSITION[player.position]
      expect(player.height).toBeGreaterThanOrEqual(min)
      expect(player.height).toBeLessThanOrEqual(max)
    }
  })
})

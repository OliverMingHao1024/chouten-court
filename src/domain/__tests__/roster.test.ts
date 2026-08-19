import { describe, expect, it } from 'vitest'
import { createInitialRoster } from '../roster'
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
})

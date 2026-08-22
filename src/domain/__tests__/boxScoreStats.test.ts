import { describe, expect, it } from 'vitest'
import { distributePlayerStats } from '../boxScoreStats'
import { STARTER_COUNT, ROTATION_COUNT, type GameLineup } from '../lineup'
import { createSeededRng } from '../rng'
import { createInitialRoster } from '../roster'
import type { Player } from '../types'

const roster = createInitialRoster(1)

function fullLineup(players: Player[]): GameLineup {
  return {
    starters: players.slice(0, STARTER_COUNT).map((p) => p.id),
    rotation: players.slice(STARTER_COUNT, STARTER_COUNT + ROTATION_COUNT).map((p) => p.id),
  }
}

describe('distributePlayerStats', () => {
  it('is deterministic for the same inputs', () => {
    const lineup = fullLineup(roster)
    const a = distributePlayerStats(70, roster, lineup, createSeededRng(1))
    const b = distributePlayerStats(70, roster, lineup, createSeededRng(1))
    expect(a).toEqual(b)
  })

  it('sums individual points to exactly the given team total', () => {
    const lineup = fullLineup(roster)
    for (let seed = 0; seed < 50; seed++) {
      const lines = distributePlayerStats(73, roster, lineup, createSeededRng(seed))
      const total = lines.reduce((sum, l) => sum + l.points, 0)
      expect(total).toBe(73)
    }
  })

  it('only includes players who are in the lineup (starters + rotation), not the bench', () => {
    const lineup = fullLineup(roster)
    const lines = distributePlayerStats(70, roster, lineup, createSeededRng(1))
    const onCourtIds = new Set([...lineup.starters, ...lineup.rotation])
    expect(lines).toHaveLength(onCourtIds.size)
    lines.forEach((line) => expect(onCourtIds.has(line.playerId)).toBe(true))
  })

  it('gives every on-court player non-negative rebounds and assists', () => {
    const lineup = fullLineup(roster)
    for (let seed = 0; seed < 50; seed++) {
      const lines = distributePlayerStats(70, roster, lineup, createSeededRng(seed))
      lines.forEach((line) => {
        expect(line.rebounds).toBeGreaterThanOrEqual(0)
        expect(line.assists).toBeGreaterThanOrEqual(0)
      })
    }
  })

  it('gives a starter a larger share of points than a rotation player, on average', () => {
    const lineup: GameLineup = { starters: [roster[0].id], rotation: [roster[1].id] }
    const uniformRoster = roster.map((p) =>
      p.id === roster[0].id || p.id === roster[1].id
        ? { ...p, attributes: { ...p.attributes, shooting: 70, three: 70 } }
        : p,
    )
    let starterTotal = 0
    let rotationTotal = 0
    const trials = 100
    for (let seed = 0; seed < trials; seed++) {
      const lines = distributePlayerStats(60, uniformRoster, lineup, createSeededRng(seed))
      starterTotal += lines.find((l) => l.playerId === roster[0].id)!.points
      rotationTotal += lines.find((l) => l.playerId === roster[1].id)!.points
    }
    expect(starterTotal).toBeGreaterThan(rotationTotal)
  })

  it('returns an empty list when nobody is in the lineup', () => {
    expect(distributePlayerStats(70, roster, { starters: [], rotation: [] }, createSeededRng(1))).toEqual([])
  })
})

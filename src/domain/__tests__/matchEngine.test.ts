import { describe, expect, it } from 'vitest'
import {
  advancePlayerWeek,
  applyFatigueDelta,
  clamp,
  computeMatchWinProbability,
  computeTeamStrength,
  computeWinProbability,
  rollForInjury,
  tickInjuryRecovery,
} from '../matchEngine'
import { createSeededRng } from '../rng'
import { createInitialRoster } from '../roster'
import type { Player } from '../types'
import type { GameLineup } from '../lineup'

describe('clamp', () => {
  it('keeps values within range and clips outliers', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('applyFatigueDelta', () => {
  it('adds load and subtracts the baseline recovery, clamped to [0,100]', () => {
    const roster = createInitialRoster(1)
    const player = { ...roster[0], fatigue: 50 }
    expect(applyFatigueDelta(player, 20).fatigue).toBe(60) // 50 + 20 - 10
    expect(applyFatigueDelta({ ...player, fatigue: 0 }, 0).fatigue).toBe(0)
    expect(applyFatigueDelta({ ...player, fatigue: 95 }, 30).fatigue).toBe(100)
  })
})

describe('computeTeamStrength', () => {
  it('averages every player attribute into a single number', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
    }))
    expect(computeTeamStrength(roster)).toBe(60)
  })

  it('excludes sidelined (minor/major) players from the average', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
    }))
    const withInjured = roster.map((p, i) => (i === 0 ? { ...p, injuryStatus: 'major' as const, attributes: { ...p.attributes, shooting: 0 } } : p))
    expect(computeTeamStrength(withInjured)).toBe(60)
  })

  it('applies the returning-player attribute discount instead of excluding them', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
    }))
    const withReturning = roster.map((p, i) => (i === 0 ? { ...p, injuryStatus: 'returning' as const } : p))
    expect(computeTeamStrength(withReturning)).toBeLessThan(60)
    expect(computeTeamStrength(withReturning)).toBeCloseTo(60 - (60 * 0.2) / roster.length, 5)
  })

  it('reduces effective strength for a fatigued player relative to a fresh one', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
    }))
    const fresh = computeTeamStrength(roster)
    const withFatigue = roster.map((p, i) => (i === 0 ? { ...p, fatigue: 100 } : p))
    expect(computeTeamStrength(withFatigue)).toBeLessThan(fresh)
  })

  it('falls back to the full roster if every player is sidelined', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
      injuryStatus: 'major' as const,
    }))
    expect(computeTeamStrength(roster)).toBe(60)
  })

  it('excludes bench players and weights starters above rotation when a lineup is given', () => {
    const roster = createInitialRoster(1).map((p, i) => ({
      ...p,
      attributes: { shooting: 0, three: 0, rebound: 0, pass: 0, defense: 0, athletic: 0, iq: i === 0 ? 90 : 0 },
    }))
    // Only player 0 (the one with a non-zero attribute) is in the lineup, as a starter.
    const lineup: GameLineup = { starters: [roster[0].id], rotation: [] }
    expect(computeTeamStrength(roster, undefined, lineup)).toBeCloseTo(90 / 7, 5)
  })

  it('gives a starter more influence than a rotation player at the same attributes', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
    }))
    const boosted = roster.map((p, i) =>
      i === 0 ? { ...p, attributes: { ...p.attributes, iq: 99 } } : p,
    )
    const asStarter: GameLineup = { starters: [boosted[0].id, boosted[1].id], rotation: [boosted[2].id] }
    const asRotation: GameLineup = { starters: [boosted[1].id, boosted[2].id], rotation: [boosted[0].id] }
    expect(computeTeamStrength(boosted, undefined, asStarter)).toBeGreaterThan(
      computeTeamStrength(boosted, undefined, asRotation),
    )
  })

  it('falls back to an unweighted average when the lineup has no recognized players', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
    }))
    const emptyLineup: GameLineup = { starters: [], rotation: [] }
    expect(computeTeamStrength(roster, undefined, emptyLineup)).toBe(60)
  })
})

describe('rollForInjury', () => {
  it('never re-injures an already-sidelined player', () => {
    const roster = createInitialRoster(1)
    const sidelined: Player = { ...roster[0], injuryStatus: 'minor', injuryWeeksRemaining: 1, fatigue: 100 }
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRng(seed)
      expect(rollForInjury(sidelined, rng).injuryStatus).toBe('minor')
    }
  })

  it('can injure a healthy player at high fatigue over enough rolls, resetting fatigue to 0 on minor injury', () => {
    const roster = createInitialRoster(1)
    const player: Player = { ...roster[0], fatigue: 100 }
    let sawMinor = false
    let sawMajor = false
    for (let seed = 0; seed < 500 && !(sawMinor && sawMajor); seed++) {
      const rng = createSeededRng(seed)
      const result = rollForInjury(player, rng)
      if (result.injuryStatus === 'minor') {
        sawMinor = true
        expect(result.fatigue).toBe(0)
        expect(result.injuryWeeksRemaining).toBeGreaterThan(0)
      }
      if (result.injuryStatus === 'major') {
        sawMajor = true
        expect(result.injuryWeeksRemaining).toBeGreaterThan(0)
      }
    }
    expect(sawMinor).toBe(true)
    expect(sawMajor).toBe(true)
  })

  it('respects a custom major-injury duration range', () => {
    const roster = createInitialRoster(1)
    const player: Player = { ...roster[0], fatigue: 100 }
    const range = { min: 6, max: 9 }
    for (let seed = 0; seed < 500; seed++) {
      const result = rollForInjury(player, createSeededRng(seed), range)
      if (result.injuryStatus === 'major') {
        expect(result.injuryWeeksRemaining).toBeGreaterThanOrEqual(range.min)
        expect(result.injuryWeeksRemaining).toBeLessThanOrEqual(range.max)
      }
    }
  })

  it('injures a fragile personality more often than a non-fragile one at the same fatigue', () => {
    const roster = createInitialRoster(1)
    const fragile: Player = { ...roster[0], fatigue: 50, personality: 'fragile' }
    const steady: Player = { ...roster[0], fatigue: 50, personality: 'steady' }

    const injuryCount = (player: Player) => {
      let count = 0
      for (let seed = 0; seed < 300; seed++) {
        if (rollForInjury(player, createSeededRng(seed)).injuryStatus !== 'healthy') count += 1
      }
      return count
    }

    expect(injuryCount(fragile)).toBeGreaterThan(injuryCount(steady))
  })
})

describe('tickInjuryRecovery', () => {
  it('leaves a healthy player untouched', () => {
    const roster = createInitialRoster(1)
    const rng = createSeededRng(1)
    expect(tickInjuryRecovery(roster[0], rng)).toEqual(roster[0])
  })

  it('counts down and recovers a minor injury to healthy', () => {
    const roster = createInitialRoster(1)
    const rng = createSeededRng(1)
    const injured: Player = { ...roster[0], injuryStatus: 'minor', injuryWeeksRemaining: 2 }
    const afterOneWeek = tickInjuryRecovery(injured, rng)
    expect(afterOneWeek.injuryStatus).toBe('minor')
    expect(afterOneWeek.injuryWeeksRemaining).toBe(1)
    const afterTwoWeeks = tickInjuryRecovery(afterOneWeek, rng)
    expect(afterTwoWeeks.injuryStatus).toBe('healthy')
    expect(afterTwoWeeks.injuryWeeksRemaining).toBe(0)
  })

  it('moves a major injury into a returning period before going fully healthy', () => {
    const roster = createInitialRoster(1)
    const rng = createSeededRng(1)
    const injured: Player = { ...roster[0], injuryStatus: 'major', injuryWeeksRemaining: 1 }
    const afterSitOut = tickInjuryRecovery(injured, rng)
    expect(afterSitOut.injuryStatus).toBe('returning')
    expect(afterSitOut.injuryWeeksRemaining).toBeGreaterThan(0)

    let current = afterSitOut
    for (let i = 0; i < 10 && current.injuryStatus === 'returning'; i++) {
      current = tickInjuryRecovery(current, rng)
    }
    expect(current.injuryStatus).toBe('healthy')
  })
})

describe('advancePlayerWeek', () => {
  it('ignores load and does not roll for a new injury for a sidelined player', () => {
    const roster = createInitialRoster(1)
    const sidelined: Player = { ...roster[0], injuryStatus: 'minor', injuryWeeksRemaining: 3, fatigue: 50 }
    const rng = createSeededRng(1)
    const result = advancePlayerWeek(sidelined, 30, rng, true)
    expect(result.fatigue).toBeLessThan(50) // only natural recovery (load=0), no match load applied
    expect(result.injuryStatus).toBe('minor')
    expect(result.injuryWeeksRemaining).toBe(2)
  })

  it('never rolls for injury on a non-match (training) week', () => {
    const roster = createInitialRoster(1)
    const player: Player = { ...roster[0], fatigue: 100 }
    for (let seed = 0; seed < 200; seed++) {
      const result = advancePlayerWeek(player, 20, createSeededRng(seed), false)
      expect(result.injuryStatus).toBe('healthy')
    }
  })
})

describe('computeMatchWinProbability', () => {
  it('gives a wider outcome spread for an all-scorer roster than an all-steady roster at the same strength', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 70, three: 70, rebound: 70, pass: 70, defense: 70, athletic: 70, iq: 70 },
    }))
    const scorerRoster = roster.map((p) => ({ ...p, personality: 'scorer' as const }))
    const steadyRoster = roster.map((p) => ({ ...p, personality: 'steady' as const }))

    const winProbabilities = (players: Player[]) =>
      Array.from({ length: 200 }, (_, seed) => computeMatchWinProbability(players, 70, createSeededRng(seed)))

    const spread = (values: number[]) => Math.max(...values) - Math.min(...values)
    expect(spread(winProbabilities(scorerRoster))).toBeGreaterThan(spread(winProbabilities(steadyRoster)))
  })

  it('still centers around 0.5 when team and opponent strength are equal, on average', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 70, three: 70, rebound: 70, pass: 70, defense: 70, athletic: 70, iq: 70 },
    }))
    const samples = Array.from({ length: 500 }, (_, seed) =>
      computeMatchWinProbability(roster, 70, createSeededRng(seed)),
    )
    const average = samples.reduce((sum, v) => sum + v, 0) / samples.length
    expect(average).toBeCloseTo(0.5, 1)
  })

  it('scopes the personality-driven variance to players actually in the lineup', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 70, three: 70, rebound: 70, pass: 70, defense: 70, athletic: 70, iq: 70 },
      personality: 'scorer' as const,
    }))
    // Bench everyone except one steady player: variance should match an all-steady team, not the scorer-heavy full roster.
    const mostlyBenched = roster.map((p, i) => (i === 0 ? { ...p, personality: 'steady' as const } : p))
    const lineup: GameLineup = { starters: [mostlyBenched[0].id], rotation: [] }

    const spread = (values: number[]) => Math.max(...values) - Math.min(...values)
    const withLineup = Array.from({ length: 200 }, (_, seed) =>
      computeMatchWinProbability(mostlyBenched, 70, createSeededRng(seed), undefined, lineup),
    )
    const wholeRosterOnBench = Array.from({ length: 200 }, (_, seed) =>
      computeMatchWinProbability(mostlyBenched, 70, createSeededRng(seed)),
    )
    expect(spread(withLineup)).toBeLessThan(spread(wholeRosterOnBench))
  })
})

describe('computeWinProbability', () => {
  it('returns 0.5 when team and opponent strength are equal', () => {
    expect(computeWinProbability(70, 70)).toBeCloseTo(0.5)
  })

  it('returns a higher probability when the team is stronger', () => {
    expect(computeWinProbability(90, 60)).toBeGreaterThan(0.5)
  })

  it('returns a lower probability when the team is weaker', () => {
    expect(computeWinProbability(50, 80)).toBeLessThan(0.5)
  })
})

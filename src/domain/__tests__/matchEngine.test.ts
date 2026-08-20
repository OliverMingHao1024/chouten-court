import { describe, expect, it } from 'vitest'
import {
  advancePlayerWeek,
  applyFatigueDelta,
  clamp,
  computeTeamStrength,
  computeWinProbability,
  rollForInjury,
  tickInjuryRecovery,
} from '../matchEngine'
import { createSeededRng } from '../rng'
import { createInitialRoster } from '../roster'
import type { Player } from '../types'

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

  it('falls back to the full roster if every player is sidelined', () => {
    const roster = createInitialRoster(1).map((p) => ({
      ...p,
      attributes: { shooting: 60, three: 60, rebound: 60, pass: 60, defense: 60, athletic: 60, iq: 60 },
      injuryStatus: 'major' as const,
    }))
    expect(computeTeamStrength(roster)).toBe(60)
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

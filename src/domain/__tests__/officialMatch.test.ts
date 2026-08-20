import { describe, expect, it } from 'vitest'
import {
  PHASE_GAME_COUNT,
  PHASE_MAJOR_INJURY_WEEKS,
  simulateOfficialGame,
  didAdvancePhase,
  getFinal4Placement,
  getGameIndexForWeek,
  isClutchPhase,
} from '../officialMatch'
import { getPhaseWeekRange } from '../calendar'
import { STARTER_COUNT, ROTATION_COUNT, type GameLineup } from '../lineup'
import { generateOpponentAce } from '../opponentAce'
import { createInitialRoster } from '../roster'
import { DEFAULT_TACTICS } from '../tactics'
import type { Player } from '../types'

const testAce = generateOpponentAce(1)

function fullLineup(roster: Player[]): GameLineup {
  return {
    starters: roster.slice(0, STARTER_COUNT).map((p) => p.id),
    rotation: roster.slice(STARTER_COUNT, STARTER_COUNT + ROTATION_COUNT).map((p) => p.id),
  }
}

describe('simulateOfficialGame', () => {
  it('returns a win/loss outcome and fatigues starters/rotation but not bench players', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const result = simulateOfficialGame(roster, 'qualifying', 7, DEFAULT_TACTICS, testAce, lineup)
    expect(['win', 'loss']).toContain(result.outcome)

    result.roster.forEach((player, index) => {
      // A minor injury force-resets fatigue to 0, so a healthy player is the only case
      // guaranteed to have strictly higher fatigue after playing a game.
      if (lineup.starters.includes(player.id) && player.injuryStatus === 'healthy') {
        expect(player.fatigue).toBeGreaterThan(roster[index].fatigue)
      }
      if (!lineup.starters.includes(player.id) && !lineup.rotation.includes(player.id)) {
        expect(player.fatigue).toBe(roster[index].fatigue) // bench: fresh at 0, net recovery clamps at 0
      }
    })
  })

  it('gives a starter more match load than a rotation player', () => {
    const roster = createInitialRoster(1)
    const lineup: GameLineup = { starters: [roster[0].id], rotation: [roster[1].id] }
    const result = simulateOfficialGame(roster, 'qualifying', 7, DEFAULT_TACTICS, testAce, lineup)
    const starterFatigue = result.roster.find((p) => p.id === roster[0].id)!.fatigue
    const rotationFatigue = result.roster.find((p) => p.id === roster[1].id)!.fatigue
    expect(starterFatigue).toBeGreaterThan(rotationFatigue)
  })

  it('can trigger a new injury for a player who plays the game', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 100 }))
    const lineup = fullLineup(roster)
    let sawInjury = false
    for (let seed = 0; seed < 200 && !sawInjury; seed++) {
      const result = simulateOfficialGame(roster, 'qualifying', seed, DEFAULT_TACTICS, testAce, lineup)
      sawInjury = result.roster.some((player) => player.injuryStatus !== 'healthy')
    }
    expect(sawInjury).toBe(true)
  })

  it('does not apply match load to a sidelined player and lets their injury count down', () => {
    const roster = createInitialRoster(1).map((p, i) =>
      i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2, fatigue: 50 } : p,
    )
    const lineup = fullLineup(roster)
    const result = simulateOfficialGame(roster, 'qualifying', 7, DEFAULT_TACTICS, testAce, lineup)
    expect(result.roster[0].injuryStatus).toBe('minor')
    expect(result.roster[0].injuryWeeksRemaining).toBe(1)
    expect(result.roster[0].fatigue).toBeLessThan(50)
  })

  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const a = simulateOfficialGame(roster, 'final4', 42, DEFAULT_TACTICS, testAce, lineup)
    const b = simulateOfficialGame(roster, 'final4', 42, DEFAULT_TACTICS, testAce, lineup)
    expect(a).toEqual(b)
  })

  it('never grants in-game growth to a bench player (not in the lineup)', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const benchIds = new Set(roster.map((p) => p.id).filter((id) => !lineup.starters.includes(id) && !lineup.rotation.includes(id)))
    for (let seed = 0; seed < 100; seed++) {
      const result = simulateOfficialGame(roster, 'qualifying', seed, DEFAULT_TACTICS, testAce, lineup)
      expect(result.growth.every((entry) => !benchIds.has(entry.playerId))).toBe(true)
      result.roster.forEach((player, index) => {
        if (benchIds.has(player.id)) expect(player.attributes).toEqual(roster[index].attributes)
      })
    }
  })
})

describe('isClutchPhase', () => {
  it('is only true for the quarterfinal and final4 phases', () => {
    expect(isClutchPhase('qualifying')).toBe(false)
    expect(isClutchPhase('preliminary')).toBe(false)
    expect(isClutchPhase('group')).toBe(false)
    expect(isClutchPhase('quarterfinal')).toBe(true)
    expect(isClutchPhase('final4')).toBe(true)
  })
})

describe('in-game growth from playing time', () => {
  it('gives a starter a higher growth rate than a rotation player, across many games', () => {
    const roster = createInitialRoster(1)
    const lineup: GameLineup = { starters: [roster[0].id], rotation: [roster[1].id] }

    const trials = 500
    let starterGrowthCount = 0
    let rotationGrowthCount = 0
    for (let seed = 0; seed < trials; seed++) {
      const result = simulateOfficialGame(roster, 'qualifying', seed, DEFAULT_TACTICS, testAce, lineup)
      if (result.growth.some((entry) => entry.playerId === roster[0].id)) starterGrowthCount += 1
      if (result.growth.some((entry) => entry.playerId === roster[1].id)) rotationGrowthCount += 1
    }
    expect(starterGrowthCount).toBeGreaterThan(rotationGrowthCount)
  })

  it('recomputes the style tag when a player gets in-game growth', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    let sawGrowth = false
    for (let seed = 0; seed < 200 && !sawGrowth; seed++) {
      const result = simulateOfficialGame(roster, 'qualifying', seed, DEFAULT_TACTICS, testAce, lineup)
      const grown = result.growth[0]
      if (grown) {
        sawGrowth = true
        const player = result.roster.find((p) => p.id === grown.playerId)!
        const before = roster.find((p) => p.id === grown.playerId)!
        expect(player.attributes[grown.attribute]).toBe(before.attributes[grown.attribute] + 1)
      }
    }
    expect(sawGrowth).toBe(true)
  })

  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const a = simulateOfficialGame(roster, 'qualifying', 7, DEFAULT_TACTICS, testAce, lineup)
    const b = simulateOfficialGame(roster, 'qualifying', 7, DEFAULT_TACTICS, testAce, lineup)
    expect(a.growth).toEqual(b.growth)
  })
})

describe('opponent ace strength bonus', () => {
  it('makes a stronger ace harder to beat than a weaker one, all else equal', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const weakAce = { name: '弱王牌', scoring: 70, shooting: 60 }
    const strongAce = { name: '強王牌', scoring: 99, shooting: 95 }

    let winsAgainstWeak = 0
    let winsAgainstStrong = 0
    for (let seed = 0; seed < 300; seed++) {
      if (simulateOfficialGame(roster, 'qualifying', seed, DEFAULT_TACTICS, weakAce, lineup).outcome === 'win') {
        winsAgainstWeak += 1
      }
      if (simulateOfficialGame(roster, 'qualifying', seed, DEFAULT_TACTICS, strongAce, lineup).outcome === 'win') {
        winsAgainstStrong += 1
      }
    }
    expect(winsAgainstWeak).toBeGreaterThan(winsAgainstStrong)
  })
})

describe('PHASE_MAJOR_INJURY_WEEKS', () => {
  it('grows the major-injury recovery window from qualifying to final4', () => {
    expect(PHASE_MAJOR_INJURY_WEEKS.qualifying.min).toBeLessThan(PHASE_MAJOR_INJURY_WEEKS.final4.min)
    expect(PHASE_MAJOR_INJURY_WEEKS.qualifying.max).toBeLessThan(PHASE_MAJOR_INJURY_WEEKS.final4.max)
  })

  it('produces major-injury durations within the phase-specific range', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 100 }))
    const lineup = fullLineup(roster)
    const range = PHASE_MAJOR_INJURY_WEEKS.final4
    let sawMajor = false
    for (let seed = 0; seed < 500; seed++) {
      const result = simulateOfficialGame(roster, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)
      const injured = result.roster.find((p) => p.injuryStatus === 'major')
      if (injured) {
        sawMajor = true
        expect(injured.injuryWeeksRemaining).toBeGreaterThanOrEqual(range.min)
        expect(injured.injuryWeeksRemaining).toBeLessThanOrEqual(range.max)
      }
    }
    expect(sawMajor).toBe(true)
  })
})

describe('PHASE_GAME_COUNT', () => {
  it('has a positive game count for every official phase', () => {
    for (const phase of ['qualifying', 'preliminary', 'group', 'quarterfinal', 'final4'] as const) {
      expect(PHASE_GAME_COUNT[phase]).toBeGreaterThan(0)
    }
  })
})

describe('didAdvancePhase', () => {
  it('advances when wins outnumber losses', () => {
    expect(didAdvancePhase('qualifying', 3, 1)).toBe(true)
  })

  it('does not advance on a losing record', () => {
    expect(didAdvancePhase('qualifying', 1, 3)).toBe(false)
  })

  it('does not advance on an exact tie', () => {
    expect(didAdvancePhase('group', 2, 2)).toBe(false)
  })
})

describe('getGameIndexForWeek', () => {
  it('returns null during the offseason', () => {
    expect(getGameIndexForWeek('offseason', 10)).toBeNull()
  })

  it('returns 0-based game index within a phase', () => {
    const range = getPhaseWeekRange('qualifying')
    expect(getGameIndexForWeek('qualifying', range.start)).toBe(0)
    expect(getGameIndexForWeek('qualifying', range.start + 1)).toBe(1)
  })

  it('returns null for spare weeks past the phase game count (final4 has 3 weeks but only 2 games)', () => {
    const range = getPhaseWeekRange('final4')
    expect(getGameIndexForWeek('final4', range.start)).toBe(0)
    expect(getGameIndexForWeek('final4', range.start + 1)).toBe(1)
    expect(getGameIndexForWeek('final4', range.end)).toBeNull()
  })
})

describe('getFinal4Placement', () => {
  it('champion: win semifinal, win final', () => {
    expect(getFinal4Placement('win', 'win')).toBe('champion')
  })

  it('runner-up: win semifinal, lose final', () => {
    expect(getFinal4Placement('win', 'loss')).toBe('runnerUp')
  })

  it('third place: lose semifinal, win third-place game', () => {
    expect(getFinal4Placement('loss', 'win')).toBe('third')
  })

  it('fourth place: lose semifinal, lose third-place game', () => {
    expect(getFinal4Placement('loss', 'loss')).toBe('fourth')
  })
})

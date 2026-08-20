import { describe, expect, it } from 'vitest'
import {
  PHASE_GAME_COUNT,
  simulateOfficialGame,
  didAdvancePhase,
  getFinal4Placement,
  getGameIndexForWeek,
} from '../officialMatch'
import { getPhaseWeekRange } from '../calendar'
import { createInitialRoster } from '../roster'

describe('simulateOfficialGame', () => {
  it('returns a win/loss outcome and a fatigued roster', () => {
    const roster = createInitialRoster(1)
    const result = simulateOfficialGame(roster, 'qualifying', 7)
    expect(['win', 'loss']).toContain(result.outcome)
    result.roster.forEach((player, index) => {
      // A minor injury force-resets fatigue to 0, so a healthy player is the only case
      // guaranteed to have strictly higher fatigue after playing a game.
      if (player.injuryStatus === 'healthy') {
        expect(player.fatigue).toBeGreaterThan(roster[index].fatigue)
      }
    })
  })

  it('can trigger a new injury for a player who plays the game', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 100 }))
    let sawInjury = false
    for (let seed = 0; seed < 200 && !sawInjury; seed++) {
      const result = simulateOfficialGame(roster, 'qualifying', seed)
      sawInjury = result.roster.some((player) => player.injuryStatus !== 'healthy')
    }
    expect(sawInjury).toBe(true)
  })

  it('does not apply match load to a sidelined player and lets their injury count down', () => {
    const roster = createInitialRoster(1).map((p, i) =>
      i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2, fatigue: 50 } : p,
    )
    const result = simulateOfficialGame(roster, 'qualifying', 7)
    expect(result.roster[0].injuryStatus).toBe('minor')
    expect(result.roster[0].injuryWeeksRemaining).toBe(1)
    expect(result.roster[0].fatigue).toBeLessThan(50)
  })

  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const a = simulateOfficialGame(roster, 'final4', 42)
    const b = simulateOfficialGame(roster, 'final4', 42)
    expect(a).toEqual(b)
  })

  it('does not grant attribute growth (official games are not training)', () => {
    const roster = createInitialRoster(1)
    const result = simulateOfficialGame(roster, 'qualifying', 7)
    result.roster.forEach((player, index) => {
      expect(player.attributes).toEqual(roster[index].attributes)
    })
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

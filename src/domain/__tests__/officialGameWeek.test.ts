import { beforeEach, describe, expect, it } from 'vitest'
import { hasReachedShortChallengeMilestone, INSURANCE_MAX_ERAS, SHORT_CHALLENGE_ERAS } from '../career'
import { ROTATION_COUNT, STARTER_COUNT, type GameLineup } from '../lineup'
import {
  describeGameGrowth,
  describeNewInjuries,
  resolveOfficialGameWeek,
  type OfficialGameWeekState,
} from '../officialGameWeek'
import { getPhaseWeekRange } from '../calendar'
import { simulateOfficialGame } from '../officialMatch'
import { loadSchoolHistory } from '../schoolHistory'
import { createInitialRoster } from '../roster'
import { DEFAULT_TACTICS } from '../tactics'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'

const testAce = { name: '測試王牌', scoring: 70, shooting: 60 }

function fullLineup(roster: Player[]): GameLineup {
  return {
    starters: roster.slice(0, STARTER_COUNT).map((p) => p.id),
    rotation: roster.slice(STARTER_COUNT, STARTER_COUNT + ROTATION_COUNT).map((p) => p.id),
  }
}

function baseState(overrides: Partial<OfficialGameWeekState> = {}): OfficialGameWeekState {
  return {
    totalWeek: getPhaseWeekRange('qualifying').start,
    players: createInitialRoster(1),
    seasonGameLog: [],
    reputation: 50,
    graduateLog: [],
    careerLog: [],
    eraCount: 0,
    schoolAssets: [],
    pendingSeasonSummary: null,
    challengeMode: 'long',
    pendingChallengeDecision: false,
    coachName: '山田',
    seed: 1,
    achievements: [],
    seasonHadInjury: false,
    ...overrides,
  }
}

describe('describeNewInjuries', () => {
  it('returns an empty string when nobody got newly injured', () => {
    const roster = createInitialRoster(1)
    expect(describeNewInjuries(roster, roster)).toBe('')
  })

  it('describes a player who newly became injured', () => {
    const before = createInitialRoster(1)
    const after = before.map((p, i) => (i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2 } : p))
    expect(describeNewInjuries(before, after)).toContain(before[0].name)
    expect(describeNewInjuries(before, after)).toContain('輕傷')
  })
})

describe('describeGameGrowth', () => {
  it('returns an empty string when nobody grew', () => {
    expect(describeGameGrowth(createInitialRoster(1), [])).toBe('')
  })

  it('names the player and attribute that grew', () => {
    const roster = createInitialRoster(1)
    expect(describeGameGrowth(roster, [{ playerId: roster[0].id, attribute: 'three' }])).toContain(roster[0].name)
  })
})

describe('resolveOfficialGameWeek', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('advances one week without ending the season when it is not the last game of the phase', () => {
    const state = baseState()
    const lineup = fullLineup(state.players)
    const gameResult = simulateOfficialGame(state.players, 'qualifying', 7, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)

    expect(resolved.nextTotalWeek).toBe(state.totalWeek + 1)
    expect(resolved.careerEnded).toBeNull()
    expect(resolved.pendingSeasonSummary).toBeNull()
    expect(resolved.recruitingCandidates).toBeNull()
    expect(resolved.seasonGameLog).toHaveLength(1)
  })

  it('describes a permanent injury aftereffect once a returning player fully recovers during the game week', () => {
    const state = baseState()
    const returningPlayer: Player = { ...state.players[0], injuryStatus: 'returning', injuryWeeksRemaining: 1 }
    const players = state.players.map((p, i) => (i === 0 ? returningPlayer : p))
    const lineup = fullLineup(players)

    let seed = 0
    let message = ''
    while (seed < 300) {
      const gameResult = simulateOfficialGame(players, 'qualifying', seed, DEFAULT_TACTICS, testAce, lineup)
      const resolved = resolveOfficialGameWeek({ ...state, players }, gameResult)
      if (resolved.message.includes('永久後遺症')) {
        message = resolved.message
        break
      }
      seed++
    }

    expect(message).toContain(returningPlayer.name)
    expect(message).toContain('永久後遺症')
  })

  it('ends the career and writes a champion entry to school history on a championship-winning season', () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1

    let seed = 0
    while (simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup).outcome !== 'win') seed++

    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
    })
    const gameResult = simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)

    expect(resolved.careerEnded).toBe('champion')
    expect(resolved.pendingSeasonSummary).not.toBeNull()
    const history = loadSchoolHistory()
    expect(history).toHaveLength(1)
    expect(history[0].reason).toBe('champion')
    expect(history[0].championRoster).not.toBeNull()
    expect(history[0].notableGraduates).toEqual([])
  })

  it('carries the most recent 5 graduate-log entries into the school history on a championship-winning season', () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1

    let seed = 0
    while (simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup).outcome !== 'win') seed++

    const graduateLog = Array.from({ length: 7 }, (_, i) => `畢業生 ${i} 的後日談。`)
    const state = baseState({
      totalWeek: finalWeek,
      players,
      graduateLog,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
    })
    const gameResult = simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)

    resolveOfficialGameWeek(state, gameResult)

    expect(loadSchoolHistory()[0].notableGraduates).toEqual(graduateLog.slice(-5))
  })

  it('advances graduation/recruiting and never writes school history when the career continues', () => {
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3 }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1
    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'loss' }],
    })
    const gameResult = simulateOfficialGame(players, 'final4', 1, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)

    expect(resolved.careerEnded).toBeNull()
    expect(resolved.recruitingCandidates).not.toBeNull()
    expect(resolved.eraCount).toBe(1)
    expect(loadSchoolHistory()).toHaveLength(0)
  })

  it('ends the career and writes an insuranceCap entry once eraCount reaches the cap', () => {
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3 }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1
    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'loss' }],
      eraCount: INSURANCE_MAX_ERAS - 1,
    })
    const gameResult = simulateOfficialGame(players, 'final4', 1, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)

    expect(resolved.careerEnded).toBe('insuranceCap')
    expect(resolved.recruitingCandidates).toBeNull()
    const history = loadSchoolHistory()
    expect(history).toHaveLength(1)
    expect(history[0].reason).toBe('insuranceCap')
    expect(history[0].championRoster).toBeNull()
  })

  it('flags pendingChallengeDecision once a 短局 run first crosses the milestone, not on every later season', () => {
    // Interleaved grades (not all grade 3) so the roster survives graduation across two seasons.
    const players = createInitialRoster(1)
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1
    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'loss' }],
      eraCount: SHORT_CHALLENGE_ERAS - 1,
      challengeMode: 'short',
    })
    const gameResult = simulateOfficialGame(players, 'final4', 1, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)
    expect(hasReachedShortChallengeMilestone(resolved.eraCount)).toBe(true)
    expect(resolved.pendingChallengeDecision).toBe(true)

    // once already pending (or already past the milestone), it does not re-flag every future season
    const secondState = baseState({
      ...state,
      players: resolved.players,
      eraCount: resolved.eraCount,
      pendingChallengeDecision: true,
    })
    const secondGameResult = simulateOfficialGame(
      resolved.players,
      'final4',
      2,
      DEFAULT_TACTICS,
      testAce,
      fullLineup(resolved.players),
    )
    const secondResolved = resolveOfficialGameWeek(secondState, secondGameResult)
    expect(secondResolved.pendingChallengeDecision).toBe(true)
  })

  it('appends a school-asset unlock message when reputation crosses a threshold this season', () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1

    let seed = 0
    while (simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup).outcome !== 'win') seed++

    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
      reputation: 55,
    })
    const gameResult = simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)
    expect(resolved.schoolAssets).toContain('scoutingNetwork')
    expect(resolved.message).toContain('永久解鎖學校資產')
  })

  it('unlocks the undefeated-season achievement when a season ends with zero losses', () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1

    let seed = 0
    while (simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup).outcome !== 'win') seed++

    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
    })
    const gameResult = simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)
    expect(resolved.achievements).toContain('undefeatedSeason')
    expect(resolved.message).toContain('解鎖成就')
    expect(resolved.message).toContain('全勝賽季')
  })

  it('unlocks the zero-injury-season achievement when nobody got newly injured all season', () => {
    const players = createInitialRoster(1)
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1

    let seed = 0
    let resolved: ReturnType<typeof resolveOfficialGameWeek> | null = null
    while (seed < 200) {
      const gameResult = simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)
      const state = baseState({
        totalWeek: finalWeek,
        players,
        seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
      })
      const candidate = resolveOfficialGameWeek(state, gameResult)
      if (candidate.achievements.includes('zeroInjurySeason')) {
        resolved = candidate
        break
      }
      seed++
    }

    expect(resolved).not.toBeNull()
    expect(resolved!.achievements).toContain('zeroInjurySeason')
  })

  it('does not unlock the zero-injury-season achievement if an earlier week this season had an injury', () => {
    const players = createInitialRoster(1)
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1
    const gameResult = simulateOfficialGame(players, 'final4', 0, DEFAULT_TACTICS, testAce, lineup)
    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
      seasonHadInjury: true,
    })

    const resolved = resolveOfficialGameWeek(state, gameResult)
    expect(resolved.achievements).not.toContain('zeroInjurySeason')
  })

  it('unlocks the back-to-back-final8 achievement when two consecutive seasons both reach quarterfinal or later', () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1

    let seed = 0
    while (simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup).outcome !== 'win') seed++

    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
      careerLog: [
        { year: 1, wins: 5, losses: 1, finalPhaseReached: 'quarterfinal', placement: null, reputationAfter: 55 },
      ],
    })
    const gameResult = simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)
    expect(resolved.achievements).toContain('backToBackFinal8')
  })

  it('does not re-append an achievement message once it is already unlocked', () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))
    const lineup = fullLineup(players)
    const finalWeek = getPhaseWeekRange('final4').start + 1

    let seed = 0
    while (simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup).outcome !== 'win') seed++

    const state = baseState({
      totalWeek: finalWeek,
      players,
      seasonGameLog: [{ totalWeek: finalWeek - 1, phase: 'final4', outcome: 'win' }],
      achievements: ['undefeatedSeason'],
      seasonHadInjury: true,
    })
    const gameResult = simulateOfficialGame(players, 'final4', seed, DEFAULT_TACTICS, testAce, lineup)

    const resolved = resolveOfficialGameWeek(state, gameResult)
    expect(resolved.achievements).toEqual(['undefeatedSeason'])
    expect(resolved.message).not.toContain('解鎖成就')
  })
})

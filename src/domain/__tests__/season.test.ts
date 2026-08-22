import { describe, expect, it } from 'vitest'
import { advanceSeasonWeek, type SeasonGameLogEntry } from '../season'
import { ROTATION_COUNT, STARTER_COUNT, type GameLineup } from '../lineup'
import type { OpponentAce } from '../opponentAce'
import { createInitialRoster } from '../roster'
import { DEFAULT_TACTICS } from '../tactics'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'
import { getPhaseWeekRange, WEEKS_PER_YEAR } from '../calendar'

// Weakest possible ace so it doesn't perturb the deterministic win/loss outcomes below,
// which were tuned against the plain PHASE_OPPONENT_STRENGTH value.
const testAce: OpponentAce = { name: '測試王牌', scoring: 70, shooting: 60 }

function withUniformAttributes(roster: Player[], value: number): Player[] {
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as AttributeSet
  return roster.map((player) => ({ ...player, attributes }))
}

function fullLineup(roster: Player[]): GameLineup {
  return {
    starters: roster.slice(0, STARTER_COUNT).map((p) => p.id),
    rotation: roster.slice(STARTER_COUNT, STARTER_COUNT + ROTATION_COUNT).map((p) => p.id),
  }
}

const strongRoster = withUniformAttributes(createInitialRoster(1), 99)
const weakRoster = withUniformAttributes(createInitialRoster(1), 1)
const strongLineup = fullLineup(strongRoster)
const weakLineup = fullLineup(weakRoster)

describe('advanceSeasonWeek', () => {
  it('advances one week and logs the game when it is not the last game of the phase', () => {
    const qualifyingStart = getPhaseWeekRange('qualifying').start
    const result = advanceSeasonWeek(strongRoster, qualifyingStart, [], 1, DEFAULT_TACTICS, testAce, strongLineup)

    expect(result.gameLogEntry.phase).toBe('qualifying')
    expect(result.gameLogEntry.outcome).toBe('win')
    expect(result.nextTotalWeek).toBe(qualifyingStart + 1)
    expect(result.seasonEnded).toBe(false)
    expect(result.finalPhaseReached).toBeNull()
    expect(result.placement).toBeNull()
    expect(result.boxScore.quarters).toHaveLength(4)
    expect(result.boxScore.final.us).toBeGreaterThan(result.boxScore.final.them)
  })

  it('lets the team continue into the next phase when it wins enough of the phase to advance', () => {
    const range = getPhaseWeekRange('qualifying')
    const lastGameWeek = range.end
    // 3 wins already logged (beats the > losses bar with the 4th game as another win)
    const gameLog: SeasonGameLogEntry[] = [
      { totalWeek: range.start, phase: 'qualifying', outcome: 'win' },
      { totalWeek: range.start + 1, phase: 'qualifying', outcome: 'win' },
      { totalWeek: range.start + 2, phase: 'qualifying', outcome: 'win' },
    ]
    const result = advanceSeasonWeek(strongRoster, lastGameWeek, gameLog, 1, DEFAULT_TACTICS, testAce, strongLineup)
    expect(result.gameLogEntry.outcome).toBe('win')
    expect(result.nextTotalWeek).toBe(lastGameWeek + 1)
    expect(result.message).toContain('晉級')
    expect(result.seasonEnded).toBe(false)
    expect(result.finalPhaseReached).toBeNull()
    expect(result.placement).toBeNull()
  })

  it('jumps straight to next year when eliminated at the end of a phase', () => {
    const range = getPhaseWeekRange('qualifying')
    const lastGameWeek = range.end
    const gameLog: SeasonGameLogEntry[] = [
      { totalWeek: range.start, phase: 'qualifying', outcome: 'loss' },
      { totalWeek: range.start + 1, phase: 'qualifying', outcome: 'loss' },
      { totalWeek: range.start + 2, phase: 'qualifying', outcome: 'loss' },
    ]
    const result = advanceSeasonWeek(weakRoster, lastGameWeek, gameLog, 1, DEFAULT_TACTICS, testAce, weakLineup)
    expect(result.gameLogEntry.outcome).toBe('loss')
    expect(result.nextTotalWeek).toBe(WEEKS_PER_YEAR + 1)
    expect(result.message).toContain('球季')
    expect(result.seasonEnded).toBe(true)
    expect(result.finalPhaseReached).toBe('qualifying')
    expect(result.placement).toBeNull()
  })

  it('crowns a champion when the team wins both final4 games', () => {
    const range = getPhaseWeekRange('final4')
    const semifinalWeek = range.start
    const finalWeek = range.start + 1

    const gameLog: SeasonGameLogEntry[] = [
      { totalWeek: semifinalWeek, phase: 'final4', outcome: 'win' },
    ]
    let seed = 1
    while (
      advanceSeasonWeek(strongRoster, finalWeek, gameLog, seed, DEFAULT_TACTICS, testAce, strongLineup).gameLogEntry.outcome !==
      'win'
    ) {
      seed++
    }
    const result = advanceSeasonWeek(strongRoster, finalWeek, gameLog, seed, DEFAULT_TACTICS, testAce, strongLineup)
    expect(result.gameLogEntry.outcome).toBe('win')
    expect(result.nextTotalWeek).toBe(WEEKS_PER_YEAR + 1)
    expect(result.message).toContain('冠軍')
    expect(result.seasonEnded).toBe(true)
    expect(result.finalPhaseReached).toBe('final4')
    expect(result.placement).toBe('champion')
  })

  it('lands on fourth place when the team loses both final4 games', () => {
    const range = getPhaseWeekRange('final4')
    const semifinalWeek = range.start
    const thirdPlaceWeek = range.start + 1

    const gameLog: SeasonGameLogEntry[] = [
      { totalWeek: semifinalWeek, phase: 'final4', outcome: 'loss' },
    ]
    const result = advanceSeasonWeek(weakRoster, thirdPlaceWeek, gameLog, 1, DEFAULT_TACTICS, testAce, weakLineup)
    expect(result.gameLogEntry.outcome).toBe('loss')
    expect(result.nextTotalWeek).toBe(WEEKS_PER_YEAR + 1)
    expect(result.message).toContain('殿軍')
    expect(result.seasonEnded).toBe(true)
    expect(result.finalPhaseReached).toBe('final4')
    expect(result.placement).toBe('fourth')
  })
})

import { describe, expect, it } from 'vitest'
import { advanceSeasonWeek, type SeasonGameLogEntry } from '../season'
import { ROTATION_COUNT, STARTER_COUNT, type GameLineup } from '../lineup'
import { simulateOfficialGame, type OfficialPhase } from '../officialMatch'
import type { OpponentAce } from '../opponentAce'
import { createInitialRoster } from '../roster'
import { DEFAULT_TACTICS } from '../tactics'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'
import { getCalendarPosition, getPhaseWeekRange, getSeasonPhase, WEEKS_PER_YEAR } from '../calendar'

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

/** advanceSeasonWeek 現在只接手「已經算好的比賽結果」,測試改用 simulateOfficialGame 先算好結果。 */
function playGame(
  roster: Player[],
  totalWeek: number,
  seed: number,
  lineup: GameLineup,
  ace: OpponentAce = testAce,
) {
  const phase = getSeasonPhase(getCalendarPosition(totalWeek).weekOfYear) as OfficialPhase
  return simulateOfficialGame(roster, phase, seed, DEFAULT_TACTICS, ace, lineup)
}

describe('advanceSeasonWeek', () => {
  it('advances one week and logs the game when it is not the last game of the phase', () => {
    const qualifyingStart = getPhaseWeekRange('qualifying').start
    const gameResult = playGame(strongRoster, qualifyingStart, 1, strongLineup)
    const result = advanceSeasonWeek(qualifyingStart, [], gameResult)

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
    const gameResult = playGame(strongRoster, lastGameWeek, 1, strongLineup)
    const result = advanceSeasonWeek(lastGameWeek, gameLog, gameResult)
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
    const gameResult = playGame(weakRoster, lastGameWeek, 1, weakLineup)
    const result = advanceSeasonWeek(lastGameWeek, gameLog, gameResult)
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
    while (playGame(strongRoster, finalWeek, seed, strongLineup).outcome !== 'win') {
      seed++
    }
    const result = advanceSeasonWeek(finalWeek, gameLog, playGame(strongRoster, finalWeek, seed, strongLineup))
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
    const gameResult = playGame(weakRoster, thirdPlaceWeek, 1, weakLineup)
    const result = advanceSeasonWeek(thirdPlaceWeek, gameLog, gameResult)
    expect(result.gameLogEntry.outcome).toBe('loss')
    expect(result.nextTotalWeek).toBe(WEEKS_PER_YEAR + 1)
    expect(result.message).toContain('殿軍')
    expect(result.seasonEnded).toBe(true)
    expect(result.finalPhaseReached).toBe('final4')
    expect(result.placement).toBe('fourth')
  })
})

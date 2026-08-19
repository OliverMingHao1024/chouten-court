import { describe, expect, it } from 'vitest'
import { advanceSeasonWeek, type SeasonGameLogEntry } from '../season'
import { createInitialRoster } from '../roster'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'
import { getPhaseWeekRange, WEEKS_PER_YEAR } from '../calendar'

function withUniformAttributes(roster: Player[], value: number): Player[] {
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as AttributeSet
  return roster.map((player) => ({ ...player, attributes }))
}

const strongRoster = withUniformAttributes(createInitialRoster(1), 99)
const weakRoster = withUniformAttributes(createInitialRoster(1), 1)

describe('advanceSeasonWeek', () => {
  it('advances one week and logs the game when it is not the last game of the phase', () => {
    const qualifyingStart = getPhaseWeekRange('qualifying').start
    const result = advanceSeasonWeek(strongRoster, qualifyingStart, [], 1)

    expect(result.gameLogEntry.phase).toBe('qualifying')
    expect(result.gameLogEntry.outcome).toBe('win')
    expect(result.nextTotalWeek).toBe(qualifyingStart + 1)
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
    const result = advanceSeasonWeek(strongRoster, lastGameWeek, gameLog, 1)
    expect(result.gameLogEntry.outcome).toBe('win')
    expect(result.nextTotalWeek).toBe(lastGameWeek + 1)
    expect(result.message).toContain('晉級')
  })

  it('jumps straight to next year when eliminated at the end of a phase', () => {
    const range = getPhaseWeekRange('qualifying')
    const lastGameWeek = range.end
    const gameLog: SeasonGameLogEntry[] = [
      { totalWeek: range.start, phase: 'qualifying', outcome: 'loss' },
      { totalWeek: range.start + 1, phase: 'qualifying', outcome: 'loss' },
      { totalWeek: range.start + 2, phase: 'qualifying', outcome: 'loss' },
    ]
    const result = advanceSeasonWeek(weakRoster, lastGameWeek, gameLog, 1)
    expect(result.gameLogEntry.outcome).toBe('loss')
    expect(result.nextTotalWeek).toBe(WEEKS_PER_YEAR + 1)
    expect(result.message).toContain('球季')
  })

  it('crowns a champion when the team wins both final4 games', () => {
    const range = getPhaseWeekRange('final4')
    const semifinalWeek = range.start
    const finalWeek = range.start + 1

    const gameLog: SeasonGameLogEntry[] = [
      { totalWeek: semifinalWeek, phase: 'final4', outcome: 'win' },
    ]
    const result = advanceSeasonWeek(strongRoster, finalWeek, gameLog, 1)
    expect(result.gameLogEntry.outcome).toBe('win')
    expect(result.nextTotalWeek).toBe(WEEKS_PER_YEAR + 1)
    expect(result.message).toContain('冠軍')
  })

  it('lands on fourth place when the team loses both final4 games', () => {
    const range = getPhaseWeekRange('final4')
    const semifinalWeek = range.start
    const thirdPlaceWeek = range.start + 1

    const gameLog: SeasonGameLogEntry[] = [
      { totalWeek: semifinalWeek, phase: 'final4', outcome: 'loss' },
    ]
    const result = advanceSeasonWeek(weakRoster, thirdPlaceWeek, gameLog, 1)
    expect(result.gameLogEntry.outcome).toBe('loss')
    expect(result.nextTotalWeek).toBe(WEEKS_PER_YEAR + 1)
    expect(result.message).toContain('殿軍')
  })
})

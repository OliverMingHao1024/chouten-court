import { getCalendarPosition, getSeasonPhase, PHASE_LABELS, WEEKS_PER_YEAR } from './calendar'
import {
  PHASE_GAME_COUNT,
  didAdvancePhase,
  getFinal4Placement,
  getGameIndexForWeek,
  simulateOfficialGame,
  type OfficialPhase,
} from './officialMatch'
import type { Player } from './types'

export interface SeasonGameLogEntry {
  totalWeek: number
  phase: OfficialPhase
  outcome: 'win' | 'loss'
}

export interface AdvanceSeasonWeekResult {
  roster: Player[]
  gameLogEntry: SeasonGameLogEntry
  nextTotalWeek: number
  message: string
}

const FINAL4_PLACEMENT_LABEL: Record<ReturnType<typeof getFinal4Placement>, string> = {
  champion: '冠軍',
  runnerUp: '亞軍',
  third: '季軍',
  fourth: '殿軍',
}

function nextYearStart(totalWeek: number): number {
  const { year } = getCalendarPosition(totalWeek)
  return year * WEEKS_PER_YEAR + 1
}

export function advanceSeasonWeek(
  roster: Player[],
  totalWeek: number,
  gameLog: SeasonGameLogEntry[],
  seed: number,
): AdvanceSeasonWeekResult {
  const { year, weekOfYear } = getCalendarPosition(totalWeek)
  const phase = getSeasonPhase(weekOfYear)
  if (phase === 'offseason') {
    throw new Error(`advanceSeasonWeek called on an offseason week (${weekOfYear})`)
  }
  const gameIndex = getGameIndexForWeek(phase, weekOfYear)
  if (gameIndex === null) {
    throw new Error(`week ${weekOfYear} has no official game scheduled in phase ${phase}`)
  }

  const { outcome, roster: fatiguedRoster } = simulateOfficialGame(roster, phase, seed)
  const gameLogEntry: SeasonGameLogEntry = { totalWeek, phase, outcome }

  const isLastGameOfPhase = gameIndex === PHASE_GAME_COUNT[phase] - 1

  if (!isLastGameOfPhase) {
    return {
      roster: fatiguedRoster,
      gameLogEntry,
      nextTotalWeek: totalWeek + 1,
      message: `${PHASE_LABELS[phase]} 第 ${gameIndex + 1} 戰:${outcome === 'win' ? '獲勝' : '落敗'}`,
    }
  }

  const phaseGames = gameLog
    .filter((entry) => entry.phase === phase && getCalendarPosition(entry.totalWeek).year === year)
    .concat(gameLogEntry)

  if (phase === 'final4') {
    const semifinal = phaseGames[0]?.outcome ?? outcome
    const placement = getFinal4Placement(semifinal, outcome)
    return {
      roster: fatiguedRoster,
      gameLogEntry,
      nextTotalWeek: nextYearStart(totalWeek),
      message: `球季結束——最終戰績:${FINAL4_PLACEMENT_LABEL[placement]}!`,
    }
  }

  const wins = phaseGames.filter((entry) => entry.outcome === 'win').length
  const losses = phaseGames.filter((entry) => entry.outcome === 'loss').length
  const advanced = didAdvancePhase(phase, wins, losses)

  return {
    roster: fatiguedRoster,
    gameLogEntry,
    nextTotalWeek: advanced ? totalWeek + 1 : nextYearStart(totalWeek),
    message: advanced
      ? `${PHASE_LABELS[phase]} 戰績 ${wins}勝${losses}敗,晉級下一階段!`
      : `${PHASE_LABELS[phase]} 戰績 ${wins}勝${losses}敗,球季提前結束。`,
  }
}

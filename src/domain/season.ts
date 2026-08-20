import { getCalendarPosition, getSeasonPhase, PHASE_LABELS, WEEKS_PER_YEAR } from './calendar'
import {
  PHASE_GAME_COUNT,
  didAdvancePhase,
  getFinal4Placement,
  getGameIndexForWeek,
  simulateOfficialGame,
  type Final4Placement,
  type GameGrowthEntry,
  type OfficialPhase,
} from './officialMatch'
import type { GameLineup } from './lineup'
import type { OpponentAce } from './opponentAce'
import type { GameTactics } from './tactics'
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
  /** true 代表本季已經結束(晉級失敗或四強賽打完),下週會進入新學年的非賽季。 */
  seasonEnded: boolean
  /** 本季最終打到的階段;只有 seasonEnded 為 true 時才會有值。 */
  finalPhaseReached: OfficialPhase | null
  /** 只有打進四強賽才會有名次,其他階段止步一律為 null。 */
  placement: Final4Placement | null
  /** 本場依出賽角色取得實戰成長的球員清單。 */
  growth: GameGrowthEntry[]
}

export const FINAL4_PLACEMENT_LABEL: Record<ReturnType<typeof getFinal4Placement>, string> = {
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
  tactics: GameTactics,
  opponentAce: OpponentAce,
  lineup: GameLineup,
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

  const { outcome, roster: fatiguedRoster, growth } = simulateOfficialGame(
    roster,
    phase,
    seed,
    tactics,
    opponentAce,
    lineup,
  )
  const gameLogEntry: SeasonGameLogEntry = { totalWeek, phase, outcome }

  const isLastGameOfPhase = gameIndex === PHASE_GAME_COUNT[phase] - 1

  if (!isLastGameOfPhase) {
    return {
      roster: fatiguedRoster,
      gameLogEntry,
      nextTotalWeek: totalWeek + 1,
      message: `${PHASE_LABELS[phase]} 第 ${gameIndex + 1} 戰:${outcome === 'win' ? '獲勝' : '落敗'}`,
      seasonEnded: false,
      finalPhaseReached: null,
      placement: null,
      growth,
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
      seasonEnded: true,
      finalPhaseReached: phase,
      placement,
      growth,
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
    seasonEnded: !advanced,
    finalPhaseReached: advanced ? null : phase,
    placement: null,
    growth,
  }
}

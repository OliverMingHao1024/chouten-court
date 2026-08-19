import { getPhaseWeekRange, type SeasonPhase } from './calendar'
import { applyFatigueDelta, computeTeamStrength, computeWinProbability } from './matchEngine'
import { createSeededRng } from './rng'
import type { Player } from './types'

export type OfficialPhase = Exclude<SeasonPhase, 'offseason'>

// 每階段我方視角要打的場次:資格賽/預賽/複賽/準決賽對應原始 HBL 分組單循環的場次數,
// 四強賽只算「我方會打到的場次」(準決賽 + 冠軍賽或季軍賽,不含另一半對戰組合)。
export const PHASE_GAME_COUNT: Record<OfficialPhase, number> = {
  qualifying: 4,
  preliminary: 4,
  group: 5,
  quarterfinal: 6,
  final4: 2,
}

// 對手強度隨階段遞增(原創配置,尚未依實際隊伍精細調校)。
export const PHASE_OPPONENT_STRENGTH: Record<OfficialPhase, number> = {
  qualifying: 55,
  preliminary: 62,
  group: 70,
  quarterfinal: 78,
  final4: 88,
}

const OFFICIAL_MATCH_LOAD = 20

/**
 * Which game (0-based) of the current phase falls on this week, or null if this
 * week has no official game scheduled (offseason, or a spare week past the phase's
 * game count, e.g. final4's 3rd week after both of the team's games are done).
 */
export function getGameIndexForWeek(phase: SeasonPhase, weekOfYear: number): number | null {
  if (phase === 'offseason') return null
  const range = getPhaseWeekRange(phase)
  const gameIndex = weekOfYear - range.start
  return gameIndex < PHASE_GAME_COUNT[phase] ? gameIndex : null
}

export interface OfficialGameResult {
  outcome: 'win' | 'loss'
  roster: Player[]
}

export function simulateOfficialGame(
  roster: Player[],
  phase: OfficialPhase,
  seed: number,
): OfficialGameResult {
  const rng = createSeededRng(seed)
  const teamStrength = computeTeamStrength(roster)
  const winProbability = computeWinProbability(teamStrength, PHASE_OPPONENT_STRENGTH[phase])
  const outcome: 'win' | 'loss' = rng() < winProbability ? 'win' : 'loss'
  const fatiguedRoster = roster.map((player) => applyFatigueDelta(player, OFFICIAL_MATCH_LOAD))
  return { outcome, roster: fatiguedRoster }
}

/**
 * 簡化版晉級判斷:同階段勝場數需嚴格多於敗場數才晉級。真實 HBL 依分組排名與其他
 * 27 校戰績決定名次,本遊戲不模擬其他學校,以勝率門檻近似晉級難度。
 */
export function didAdvancePhase(_phase: OfficialPhase, wins: number, losses: number): boolean {
  return wins > losses
}

export type Final4Placement = 'champion' | 'runnerUp' | 'third' | 'fourth'

export function getFinal4Placement(
  semifinal: 'win' | 'loss',
  secondGame: 'win' | 'loss',
): Final4Placement {
  if (semifinal === 'win') return secondGame === 'win' ? 'champion' : 'runnerUp'
  return secondGame === 'win' ? 'third' : 'fourth'
}

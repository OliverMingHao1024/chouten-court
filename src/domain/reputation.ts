import { clamp } from './matchEngine'
import type { Final4Placement, OfficialPhase } from './officialMatch'

export const REPUTATION_MIN = 0
export const REPUTATION_MAX = 100
export const INITIAL_REPUTATION = 50

// 依球季最終晉級到哪個階段調整聲望(原創數值,待調校):止步越早期扣越多,打進四強一定加分,
// 奪冠再加一筆額外獎勵。
const PHASE_ELIMINATION_DELTA: Record<OfficialPhase, number> = {
  qualifying: -6,
  preliminary: -2,
  group: 2,
  quarterfinal: 6,
  final4: 10,
}

const CHAMPION_BONUS = 10

export function computeSeasonReputationDelta(
  finalPhaseReached: OfficialPhase,
  placement: Final4Placement | null,
): number {
  const base = PHASE_ELIMINATION_DELTA[finalPhaseReached]
  if (finalPhaseReached === 'final4' && placement === 'champion') return base + CHAMPION_BONUS
  return base
}

export function applyReputationDelta(reputation: number, delta: number): number {
  return clamp(reputation + delta, REPUTATION_MIN, REPUTATION_MAX)
}

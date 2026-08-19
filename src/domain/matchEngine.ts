import type { Player } from './types'

export const FATIGUE_MIN = 0
export const FATIGUE_MAX = 100
export const ATTRIBUTE_MAX = 99
export const BASELINE_RECOVERY = 10

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function applyFatigueDelta(player: Player, load: number): Player {
  const fatigue = clamp(player.fatigue + load - BASELINE_RECOVERY, FATIGUE_MIN, FATIGUE_MAX)
  return { ...player, fatigue }
}

export function computeTeamStrength(roster: Player[]): number {
  return (
    roster.reduce((sum, player) => {
      const attrValues = Object.values(player.attributes)
      return sum + attrValues.reduce((s, v) => s + v, 0) / attrValues.length
    }, 0) / roster.length
  )
}

export function computeWinProbability(teamStrength: number, opponentStrength: number): number {
  return 1 / (1 + Math.exp(-(teamStrength - opponentStrength) / 10))
}

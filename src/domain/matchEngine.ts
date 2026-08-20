import type { Rng } from './rng'
import type { Player } from './types'

export const FATIGUE_MIN = 0
export const FATIGUE_MAX = 100
export const ATTRIBUTE_MAX = 99
export const BASELINE_RECOVERY = 10

// 受傷機率隨疲勞值線性上升(原創數值,待調校):疲勞 0 時約 2%,疲勞 100 時約 20%。
export const INJURY_BASE_PROBABILITY = 0.02
export const INJURY_FATIGUE_PROBABILITY_SCALE = 0.18
// 玻璃體質(fragile)個性受傷機率係數較高。
export const FRAGILE_INJURY_MULTIPLIER = 1.6
// 受傷後三成機率是重傷,其餘七成是輕傷。
export const MAJOR_INJURY_SHARE = 0.3
// 復出過渡期屬性打 8 折,僅影響比賽表現計算,不修改球員實際屬性數值。
export const RETURNING_ATTRIBUTE_MULTIPLIER = 0.8

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function applyFatigueDelta(player: Player, load: number): Player {
  const fatigue = clamp(player.fatigue + load - BASELINE_RECOVERY, FATIGUE_MIN, FATIGUE_MAX)
  return { ...player, fatigue }
}

function injuryProbability(player: Player): number {
  const base = INJURY_BASE_PROBABILITY + (player.fatigue / FATIGUE_MAX) * INJURY_FATIGUE_PROBABILITY_SCALE
  return player.personality === 'fragile' ? base * FRAGILE_INJURY_MULTIPLIER : base
}

/** 比賽結算時依當下疲勞值滾機率判定是否受傷;已經缺賽中的球員不會再被判定。 */
export function rollForInjury(player: Player, rng: Rng): Player {
  if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') return player
  if (rng() >= injuryProbability(player)) return player

  const isMajor = rng() < MAJOR_INJURY_SHARE
  if (isMajor) {
    return { ...player, injuryStatus: 'major', injuryWeeksRemaining: 4 + Math.floor(rng() * 4) }
  }
  return {
    ...player,
    injuryStatus: 'minor',
    injuryWeeksRemaining: 1 + Math.floor(rng() * 2),
    fatigue: FATIGUE_MIN,
  }
}

/** 每週結算傷勢倒數:輕傷/重傷期滿即可恢復(重傷先進入復出過渡期),與是否有比賽無關。 */
export function tickInjuryRecovery(player: Player, rng: Rng): Player {
  if (player.injuryStatus === 'healthy') return player

  const injuryWeeksRemaining = player.injuryWeeksRemaining - 1
  if (injuryWeeksRemaining > 0) return { ...player, injuryWeeksRemaining }

  if (player.injuryStatus === 'major') {
    return { ...player, injuryStatus: 'returning', injuryWeeksRemaining: 1 + Math.floor(rng() * 2) }
  }
  return { ...player, injuryStatus: 'healthy', injuryWeeksRemaining: 0 }
}

function effectiveAttributeAverage(player: Player): number {
  const attrValues = Object.values(player.attributes)
  const average = attrValues.reduce((s, v) => s + v, 0) / attrValues.length
  return player.injuryStatus === 'returning' ? average * RETURNING_ATTRIBUTE_MULTIPLIER : average
}

/**
 * 每週對單一球員套用該週負荷與傷勢處理:
 * - 缺賽中的球員(輕傷/重傷)不參與該週活動、不受負荷影響,只倒數傷勢。
 * - 復出過渡期球員照常參與並倒數過渡期剩餘週數。
 * - isMatchWeek 為 true(正式賽/練習賽)時,才會依當下疲勞值判定是否受傷;訓練週不會。
 */
export function advancePlayerWeek(player: Player, load: number, rng: Rng, isMatchWeek: boolean): Player {
  if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') {
    return applyFatigueDelta(tickInjuryRecovery(player, rng), 0)
  }
  const ticked = player.injuryStatus === 'returning' ? tickInjuryRecovery(player, rng) : player
  const fatigued = applyFatigueDelta(ticked, load)
  return isMatchWeek ? rollForInjury(fatigued, rng) : fatigued
}

export function computeTeamStrength(roster: Player[]): number {
  const available = roster.filter((player) => player.injuryStatus !== 'minor' && player.injuryStatus !== 'major')
  const pool = available.length > 0 ? available : roster
  return pool.reduce((sum, player) => sum + effectiveAttributeAverage(player), 0) / pool.length
}

export function computeWinProbability(teamStrength: number, opponentStrength: number): number {
  return 1 / (1 + Math.exp(-(teamStrength - opponentStrength) / 10))
}

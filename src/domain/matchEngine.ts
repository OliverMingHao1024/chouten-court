import { lineupWeight, type GameLineup } from './lineup'
import type { Rng } from './rng'
import type { AttributeKey, Player } from './types'

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
// 疲勞值影響比賽表現的係數(原創數值,待調校):疲勞 100 時戰力打 85 折。
export const FATIGUE_PERFORMANCE_PENALTY = 0.15
// 賽前預覽用的「高受傷風險」門檻(原創數值,待調校):僅作為警示用的簡單門檻,不對外
// 顯示精確機率,避免暗示比實際更精準的預測。
export const HIGH_FATIGUE_RISK_THRESHOLD = 70

export interface InjuryDurationRange {
  min: number
  max: number
}

// 重傷缺賽週數預設範圍(無賽制階段情境時使用,例如練習賽)。
export const DEFAULT_MAJOR_INJURY_WEEKS: InjuryDurationRange = { min: 4, max: 7 }

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
export function rollForInjury(
  player: Player,
  rng: Rng,
  majorInjuryWeeks: InjuryDurationRange = DEFAULT_MAJOR_INJURY_WEEKS,
): Player {
  if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') return player
  if (rng() >= injuryProbability(player)) return player

  const isMajor = rng() < MAJOR_INJURY_SHARE
  if (isMajor) {
    const { min, max } = majorInjuryWeeks
    return { ...player, injuryStatus: 'major', injuryWeeksRemaining: min + Math.floor(rng() * (max - min + 1)) }
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

export type AttributeWeights = Partial<Record<AttributeKey, number>>

function weightedAttributeAverage(attributes: Player['attributes'], weights?: AttributeWeights): number {
  let weightedSum = 0
  let weightTotal = 0
  for (const [key, value] of Object.entries(attributes) as [AttributeKey, number][]) {
    const weight = weights?.[key] ?? 1
    weightedSum += value * weight
    weightTotal += weight
  }
  return weightedSum / weightTotal
}

function effectiveAttributeAverage(player: Player, weights?: AttributeWeights): number {
  const average = weightedAttributeAverage(player.attributes, weights)
  const fatigueMultiplier = 1 - (player.fatigue / FATIGUE_MAX) * FATIGUE_PERFORMANCE_PENALTY
  const returningMultiplier = player.injuryStatus === 'returning' ? RETURNING_ATTRIBUTE_MULTIPLIER : 1
  return average * fatigueMultiplier * returningMultiplier
}

/**
 * 每週對單一球員套用該週負荷與傷勢處理:
 * - 缺賽中的球員(輕傷/重傷)不參與該週活動、不受負荷影響,只倒數傷勢。
 * - 復出過渡期球員照常參與並倒數過渡期剩餘週數。
 * - isMatchWeek 為 true(正式賽/練習賽)時,才會依當下疲勞值判定是否受傷;訓練週不會。
 */
export function advancePlayerWeek(
  player: Player,
  load: number,
  rng: Rng,
  isMatchWeek: boolean,
  majorInjuryWeeks: InjuryDurationRange = DEFAULT_MAJOR_INJURY_WEEKS,
): Player {
  if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') {
    return applyFatigueDelta(tickInjuryRecovery(player, rng), 0)
  }
  const ticked = player.injuryStatus === 'returning' ? tickInjuryRecovery(player, rng) : player
  const fatigued = applyFatigueDelta(ticked, load)
  return isMatchWeek ? rollForInjury(fatigued, rng, majorInjuryWeeks) : fatigued
}

/**
 * 隊伍戰力:未提供 lineup 時,對「可上場」球員(排除輕傷/重傷)做簡單平均,沿用練習賽等
 * 沒有先發/輪替概念的場合。提供 lineup 時,改依先發/輪替權重(先發6:輪替3:未上場0)
 * 做加權平均,未列入陣容的球員完全不計入戰力;若加權後總權重為 0(例如陣容剛好是空的),
 * 安全退回未加權平均,避免除以 0。
 */
export function computeTeamStrength(
  roster: Player[],
  attributeWeights?: AttributeWeights,
  lineup?: GameLineup,
): number {
  const available = roster.filter((player) => player.injuryStatus !== 'minor' && player.injuryStatus !== 'major')
  const pool = available.length > 0 ? available : roster

  if (lineup) {
    const weighted = pool.map((player) => ({ player, weight: lineupWeight(player.id, lineup) }))
    const totalWeight = weighted.reduce((sum, { weight }) => sum + weight, 0)
    if (totalWeight > 0) {
      return (
        weighted.reduce((sum, { player, weight }) => sum + effectiveAttributeAverage(player, attributeWeights) * weight, 0) /
        totalWeight
      )
    }
  }

  return pool.reduce((sum, player) => sum + effectiveAttributeAverage(player, attributeWeights), 0) / pool.length
}

export function computeWinProbability(teamStrength: number, opponentStrength: number): number {
  return 1 / (1 + Math.exp(-(teamStrength - opponentStrength) / 10))
}

// 個性影響單場表現波動範圍(原創數值,待調校):飆分型愈多、波動範圍愈大(高風險高上下限);
// 穩健型愈多、波動範圍愈小(表現穩定)。
const PERFORMANCE_VARIANCE_BASE = 4
const PERFORMANCE_VARIANCE_PERSONALITY_DELTA = 1.5
const PERFORMANCE_VARIANCE_MIN = 1

function computePerformanceVarianceRange(roster: Player[], lineup?: GameLineup): number {
  const available = roster.filter((player) => player.injuryStatus !== 'minor' && player.injuryStatus !== 'major')
  // 有陣容時,只計算實際上場(先發+輪替)的個性組成,未上場球員不影響場上表現波動。
  const pool = lineup ? available.filter((player) => lineupWeight(player.id, lineup) > 0) : available
  const scorerCount = pool.filter((player) => player.personality === 'scorer').length
  const steadyCount = pool.filter((player) => player.personality === 'steady').length
  const range =
    PERFORMANCE_VARIANCE_BASE + (scorerCount - steadyCount) * PERFORMANCE_VARIANCE_PERSONALITY_DELTA
  return Math.max(PERFORMANCE_VARIANCE_MIN, range)
}

/**
 * 單場比賽的勝率計算:先算出隊伍基礎戰力(含戰術權重、先發/輪替加權與疲勞/傷勢係數),
 * 再依實際上場名單的個性組成(穩健型低變異/飆分型高變異)疊加一次性隨機噪音,最後才餵進
 * 勝率曲線。噪音會消耗一次 rng(),呼叫方需固定呼叫順序才能維持「同種子可重現」。
 */
export function computeMatchWinProbability(
  roster: Player[],
  opponentStrength: number,
  rng: Rng,
  attributeWeights?: AttributeWeights,
  lineup?: GameLineup,
): number {
  const baseStrength = computeTeamStrength(roster, attributeWeights, lineup)
  const range = computePerformanceVarianceRange(roster, lineup)
  const noise = (rng() * 2 - 1) * range
  return computeWinProbability(baseStrength + noise, opponentStrength)
}

import { lineupWeight, type GameLineup } from './lineup'
import { hashSeed, type Rng } from './rng'
import type { SpecialAbilityKey } from './specialAbilities'
import type { AttributeKey, Player } from './types'

function hasAbility(player: Player, ability: SpecialAbilityKey): boolean {
  return player.specialAbilities.includes(ability)
}

export const FATIGUE_MIN = 0
export const FATIGUE_MAX = 100
export const ATTRIBUTE_MAX = 99
export const BASELINE_RECOVERY = 10
// 恢復能力的個別差異(原創數值,待調校):與受傷抗性(玻璃體質的高受傷機率)是各自獨立的概念,
// 差異幅度刻意壓低,不足以讓特定球員必然無法或必然適合擔任主力。由球員 id 雜湊決定,終身固定。
export const RECOVERY_INDIVIDUAL_VARIANCE = 2
// 年級造成的恢復差異(原創數值,待調校):低年級體力回復略快,高三略慢。
export const RECOVERY_GRADE_DELTA: Record<number, number> = { 1: 1, 2: 0, 3: -1 }
// 特殊能力「快速回復」的每週恢復量加成(原創數值,待調校)。
export const QUICK_RECOVERY_BONUS = 3

/**
 * 單一球員的每週體力恢復量:基準值疊加「終身固定、由 id 雜湊決定」的個人差異,再疊加年級
 * 差異與「快速回復」特殊能力加成。刻意不讓個性或傷勢狀態影響恢復速度,避免和玻璃體質既有的
 * 受傷機率效果混為一談。
 */
export function computeRecoveryRate(player: Player): number {
  const individual = (hashSeed(player.id) % (RECOVERY_INDIVIDUAL_VARIANCE * 2 + 1)) - RECOVERY_INDIVIDUAL_VARIANCE
  const gradeDelta = RECOVERY_GRADE_DELTA[player.grade] ?? 0
  const abilityBonus = hasAbility(player, 'quickRecovery') ? QUICK_RECOVERY_BONUS : 0
  return BASELINE_RECOVERY + individual + gradeDelta + abilityBonus
}

// 受傷機率隨疲勞值線性上升(原創數值,待調校):疲勞 0 時約 2%,疲勞 100 時約 20%。
export const INJURY_BASE_PROBABILITY = 0.02
export const INJURY_FATIGUE_PROBABILITY_SCALE = 0.18
// 玻璃體質(fragile)個性受傷機率係數較高。
export const FRAGILE_INJURY_MULTIPLIER = 1.6
// 特殊能力「玄鐵之軀」降低受傷機率(原創數值,待調校)。
export const IRON_BODY_INJURY_MULTIPLIER = 0.7
// 受傷後三成機率是重傷,其餘七成是輕傷。
export const MAJOR_INJURY_SHARE = 0.3
// 復出過渡期屬性打 8 折,僅影響比賽表現計算,不修改球員實際屬性數值。
export const RETURNING_ATTRIBUTE_MULTIPLIER = 0.8
// 疲勞值影響比賽表現的係數(原創數值,待調校):疲勞 100 時戰力打 85 折。
export const FATIGUE_PERFORMANCE_PENALTY = 0.15
// 賽前預覽用的「高受傷風險」門檻(原創數值,待調校):僅作為警示用的簡單門檻,不對外
// 顯示精確機率,避免暗示比實際更精準的預測。
export const HIGH_FATIGUE_RISK_THRESHOLD = 70
// 隊長型(captain)僅列為先發時提供小幅團隊有效戰力加成(原創數值,待調校);多名隊長同時
// 先發也不重複疊加,只取一次效果。
export const CAPTAIN_STRENGTH_BONUS = 3
// 特殊能力「隊魂領袖」「鎖喉夾擊」跟隊長型走同一種機制,但各自是獨立來源,可以同時疊加
// (原創數值,待調校)。
export const TEAM_SOUL_STRENGTH_BONUS = 3
export const CHOKE_HOLD_STRENGTH_BONUS = 3
// 抗壓型(clutch)僅在八強/四強階段生效,提高該球員的有效比賽表現;不修改永久屬性
// (原創數值,待調校)。
export const CLUTCH_PERFORMANCE_BONUS = 0.1

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
  const fatigue = clamp(player.fatigue + load - computeRecoveryRate(player), FATIGUE_MIN, FATIGUE_MAX)
  return { ...player, fatigue }
}

// 特殊能力「鋼鐵般的心臟」降低正式賽/練習賽的疲勞負荷(原創數值,待調校);只降低會增加疲勞
// 的正向負荷,不影響休養/訓練這類非比賽負荷,也不會讓負向負荷(恢復)被放大。
export const IRON_HEART_MATCH_LOAD_MULTIPLIER = 0.85

function applyIronHeartLoadReduction(player: Player, load: number, isMatchWeek: boolean): number {
  if (isMatchWeek && load > 0 && hasAbility(player, 'ironHeart')) return load * IRON_HEART_MATCH_LOAD_MULTIPLIER
  return load
}

function injuryProbability(player: Player): number {
  let probability = INJURY_BASE_PROBABILITY + (player.fatigue / FATIGUE_MAX) * INJURY_FATIGUE_PROBABILITY_SCALE
  if (player.personality === 'fragile') probability *= FRAGILE_INJURY_MULTIPLIER
  if (hasAbility(player, 'ironBody')) probability *= IRON_BODY_INJURY_MULTIPLIER
  return probability
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

// 特殊能力 1~5 每項對應一個屬性,比賽計算隊伍戰力時,額外加成該球員在對應屬性上的有效值
// (原創數值,待調校);跟訓練層面的「個性加成」是獨立的兩件事,只在比賽計算生效。
const ATTRIBUTE_BOOST_ABILITIES: Partial<Record<SpecialAbilityKey, AttributeKey>> = {
  deadeyeShooter: 'three',
  paintBeast: 'shooting',
  reboundMachine: 'rebound',
  passingArtist: 'pass',
  ironWall: 'defense',
}
export const ABILITY_ATTRIBUTE_BOOST_AMOUNT = 5

// 特殊能力「抗壓王牌」跟抗壓型個性走同一種機制(八強/四強額外表現加成),但是獨立來源,
// 兩者可以同時生效(原創數值,待調校)。
export const CLUTCH_ACE_PERFORMANCE_BONUS = 0.1

function boostedAttributes(player: Player): Player['attributes'] {
  let attributes = player.attributes
  for (const ability of player.specialAbilities) {
    const attribute = ATTRIBUTE_BOOST_ABILITIES[ability]
    if (attribute) {
      attributes = { ...attributes, [attribute]: attributes[attribute] + ABILITY_ATTRIBUTE_BOOST_AMOUNT }
    }
  }
  return attributes
}

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

function effectiveAttributeAverage(player: Player, weights?: AttributeWeights, clutchActive = false): number {
  const average = weightedAttributeAverage(boostedAttributes(player), weights)
  const fatigueMultiplier = 1 - (player.fatigue / FATIGUE_MAX) * FATIGUE_PERFORMANCE_PENALTY
  const returningMultiplier = player.injuryStatus === 'returning' ? RETURNING_ATTRIBUTE_MULTIPLIER : 1
  let clutchMultiplier = 1
  if (clutchActive && player.personality === 'clutch') clutchMultiplier *= 1 + CLUTCH_PERFORMANCE_BONUS
  if (clutchActive && hasAbility(player, 'clutchAce')) clutchMultiplier *= 1 + CLUTCH_ACE_PERFORMANCE_BONUS
  return average * fatigueMultiplier * returningMultiplier * clutchMultiplier
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
  const fatigued = applyFatigueDelta(ticked, applyIronHeartLoadReduction(ticked, load, isMatchWeek))
  return isMatchWeek ? rollForInjury(fatigued, rng, majorInjuryWeeks) : fatigued
}

/**
 * 隊伍戰力:未提供 lineup 時,對「可上場」球員(排除輕傷/重傷)做簡單平均,沿用練習賽等
 * 沒有先發/輪替概念的場合。提供 lineup 時,改依先發/輪替權重(先發6:輪替3:未上場0)
 * 做加權平均,未列入陣容的球員完全不計入戰力;若加權後總權重為 0(例如陣容剛好是空的),
 * 安全退回未加權平均,避免除以 0。clutchActive 為 true 時(八強/四強階段),抗壓型個性與
 * 「抗壓王牌」特殊能力的球員有效表現各自額外加成;有 lineup 且先發中有隊長型球員、或帶
 * 「隊魂領袖」「鎖喉夾擊」特殊能力的球員時,各自額外加上一次性的團隊戰力加成(同一類來源
 * 多人同時先發不重複疊加,但不同來源之間可以疊加)。
 */
export function computeTeamStrength(
  roster: Player[],
  attributeWeights?: AttributeWeights,
  lineup?: GameLineup,
  clutchActive = false,
): number {
  const available = roster.filter((player) => player.injuryStatus !== 'minor' && player.injuryStatus !== 'major')
  const pool = available.length > 0 ? available : roster
  const hasCaptainStarter = lineup
    ? lineup.starters.some((id) => roster.find((player) => player.id === id)?.personality === 'captain')
    : false
  const hasAbilityStarter = (ability: SpecialAbilityKey) =>
    lineup
      ? lineup.starters.some((id) => roster.find((player) => player.id === id)?.specialAbilities.includes(ability))
      : false
  const startBonus =
    (hasCaptainStarter ? CAPTAIN_STRENGTH_BONUS : 0) +
    (hasAbilityStarter('teamSoul') ? TEAM_SOUL_STRENGTH_BONUS : 0) +
    (hasAbilityStarter('chokeHold') ? CHOKE_HOLD_STRENGTH_BONUS : 0)

  if (lineup) {
    const weighted = pool.map((player) => ({ player, weight: lineupWeight(player.id, lineup) }))
    const totalWeight = weighted.reduce((sum, { weight }) => sum + weight, 0)
    if (totalWeight > 0) {
      return (
        weighted.reduce(
          (sum, { player, weight }) => sum + effectiveAttributeAverage(player, attributeWeights, clutchActive) * weight,
          0,
        ) /
          totalWeight +
        startBonus
      )
    }
  }

  return (
    pool.reduce((sum, player) => sum + effectiveAttributeAverage(player, attributeWeights, clutchActive), 0) /
      pool.length +
    startBonus
  )
}

export function computeWinProbability(teamStrength: number, opponentStrength: number): number {
  return 1 / (1 + Math.exp(-(teamStrength - opponentStrength) / 10))
}

// 個性影響單場表現波動範圍(原創數值,待調校):飆分型愈多、波動範圍愈大(高風險高上下限);
// 穩健型愈多、波動範圍愈小(表現穩定)。
const PERFORMANCE_VARIANCE_BASE = 4
const PERFORMANCE_VARIANCE_PERSONALITY_DELTA = 1.5
const PERFORMANCE_VARIANCE_MIN = 1
// 特殊能力「定海神針」跟穩健型走同一種降低波動機制,是獨立來源(原創數值,待調校)。
const PERFORMANCE_VARIANCE_ABILITY_DELTA = 1.5

export function computePerformanceVarianceRange(roster: Player[], lineup?: GameLineup): number {
  const available = roster.filter((player) => player.injuryStatus !== 'minor' && player.injuryStatus !== 'major')
  // 有陣容時,只計算實際上場(先發+輪替)的個性組成,未上場球員不影響場上表現波動。
  const pool = lineup ? available.filter((player) => lineupWeight(player.id, lineup) > 0) : available
  const scorerCount = pool.filter((player) => player.personality === 'scorer').length
  const steadyCount = pool.filter((player) => player.personality === 'steady').length
  const steadyAnchorCount = pool.filter((player) => hasAbility(player, 'steadyAnchor')).length
  const range =
    PERFORMANCE_VARIANCE_BASE +
    (scorerCount - steadyCount) * PERFORMANCE_VARIANCE_PERSONALITY_DELTA -
    steadyAnchorCount * PERFORMANCE_VARIANCE_ABILITY_DELTA
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
  clutchActive = false,
): number {
  const baseStrength = computeTeamStrength(roster, attributeWeights, lineup, clutchActive)
  const range = computePerformanceVarianceRange(roster, lineup)
  const noise = (rng() * 2 - 1) * range
  return computeWinProbability(baseStrength + noise, opponentStrength)
}

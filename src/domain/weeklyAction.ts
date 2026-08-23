import { advancePlayerWeek, ATTRIBUTE_MAX, clamp, computeMatchWinProbability } from './matchEngine'
import { createSeededRng } from './rng'
import { computeStyleTag } from './styleTag'
import { PERSONALITY_LABELS, type AttributeKey, type Player, type PersonalityKey } from './types'

// 訓練不再分風險強度,單一動作、固定負荷;成長量直接依骰子點數對應,不是另外判定成功/失敗
// (原創數值,待調校):1點不成長,2~3點小幅成長,4~5點中幅成長,6點(會心一擊)成長最多。
const ROLL_GROWTH: Record<number, number> = {
  1: 0,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 3,
}

// 2026-08-24 從 8 調降到 6(原創數值,待調校):全隊訓練卡的負荷是套用到「整個名冊」
// 每人身上,疊多張同屬性卡(觸發連鎖加成)最容易把全隊體力一次推高很多,是「體力耗盡過快」
// 回饋裡影響最大的單一因素;連同 matchEngine.ts 的 BASELINE_RECOVERY 一起調整,讓積極訓練
// 的取捨依然存在,但不會一週就把整隊操到疲勞警戒線。
export const TRAINING_LOAD = 6

// 全隊休養:不練習、沒有成長,換取確定且比訓練更大的體力恢復(原創數值,待調校)。
export const TEAM_REST_LOAD = -10

export type PracticeStrength = 'weak' | 'medium' | 'strong'

export const PRACTICE_STRENGTHS: PracticeStrength[] = ['weak', 'medium', 'strong']

export const PRACTICE_OPPONENT_STRENGTH: Record<PracticeStrength, number> = {
  weak: 50,
  medium: 65,
  strong: 80,
}

export const PRACTICE_LOAD: Record<PracticeStrength, number> = {
  weak: 15,
  medium: 20,
  strong: 25,
}

export const PRACTICE_WIN_GROWTH: Record<PracticeStrength, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
}

// 輸了還是有練到,但比贏球少;強度越高、輸了學到的也越多。
export const PRACTICE_LOSS_GROWTH: Record<PracticeStrength, number> = {
  weak: 0,
  medium: 0,
  strong: 1,
}

// 玻璃體質(fragile)受傷機率較高,骰面達 4~6(中幅以上成長)時提供額外成長收益作為風險
// 補償,不提高全域屬性上限(原創數值,待調校)。
const FRAGILE_HIGH_ROLL_MULTIPLIER = 1.25
const FRAGILE_HIGH_ROLL_THRESHOLD = 4

const ATTRIBUTE_AFFINITY_MULTIPLIER = 1.3

/**
 * 哪些個性對這項屬性有固定(不看骰面)的訓練加成,供卡池畫面顯示「個性相性」提示,
 * 也是 personalityMultiplier 骰面無關那一半的單一資料來源。玻璃體質的加成只在高骰面才觸發,
 * 屬於骰面相關的風險補償,不算「相性」,不列在這裡。
 */
export function attributeAffinityPersonalities(attribute: AttributeKey): PersonalityKey[] {
  const affinities: PersonalityKey[] = ['genius']
  if (attribute === 'shooting' || attribute === 'three') affinities.push('scorer')
  return affinities
}

function personalityMultiplier(attribute: AttributeKey, personality: PersonalityKey, roll: number): number {
  if (attributeAffinityPersonalities(attribute).includes(personality)) return ATTRIBUTE_AFFINITY_MULTIPLIER
  if (personality === 'fragile' && roll >= FRAGILE_HIGH_ROLL_THRESHOLD) return FRAGILE_HIGH_ROLL_MULTIPLIER
  return 1.0
}

export function computeTrainingRollGain(attribute: AttributeKey, personality: PersonalityKey, roll: number): number {
  return Math.round(ROLL_GROWTH[roll] * personalityMultiplier(attribute, personality, roll))
}

/** 只有當個性真的把這次骰的成長量往上推,才回傳標籤;倍率存在但被四捨五入吃掉時回傳 null。 */
export function personalityBonusLabel(
  attribute: AttributeKey,
  personality: PersonalityKey,
  roll: number,
): string | null {
  const baseGain = ROLL_GROWTH[roll]
  const gain = computeTrainingRollGain(attribute, personality, roll)
  return gain > baseGain ? `${PERSONALITY_LABELS[personality]}加成` : null
}

export interface PlayerRoll {
  playerId: string
  roll: number
  succeeded: boolean
  gain: number
  bonusLabel: string | null
}

export interface TrainingResult {
  roster: Player[]
  successCount: number
  totalPlayers: number
  totalGain: number
  rolls: PlayerRoll[]
}

export function applyTraining(roster: Player[], attribute: AttributeKey, seed: number): TrainingResult {
  const rng = createSeededRng(seed)

  let successCount = 0
  let totalGain = 0
  const rolls: PlayerRoll[] = []

  const newRoster = roster.map((player) => {
    if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') {
      return advancePlayerWeek(player, 0, rng, false)
    }

    // 每位可訓練球員各自擲一顆 1~6 的骰子,成長量直接依點數對應,不是額外判定成功/失敗。
    const roll = Math.floor(rng() * 6) + 1
    const gain = computeTrainingRollGain(attribute, player.personality, roll)
    const succeeded = gain > 0
    if (succeeded) successCount += 1
    const bonusLabel = personalityBonusLabel(attribute, player.personality, roll)
    rolls.push({ playerId: player.id, roll, succeeded, gain, bonusLabel })

    const clampedAttribute = clamp(player.attributes[attribute] + gain, 0, ATTRIBUTE_MAX)
    totalGain += clampedAttribute - player.attributes[attribute]

    const attributes = { ...player.attributes, [attribute]: clampedAttribute }
    const withAttributes = { ...player, attributes, styleTag: computeStyleTag(attributes) }
    return advancePlayerWeek(withAttributes, TRAINING_LOAD, rng, false)
  })

  return { roster: newRoster, successCount, totalPlayers: roster.length, totalGain, rolls }
}

export interface TeamRestResult {
  roster: Player[]
}

/** 全隊休養:不練習、沒有成長,換取確定且比訓練更大的體力恢復。 */
export function applyTeamRest(roster: Player[], seed: number): TeamRestResult {
  const rng = createSeededRng(seed)
  const newRoster = roster.map((player) => {
    if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') {
      return advancePlayerWeek(player, 0, rng, false)
    }
    return advancePlayerWeek(player, TEAM_REST_LOAD, rng, false)
  })
  return { roster: newRoster }
}

export interface PracticeMatchResult {
  outcome: 'win' | 'loss'
  roster: Player[]
}

export function applyPracticeMatch(
  roster: Player[],
  strength: PracticeStrength,
  seed: number,
): PracticeMatchResult {
  const rng = createSeededRng(seed)

  const opponentStrength = PRACTICE_OPPONENT_STRENGTH[strength]
  const winProbability = computeMatchWinProbability(roster, opponentStrength, rng)
  const outcome: 'win' | 'loss' = rng() < winProbability ? 'win' : 'loss'

  const load = PRACTICE_LOAD[strength]
  let fatiguedRoster = roster.map((player) => {
    if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') {
      return advancePlayerWeek(player, 0, rng, false)
    }
    return advancePlayerWeek(player, load, rng, true)
  })

  const growth = outcome === 'win' ? PRACTICE_WIN_GROWTH[strength] : PRACTICE_LOSS_GROWTH[strength]
  const eligibleIndices = fatiguedRoster
    .map((_, index) => index)
    .filter((index) => fatiguedRoster[index].injuryStatus !== 'minor' && fatiguedRoster[index].injuryStatus !== 'major')
  const beneficiaryCount = Math.min(outcome === 'win' ? 2 : 1, eligibleIndices.length)

  if (growth > 0 && beneficiaryCount > 0) {
    const indices = new Set<number>()
    while (indices.size < beneficiaryCount) {
      indices.add(eligibleIndices[Math.floor(rng() * eligibleIndices.length)])
    }
    fatiguedRoster = fatiguedRoster.map((player, index) => {
      if (!indices.has(index)) return player
      const attrKeys = Object.keys(player.attributes) as AttributeKey[]
      const attribute = attrKeys[Math.floor(rng() * attrKeys.length)]
      const attributes = {
        ...player.attributes,
        [attribute]: clamp(player.attributes[attribute] + growth, 0, ATTRIBUTE_MAX),
      }
      return { ...player, attributes, styleTag: computeStyleTag(attributes) }
    })
  }

  return { outcome, roster: fatiguedRoster }
}

import { applyFatigueDelta, ATTRIBUTE_MAX, clamp, computeTeamStrength, computeWinProbability } from './matchEngine'
import { createSeededRng } from './rng'
import { computeStyleTag } from './styleTag'
import type { AttributeKey, Player, PersonalityKey } from './types'

export type TrainingIntensity = 'light' | 'moderate' | 'intense'

export const TRAINING_INTENSITIES: TrainingIntensity[] = ['light', 'moderate', 'intense']

// 風險越高,成功時單週成長越多,但成功機率越低、消耗的體力也越多
// (原創數值,概念參考「保守應對/照常執行/全力一搏」這種三檔風險賭博機制,實際機率/數值皆自行設計)。
const TRAINING_GROWTH: Record<TrainingIntensity, number> = {
  light: 1,
  moderate: 2,
  intense: 3,
}

export const TRAINING_SUCCESS_RATE: Record<TrainingIntensity, number> = {
  light: 0.85,
  moderate: 0.65,
  intense: 0.45,
}

export const TRAINING_INTENSITY_LABELS: Record<TrainingIntensity, string> = {
  light: '保守應對',
  moderate: '照常執行',
  intense: '全力一搏',
}

const TRAINING_LOAD: Record<TrainingIntensity, number> = {
  light: 4,
  moderate: 8,
  intense: 16,
}

export type PracticeStrength = 'weak' | 'medium' | 'strong'

export const PRACTICE_STRENGTHS: PracticeStrength[] = ['weak', 'medium', 'strong']

export const PRACTICE_OPPONENT_STRENGTH: Record<PracticeStrength, number> = {
  weak: 50,
  medium: 65,
  strong: 80,
}

const PRACTICE_LOAD: Record<PracticeStrength, number> = {
  weak: 15,
  medium: 20,
  strong: 25,
}

const PRACTICE_WIN_GROWTH: Record<PracticeStrength, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
}

// 輸了還是有練到,但比贏球少;強度越高、輸了學到的也越多。
const PRACTICE_LOSS_GROWTH: Record<PracticeStrength, number> = {
  weak: 0,
  medium: 0,
  strong: 1,
}

function personalityMultiplier(attribute: AttributeKey, personality: PersonalityKey): number {
  if (personality === 'genius') return 1.3
  if (personality === 'scorer' && (attribute === 'shooting' || attribute === 'three')) return 1.3
  return 1.0
}

export function computeTrainingSuccessGain(
  intensity: TrainingIntensity,
  attribute: AttributeKey,
  personality: PersonalityKey,
): number {
  return Math.round(TRAINING_GROWTH[intensity] * personalityMultiplier(attribute, personality))
}

export function applyTraining(
  roster: Player[],
  attribute: AttributeKey,
  intensity: TrainingIntensity,
  seed: number,
): Player[] {
  const rng = createSeededRng(seed)
  const load = TRAINING_LOAD[intensity]
  const successRate = TRAINING_SUCCESS_RATE[intensity]

  return roster.map((player) => {
    const succeeded = rng() < successRate
    const gain = succeeded ? computeTrainingSuccessGain(intensity, attribute, player.personality) : 0
    const attributes = {
      ...player.attributes,
      [attribute]: clamp(player.attributes[attribute] + gain, 0, ATTRIBUTE_MAX),
    }
    const withAttributes = { ...player, attributes, styleTag: computeStyleTag(attributes) }
    return applyFatigueDelta(withAttributes, load)
  })
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

  const teamStrength = computeTeamStrength(roster)
  const opponentStrength = PRACTICE_OPPONENT_STRENGTH[strength]
  const winProbability = computeWinProbability(teamStrength, opponentStrength)
  const outcome: 'win' | 'loss' = rng() < winProbability ? 'win' : 'loss'

  const load = PRACTICE_LOAD[strength]
  let fatiguedRoster = roster.map((player) => applyFatigueDelta(player, load))

  const growth = outcome === 'win' ? PRACTICE_WIN_GROWTH[strength] : PRACTICE_LOSS_GROWTH[strength]
  const beneficiaryCount = outcome === 'win' ? Math.min(2, fatiguedRoster.length) : Math.min(1, fatiguedRoster.length)

  if (growth > 0) {
    const indices = new Set<number>()
    while (indices.size < beneficiaryCount) {
      indices.add(Math.floor(rng() * fatiguedRoster.length))
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

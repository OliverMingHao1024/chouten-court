import { createSeededRng } from './rng'
import { computeStyleTag } from './styleTag'
import type { AttributeKey, Player, PersonalityKey } from './types'

const FATIGUE_MIN = 0
const FATIGUE_MAX = 100
const ATTRIBUTE_MAX = 99

const BASELINE_RECOVERY = 10
const TRAINING_LOAD = 5

export type PracticeStrength = 'weak' | 'medium' | 'strong'

const OPPONENT_STRENGTH: Record<PracticeStrength, number> = {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function personalityMultiplier(attribute: AttributeKey, personality: PersonalityKey): number {
  if (personality === 'genius') return 1.3
  if (personality === 'scorer' && (attribute === 'shooting' || attribute === 'three')) return 1.3
  return 1.0
}

function applyFatigueDelta(player: Player, load: number): Player {
  const fatigue = clamp(player.fatigue + load - BASELINE_RECOVERY, FATIGUE_MIN, FATIGUE_MAX)
  return { ...player, fatigue }
}

export function applyTraining(roster: Player[], attribute: AttributeKey, amount: number): Player[] {
  return roster.map((player) => {
    const gain = Math.round(amount * personalityMultiplier(attribute, player.personality))
    const attributes = {
      ...player.attributes,
      [attribute]: clamp(player.attributes[attribute] + gain, 0, ATTRIBUTE_MAX),
    }
    const withAttributes = { ...player, attributes, styleTag: computeStyleTag(attributes) }
    return applyFatigueDelta(withAttributes, TRAINING_LOAD)
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

  const teamStrength =
    roster.reduce((sum, player) => {
      const attrValues = Object.values(player.attributes)
      return sum + attrValues.reduce((s, v) => s + v, 0) / attrValues.length
    }, 0) / roster.length

  const opponentStrength = OPPONENT_STRENGTH[strength]
  const winProbability = 1 / (1 + Math.exp(-(teamStrength - opponentStrength) / 10))
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

import { ATTRIBUTE_MAX, clamp } from './matchEngine'
import { generatePersonName } from './nameGenerator'
import { INITIAL_REPUTATION } from './reputation'
import { createSeededRng, type Rng } from './rng'
import { computeStyleTag } from './styleTag'
import {
  ATTRIBUTE_KEYS,
  PERSONALITY_KEYS,
  POSITIONS,
  type AttributeKey,
  type AttributeSet,
  type PersonalityKey,
  type Player,
  type Position,
} from './types'

export interface AttributeRange {
  min: number
  max: number
}

export interface Candidate {
  id: string
  name: string
  position: Position
  personality: PersonalityKey
  /** 球探拿到的最終真實屬性,招生階段只顯示 attributeRanges,收隊後才套用這份數值。 */
  trueAttributes: AttributeSet
  attributeRanges: Record<AttributeKey, AttributeRange>
}

const CANDIDATE_ATTRIBUTE_FLOOR = 35
const CANDIDATE_ATTRIBUTE_CEILING = 70
const CANDIDATE_ATTRIBUTE_MIN = 15
const CANDIDATE_RANGE_WINDOW = 20

// 聲望只調整候選人屬性基準值的機率分佈,不設硬上限/下限:聲望越高,新生候選池整體品質
// 越好,但弱校仍有機率巧遇高潛力球員(原創數值,待調校)。
const REPUTATION_ATTRIBUTE_SHIFT = 0.25

function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

export function generateCandidatePool(reputation: number, size: number, seed: number): Candidate[] {
  const rng = createSeededRng(seed)
  const shift = (reputation - INITIAL_REPUTATION) * REPUTATION_ATTRIBUTE_SHIFT

  return Array.from({ length: size }, (_, index) => {
    const position = POSITIONS[randomInt(rng, 0, POSITIONS.length - 1)]
    const personality = PERSONALITY_KEYS[randomInt(rng, 0, PERSONALITY_KEYS.length - 1)]

    const trueAttributes = {} as AttributeSet
    const attributeRanges = {} as Record<AttributeKey, AttributeRange>
    for (const key of ATTRIBUTE_KEYS) {
      const base = randomInt(rng, CANDIDATE_ATTRIBUTE_FLOOR, CANDIDATE_ATTRIBUTE_CEILING)
      const trueValue = clamp(Math.round(base + shift), CANDIDATE_ATTRIBUTE_MIN, ATTRIBUTE_MAX)
      trueAttributes[key] = trueValue
      const half = CANDIDATE_RANGE_WINDOW / 2
      attributeRanges[key] = {
        min: clamp(trueValue - half, 0, ATTRIBUTE_MAX),
        max: clamp(trueValue + half, 0, ATTRIBUTE_MAX),
      }
    }

    return {
      id: `candidate-${seed}-${index}`,
      name: generatePersonName(rng),
      position,
      personality,
      trueAttributes,
      attributeRanges,
    }
  })
}

/** 招生截止時,把選中的候選人直接收進名冊,不做拒絕/交涉機制。 */
export function signCandidates(candidates: Candidate[], selectedIds: string[]): Player[] {
  return candidates
    .filter((candidate) => selectedIds.includes(candidate.id))
    .map((candidate) => ({
      id: `player-${candidate.id}`,
      name: candidate.name,
      position: candidate.position,
      attributes: candidate.trueAttributes,
      personality: candidate.personality,
      fatigue: 0,
      styleTag: computeStyleTag(candidate.trueAttributes),
      injuryStatus: 'healthy',
      injuryWeeksRemaining: 0,
      grade: 1,
    }))
}

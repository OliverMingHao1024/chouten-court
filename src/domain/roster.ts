import { createSeededRng, type Rng } from './rng'
import { computeStyleTag } from './styleTag'
import {
  ATTRIBUTE_KEYS,
  PERSONALITY_KEYS,
  POSITIONS,
  type AttributeSet,
  type Player,
  type Position,
} from './types'

const ROSTER_SIZE = 12
const ATTRIBUTE_MIN = 40
const ATTRIBUTE_MAX = 75

function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomAttributes(rng: Rng): AttributeSet {
  const attrs = {} as AttributeSet
  for (const key of ATTRIBUTE_KEYS) {
    attrs[key] = randomInt(rng, ATTRIBUTE_MIN, ATTRIBUTE_MAX)
  }
  return attrs
}

function assignPositions(size: number, rng: Rng): Position[] {
  const assignments: Position[] = [...POSITIONS]
  while (assignments.length < size) {
    assignments.push(POSITIONS[randomInt(rng, 0, POSITIONS.length - 1)])
  }
  return assignments
}

export function createInitialRoster(seed: number, size: number = ROSTER_SIZE): Player[] {
  const rng = createSeededRng(seed)
  const positions = assignPositions(size, rng)

  return Array.from({ length: size }, (_, index) => {
    const attributes = randomAttributes(rng)
    const personality = PERSONALITY_KEYS[randomInt(rng, 0, PERSONALITY_KEYS.length - 1)]
    return {
      id: `player-${seed}-${index}`,
      name: `球員${String(index + 1).padStart(2, '0')}`,
      position: positions[index],
      attributes,
      personality,
      fatigue: 0,
      styleTag: computeStyleTag(attributes),
    }
  })
}

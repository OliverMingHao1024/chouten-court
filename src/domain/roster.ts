import { generatePersonName } from './nameGenerator'
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

export const ROSTER_SIZE = 12
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

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function assignPositions(size: number, rng: Rng): Position[] {
  const assignments: Position[] = shuffle(POSITIONS, rng)
  while (assignments.length < size) {
    assignments.push(POSITIONS[randomInt(rng, 0, POSITIONS.length - 1)])
  }
  return assignments
}

const NAME_RETRY_LIMIT = 5

function generateUniquePlayerName(rng: Rng, usedNames: Set<string>): string {
  let name = generatePersonName(rng)
  for (let attempt = 0; attempt < NAME_RETRY_LIMIT && usedNames.has(name); attempt++) {
    name = generatePersonName(rng)
  }
  usedNames.add(name)
  return name
}

export function createInitialRoster(seed: number, size: number = ROSTER_SIZE): Player[] {
  const rng = createSeededRng(seed)
  const positions = assignPositions(size, rng)
  const usedNames = new Set<string>()

  return Array.from({ length: size }, (_, index) => {
    const attributes = randomAttributes(rng)
    const personality = PERSONALITY_KEYS[randomInt(rng, 0, PERSONALITY_KEYS.length - 1)]
    return {
      id: `player-${seed}-${index}`,
      name: generateUniquePlayerName(rng, usedNames),
      position: positions[index],
      attributes,
      personality,
      fatigue: 0,
      styleTag: computeStyleTag(attributes),
      injuryStatus: 'healthy',
      injuryWeeksRemaining: 0,
      grade: 1,
    }
  })
}

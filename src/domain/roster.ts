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
const GRADES = [1, 2, 3] as const

// 身高(公分)僅供展示,依位置給不同區間營造合理觀感,不影響任何屬性/比賽計算(原創數值,待調校)。
export const HEIGHT_RANGE_BY_POSITION: Record<Position, { min: number; max: number }> = {
  PG: { min: 170, max: 183 },
  SG: { min: 175, max: 188 },
  SF: { min: 180, max: 193 },
  PF: { min: 185, max: 198 },
  C: { min: 190, max: 205 },
}

function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

export function randomHeight(position: Position, rng: Rng): number {
  const { min, max } = HEIGHT_RANGE_BY_POSITION[position]
  return randomInt(rng, min, max)
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

// 開局名冊高一到高三交錯分佈(不存在留級生),讓畢業/招生從第一年起就逐年交錯發生,
// 不會全隊同批畢業:以年級輪流排列(儘量平均)後洗牌決定「誰是幾年級」。
function assignGrades(size: number, rng: Rng): number[] {
  const assignments = Array.from({ length: size }, (_, index) => GRADES[index % GRADES.length])
  return shuffle(assignments, rng)
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
  const grades = assignGrades(size, rng)
  const usedNames = new Set<string>()

  return Array.from({ length: size }, (_, index) => {
    const attributes = randomAttributes(rng)
    const personality = PERSONALITY_KEYS[randomInt(rng, 0, PERSONALITY_KEYS.length - 1)]
    const position = positions[index]
    return {
      id: `player-${seed}-${index}`,
      name: generateUniquePlayerName(rng, usedNames),
      position,
      height: randomHeight(position, rng),
      attributes,
      personality,
      specialAbilities: [],
      fatigue: 0,
      styleTag: computeStyleTag(attributes),
      injuryStatus: 'healthy',
      injuryWeeksRemaining: 0,
      grade: grades[index],
    }
  })
}

import { ATTRIBUTE_KEYS, type AttributeSet } from './types'

export const GRADES = ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as const
export type Grade = (typeof GRADES)[number]

const GRADE_THRESHOLDS: Array<[Grade, number]> = [
  ['S', 90],
  ['A', 80],
  ['B', 70],
  ['C', 60],
  ['D', 50],
  ['E', 40],
]

export function getAttributeGrade(value: number): Grade {
  for (const [grade, min] of GRADE_THRESHOLDS) {
    if (value >= min) return grade
  }
  return 'F'
}

export function computeOverallGrade(attributes: AttributeSet): Grade {
  const average = ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributes[key], 0) / ATTRIBUTE_KEYS.length
  return getAttributeGrade(average)
}

import { describe, expect, it } from 'vitest'
import { getAttributeGrade, computeOverallGrade } from '../attributeGrade'
import { ATTRIBUTE_KEYS, type AttributeSet } from '../types'

function withUniformAttributes(value: number): AttributeSet {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as AttributeSet
}

describe('getAttributeGrade', () => {
  it.each([
    [99, 'S'],
    [90, 'S'],
    [89, 'A'],
    [80, 'A'],
    [79, 'B'],
    [70, 'B'],
    [69, 'C'],
    [60, 'C'],
    [59, 'D'],
    [50, 'D'],
    [49, 'E'],
    [40, 'E'],
    [39, 'F'],
    [0, 'F'],
  ])('grades %i as %s', (value, expected) => {
    expect(getAttributeGrade(value)).toBe(expected)
  })
})

describe('computeOverallGrade', () => {
  it('grades the average of all 7 attributes', () => {
    expect(computeOverallGrade(withUniformAttributes(85))).toBe('A')
    expect(computeOverallGrade(withUniformAttributes(55))).toBe('D')
  })
})

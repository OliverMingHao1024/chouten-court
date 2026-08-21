import { describe, expect, it } from 'vitest'
import { createInitialRoster } from '../roster'
import { computeTeamFocusStyle, focusDiscountForAttribute, FOCUS_DISCOUNT } from '../trainingDirection'
import type { Player, StyleKey } from '../types'

function withPrimaryStyle(seed: number, style: StyleKey): Player {
  const [player] = createInitialRoster(seed, 1)
  return { ...player, styleTag: { primary: style, secondary: style, label: 'x' } }
}

describe('computeTeamFocusStyle', () => {
  it('returns null for an empty roster', () => {
    expect(computeTeamFocusStyle([])).toBeNull()
  })

  it('picks the style that the most players share', () => {
    const players = [
      withPrimaryStyle(1, 'shooting'),
      withPrimaryStyle(2, 'shooting'),
      withPrimaryStyle(3, 'rebounding'),
    ]
    expect(computeTeamFocusStyle(players)).toBe('shooting')
  })

  it('is deterministic on a tie, breaking by STYLE_KEYS order', () => {
    const players = [withPrimaryStyle(1, 'rebounding'), withPrimaryStyle(2, 'scoring')]
    // STYLE_KEYS = ['scoring', 'shooting', 'playmaking', 'defense', 'rebounding'], scoring comes first.
    expect(computeTeamFocusStyle(players)).toBe('scoring')
  })
})

describe('focusDiscountForAttribute', () => {
  it('gives no discount when there is no active focus', () => {
    expect(focusDiscountForAttribute('three', null)).toBe(0)
  })

  it('gives the discount when the attribute maps to the focus style', () => {
    expect(focusDiscountForAttribute('three', 'shooting')).toBe(FOCUS_DISCOUNT)
  })

  it('gives no discount when the attribute maps to a different style', () => {
    expect(focusDiscountForAttribute('rebound', 'shooting')).toBe(0)
  })
})

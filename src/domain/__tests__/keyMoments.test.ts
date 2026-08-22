import { describe, expect, it } from 'vitest'
import {
  isKeyMomentTrigger,
  KEY_MOMENT_MARGIN_THRESHOLD,
  KEY_MOMENT_MODIFIERS,
  KEY_MOMENT_OPTIONS,
  KEY_MOMENT_OPTION_HINTS,
  KEY_MOMENT_OPTION_LABELS,
} from '../keyMoments'

describe('isKeyMomentTrigger', () => {
  it('triggers when the margin is within the threshold, after quarters 1-3', () => {
    for (let quarterIndex = 0; quarterIndex <= 2; quarterIndex++) {
      expect(isKeyMomentTrigger(quarterIndex, { us: 40, them: 40 + KEY_MOMENT_MARGIN_THRESHOLD })).toBe(true)
    }
  })

  it('does not trigger when the margin exceeds the threshold', () => {
    expect(isKeyMomentTrigger(0, { us: 40, them: 40 + KEY_MOMENT_MARGIN_THRESHOLD + 1 })).toBe(false)
  })

  it('never triggers after the 4th quarter (index 3), even at a 0 margin', () => {
    expect(isKeyMomentTrigger(3, { us: 50, them: 50 })).toBe(false)
  })

  it('is symmetric: a close margin either way triggers the same', () => {
    expect(isKeyMomentTrigger(0, { us: 40, them: 42 })).toBe(true)
    expect(isKeyMomentTrigger(0, { us: 42, them: 40 })).toBe(true)
  })
})

describe('KEY_MOMENT_MODIFIERS', () => {
  it('defines a modifier for every option', () => {
    for (const option of KEY_MOMENT_OPTIONS) {
      expect(KEY_MOMENT_MODIFIERS[option]).toBeDefined()
      expect(typeof KEY_MOMENT_MODIFIERS[option].marginBonus).toBe('number')
      expect(typeof KEY_MOMENT_MODIFIERS[option].varianceMultiplier).toBe('number')
    }
  })

  it('makes auto a true no-op (matches the neutral modifier the full-auto path uses)', () => {
    expect(KEY_MOMENT_MODIFIERS.auto).toEqual({ marginBonus: 0, varianceMultiplier: 1 })
  })

  it('gives push a bigger margin bonus and more variance than steady', () => {
    expect(KEY_MOMENT_MODIFIERS.push.marginBonus).toBeGreaterThan(KEY_MOMENT_MODIFIERS.steady.marginBonus)
    expect(KEY_MOMENT_MODIFIERS.push.varianceMultiplier).toBeGreaterThan(KEY_MOMENT_MODIFIERS.steady.varianceMultiplier)
  })
})

describe('KEY_MOMENT_OPTION_LABELS / KEY_MOMENT_OPTION_HINTS', () => {
  it('has a non-empty label and hint for every option', () => {
    for (const option of KEY_MOMENT_OPTIONS) {
      expect(KEY_MOMENT_OPTION_LABELS[option].length).toBeGreaterThan(0)
      expect(KEY_MOMENT_OPTION_HINTS[option].length).toBeGreaterThan(0)
    }
  })
})

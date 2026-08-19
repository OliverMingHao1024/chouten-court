import { describe, expect, it } from 'vitest'
import { computeStyleTag, STYLE_LABELS } from '../styleTag'
import type { AttributeSet } from '../types'

function attrs(overrides: Partial<AttributeSet>): AttributeSet {
  return {
    shooting: 50,
    three: 50,
    rebound: 50,
    pass: 50,
    defense: 50,
    athletic: 50,
    iq: 50,
    ...overrides,
  }
}

describe('computeStyleTag', () => {
  it('labels a pure rebounding profile as rebounding-primary', () => {
    const tag = computeStyleTag(attrs({ rebound: 95, defense: 60, athletic: 60 }))
    expect(tag.primary).toBe('rebounding')
    expect(tag.label).toContain(STYLE_LABELS.rebounding)
  })

  it('labels a pure playmaking profile as playmaking-primary', () => {
    const tag = computeStyleTag(attrs({ pass: 95, iq: 80 }))
    expect(tag.primary).toBe('playmaking')
  })

  it('combines primary and secondary into the label when they differ', () => {
    const tag = computeStyleTag(attrs({ three: 90, defense: 90 }))
    expect(tag.primary).not.toBe(tag.secondary)
    expect(tag.label).toContain(STYLE_LABELS[tag.primary])
    expect(tag.label).toContain(STYLE_LABELS[tag.secondary])
  })

  it('is deterministic for the same attributes', () => {
    const a = attrs({ shooting: 70, three: 65 })
    expect(computeStyleTag(a)).toEqual(computeStyleTag(a))
  })
})

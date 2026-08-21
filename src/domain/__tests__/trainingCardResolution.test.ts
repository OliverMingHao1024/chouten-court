import { describe, expect, it } from 'vitest'
import { createInitialRoster } from '../roster'
import { COMBO_BONUS_MULTIPLIER, type PoolCard } from '../trainingCardPool'
import { resolveCardSelections, type CardSelection } from '../trainingCardResolution'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'

function withUniformAttributes(roster: Player[], value: number): Player[] {
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as AttributeSet
  return roster.map((player) => ({ ...player, attributes, personality: 'steady' as const }))
}

function makeCard(overrides: Partial<PoolCard> = {}): PoolCard {
  return { id: 'card-x', kind: 'teamTraining', attribute: 'three', age: 0, ...overrides }
}

describe('resolveCardSelections: teamTraining', () => {
  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const selections: CardSelection[] = [{ card: makeCard() }]
    const a = resolveCardSelections(roster, selections, 42)
    const b = resolveCardSelections(roster, selections, 42)
    expect(a).toEqual(b)
  })

  it('trains every non-sidelined player and skips injured players', () => {
    const roster = createInitialRoster(1).map((p, i) => (i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2 } : p))
    const result = resolveCardSelections(roster, [{ card: makeCard() }], 7)
    const teamCard = result.resolvedCards[0]
    expect(teamCard.kind).toBe('teamTraining')
    if (teamCard.kind === 'teamTraining') {
      expect(teamCard.rolls.map((r) => r.playerId)).not.toContain(roster[0].id)
      expect(teamCard.rolls).toHaveLength(roster.length - 1)
    }
    expect(result.roster[0].attributes).toEqual(roster[0].attributes)
  })

  it('scales down the gain for an aged (decayed) card', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 40)
    const fresh = resolveCardSelections(roster, [{ card: makeCard({ age: 0 }) }], 999)
    const decayed = resolveCardSelections(roster, [{ card: makeCard({ age: 8 }) }], 999)
    const freshGain = (fresh.resolvedCards[0] as { rolls: { gain: number }[] }).rolls.reduce((s, r) => s + r.gain, 0)
    const decayedGain = (decayed.resolvedCards[0] as { rolls: { gain: number }[] }).rolls.reduce((s, r) => s + r.gain, 0)
    expect(decayedGain).toBeLessThanOrEqual(freshGain)
  })
})

describe('resolveCardSelections: combo bonus', () => {
  it('boosts gain when two teamTraining cards share the same attribute', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 40)
    const single = resolveCardSelections(roster, [{ card: makeCard({ id: 'a' }) }], 5)
    const combo = resolveCardSelections(
      roster,
      [{ card: makeCard({ id: 'a' }) }, { card: makeCard({ id: 'b' }) }],
      5,
    )
    const singleGain = (single.resolvedCards[0] as { rolls: { gain: number }[] }).rolls.reduce((s, r) => s + r.gain, 0)
    const comboGain = (combo.resolvedCards[0] as { rolls: { gain: number }[] }).rolls.reduce((s, r) => s + r.gain, 0)
    expect(comboGain).toBeGreaterThan(singleGain)
    expect((combo.resolvedCards[0] as { comboBonus: boolean }).comboBonus).toBe(true)
    expect(COMBO_BONUS_MULTIPLIER).toBeGreaterThan(1)
  })

  it('does not apply the combo bonus for two different attributes', () => {
    const combo = resolveCardSelections(
      createInitialRoster(1),
      [{ card: makeCard({ id: 'a', attribute: 'three' }) }, { card: makeCard({ id: 'b', attribute: 'defense' }) }],
      5,
    )
    expect((combo.resolvedCards[0] as { comboBonus: boolean }).comboBonus).toBe(false)
    expect((combo.resolvedCards[1] as { comboBonus: boolean }).comboBonus).toBe(false)
  })
})

describe('resolveCardSelections: individualTraining', () => {
  it('only trains the targeted player, leaving everyone else untouched', () => {
    const roster = createInitialRoster(1)
    const target = roster[3]
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    const result = resolveCardSelections(roster, [{ card, playerId: target.id, attribute: 'iq' }], 11)

    const resolved = result.resolvedCards[0]
    expect(resolved.kind).toBe('individualTraining')
    if (resolved.kind === 'individualTraining') {
      expect(resolved.playerId).toBe(target.id)
      expect(resolved.attribute).toBe('iq')
    }

    roster.forEach((player, index) => {
      if (index === 3) return
      expect(result.roster[index].attributes).toEqual(player.attributes)
    })
  })

  it('does not grow or fatigue an injured target', () => {
    const roster = createInitialRoster(1).map((p, i) => (i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2, fatigue: 50 } : p))
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    const result = resolveCardSelections(roster, [{ card, playerId: roster[0].id, attribute: 'iq' }], 11)
    expect(result.roster[0].attributes).toEqual(roster[0].attributes)
  })

  it('throws if the selection is missing playerId or attribute', () => {
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    expect(() => resolveCardSelections(createInitialRoster(1), [{ card }], 1)).toThrow()
  })
})

describe('resolveCardSelections: practiceMatch', () => {
  it('produces a win or loss outcome and fatigues the whole roster', () => {
    const roster = createInitialRoster(1)
    const card = makeCard({ kind: 'practiceMatch', attribute: null })
    const result = resolveCardSelections(roster, [{ card, strength: 'medium' }], 7)
    const resolved = result.resolvedCards[0]
    expect(resolved.kind).toBe('practiceMatch')
    if (resolved.kind === 'practiceMatch') {
      expect(['win', 'loss']).toContain(resolved.outcome)
    }
    result.roster.forEach((player, index) => {
      if (player.injuryStatus === 'healthy') expect(player.fatigue).toBeGreaterThan(roster[index].fatigue)
    })
  })

  it('throws if the selection is missing strength', () => {
    const card = makeCard({ kind: 'practiceMatch', attribute: null })
    expect(() => resolveCardSelections(createInitialRoster(1), [{ card }], 1)).toThrow()
  })
})

describe('resolveCardSelections: rest', () => {
  it('recovers fatigue for the whole roster without any growth', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 50 }))
    const card = makeCard({ kind: 'rest', attribute: null })
    const result = resolveCardSelections(roster, [{ card }], 3)
    result.roster.forEach((player, index) => {
      expect(player.fatigue).toBeLessThan(roster[index].fatigue)
      expect(player.attributes).toEqual(roster[index].attributes)
    })
  })
})

describe('resolveCardSelections: multiple simultaneous cards on the same player', () => {
  it('recovers fatigue exactly once even when two cards both touch the same player (no double-counted recovery)', () => {
    // Two team-training cards (different attributes) both load every player once each;
    // recovery should still only be subtracted once per player, not once per card.
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 50 }))
    const cardA = makeCard({ id: 'a', attribute: 'three' })
    const cardB = makeCard({ id: 'b', attribute: 'defense' })
    const result = resolveCardSelections(roster, [{ card: cardA }, { card: cardB }], 9)

    // Reference: resolving the same two cards one at a time, chaining the roster, WOULD
    // double-subtract recovery. The combined single-pass result must NOT match that.
    const sequential = resolveCardSelections(resolveCardSelections(roster, [{ card: cardA }], 9).roster, [{ card: cardB }], 9)

    expect(result.roster[0].fatigue).not.toBe(sequential.roster[0].fatigue)
  })

  it('sums attribute growth from both a teamTraining card and an individualTraining card on the same player', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 40)
    const target = roster[0]
    const teamCard = makeCard({ id: 'team', attribute: 'iq' })
    const individualCard = makeCard({ id: 'ind', kind: 'individualTraining', attribute: null })
    const result = resolveCardSelections(
      roster,
      [{ card: teamCard }, { card: individualCard, playerId: target.id, attribute: 'iq' }],
      13,
    )
    const teamOnly = resolveCardSelections(roster, [{ card: teamCard }], 13)
    expect(result.roster[0].attributes.iq).toBeGreaterThanOrEqual(teamOnly.roster[0].attributes.iq)
  })
})

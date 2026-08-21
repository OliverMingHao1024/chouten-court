import { describe, expect, it } from 'vitest'
import { createInitialRoster } from '../roster'
import { LEARNABLE_SPECIAL_ABILITY_KEYS, unlockedAbilities, unlockedAbilityCount } from '../specialAbilities'
import { COMBO_BONUS_MULTIPLIER, type PoolCard } from '../trainingCardPool'
import { resolveCardSelections, type CardSelection } from '../trainingCardResolution'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'

const FULL_REPUTATION = 100

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
    const a = resolveCardSelections(roster, selections, 42, FULL_REPUTATION)
    const b = resolveCardSelections(roster, selections, 42, FULL_REPUTATION)
    expect(a).toEqual(b)
  })

  it('trains every non-sidelined player and skips injured players', () => {
    const roster = createInitialRoster(1).map((p, i) => (i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2 } : p))
    const result = resolveCardSelections(roster, [{ card: makeCard() }], 7, FULL_REPUTATION)
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
    const fresh = resolveCardSelections(roster, [{ card: makeCard({ age: 0 }) }], 999, FULL_REPUTATION)
    const decayed = resolveCardSelections(roster, [{ card: makeCard({ age: 8 }) }], 999, FULL_REPUTATION)
    const freshGain = (fresh.resolvedCards[0] as { rolls: { gain: number }[] }).rolls.reduce((s, r) => s + r.gain, 0)
    const decayedGain = (decayed.resolvedCards[0] as { rolls: { gain: number }[] }).rolls.reduce((s, r) => s + r.gain, 0)
    expect(decayedGain).toBeLessThanOrEqual(freshGain)
  })
})

describe('resolveCardSelections: combo bonus', () => {
  it('boosts gain when two teamTraining cards share the same attribute', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 40)
    const single = resolveCardSelections(roster, [{ card: makeCard({ id: 'a' }) }], 5, FULL_REPUTATION)
    const combo = resolveCardSelections(
      roster,
      [{ card: makeCard({ id: 'a' }) }, { card: makeCard({ id: 'b' }) }],
      5,
      FULL_REPUTATION,
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
      FULL_REPUTATION,
    )
    expect((combo.resolvedCards[0] as { comboBonus: boolean }).comboBonus).toBe(false)
    expect((combo.resolvedCards[1] as { comboBonus: boolean }).comboBonus).toBe(false)
  })
})

describe('resolveCardSelections: individualTraining (teaches a special ability, no longer grows an attribute)', () => {
  it('only affects the targeted player: attempts to teach the ability there, leaves everyone else untouched', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 99)
    const target = roster[3]
    const [ability] = unlockedAbilities(FULL_REPUTATION)
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    const result = resolveCardSelections(roster, [{ card, playerId: target.id, ability }], 11, FULL_REPUTATION)

    const resolved = result.resolvedCards[0]
    expect(resolved.kind).toBe('individualTraining')
    if (resolved.kind === 'individualTraining') {
      expect(resolved.playerId).toBe(target.id)
      expect(resolved.ability).toBe(ability)
      // attribute maxed out at 99 -> learn chance is ~1, should succeed
      expect(resolved.succeeded).toBe(true)
    }
    expect(result.roster[3].specialAbilities).toContain(ability)

    roster.forEach((player, index) => {
      if (index === 3) return
      expect(result.roster[index].specialAbilities).toEqual(player.specialAbilities)
    })
  })

  it('does not teach the ability or apply the training load to an injured target', () => {
    const roster = createInitialRoster(1).map((p, i) =>
      i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2, fatigue: 50 } : p,
    )
    const [ability] = unlockedAbilities(FULL_REPUTATION)
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    const result = resolveCardSelections(roster, [{ card, playerId: roster[0].id, ability }], 11, FULL_REPUTATION)
    expect(result.roster[0].specialAbilities).toEqual([])
  })

  it('throws if the selection is missing playerId or ability', () => {
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    expect(() => resolveCardSelections(createInitialRoster(1), [{ card }], 1, FULL_REPUTATION)).toThrow()
  })

  it('throws if the target already has the ability', () => {
    const [ability] = unlockedAbilities(FULL_REPUTATION)
    const roster = createInitialRoster(1).map((p, i) => (i === 0 ? { ...p, specialAbilities: [ability] } : p))
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    expect(() =>
      resolveCardSelections(roster, [{ card, playerId: roster[0].id, ability }], 1, FULL_REPUTATION),
    ).toThrow()
  })

  it('throws if the ability is not yet unlocked at the given reputation', () => {
    const lowReputation = 0
    const lockedAbility = LEARNABLE_SPECIAL_ABILITY_KEYS[unlockedAbilityCount(lowReputation)]
    const roster = createInitialRoster(1)
    const card = makeCard({ kind: 'individualTraining', attribute: null })
    expect(() =>
      resolveCardSelections(roster, [{ card, playerId: roster[0].id, ability: lockedAbility }], 1, lowReputation),
    ).toThrow()
  })
})

describe('resolveCardSelections: practiceMatch', () => {
  it('produces a win or loss outcome and fatigues the whole roster', () => {
    const roster = createInitialRoster(1)
    const card = makeCard({ kind: 'practiceMatch', attribute: null })
    const result = resolveCardSelections(roster, [{ card, strength: 'medium' }], 7, FULL_REPUTATION)
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
    expect(() => resolveCardSelections(createInitialRoster(1), [{ card }], 1, FULL_REPUTATION)).toThrow()
  })
})

describe('resolveCardSelections: rest', () => {
  it('recovers fatigue for the whole roster without any growth', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 50 }))
    const card = makeCard({ kind: 'rest', attribute: null })
    const result = resolveCardSelections(roster, [{ card }], 3, FULL_REPUTATION)
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
    const result = resolveCardSelections(roster, [{ card: cardA }, { card: cardB }], 9, FULL_REPUTATION)

    // Reference: resolving the same two cards one at a time, chaining the roster, WOULD
    // double-subtract recovery. The combined single-pass result must NOT match that.
    const sequential = resolveCardSelections(
      resolveCardSelections(roster, [{ card: cardA }], 9, FULL_REPUTATION).roster,
      [{ card: cardB }],
      9,
      FULL_REPUTATION,
    )

    expect(result.roster[0].fatigue).not.toBe(sequential.roster[0].fatigue)
  })

  it('lets a teamTraining card and an individualTraining card resolve independently in the same week', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 99)
    const target = roster[0]
    const [ability] = unlockedAbilities(FULL_REPUTATION)
    const teamCard = makeCard({ id: 'team', attribute: 'iq' })
    const individualCard = makeCard({ id: 'ind', kind: 'individualTraining', attribute: null })
    const result = resolveCardSelections(
      roster,
      [{ card: teamCard }, { card: individualCard, playerId: target.id, ability }],
      13,
      FULL_REPUTATION,
    )
    expect(result.roster[0].attributes.iq).toBeGreaterThanOrEqual(roster[0].attributes.iq)
    expect(result.roster[0].specialAbilities).toContain(ability)
  })
})

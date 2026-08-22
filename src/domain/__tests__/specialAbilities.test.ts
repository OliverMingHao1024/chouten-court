import { describe, expect, it } from 'vitest'
import { createInitialRoster } from '../roster'
import { createSeededRng } from '../rng'
import {
  attemptLearnAbility,
  hasAbility,
  learnableAbilitiesForPlayer,
  LEARNABLE_SPECIAL_ABILITY_KEYS,
  specialAbilityLearnChance,
  SPECIAL_ABILITY_ATTRIBUTE,
  unlockedAbilities,
  unlockedAbilityCount,
} from '../specialAbilities'
import type { Player } from '../types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return { ...createInitialRoster(1)[0], specialAbilities: [], ...overrides }
}

describe('LEARNABLE_SPECIAL_ABILITY_KEYS', () => {
  it('excludes the two abilities deferred pending the match-engine box score (gameWinner, clutchThree)', () => {
    expect(LEARNABLE_SPECIAL_ABILITY_KEYS).not.toContain('gameWinner')
    expect(LEARNABLE_SPECIAL_ABILITY_KEYS).not.toContain('clutchThree')
  })
})

describe('unlockedAbilityCount / unlockedAbilities', () => {
  it('unlocks a small fixed floor at zero reputation and everything at max reputation', () => {
    expect(unlockedAbilityCount(0)).toBeGreaterThan(0)
    expect(unlockedAbilityCount(100)).toBe(LEARNABLE_SPECIAL_ABILITY_KEYS.length)
  })

  it('unlocks strictly more abilities as reputation increases', () => {
    expect(unlockedAbilityCount(50)).toBeGreaterThan(unlockedAbilityCount(0))
  })

  it('unlocks abilities in a stable, deterministic order (a prefix of the catalog)', () => {
    const atLowRep = unlockedAbilities(10)
    const atHighRep = unlockedAbilities(90)
    expect(atHighRep.slice(0, atLowRep.length)).toEqual(atLowRep)
  })

  it('unlocks one extra ability when a bonus slot is passed in', () => {
    expect(unlockedAbilityCount(0, 1)).toBe(unlockedAbilityCount(0) + 1)
    expect(unlockedAbilities(0, 1)).toHaveLength(unlockedAbilities(0).length + 1)
  })

  it('never unlocks more than the full catalog even with a bonus slot at max reputation', () => {
    expect(unlockedAbilityCount(100, 1)).toBe(LEARNABLE_SPECIAL_ABILITY_KEYS.length)
  })
})

describe('learnableAbilitiesForPlayer', () => {
  it('excludes abilities the player already has', () => {
    const [first] = unlockedAbilities(100)
    const player = makePlayer({ specialAbilities: [first] })
    expect(learnableAbilitiesForPlayer(player, 100)).not.toContain(first)
  })

  it('returns nothing once the player already has every unlocked ability', () => {
    const player = makePlayer({ specialAbilities: [...unlockedAbilities(0)] })
    expect(learnableAbilitiesForPlayer(player, 0)).toEqual([])
  })

  it('includes the bonus-unlocked ability once a bonus slot is passed in', () => {
    const player = makePlayer({ specialAbilities: [...unlockedAbilities(0)] })
    expect(learnableAbilitiesForPlayer(player, 0)).toEqual([])
    expect(learnableAbilitiesForPlayer(player, 0, 1)).toHaveLength(1)
  })
})

describe('specialAbilityLearnChance', () => {
  it('scales up with attribute value, floored at MIN_LEARN_CHANCE', () => {
    expect(specialAbilityLearnChance(0)).toBeGreaterThan(0)
    expect(specialAbilityLearnChance(99)).toBeCloseTo(1)
    expect(specialAbilityLearnChance(99)).toBeGreaterThan(specialAbilityLearnChance(10))
  })
})

describe('attemptLearnAbility', () => {
  it('is deterministic for the same seed', () => {
    const player = makePlayer({ attributes: { ...makePlayer().attributes, three: 80 } })
    const a = attemptLearnAbility(player, 'deadeyeShooter', createSeededRng(1))
    const b = attemptLearnAbility(player, 'deadeyeShooter', createSeededRng(1))
    expect(a).toEqual(b)
  })

  it('uses the ability-specific attribute to compute the chance', () => {
    const base = makePlayer()
    const highThree = makePlayer({ attributes: { ...base.attributes, three: 99 } })
    const result = attemptLearnAbility(highThree, 'deadeyeShooter', createSeededRng(1))
    expect(result.chance).toBeCloseTo(1)
    expect(SPECIAL_ABILITY_ATTRIBUTE.deadeyeShooter).toBe('three')
  })
})

describe('hasAbility', () => {
  it('checks membership in the player specialAbilities array', () => {
    expect(hasAbility(makePlayer({ specialAbilities: ['ironWall'] }), 'ironWall')).toBe(true)
    expect(hasAbility(makePlayer({ specialAbilities: [] }), 'ironWall')).toBe(false)
  })
})

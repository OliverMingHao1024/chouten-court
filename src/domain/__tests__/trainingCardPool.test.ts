import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../rng'
import {
  advanceCardPool,
  canSelectCards,
  cardCost,
  cardEffectMultiplier,
  cardEffectTier,
  CARD_POOL_SIZE,
  comboAttributes,
  createInitialCardPool,
  MAX_CARD_AGE,
  MAX_CARDS_PER_WEEK,
  maxTrainingPoints,
  MIN_CARD_COST,
  MIN_EFFECT_TIER,
  recoverTrainingPoints,
  totalCost,
  trainingPointsRecovery,
  type PoolCard,
} from '../trainingCardPool'

function makeCard(overrides: Partial<PoolCard> = {}): PoolCard {
  return { id: 'card-x', kind: 'teamTraining', attribute: 'three', age: 0, ...overrides }
}

describe('createInitialCardPool', () => {
  it('creates exactly CARD_POOL_SIZE fresh cards with unique ids', () => {
    const pool = createInitialCardPool(createSeededRng(1))
    expect(pool.cards).toHaveLength(CARD_POOL_SIZE)
    expect(new Set(pool.cards.map((c) => c.id)).size).toBe(CARD_POOL_SIZE)
    pool.cards.forEach((card) => expect(card.age).toBe(0))
  })

  it('is deterministic for the same seed', () => {
    const a = createInitialCardPool(createSeededRng(42))
    const b = createInitialCardPool(createSeededRng(42))
    expect(a).toEqual(b)
  })
})

describe('cardCost and cardEffectTier', () => {
  it('starts at the base cost/effect for a fresh card', () => {
    const card = makeCard({ kind: 'rest', age: 0 })
    expect(cardCost(card)).toBeGreaterThan(0)
    expect(cardEffectTier(makeCard({ age: 0 }))).toBe(3)
  })

  it('decreases cost and effect as the card ages, floored at the minimum', () => {
    const fresh = makeCard({ kind: 'practiceMatch', age: 0 })
    const aged = makeCard({ kind: 'practiceMatch', age: 5 })
    expect(cardCost(aged)).toBeLessThan(cardCost(fresh))
    expect(cardCost(aged)).toBeGreaterThanOrEqual(MIN_CARD_COST)
    expect(cardEffectTier(aged)).toBeGreaterThanOrEqual(MIN_EFFECT_TIER)
  })

  it('never lets cost or effect drop below their floors even at max age', () => {
    const veryOld = makeCard({ age: MAX_CARD_AGE })
    expect(cardCost(veryOld)).toBeGreaterThanOrEqual(MIN_CARD_COST)
    expect(cardEffectTier(veryOld)).toBe(MIN_EFFECT_TIER)
  })

  it('converts effect tier into a 0~1 multiplier', () => {
    expect(cardEffectMultiplier(makeCard({ age: 0 }))).toBe(1)
    expect(cardEffectMultiplier(makeCard({ age: MAX_CARD_AGE }))).toBeCloseTo(MIN_EFFECT_TIER / 3)
  })
})

describe('maxTrainingPoints / trainingPointsRecovery', () => {
  it('matches the researched range at the reputation extremes', () => {
    expect(maxTrainingPoints(0)).toBe(7)
    expect(maxTrainingPoints(100)).toBe(12)
    expect(trainingPointsRecovery(0)).toBe(3)
    expect(trainingPointsRecovery(100)).toBe(8)
  })

  it('interpolates between the extremes for mid-range reputation', () => {
    const mid = maxTrainingPoints(50)
    expect(mid).toBeGreaterThan(7)
    expect(mid).toBeLessThan(12)
  })
})

describe('recoverTrainingPoints', () => {
  it('adds the recovery amount without exceeding the reputation-based cap', () => {
    expect(recoverTrainingPoints(0, 0)).toBe(3)
    expect(recoverTrainingPoints(6, 0)).toBe(7) // capped at maxTrainingPoints(0) = 7, not 9
  })
})

describe('totalCost / canSelectCards', () => {
  it('sums the cost of each selected card', () => {
    const cards = [makeCard({ age: 0 }), makeCard({ kind: 'rest', age: 0 })]
    expect(totalCost(cards)).toBe(cardCost(cards[0]) + cardCost(cards[1]))
  })

  it('rejects an empty selection', () => {
    expect(canSelectCards([], 100)).toBe(false)
  })

  it('rejects more than MAX_CARDS_PER_WEEK cards even if affordable', () => {
    const cards = Array.from({ length: MAX_CARDS_PER_WEEK + 1 }, () => makeCard({ kind: 'rest' }))
    expect(canSelectCards(cards, 999)).toBe(false)
  })

  it('rejects a selection whose total cost exceeds the remaining points', () => {
    const cards = [makeCard({ kind: 'practiceMatch' })]
    expect(canSelectCards(cards, cardCost(cards[0]) - 1)).toBe(false)
  })

  it('accepts a selection within both the count and cost limits', () => {
    const cards = [makeCard({ kind: 'rest' })]
    expect(canSelectCards(cards, cardCost(cards[0]))).toBe(true)
  })
})

describe('comboAttributes', () => {
  it('finds no combo with a single team-training card', () => {
    expect(comboAttributes([makeCard({ attribute: 'three' })])).toEqual([])
  })

  it('finds a combo when two team-training cards share the same attribute', () => {
    const cards = [makeCard({ id: 'a', attribute: 'three' }), makeCard({ id: 'b', attribute: 'three' })]
    expect(comboAttributes(cards)).toEqual(['three'])
  })

  it('does not combo across different attributes', () => {
    const cards = [makeCard({ id: 'a', attribute: 'three' }), makeCard({ id: 'b', attribute: 'defense' })]
    expect(comboAttributes(cards)).toEqual([])
  })

  it('ignores non-teamTraining cards when looking for combos', () => {
    const cards = [
      makeCard({ id: 'a', kind: 'individualTraining', attribute: null }),
      makeCard({ id: 'b', kind: 'individualTraining', attribute: null }),
    ]
    expect(comboAttributes(cards)).toEqual([])
  })
})

describe('advanceCardPool', () => {
  it('removes selected cards and keeps the pool at CARD_POOL_SIZE', () => {
    const pool = createInitialCardPool(createSeededRng(1))
    const selectedIds = pool.cards.slice(0, 2).map((c) => c.id)
    const result = advanceCardPool(pool, selectedIds, createSeededRng(2))
    expect(result.state.cards).toHaveLength(CARD_POOL_SIZE)
    selectedIds.forEach((id) => expect(result.state.cards.some((c) => c.id === id)).toBe(false))
  })

  it('ages every surviving card by exactly one week', () => {
    const pool = createInitialCardPool(createSeededRng(1))
    const result = advanceCardPool(pool, [], createSeededRng(2))
    const survivorIds = new Set(pool.cards.map((c) => c.id))
    result.state.cards
      .filter((c) => survivorIds.has(c.id))
      .forEach((card) => {
        const original = pool.cards.find((c) => c.id === card.id)!
        expect(card.age).toBe(original.age + 1)
      })
  })

  it('expires a card that has survived past MAX_CARD_AGE, and reports it', () => {
    const pool = { cards: [{ id: 'old', kind: 'rest' as const, attribute: null, age: MAX_CARD_AGE }], nextCardId: 1 }
    const result = advanceCardPool(pool, [], createSeededRng(1))
    expect(result.expired.map((c) => c.id)).toContain('old')
    expect(result.state.cards.some((c) => c.id === 'old')).toBe(false)
  })

  it('backfills every vacated slot with a fresh (age 0) card using unique ids', () => {
    const pool = createInitialCardPool(createSeededRng(1))
    const selectedIds = pool.cards.slice(0, 3).map((c) => c.id)
    const result = advanceCardPool(pool, selectedIds, createSeededRng(2))
    const freshCards = result.state.cards.filter((c) => c.age === 0)
    expect(freshCards.length).toBeGreaterThanOrEqual(3)
    expect(new Set(result.state.cards.map((c) => c.id)).size).toBe(CARD_POOL_SIZE)
  })

  it('is deterministic for the same inputs and seed', () => {
    const pool = createInitialCardPool(createSeededRng(1))
    const a = advanceCardPool(pool, [], createSeededRng(2))
    const b = advanceCardPool(pool, [], createSeededRng(2))
    expect(a).toEqual(b)
  })
})

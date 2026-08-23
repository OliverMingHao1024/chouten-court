import { describe, expect, it } from 'vitest'
import { createInitialRoster } from '../roster'
import { unlockedAbilities } from '../specialAbilities'
import type { PoolCard, TrainingCardPoolState } from '../trainingCardPool'
import { suggestTrainingCardSelections } from '../trainingCardSuggestion'

function makeCard(overrides: Partial<PoolCard> = {}): PoolCard {
  return { id: 'card-x', kind: 'teamTraining', attribute: 'three', age: 0, ...overrides }
}

function makePool(cards: PoolCard[]): TrainingCardPoolState {
  return { cards, nextCardId: cards.length }
}

// 全部設中性個性(steady 沒有任何加成/懲罰),避免 focus/個性效果干擾成本排序的斷言。
function neutralRoster() {
  return createInitialRoster(1).map((p) => ({ ...p, personality: 'steady' as const }))
}

describe('suggestTrainingCardSelections', () => {
  it('picks cards by effect-tier/cost value, preferring cheap high-tier cards over expensive ones', () => {
    const pool = makePool([
      makeCard({ id: 'rest', kind: 'rest', attribute: null, age: 0 }), // cost 1, tier 3 -> value 3
      makeCard({ id: 'individual', kind: 'individualTraining', attribute: null, age: 0 }), // cost 2, tier 3 -> value 1.5
      makeCard({ id: 'team', kind: 'teamTraining', attribute: 'three', age: 0 }), // cost 3, tier 3 -> value 1
      makeCard({ id: 'practice', kind: 'practiceMatch', attribute: null, age: 0 }), // cost 4, tier 3 -> value 0.75
    ])
    const selections = suggestTrainingCardSelections(pool, neutralRoster(), 10, 100, 3)

    expect(selections).toHaveLength(3)
    expect(selections.map((s) => s.card.id)).toEqual(['rest', 'individual', 'team'])
  })

  it('never exceeds the training-points budget', () => {
    const pool = makePool([
      makeCard({ id: 'rest', kind: 'rest', attribute: null, age: 0 }), // cost 1
      makeCard({ id: 'individual', kind: 'individualTraining', attribute: null, age: 0 }), // cost 2
      makeCard({ id: 'team', kind: 'teamTraining', attribute: 'three', age: 0 }), // cost 3
    ])
    const selections = suggestTrainingCardSelections(pool, neutralRoster(), 2, 100, 3)

    expect(selections).toHaveLength(1)
    expect(selections[0].card.id).toBe('rest')
  })

  it('never exceeds maxCardsPerWeek even with plenty of budget', () => {
    const pool = makePool([
      makeCard({ id: 'a', kind: 'rest', attribute: null, age: 0 }),
      makeCard({ id: 'b', kind: 'rest', attribute: null, age: 1 }),
      makeCard({ id: 'c', kind: 'rest', attribute: null, age: 2 }),
    ])
    const selections = suggestTrainingCardSelections(pool, neutralRoster(), 100, 100, 1)
    expect(selections).toHaveLength(1)
  })

  it('respects a higher maxCardsPerWeek (e.g. from the training-facility school asset)', () => {
    const pool = makePool([
      makeCard({ id: 'a', kind: 'rest', attribute: null, age: 0 }),
      makeCard({ id: 'b', kind: 'rest', attribute: null, age: 1 }),
      makeCard({ id: 'c', kind: 'rest', attribute: null, age: 2 }),
      makeCard({ id: 'd', kind: 'rest', attribute: null, age: 3 }),
    ])
    const selections = suggestTrainingCardSelections(pool, neutralRoster(), 100, 100, 4)
    expect(selections).toHaveLength(4)
  })

  it('assigns a trainable player and their best-chance learnable ability to a suggested individualTraining card', () => {
    const pool = makePool([makeCard({ id: 'individual', kind: 'individualTraining', attribute: null, age: 0 })])
    const selections = suggestTrainingCardSelections(pool, neutralRoster(), 10, 100)

    expect(selections).toHaveLength(1)
    expect(selections[0].playerId).toBeDefined()
    expect(selections[0].ability).toBeDefined()
  })

  it('picks the trainable player with the highest overall attributes when several could learn something', () => {
    const roster = neutralRoster()
    const boosted = roster.map((p, i) =>
      i === 0 ? { ...p, attributes: Object.fromEntries(Object.keys(p.attributes).map((k) => [k, 99])) as never } : p,
    )
    const pool = makePool([makeCard({ id: 'individual', kind: 'individualTraining', attribute: null, age: 0 })])
    const selections = suggestTrainingCardSelections(pool, boosted, 10, 100)

    expect(selections[0].playerId).toBe(boosted[0].id)
  })

  it('leaves playerId/ability unset when nobody has anything left to learn', () => {
    const alreadyKnowsEverything = unlockedAbilities(0)
    const roster = neutralRoster().map((p) => ({ ...p, specialAbilities: [...alreadyKnowsEverything] }))
    const pool = makePool([makeCard({ id: 'individual', kind: 'individualTraining', attribute: null, age: 0 })])
    const selections = suggestTrainingCardSelections(pool, roster, 10, 0)

    expect(selections[0].playerId).toBeUndefined()
    expect(selections[0].ability).toBeUndefined()
  })

  it('defaults a suggested practiceMatch card to medium strength', () => {
    const pool = makePool([makeCard({ id: 'practice', kind: 'practiceMatch', attribute: null, age: 0 })])
    const selections = suggestTrainingCardSelections(pool, neutralRoster(), 10, 100)

    expect(selections).toHaveLength(1)
    expect(selections[0].strength).toBe('medium')
  })

  it('does not mutate the input pool or roster', () => {
    const pool = makePool([makeCard({ id: 'rest', kind: 'rest', attribute: null, age: 0 })])
    const roster = neutralRoster()
    const poolSnapshot = JSON.parse(JSON.stringify(pool))
    const rosterSnapshot = JSON.parse(JSON.stringify(roster))

    suggestTrainingCardSelections(pool, roster, 10, 100)

    expect(pool).toEqual(poolSnapshot)
    expect(roster).toEqual(rosterSnapshot)
  })
})

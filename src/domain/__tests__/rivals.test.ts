import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../rng'
import {
  computeComebackMargin,
  MAX_PINNED_RIVALS,
  pickOpponentName,
  pinRival,
  recordRivalGame,
  unpinRival,
  type RivalRecord,
} from '../rivals'

function makeRival(overrides: Partial<RivalRecord> = {}): RivalRecord {
  return { name: '板橋高中', wins: 0, losses: 0, biggestComebackMargin: null, pinnedAtWeek: 1, ...overrides }
}

describe('pinRival', () => {
  it('adds a new rival with zeroed stats', () => {
    const rivals = pinRival([], '板橋高中', 5)
    expect(rivals).toEqual([{ name: '板橋高中', wins: 0, losses: 0, biggestComebackMargin: null, pinnedAtWeek: 5 }])
  })

  it('does not add a duplicate of an already-pinned name', () => {
    const rivals = [makeRival({ wins: 3 })]
    expect(pinRival(rivals, '板橋高中', 10)).toBe(rivals)
  })

  it('refuses to add beyond MAX_PINNED_RIVALS', () => {
    const rivals = Array.from({ length: MAX_PINNED_RIVALS }, (_, i) => makeRival({ name: `校${i}` }))
    expect(pinRival(rivals, '新學校', 10)).toBe(rivals)
  })
})

describe('unpinRival', () => {
  it('removes a rival by name', () => {
    const rivals = [makeRival({ name: 'A' }), makeRival({ name: 'B' })]
    expect(unpinRival(rivals, 'A')).toEqual([makeRival({ name: 'B' })])
  })

  it('is a no-op when the name is not pinned', () => {
    const rivals = [makeRival({ name: 'A' })]
    expect(unpinRival(rivals, 'C')).toEqual(rivals)
  })
})

describe('recordRivalGame', () => {
  it('only updates the rival matching the opponent name', () => {
    const rivals = [makeRival({ name: 'A' }), makeRival({ name: 'B' })]
    const updated = recordRivalGame(rivals, 'A', 'win', null)
    expect(updated.find((r) => r.name === 'A')!.wins).toBe(1)
    expect(updated.find((r) => r.name === 'B')!.wins).toBe(0)
  })

  it('is a no-op when the opponent is not a pinned rival', () => {
    const rivals = [makeRival({ name: 'A' })]
    expect(recordRivalGame(rivals, '未釘選學校', 'win', null)).toEqual(rivals)
  })

  it('increments losses on a loss', () => {
    const rivals = [makeRival({ name: 'A' })]
    expect(recordRivalGame(rivals, 'A', 'loss', null)[0].losses).toBe(1)
  })

  it('keeps the largest comeback margin seen so far', () => {
    const rivals = [makeRival({ name: 'A', biggestComebackMargin: 5 })]
    expect(recordRivalGame(rivals, 'A', 'win', 3)[0].biggestComebackMargin).toBe(5)
    expect(recordRivalGame(rivals, 'A', 'win', 8)[0].biggestComebackMargin).toBe(8)
  })
})

describe('computeComebackMargin', () => {
  it('returns null for a loss, regardless of the quarters', () => {
    expect(computeComebackMargin([{ us: 10, them: 30 }], 'loss')).toBeNull()
  })

  it('returns null for a win where the team was never behind', () => {
    const quarters = [{ us: 20, them: 10 }, { us: 20, them: 10 }]
    expect(computeComebackMargin(quarters, 'win')).toBeNull()
  })

  it('returns the largest cumulative deficit overcome for a comeback win', () => {
    // After Q1: 10-20 (down 10). After Q2: 30-35 (down 5, cumulative). After Q3: 55-45 (ahead).
    const quarters = [{ us: 10, them: 20 }, { us: 20, them: 15 }, { us: 25, them: 10 }]
    expect(computeComebackMargin(quarters, 'win')).toBe(10)
  })
})

describe('pickOpponentName', () => {
  it('always returns the fallback name when there are no rivals', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(pickOpponentName([], '板橋高中', createSeededRng(seed))).toBe('板橋高中')
    }
  })

  it('sometimes returns a pinned rival name across many seeds', () => {
    const rivals = [makeRival({ name: '宿敵高中' })]
    let sawRival = false
    for (let seed = 0; seed < 200 && !sawRival; seed++) {
      if (pickOpponentName(rivals, '板橋高中', createSeededRng(seed)) === '宿敵高中') sawRival = true
    }
    expect(sawRival).toBe(true)
  })

  it('only ever returns the fallback or a name from the rival list', () => {
    const rivals = [makeRival({ name: 'A' }), makeRival({ name: 'B' })]
    for (let seed = 0; seed < 100; seed++) {
      const name = pickOpponentName(rivals, 'fallback', createSeededRng(seed))
      expect(['fallback', 'A', 'B']).toContain(name)
    }
  })
})

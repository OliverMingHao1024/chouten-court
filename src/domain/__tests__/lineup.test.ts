import { describe, expect, it } from 'vitest'
import {
  completeLineup,
  lineupRole,
  lineupWeight,
  ROTATION_COUNT,
  ROTATION_WEIGHT,
  STARTER_COUNT,
  STARTER_WEIGHT,
} from '../lineup'

describe('lineupRole / lineupWeight', () => {
  const lineup = { starters: ['a', 'b'], rotation: ['c'] }

  it('classifies starters, rotation, and everyone else as bench', () => {
    expect(lineupRole('a', lineup)).toBe('starter')
    expect(lineupRole('c', lineup)).toBe('rotation')
    expect(lineupRole('z', lineup)).toBe('bench')
  })

  it('weights starters highest, rotation lower, bench zero', () => {
    expect(lineupWeight('a', lineup)).toBe(STARTER_WEIGHT)
    expect(lineupWeight('c', lineup)).toBe(ROTATION_WEIGHT)
    expect(lineupWeight('z', lineup)).toBe(0)
  })
})

describe('completeLineup', () => {
  it('keeps a full manual selection unchanged', () => {
    const available = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const result = completeLineup(available, ['p1', 'p2', 'p3', 'p4', 'p5'], ['p6', 'p7', 'p8'])
    expect(result.starters).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(result.rotation).toEqual(['p6', 'p7', 'p8'])
  })

  it('auto-fills unfilled starter/rotation slots from the remaining available players', () => {
    const available = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
    const result = completeLineup(available, ['p1', 'p2'], [])
    expect(result.starters).toHaveLength(STARTER_COUNT)
    expect(result.rotation).toHaveLength(ROTATION_COUNT)
    // no duplicates and no player outside the available pool
    const all = [...result.starters, ...result.rotation]
    expect(new Set(all).size).toBe(all.length)
    all.forEach((id) => expect(available).toContain(id))
  })

  it('gracefully fills as many slots as possible when fewer than 8 players are available', () => {
    const available = ['p1', 'p2', 'p3', 'p4', 'p5']
    const result = completeLineup(available, [], [])
    expect(result.starters).toHaveLength(STARTER_COUNT)
    expect(result.rotation).toHaveLength(0)
  })

  it('ignores a selected id that is no longer available (e.g. newly injured)', () => {
    const available = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    const result = completeLineup(available, ['p1', 'p2', 'p3', 'p4', 'injured'], [])
    expect(result.starters).not.toContain('injured')
    expect(result.starters).toHaveLength(STARTER_COUNT)
  })

  it('does not let the same player occupy both starter and rotation', () => {
    const available = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    const result = completeLineup(available, ['p1'], ['p1', 'p2'])
    const all = [...result.starters, ...result.rotation]
    expect(new Set(all).size).toBe(all.length)
  })
})

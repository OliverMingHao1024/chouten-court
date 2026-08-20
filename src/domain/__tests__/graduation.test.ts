import { describe, expect, it } from 'vitest'
import { advanceGrades, decideGraduateDestination, describeGraduate, GRADUATION_GRADE } from '../graduation'
import { createSeededRng } from '../rng'
import { createInitialRoster } from '../roster'
import type { AttributeSet, Player } from '../types'

function withAttributes(player: Player, value: number): Player {
  const attributes = Object.fromEntries(Object.keys(player.attributes).map((key) => [key, value])) as AttributeSet
  return { ...player, attributes }
}

describe('advanceGrades', () => {
  it('increments every player grade by 1', () => {
    const roster = createInitialRoster(1) // all grade 1
    const { roster: advanced } = advanceGrades(roster)
    advanced.forEach((player, index) => expect(player.grade).toBe(roster[index].grade + 1))
  })

  it('keeps a player below the graduation grade in the roster', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, grade: 1 }))
    const { roster: remaining, graduates } = advanceGrades(roster)
    expect(remaining).toHaveLength(roster.length)
    expect(graduates).toHaveLength(0)
  })

  it('graduates every player who crosses GRADUATION_GRADE', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, grade: GRADUATION_GRADE }))
    const { roster: remaining, graduates } = advanceGrades(roster)
    expect(remaining).toHaveLength(0)
    expect(graduates).toHaveLength(roster.length)
    graduates.forEach((player) => expect(player.grade).toBe(GRADUATION_GRADE + 1))
  })

  it('splits a mixed roster between remaining and graduating players', () => {
    const roster = createInitialRoster(1).map((p, i) => ({ ...p, grade: i % 2 === 0 ? GRADUATION_GRADE : 1 }))
    const { roster: remaining, graduates } = advanceGrades(roster)
    expect(remaining.length + graduates.length).toBe(roster.length)
    expect(graduates.length).toBeGreaterThan(0)
    expect(remaining.length).toBeGreaterThan(0)
  })
})

describe('decideGraduateDestination', () => {
  it('is deterministic for the same rng sequence', () => {
    const player = createInitialRoster(1)[0]
    expect(decideGraduateDestination(player, 50, createSeededRng(1))).toBe(
      decideGraduateDestination(player, 50, createSeededRng(1)),
    )
  })

  it('favours a pro opportunity for a very strong player over a very weak one', () => {
    const roster = createInitialRoster(1)
    const strong = withAttributes(roster[0], 99)
    const weak = withAttributes(roster[0], 5)

    const countProOutcomes = (player: Player) => {
      let count = 0
      for (let seed = 0; seed < 200; seed++) {
        if (decideGraduateDestination(player, 50, createSeededRng(seed)) === 'proOpportunity') count += 1
      }
      return count
    }

    expect(countProOutcomes(strong)).toBeGreaterThan(countProOutcomes(weak))
  })

  it('never picks a pro opportunity for an extremely weak player', () => {
    const weak = withAttributes(createInitialRoster(1)[0], 0)
    for (let seed = 0; seed < 100; seed++) {
      expect(decideGraduateDestination(weak, 0, createSeededRng(seed))).not.toBe('proOpportunity')
    }
  })
})

describe('describeGraduate', () => {
  it('mentions the player by name', () => {
    const player = createInitialRoster(1)[0]
    const text = describeGraduate(player, 50, createSeededRng(1))
    expect(text).toContain(player.name)
  })
})

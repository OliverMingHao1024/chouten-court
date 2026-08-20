import { describe, expect, it } from 'vitest'
import {
  applyTraining,
  applyTeamRest,
  applyPracticeMatch,
  computeTrainingRollGain,
} from '../weeklyAction'
import { createInitialRoster } from '../roster'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../types'

function withUniformAttributes(roster: Player[], value: number): Player[] {
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as AttributeSet
  return roster.map((player) => ({ ...player, attributes }))
}

function totalAttributeValue(roster: Player[]): number {
  return roster.reduce(
    (sum, player) => sum + Object.values(player.attributes).reduce((s, v) => s + v, 0),
    0,
  )
}

describe('computeTrainingRollGain', () => {
  it('gives a bigger gain to a personality that favours the trained attribute', () => {
    const geniusGain = computeTrainingRollGain('three', 'genius', 4)
    const steadyGain = computeTrainingRollGain('three', 'steady', 4)
    expect(geniusGain).toBeGreaterThanOrEqual(steadyGain)
  })

  it('grows with the roll value', () => {
    expect(computeTrainingRollGain('three', 'steady', 1)).toBeLessThan(computeTrainingRollGain('three', 'steady', 4))
    expect(computeTrainingRollGain('three', 'steady', 4)).toBeLessThan(computeTrainingRollGain('three', 'steady', 6))
  })

  it('gives no growth at all on the lowest roll', () => {
    expect(computeTrainingRollGain('three', 'steady', 1)).toBe(0)
  })
})

describe('applyTraining', () => {
  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const a = applyTraining(roster, 'three', 42)
    const b = applyTraining(roster, 'three', 42)
    expect(a).toEqual(b)
  })

  it('never regresses the chosen attribute (never negative growth)', () => {
    const roster = createInitialRoster(1)
    const before = roster.map((p) => p.attributes.three)
    const result = applyTraining(roster, 'three', 999)
    result.roster.forEach((player, index) => {
      expect(player.attributes.three).toBeGreaterThanOrEqual(before[index])
    })
  })

  it('does not change attributes other than the chosen one', () => {
    const roster = createInitialRoster(1)
    const result = applyTraining(roster, 'three', 42)
    roster.forEach((player, index) => {
      expect(result.roster[index].attributes.shooting).toBe(player.attributes.shooting)
      expect(result.roster[index].attributes.iq).toBe(player.attributes.iq)
    })
  })

  it('fatigue load is fixed regardless of the roll outcome', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 40 }))
    // Fatigue delta only depends on the fixed training load, not the roll, across many seeds.
    const deltas = new Set(
      Array.from({ length: 10 }, (_, seed) => applyTraining(roster, 'three', seed).roster[0].fatigue),
    )
    expect(deltas.size).toBe(1)
  })

  it('never rolls a new injury during training, even at max fatigue', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 100 }))
    for (let seed = 0; seed < 200; seed++) {
      const result = applyTraining(roster, 'three', seed)
      result.roster.forEach((player) => expect(player.injuryStatus).toBe('healthy'))
    }
  })

  it('rolls an actual 1~6 die per trained player, with growth mapped directly from the roll', () => {
    const roster = createInitialRoster(1)
    const result = applyTraining(roster, 'three', 7)

    expect(result.rolls).toHaveLength(roster.length)
    result.rolls.forEach((roll) => {
      expect(roll.roll).toBeGreaterThanOrEqual(1)
      expect(roll.roll).toBeLessThanOrEqual(6)
      expect(roll.succeeded).toBe(roll.gain > 0)
      if (roll.roll === 1) expect(roll.gain).toBe(0)
      if (roll.roll === 6) expect(roll.gain).toBeGreaterThan(0)
    })
  })

  it('gives a rolled 6 a bigger gain than a rolled 2, all else equal', () => {
    // Fix personality to 'steady' so the personality multiplier can't obscure the roll-based scaling.
    const roster = createInitialRoster(1).map((p) => ({ ...p, personality: 'steady' as const }))
    let sixGain: number | null = null
    let twoGain: number | null = null
    for (let seed = 0; seed < 200 && (sixGain === null || twoGain === null); seed++) {
      const result = applyTraining(roster, 'three', seed)
      const six = result.rolls.find((roll) => roll.roll === 6)
      const two = result.rolls.find((roll) => roll.roll === 2)
      if (six) sixGain ??= six.gain
      if (two) twoGain ??= two.gain
    }
    expect(sixGain).not.toBeNull()
    expect(twoGain).not.toBeNull()
    expect(sixGain!).toBeGreaterThan(twoGain!)
  })

  it('excludes a sidelined player from training load and growth', () => {
    const roster = createInitialRoster(1).map((p, i) =>
      i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2, fatigue: 50 } : p,
    )
    const result = applyTraining(roster, 'three', 7)
    expect(result.roster[0].injuryStatus).toBe('minor')
    expect(result.roster[0].injuryWeeksRemaining).toBe(1)
    expect(result.roster[0].fatigue).toBeLessThan(50)
    expect(result.roster[0].attributes).toEqual(roster[0].attributes)
  })

  it('reports successCount and totalGain consistent with the roster outcome', () => {
    const roster = withUniformAttributes(createInitialRoster(1), 40).map((p) => ({
      ...p,
      personality: 'steady' as const,
    }))
    const result = applyTraining(roster, 'three', 7)

    const actualSuccessCount = result.roster.filter((p, i) => p.attributes.three > roster[i].attributes.three)
      .length
    const actualTotalGain = result.roster.reduce(
      (sum, p, i) => sum + (p.attributes.three - roster[i].attributes.three),
      0,
    )

    expect(result.successCount).toBe(actualSuccessCount)
    expect(result.totalGain).toBe(actualTotalGain)
    expect(result.totalPlayers).toBe(roster.length)
  })
})

describe('applyTeamRest', () => {
  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const a = applyTeamRest(roster, 42)
    const b = applyTeamRest(roster, 42)
    expect(a).toEqual(b)
  })

  it('recovers fatigue by a guaranteed amount, not dependent on rng', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 40 }))
    const deltas = new Set(
      Array.from({ length: 10 }, (_, seed) => applyTeamRest(roster, seed).roster[0].fatigue),
    )
    expect(deltas.size).toBe(1)
    expect(roster[0].fatigue).toBeGreaterThan(applyTeamRest(roster, 1).roster[0].fatigue)
  })

  it('does not change any attribute', () => {
    const roster = createInitialRoster(1)
    const result = applyTeamRest(roster, 7)
    result.roster.forEach((player, index) => {
      expect(player.attributes).toEqual(roster[index].attributes)
    })
  })

  it('excludes a sidelined player from the recovery load, just letting their injury count down', () => {
    const roster = createInitialRoster(1).map((p, i) =>
      i === 0 ? { ...p, injuryStatus: 'minor' as const, injuryWeeksRemaining: 2, fatigue: 50 } : p,
    )
    const result = applyTeamRest(roster, 7)
    expect(result.roster[0].injuryStatus).toBe('minor')
    expect(result.roster[0].injuryWeeksRemaining).toBe(1)
  })
})

describe('applyPracticeMatch', () => {
  it('returns a result with a win/loss outcome and updated roster', () => {
    const roster = createInitialRoster(1)
    const result = applyPracticeMatch(roster, 'medium', 7)
    expect(['win', 'loss']).toContain(result.outcome)
    expect(result.roster).toHaveLength(roster.length)
  })

  it('increases fatigue for every player (practice matches never net-recover)', () => {
    const roster = createInitialRoster(1)
    const result = applyPracticeMatch(roster, 'medium', 7)
    result.roster.forEach((player, index) => {
      // A minor injury force-resets fatigue to 0, so only a still-healthy player is
      // guaranteed to have strictly higher fatigue after playing.
      if (player.injuryStatus === 'healthy') {
        expect(player.fatigue).toBeGreaterThan(roster[index].fatigue)
      }
    })
  })

  it('can trigger a new injury for a player who plays the match', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 100 }))
    let sawInjury = false
    for (let seed = 0; seed < 200 && !sawInjury; seed++) {
      const result = applyPracticeMatch(roster, 'strong', seed)
      sawInjury = result.roster.some((player) => player.injuryStatus !== 'healthy')
    }
    expect(sawInjury).toBe(true)
  })

  it('excludes a sidelined player from match load and growth eligibility', () => {
    const roster = createInitialRoster(1).map((p, i) =>
      i === 0 ? { ...p, injuryStatus: 'major' as const, injuryWeeksRemaining: 3, fatigue: 50 } : p,
    )
    const result = applyPracticeMatch(roster, 'strong', 7)
    expect(result.roster[0].injuryStatus).toBe('major')
    expect(result.roster[0].injuryWeeksRemaining).toBe(2)
    expect(result.roster[0].fatigue).toBeLessThan(50)
    expect(result.roster[0].attributes).toEqual(roster[0].attributes)
  })

  it('is deterministic for the same seed', () => {
    const roster = createInitialRoster(1)
    const a = applyPracticeMatch(roster, 'strong', 123)
    const b = applyPracticeMatch(roster, 'strong', 123)
    expect(a).toEqual(b)
  })

  it('caps fatigue at 100', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 95 }))
    const result = applyPracticeMatch(roster, 'strong', 7)
    result.roster.forEach((player) => {
      expect(player.fatigue).toBeLessThanOrEqual(100)
    })
  })

  it('grows the roster less on a loss than on a win, never more', () => {
    const strongRoster = withUniformAttributes(createInitialRoster(1), 95)
    const weakRoster = withUniformAttributes(createInitialRoster(1), 5)

    const winResult = applyPracticeMatch(strongRoster, 'weak', 1)
    const lossResult = applyPracticeMatch(weakRoster, 'strong', 1)

    expect(winResult.outcome).toBe('win')
    expect(lossResult.outcome).toBe('loss')

    const winGain = totalAttributeValue(winResult.roster) - totalAttributeValue(strongRoster)
    const lossGain = totalAttributeValue(lossResult.roster) - totalAttributeValue(weakRoster)

    expect(lossGain).toBeLessThan(winGain)
    expect(lossGain).toBeGreaterThanOrEqual(0)
  })

  it('still grants a little growth on a loss against a strong opponent (spec: 輸了成長少甚至小懲罰, not zero)', () => {
    const weakRoster = withUniformAttributes(createInitialRoster(1), 5)
    const lossResult = applyPracticeMatch(weakRoster, 'strong', 1)
    expect(lossResult.outcome).toBe('loss')

    const lossGain = totalAttributeValue(lossResult.roster) - totalAttributeValue(weakRoster)
    expect(lossGain).toBeGreaterThan(0)
  })
})

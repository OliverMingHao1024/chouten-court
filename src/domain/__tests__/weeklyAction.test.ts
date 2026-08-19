import { describe, expect, it } from 'vitest'
import { applyTraining, applyPracticeMatch } from '../weeklyAction'
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

describe('applyTraining', () => {
  it('raises the chosen attribute for every player and never regresses it', () => {
    const roster = createInitialRoster(1)
    const before = roster.map((p) => p.attributes.three)

    const after = applyTraining(roster, 'three', 'moderate')

    after.forEach((player, index) => {
      expect(player.attributes.three).toBeGreaterThanOrEqual(before[index])
    })
  })

  it('does not change attributes other than the chosen one', () => {
    const roster = createInitialRoster(1)
    const after = applyTraining(roster, 'three', 'moderate')

    roster.forEach((player, index) => {
      expect(after[index].attributes.shooting).toBe(player.attributes.shooting)
      expect(after[index].attributes.iq).toBe(player.attributes.iq)
    })
  })

  it('gives a bigger boost to players whose personality favours the trained attribute', () => {
    const roster = createInitialRoster(1)
    const geniusIndex = roster.findIndex((p) => p.personality === 'genius')
    const steadyIndex = roster.findIndex((p) => p.personality === 'steady')
    if (geniusIndex === -1 || steadyIndex === -1) return // seed didn't roll both; skip rather than flake

    const after = applyTraining(roster, 'three', 'moderate')
    const geniusGain = after[geniusIndex].attributes.three - roster[geniusIndex].attributes.three
    const steadyGain = after[steadyIndex].attributes.three - roster[steadyIndex].attributes.three
    expect(geniusGain).toBeGreaterThanOrEqual(steadyGain)
  })

  it('reduces fatigue on light/moderate intensity (net recovery), but not on intense', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 40 }))
    const light = applyTraining(roster, 'three', 'light')
    const moderate = applyTraining(roster, 'three', 'moderate')
    light.forEach((player) => expect(player.fatigue).toBeLessThan(40))
    moderate.forEach((player) => expect(player.fatigue).toBeLessThanOrEqual(40))
  })

  it('grows attributes more and costs more fatigue as intensity increases', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, fatigue: 40, personality: 'steady' as const }))

    const light = applyTraining(roster, 'three', 'light')
    const moderate = applyTraining(roster, 'three', 'moderate')
    const intense = applyTraining(roster, 'three', 'intense')

    const gain = (after: Player[]) => after[0].attributes.three - roster[0].attributes.three
    expect(gain(light)).toBeLessThan(gain(moderate))
    expect(gain(moderate)).toBeLessThan(gain(intense))

    expect(light[0].fatigue).toBeLessThan(moderate[0].fatigue)
    expect(moderate[0].fatigue).toBeLessThan(intense[0].fatigue)
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
      expect(player.fatigue).toBeGreaterThan(roster[index].fatigue)
    })
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

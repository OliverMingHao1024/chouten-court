import { describe, expect, it } from 'vitest'
import type { GameSummaryResult } from './GameSummaryDialog'
import { deriveGameSummaryNextStep, deriveGameSummaryReasons } from './gameSummaryReasons'

function makeResult(overrides: Partial<GameSummaryResult> = {}): GameSummaryResult {
  return {
    outcome: 'win',
    strengthBefore: 60,
    strengthAfter: 58,
    players: [
      { playerId: 'p1', playerName: '球員01', role: 'starter', fatigueBefore: 20, fatigueAfter: 40, grewAttribute: null },
    ],
    newInjuries: [],
    ...overrides,
  }
}

describe('deriveGameSummaryReasons', () => {
  it('returns no reasons when nothing notable happened', () => {
    expect(deriveGameSummaryReasons(makeResult())).toEqual([])
  })

  it('leads with new injuries as the most important reason', () => {
    const reasons = deriveGameSummaryReasons(
      makeResult({ newInjuries: [{ playerName: '球員02', status: 'minor', weeksRemaining: 2, fatigueBeforeGame: 85 }] }),
    )
    expect(reasons[0]).toContain('球員02')
    expect(reasons[0]).toContain('新傷')
  })

  it('flags an exhausted starter but not an exhausted rotation player or a healthy starter', () => {
    const reasons = deriveGameSummaryReasons(
      makeResult({
        players: [
          { playerId: 'p1', playerName: '疲勞先發', role: 'starter', fatigueBefore: 60, fatigueAfter: 90, grewAttribute: null },
          { playerId: 'p2', playerName: '疲勞替補', role: 'rotation', fatigueBefore: 60, fatigueAfter: 90, grewAttribute: null },
          { playerId: 'p3', playerName: '健康先發', role: 'starter', fatigueBefore: 20, fatigueAfter: 30, grewAttribute: null },
        ],
      }),
    )
    expect(reasons.some((r) => r.includes('疲勞先發'))).toBe(true)
    expect(reasons.some((r) => r.includes('疲勞替補'))).toBe(false)
    expect(reasons.some((r) => r.includes('健康先發'))).toBe(false)
  })

  it('names players who grew an attribute this game', () => {
    const reasons = deriveGameSummaryReasons(
      makeResult({
        players: [
          { playerId: 'p1', playerName: '成長球員', role: 'starter', fatigueBefore: 20, fatigueAfter: 40, grewAttribute: 'three' },
        ],
      }),
    )
    expect(reasons[0]).toContain('成長球員')
    expect(reasons[0]).toContain('三分+1')
  })

  it('caps the list at 3 reasons, ranked injuries > fatigue > growth', () => {
    const reasons = deriveGameSummaryReasons(
      makeResult({
        newInjuries: [
          { playerName: '傷員A', status: 'minor', weeksRemaining: 1, fatigueBeforeGame: 80 },
          { playerName: '傷員B', status: 'major', weeksRemaining: 4, fatigueBeforeGame: 90 },
        ],
        players: [
          { playerId: 'p1', playerName: '疲勞員', role: 'starter', fatigueBefore: 60, fatigueAfter: 90, grewAttribute: null },
          { playerId: 'p2', playerName: '成長員', role: 'starter', fatigueBefore: 20, fatigueAfter: 30, grewAttribute: 'iq' },
        ],
      }),
    )
    expect(reasons).toHaveLength(3)
    expect(reasons[0]).toContain('傷員A')
    expect(reasons[1]).toContain('傷員B')
    expect(reasons[2]).toContain('疲勞員')
  })
})

describe('deriveGameSummaryNextStep', () => {
  it('prioritizes new injuries over everything else', () => {
    const nextStep = deriveGameSummaryNextStep(
      makeResult({
        outcome: 'loss',
        newInjuries: [{ playerName: '球員02', status: 'major', weeksRemaining: 4, fatigueBeforeGame: 90 }],
        players: [
          { playerId: 'p1', playerName: '疲勞員', role: 'starter', fatigueBefore: 60, fatigueAfter: 90, grewAttribute: null },
        ],
      }),
    )
    expect(nextStep).toContain('球員02')
    expect(nextStep).toContain('傷勢')
  })

  it('suggests rest for an exhausted starter when there is no new injury', () => {
    const nextStep = deriveGameSummaryNextStep(
      makeResult({
        players: [
          { playerId: 'p1', playerName: '疲勞員', role: 'starter', fatigueBefore: 60, fatigueAfter: 90, grewAttribute: null },
        ],
      }),
    )
    expect(nextStep).toContain('疲勞員')
    expect(nextStep).toContain('休養')
  })

  it('suggests reviewing tactics after a loss with no injuries or exhaustion', () => {
    expect(deriveGameSummaryNextStep(makeResult({ outcome: 'loss' }))).toContain('戰術')
  })

  it('suggests keeping the current rhythm after a clean win', () => {
    expect(deriveGameSummaryNextStep(makeResult({ outcome: 'win' }))).toContain('現有節奏')
  })
})

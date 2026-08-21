import { describe, expect, it } from 'vitest'
import { describePlayerStatus } from '../playerStatus'
import { createInitialRoster } from '../roster'
import type { Player } from '../types'

function basePlayer(overrides: Partial<Player>): Player {
  const [player] = createInitialRoster(1, 1)
  return { ...player, ...overrides }
}

describe('describePlayerStatus', () => {
  it('leads with major injury status over anything else', () => {
    const player = basePlayer({ injuryStatus: 'major', injuryWeeksRemaining: 4, fatigue: 5 })
    const status = describePlayerStatus(player)
    expect(status.tone).toBe('injury')
    expect(status.text).toContain('4 週')
  })

  it('leads with minor injury status', () => {
    const player = basePlayer({ injuryStatus: 'minor', injuryWeeksRemaining: 2, fatigue: 5 })
    expect(describePlayerStatus(player).tone).toBe('injury')
  })

  it('flags a returning player even at low fatigue', () => {
    const player = basePlayer({ injuryStatus: 'returning', injuryWeeksRemaining: 0, fatigue: 5 })
    expect(describePlayerStatus(player).tone).toBe('injury')
  })

  it('flags high fatigue for a healthy player before praising their attributes', () => {
    const player = basePlayer({ injuryStatus: 'healthy', fatigue: 85 })
    expect(describePlayerStatus(player).tone).toBe('fatigue')
  })

  it('is thriving when healthy and well rested', () => {
    const player = basePlayer({ injuryStatus: 'healthy', fatigue: 10 })
    expect(describePlayerStatus(player).tone).toBe('thriving')
  })

  it('is steady when healthy with moderate fatigue', () => {
    const player = basePlayer({ injuryStatus: 'healthy', fatigue: 50 })
    expect(describePlayerStatus(player).tone).toBe('steady')
  })

  it('always mentions the player name', () => {
    const player = basePlayer({ name: '測試球員', injuryStatus: 'healthy', fatigue: 50 })
    expect(describePlayerStatus(player).text).toContain('測試球員')
  })
})

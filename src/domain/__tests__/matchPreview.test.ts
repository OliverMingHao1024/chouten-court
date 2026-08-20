import { describe, expect, it } from 'vitest'
import { computeMatchPreview } from '../matchPreview'
import { createInitialRoster } from '../roster'
import { DEFAULT_TACTICS } from '../tactics'
import type { GameLineup } from '../lineup'
import type { OpponentAce } from '../opponentAce'
import { HIGH_FATIGUE_RISK_THRESHOLD } from '../matchEngine'

const testAce: OpponentAce = { name: '測試王牌', scoring: 80, shooting: 70 }

function fullLineup(roster: ReturnType<typeof createInitialRoster>): GameLineup {
  return { starters: roster.slice(0, 5).map((p) => p.id), rotation: roster.slice(5, 8).map((p) => p.id) }
}

describe('computeMatchPreview', () => {
  it('does not consume any randomness (baseline win probability is stable across calls)', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const a = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    const b = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(a).toEqual(b)
  })

  it('reports a positive fatigue penalty for a tired roster, zero for a fresh one', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const fresh = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(fresh.fatiguePenalty).toBe(0)

    const tired = roster.map((p) => ({ ...p, fatigue: 100 }))
    const tiredPreview = computeMatchPreview(tired, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(tiredPreview.fatiguePenalty).toBeGreaterThan(0)
  })

  it('lists the attributes boosted by the current tactic', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const preview = computeMatchPreview(roster, lineup, { offense: 'fast', defense: 'manToMan' }, 'qualifying', testAce)
    expect(preview.boostedAttributes).toContain('athletic')
    expect(preview.boostedAttributes).toContain('defense')
  })

  it('computes role-based expected fatigue deltas: starter > rotation > bench', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const preview = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(preview.roleFatigueDelta.starter).toBeGreaterThan(preview.roleFatigueDelta.rotation)
    expect(preview.roleFatigueDelta.rotation).toBeGreaterThan(preview.roleFatigueDelta.bench)
  })

  it('flags high-fatigue players in the lineup as high risk, but not bench players', () => {
    const roster = createInitialRoster(1).map((p, i) => ({
      ...p,
      fatigue: i === 0 || i === 9 ? HIGH_FATIGUE_RISK_THRESHOLD : 0,
    }))
    const lineup: GameLineup = { starters: [roster[0].id], rotation: [] }
    const preview = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(preview.highRiskPlayerIds).toContain(roster[0].id)
    expect(preview.highRiskPlayerIds).not.toContain(roster[9].id) // high fatigue but benched
  })

  it('gives a stronger opponent ace a higher opponent strength and tier', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const weakAce: OpponentAce = { name: 'weak', scoring: 70, shooting: 60 }
    const strongAce: OpponentAce = { name: 'strong', scoring: 99, shooting: 95 }
    const weak = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', weakAce)
    const strong = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', strongAce)
    expect(strong.opponentStrength).toBeGreaterThan(weak.opponentStrength)
  })
})

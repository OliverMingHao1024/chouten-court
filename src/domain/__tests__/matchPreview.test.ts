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

  it('bases the role fatigue delta estimate on the roster\'s actual average recovery rate, not a flat constant', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    const baseline = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)

    // Every player one grade younger recovers faster (see RECOVERY_GRADE_DELTA), so the
    // estimated net fatigue change after a game should be lower (less bad) than the baseline.
    const youngerRoster = roster.map((p) => ({ ...p, grade: 1 }))
    const younger = computeMatchPreview(youngerRoster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(younger.roleFatigueDelta.starter).toBeLessThan(baseline.roleFatigueDelta.starter)
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

  it('reports whether the captain bonus is active based on the starting lineup', () => {
    const roster = createInitialRoster(1).map((p) => ({ ...p, personality: 'steady' as const }))
    const lineup = fullLineup(roster)
    const withoutCaptain = computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(withoutCaptain.captainBonusActive).toBe(false)

    const withCaptainStarter = roster.map((p, i) => (i === 0 ? { ...p, personality: 'captain' as const } : p))
    const withCaptain = computeMatchPreview(withCaptainStarter, lineup, DEFAULT_TACTICS, 'qualifying', testAce)
    expect(withCaptain.captainBonusActive).toBe(true)
    expect(withCaptain.teamStrength).toBeGreaterThan(withoutCaptain.teamStrength)

    const withCaptainOnBench = roster.map((p, i) => (i === 7 ? { ...p, personality: 'captain' as const } : p))
    expect(computeMatchPreview(withCaptainOnBench, lineup, DEFAULT_TACTICS, 'qualifying', testAce).captainBonusActive).toBe(
      false,
    )
  })

  it('reports whether the clutch bonus is active based on the season phase', () => {
    const roster = createInitialRoster(1)
    const lineup = fullLineup(roster)
    expect(computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'qualifying', testAce).clutchBonusActive).toBe(false)
    expect(computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'quarterfinal', testAce).clutchBonusActive).toBe(true)
    expect(computeMatchPreview(roster, lineup, DEFAULT_TACTICS, 'final4', testAce).clutchBonusActive).toBe(true)
  })
})

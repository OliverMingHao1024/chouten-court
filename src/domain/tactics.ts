import type { AttributeKey } from './types'
import type { AttributeWeights } from './matchEngine'

export const OFFENSE_TACTICS = ['fast', 'halfcourt'] as const
export type OffenseTactic = (typeof OFFENSE_TACTICS)[number]

export const DEFENSE_TACTICS = ['manToMan', 'zone'] as const
export type DefenseTactic = (typeof DEFENSE_TACTICS)[number]

export const OFFENSE_TACTIC_LABELS: Record<OffenseTactic, string> = {
  fast: '快攻',
  halfcourt: '半場陣地戰',
}

export const DEFENSE_TACTIC_LABELS: Record<DefenseTactic, string> = {
  manToMan: '盯人',
  zone: '聯防',
}

export interface GameTactics {
  offense: OffenseTactic
  defense: DefenseTactic
}

export const DEFAULT_TACTICS: GameTactics = { offense: 'fast', defense: 'manToMan' }

// 戰術對應屬性權重加成(原創數值,待調校):快攻放大運動能力/傳球,半場陣地戰放大投籃/三分/IQ;
// 盯人放大防守/運動能力,聯防放大防守/籃板。
const OFFENSE_WEIGHT_DELTA: Record<OffenseTactic, Partial<Record<AttributeKey, number>>> = {
  fast: { athletic: 0.3, pass: 0.2 },
  halfcourt: { shooting: 0.2, three: 0.2, iq: 0.3 },
}

const DEFENSE_WEIGHT_DELTA: Record<DefenseTactic, Partial<Record<AttributeKey, number>>> = {
  manToMan: { defense: 0.3, athletic: 0.2 },
  zone: { defense: 0.2, rebound: 0.3 },
}

export function computeTacticAttributeWeights(tactics: GameTactics): AttributeWeights {
  const weights: AttributeWeights = {}
  const apply = (delta: Partial<Record<AttributeKey, number>>) => {
    for (const [key, value] of Object.entries(delta) as [AttributeKey, number][]) {
      weights[key] = (weights[key] ?? 1) + value
    }
  }
  apply(OFFENSE_WEIGHT_DELTA[tactics.offense])
  apply(DEFENSE_WEIGHT_DELTA[tactics.defense])
  return weights
}

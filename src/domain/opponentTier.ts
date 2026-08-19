export const OPPONENT_TIERS = ['弱校', '中堅', '名門', '籃球名校'] as const
export type OpponentTier = (typeof OPPONENT_TIERS)[number]

const TIER_THRESHOLDS: Array<[OpponentTier, number]> = [
  ['籃球名校', 85],
  ['名門', 75],
  ['中堅', 60],
]

export function getOpponentTier(strength: number): OpponentTier {
  for (const [tier, min] of TIER_THRESHOLDS) {
    if (strength >= min) return tier
  }
  return '弱校'
}

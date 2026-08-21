import { ATTRIBUTE_KEYS, STYLE_KEYS, type AttributeKey, type AttributeSet, type StyleKey, type StyleTag } from './types'

export const STYLE_LABELS: Record<StyleKey, string> = {
  scoring: '得分',
  shooting: '射手',
  playmaking: '組織',
  defense: '防守',
  rebounding: '籃板',
}

/**
 * 原創權重公式,尚未依遊戲平衡調校,實作/測試階段可能調整。
 */
const STYLE_ATTRIBUTE_WEIGHTS: Record<StyleKey, Partial<Record<AttributeKey, number>>> = {
  scoring: { shooting: 0.5, athletic: 0.3, three: 0.1, iq: 0.1 },
  shooting: { three: 0.6, shooting: 0.25, iq: 0.15 },
  playmaking: { pass: 0.6, iq: 0.3, shooting: 0.1 },
  defense: { defense: 0.6, athletic: 0.2, iq: 0.2 },
  rebounding: { rebound: 0.6, defense: 0.2, athletic: 0.2 },
}

function computeStyleScores(attrs: AttributeSet): Record<StyleKey, number> {
  const scores = {} as Record<StyleKey, number>
  for (const style of STYLE_KEYS) {
    let score = 0
    for (const attribute of ATTRIBUTE_KEYS) {
      score += attrs[attribute] * (STYLE_ATTRIBUTE_WEIGHTS[style][attribute] ?? 0)
    }
    scores[style] = score
  }
  return scores
}

/** 一項屬性在球風權重表中貢獻最大的球風分類,供訓練卡池顯示「球風相性」提示使用。 */
export function primaryStyleForAttribute(attribute: AttributeKey): StyleKey | null {
  let best: StyleKey | null = null
  let bestWeight = 0
  for (const style of STYLE_KEYS) {
    const weight = STYLE_ATTRIBUTE_WEIGHTS[style][attribute] ?? 0
    if (weight > bestWeight) {
      bestWeight = weight
      best = style
    }
  }
  return best
}

export function computeStyleTag(attrs: AttributeSet): StyleTag {
  const scores = computeStyleScores(attrs)
  const ranked = [...STYLE_KEYS].sort((a, b) => scores[b] - scores[a])
  const primary = ranked[0]
  const secondary = ranked[1]
  const label =
    primary === secondary
      ? `${STYLE_LABELS[primary]}型`
      : `${STYLE_LABELS[primary]}${STYLE_LABELS[secondary]}型`
  return { primary, secondary, label }
}

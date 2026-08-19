import { STYLE_KEYS, type AttributeSet, type StyleKey, type StyleTag } from './types'

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
function computeStyleScores(attrs: AttributeSet): Record<StyleKey, number> {
  return {
    scoring: attrs.shooting * 0.5 + attrs.athletic * 0.3 + attrs.three * 0.1 + attrs.iq * 0.1,
    shooting: attrs.three * 0.6 + attrs.shooting * 0.25 + attrs.iq * 0.15,
    playmaking: attrs.pass * 0.6 + attrs.iq * 0.3 + attrs.shooting * 0.1,
    defense: attrs.defense * 0.6 + attrs.athletic * 0.2 + attrs.iq * 0.2,
    rebounding: attrs.rebound * 0.6 + attrs.defense * 0.2 + attrs.athletic * 0.2,
  }
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

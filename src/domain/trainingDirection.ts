import { primaryStyleForAttribute } from './styleTag'
import { STYLE_KEYS, type AttributeKey, type Player, type StyleKey } from './types'

// 月度訓練方向的原創數值,待調校:對應屬性的全隊訓練卡固定折扣 1 點。
export const FOCUS_DISCOUNT = 1

/**
 * 「本月焦點」不是玩家手動選的獨立系統,而是即時從當下名冊算出來的:球風主傾向
 * (styleTag.primary)人數最多的分類。名冊改變(訓練成長、招生、畢業)時,焦點會自然跟著變動,
 * 不需要額外的存檔欄位或選擇畫面。同分時依 STYLE_KEYS 的固定順序決定,確保結果穩定。
 */
export function computeTeamFocusStyle(players: Player[]): StyleKey | null {
  if (players.length === 0) return null
  const counts = new Map<StyleKey, number>()
  for (const player of players) {
    counts.set(player.styleTag.primary, (counts.get(player.styleTag.primary) ?? 0) + 1)
  }
  let best: StyleKey = STYLE_KEYS[0]
  let bestCount = -1
  for (const style of STYLE_KEYS) {
    const count = counts.get(style) ?? 0
    if (count > bestCount) {
      bestCount = count
      best = style
    }
  }
  return best
}

/** 這項屬性的全隊訓練卡,在給定的本月焦點下能拿到的折扣點數(0 表示沒有加成)。 */
export function focusDiscountForAttribute(attribute: AttributeKey, focusStyle: StyleKey | null): number {
  if (!focusStyle) return 0
  return primaryStyleForAttribute(attribute) === focusStyle ? FOCUS_DISCOUNT : 0
}

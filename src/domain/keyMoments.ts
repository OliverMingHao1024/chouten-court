import type { QuarterModifier, QuarterScore } from './quarterSimulation'

export const KEY_MOMENT_OPTIONS = ['push', 'steady', 'defense', 'auto'] as const
export type KeyMomentOption = (typeof KEY_MOMENT_OPTIONS)[number]

export const KEY_MOMENT_OPTION_LABELS: Record<KeyMomentOption, string> = {
  push: '加速反攻',
  steady: '穩紮穩打',
  defense: '收縮防守',
  auto: '交給球員自由發揮',
}

export const KEY_MOMENT_OPTION_HINTS: Record<KeyMomentOption, string> = {
  push: '搏更大的分差,但這節表現起伏也更大',
  steady: '降低這節的表現起伏,穩定拿下小幅優勢',
  defense: '把重心放在守住分差,起伏比全力反攻小',
  auto: '不特別指示戰術,維持這節原本的表現',
}

// 原創數值,待調校:三個實質選項的效果強度跟 push/steady 一致的取捨(高風險高回報 vs
// 低風險低回報),defense 走中間路線;auto 完全不介入,等同於維持全自動模擬。
export const KEY_MOMENT_MODIFIERS: Record<KeyMomentOption, QuarterModifier> = {
  push: { marginBonus: 4, varianceMultiplier: 1.6 },
  steady: { marginBonus: 2, varianceMultiplier: 0.7 },
  defense: { marginBonus: 3, varianceMultiplier: 0.85 },
  auto: { marginBonus: 0, varianceMultiplier: 1 },
}

// 分差在正負這個範圍內(原創數值,待調校)才算「比賽真的需要教練」的膠著時刻,觸發決策;
// 差距已經拉開時,教練介入與否的敘事說服力不足,直接讓比賽照跑。
export const KEY_MOMENT_MARGIN_THRESHOLD = 6

// 只有第 1~3 節結束後(0-based:0、1、2)可能跳出決策;第 4 節結束比賽已經打完,不再詢問。
const LAST_QUARTER_INDEX_ELIGIBLE_FOR_A_DECISION = 2

/**
 * 第 quarterIndex 節(0-based)結束後,是否該跳出關鍵回合決策。最後一節結束後比賽已經
 * 打完,不再詢問;其餘三節之間只要當下分差夠接近,就算成立(呼應「2~4 次」的規格範圍——
 * 三個檢查點,膠著局才會全部觸發)。
 */
export function isKeyMomentTrigger(quarterIndex: number, marginAfterQuarter: QuarterScore): boolean {
  if (quarterIndex > LAST_QUARTER_INDEX_ELIGIBLE_FOR_A_DECISION) return false
  return Math.abs(marginAfterQuarter.us - marginAfterQuarter.them) <= KEY_MOMENT_MARGIN_THRESHOLD
}

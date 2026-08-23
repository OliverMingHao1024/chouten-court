import type { CSSProperties } from 'react'

export const REVEAL_CLASS = 'result-reveal'

/**
 * 結果彈窗揭曉節奏的延遲樣式:第 index 項延遲 index * staggerMs 出現,
 * 搭配 index.css 的 .result-reveal(讀取 --reveal-delay)做逐項淡入。
 */
export function revealStyle(index: number, staggerMs = 80): CSSProperties {
  return { '--reveal-delay': `${index * staggerMs}ms` } as CSSProperties
}

/**
 * 揭曉節奏的計數器版本,給「項目數不固定、部分項目依條件才出現」的呼叫端
 * (例如賽後摘要有些區塊只在資料存在時才顯示)——每呼叫一次 next() 自動
 * 往下一個延遲格位遞增,呼叫端不用自己維護 index。
 */
export function createRevealStagger(staggerMs = 80) {
  let index = 0
  return { next: () => revealStyle(index++, staggerMs) }
}

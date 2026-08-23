import { INITIAL_REPUTATION } from './reputation'

// 開局起始情境(呼應 spec.md 第 4 節原本「MVP 尚未實作」的規劃):影響初始聲望與名冊強度,
// 不影響開局之後的任何系統——聲望、屬性此後照舊依既有規則變動,純粹是一次性的難度/敘事選擇。
export const STARTING_SCENARIOS = ['underdog', 'standard', 'contender'] as const
export type StartingScenario = (typeof STARTING_SCENARIOS)[number]

export const STARTING_SCENARIO_LABELS: Record<StartingScenario, string> = {
  underdog: '新手教練接弱校',
  standard: '一般接班',
  contender: '老牌名校接班',
}

export const STARTING_SCENARIO_DESCRIPTIONS: Record<StartingScenario, string> = {
  underdog: '聲望與名冊都偏弱,從零開始,外界期待低。',
  standard: '維持目前的預設難度。',
  contender: '一開局就是傳統強權,聲望與名冊都偏強,但外界期待也高。',
}

// 原創數值,待調校。
export const STARTING_SCENARIO_REPUTATION: Record<StartingScenario, number> = {
  underdog: 20,
  standard: INITIAL_REPUTATION,
  contender: 80,
}

// 疊加到名冊每項屬性隨機範圍上的偏移量(原創數值,待調校)。
export const STARTING_SCENARIO_ATTRIBUTE_SHIFT: Record<StartingScenario, number> = {
  underdog: -10,
  standard: 0,
  contender: 10,
}

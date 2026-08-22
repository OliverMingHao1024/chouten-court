import { createInitialRoster } from './roster'
import type { Player } from './types'

// 對手名冊人數(原創數值,待調校),沿用我方 ROSTER_SIZE 的慣例。
export const OPPONENT_ROSTER_SIZE = 12

/**
 * 對手完整名冊:直接沿用 createInitialRoster 的生成邏輯,產出一份跟我方球員同樣結構的
 * 陣容(位置、屬性、個性、球風)。只做展示用途,不參與戰力計算——正式賽的對手強度仍然是
 * PHASE_OPPONENT_STRENGTH 依賽制階段遞增,加上 opponentAce.ts 的王牌加成,這裡不重複定義
 * 一套獨立的對手戰力公式,避免兩套數字互相矛盾。呼叫端應該用跟 opponentAce/opponentStyle
 * 同一套「每屆固定、換屆才重生」的種子(見 opponentAceEraIndex),讓名冊在同一屆內保持穩定。
 */
export function generateOpponentRoster(seed: number, size: number = OPPONENT_ROSTER_SIZE): Player[] {
  return createInitialRoster(seed, size)
}

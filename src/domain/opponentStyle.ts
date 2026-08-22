import { createSeededRng } from './rng'

export const OPPONENT_STYLES = ['fastBreak', 'outside', 'interior', 'pressure', 'disciplinedDefense'] as const
export type OpponentStyleKey = (typeof OPPONENT_STYLES)[number]

export const OPPONENT_STYLE_LABELS: Record<OpponentStyleKey, string> = {
  fastBreak: '快攻型',
  outside: '外線型',
  interior: '禁區型',
  pressure: '壓迫型',
  disciplinedDefense: '防守紀律型',
}

/**
 * 依種子生成對手校隊風格標籤,跟王牌選手一樣「每屆固定、換屆才重生」(呼叫端沿用
 * opponentAceEraIndex 衍生種子)。純敘事/球探情資用途,不影響戰力或勝率計算——校隊風格
 * 真正接上戰術相性是 M2 的範圍,這裡先只做資訊層。
 */
export function generateOpponentStyle(seed: number): OpponentStyleKey {
  const rng = createSeededRng(seed)
  return OPPONENT_STYLES[Math.floor(rng() * OPPONENT_STYLES.length)]
}

// 聲望達到這個門檻才視為「已偵察」(原創數值,待調校),呼應招生/特殊能力既有的聲望解鎖慣例:
// 聲望代表學校的知名度與資源,越高才請得起/换得到對手球探情資。
export const SCOUTING_REPUTATION_THRESHOLD = 55

export function isOpponentScouted(reputation: number): boolean {
  return reputation >= SCOUTING_REPUTATION_THRESHOLD
}

// 偵察後顯示的戰力區間寬度(原創數值,待調校):故意抓一段模糊帶,不直接洩漏精確數字,
// 呼應賽前預覽本來就不顯示精確勝率的設計原則。
const STRENGTH_RANGE_WIDTH = 4

export interface StrengthRange {
  min: number
  max: number
}

export function scoutedStrengthRange(opponentStrength: number): StrengthRange {
  return {
    min: Math.round(opponentStrength - STRENGTH_RANGE_WIDTH),
    max: Math.round(opponentStrength + STRENGTH_RANGE_WIDTH),
  }
}

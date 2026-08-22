import type { Rng } from './rng'
import type { QuarterScore } from './quarterSimulation'

export interface RivalRecord {
  name: string
  wins: number
  losses: number
  /** 我方由落後翻盤獲勝時,曾經落後的最大分差;沒發生過逆轉時為 null。 */
  biggestComebackMargin: number | null
  /** 釘選當下的週數,純顯示用(方便回顧「從哪一週開始在意這所學校」)。 */
  pinnedAtWeek: number
}

// 最多同時釘選幾所宿敵學校(原創數值,待調校):對手校名池有限,釘太多會讓「宿敵」失去
// 特殊感,3 所在一輪賽程(通常 4~6 場)裡仍有機會反覆碰到,但不會場場都是熟面孔。
export const MAX_PINNED_RIVALS = 3

// 已釘選宿敵時,本場對手改成從宿敵清單抽一所的機率(原創數值,待調校):保留隨機對手的
// 新鮮感,同時讓「宿敵」夠常出現、玩家才會真的有感。沒有任何宿敵時這個機率不會生效
// (呼叫端在清單為空時直接使用原本隨機產生的校名)。
export const RIVAL_MATCHUP_CHANCE = 0.35

export function pickOpponentName(rivals: RivalRecord[], fallbackName: string, rng: Rng): string {
  if (rivals.length === 0) return fallbackName
  if (rng() < RIVAL_MATCHUP_CHANCE) {
    return rivals[Math.floor(rng() * rivals.length)].name
  }
  return fallbackName
}

/**
 * 這場比賽算不算「逆轉獲勝」:輸的話一律不算;贏的話,看逐節比分累計到目前為止,我方曾經
 * 落後過的最大分差(沒有落後過就回傳 null,不算逆轉)。純粹從已經算好的四節比分事後推算,
 * 不需要額外的比賽中狀態。
 */
export function computeComebackMargin(quarters: QuarterScore[], outcome: 'win' | 'loss'): number | null {
  if (outcome !== 'win') return null
  let runningUs = 0
  let runningThem = 0
  let maxDeficit = 0
  for (const quarter of quarters) {
    runningUs += quarter.us
    runningThem += quarter.them
    maxDeficit = Math.max(maxDeficit, runningThem - runningUs)
  }
  return maxDeficit > 0 ? maxDeficit : null
}

/** 只有已經釘選的宿敵才會累積交手紀錄;沒釘選的對手照舊只是一次性隨機校名,不佔存檔空間。 */
export function recordRivalGame(
  rivals: RivalRecord[],
  opponentName: string,
  outcome: 'win' | 'loss',
  comebackMargin: number | null,
): RivalRecord[] {
  return rivals.map((rival) => {
    if (rival.name !== opponentName) return rival
    const biggestComebackMargin =
      comebackMargin !== null && (rival.biggestComebackMargin === null || comebackMargin > rival.biggestComebackMargin)
        ? comebackMargin
        : rival.biggestComebackMargin
    return {
      ...rival,
      wins: rival.wins + (outcome === 'win' ? 1 : 0),
      losses: rival.losses + (outcome === 'loss' ? 1 : 0),
      biggestComebackMargin,
    }
  })
}

export function pinRival(rivals: RivalRecord[], name: string, totalWeek: number): RivalRecord[] {
  if (rivals.some((rival) => rival.name === name)) return rivals
  if (rivals.length >= MAX_PINNED_RIVALS) return rivals
  return [...rivals, { name, wins: 0, losses: 0, biggestComebackMargin: null, pinnedAtWeek: totalWeek }]
}

export function unpinRival(rivals: RivalRecord[], name: string): RivalRecord[] {
  return rivals.filter((rival) => rival.name !== name)
}

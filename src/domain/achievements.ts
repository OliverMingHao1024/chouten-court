import type { OfficialPhase } from './officialMatch'
import type { SeasonRecord } from './seasonSummary'

// 純紀錄性質的成就/稱號系統(呼應 spec.md 第 17 節):只做徽章解鎖與展示,不影響任何
// 數值運算——跟學校資產(schoolAssets.ts)不同,這裡沒有任何解鎖後改變選項/資訊的效果。
export const ACHIEVEMENT_KEYS = ['undefeatedSeason', 'zeroInjurySeason', 'comebackWin', 'backToBackFinal8'] as const

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number]

export const ACHIEVEMENT_LABELS: Record<AchievementKey, string> = {
  undefeatedSeason: '全勝賽季',
  zeroInjurySeason: '零傷賽季',
  comebackWin: '大逆轉',
  backToBackFinal8: '連霸八強',
}

export const ACHIEVEMENT_DESCRIPTIONS: Record<AchievementKey, string> = {
  undefeatedSeason: '單一賽季所有正式賽全部獲勝。',
  zeroInjurySeason: '單一賽季沒有任何球員新增傷勢。',
  comebackWin: '單場正式賽從大幅落後逆轉獲勝。',
  backToBackFinal8: '連續兩屆賽季都打進八強以上。',
}

// 逆轉勝門檻(原創數值,待調校):比賽過程中曾經落後達到這個分差,最終仍獲勝才算「大逆轉」。
export const COMEBACK_WIN_MARGIN_THRESHOLD = 15

export function isComebackWin(comebackMargin: number | null): boolean {
  return comebackMargin !== null && comebackMargin >= COMEBACK_WIN_MARGIN_THRESHOLD
}

export function isUndefeatedSeason(record: SeasonRecord): boolean {
  return record.wins > 0 && record.losses === 0
}

const FINAL8_OR_LATER: ReadonlySet<OfficialPhase> = new Set(['quarterfinal', 'final4'])

export function isBackToBackFinal8(careerLog: SeasonRecord[]): boolean {
  if (careerLog.length < 2) return false
  const [previous, latest] = careerLog.slice(-2)
  return FINAL8_OR_LATER.has(previous.finalPhaseReached) && FINAL8_OR_LATER.has(latest.finalPhaseReached)
}

/** 成就只會累積、不會被收回,已經解鎖過的不重複加入陣列。 */
export function unlockAchievement(achievements: AchievementKey[], key: AchievementKey): AchievementKey[] {
  return achievements.includes(key) ? achievements : [...achievements, key]
}

export function newlyUnlockedAchievements(before: AchievementKey[], after: AchievementKey[]): AchievementKey[] {
  return after.filter((key) => !before.includes(key))
}

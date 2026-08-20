import type { Final4Placement } from './officialMatch'
import type { SeasonRecord } from './seasonSummary'

// spec 原文寫「6屆(約18年,約650週)」為粗略 flavor 敘述。名冊高一到高三交錯分佈(不留級)後,
// 畢業不再是全隊同批發生,而是幾乎每年都有球員畢業;因此「屆」改為「只要當年有人畢業就算一屆」,
// 上限也對應從 6 調整為 18,延續原本「約 18 年」的生涯長度精神,不追週數精算。
export const INSURANCE_MAX_ERAS = 18

export type CareerEndReason = 'champion' | 'insuranceCap'

export function isChampionRun(placement: Final4Placement | null): boolean {
  return placement === 'champion'
}

export function hasReachedInsuranceCap(erasCompleted: number): boolean {
  return erasCompleted >= INSURANCE_MAX_ERAS
}

const PLACEMENT_RANK: Record<Final4Placement, number> = {
  champion: 4,
  runnerUp: 3,
  third: 2,
  fourth: 1,
}

export interface CareerSummary {
  totalSeasons: number
  totalWins: number
  totalLosses: number
  bestPlacement: Final4Placement | null
  reason: CareerEndReason
}

export function summarizeCareer(records: SeasonRecord[], reason: CareerEndReason): CareerSummary {
  const totalWins = records.reduce((sum, record) => sum + record.wins, 0)
  const totalLosses = records.reduce((sum, record) => sum + record.losses, 0)
  const bestPlacement = records.reduce<Final4Placement | null>((best, record) => {
    if (!record.placement) return best
    if (!best || PLACEMENT_RANK[record.placement] > PLACEMENT_RANK[best]) return record.placement
    return best
  }, null)

  return { totalSeasons: records.length, totalWins, totalLosses, bestPlacement, reason }
}

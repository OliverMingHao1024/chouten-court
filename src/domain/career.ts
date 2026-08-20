import type { Final4Placement } from './officialMatch'
import type { SeasonRecord } from './seasonSummary'

// spec 原文寫「6屆(約18年,約650週)」為粗略 flavor 敘述;實作以「屆數」(每次全隊畢業算一屆)
// 為準,與批次畢業/招生的機制邊界一致,不追週數精算。
export const INSURANCE_MAX_ERAS = 6

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

import type { Rng } from './rng'
import type { Player } from './types'

// 高中學制 3 年;超過即畢業離隊(原創配置,球員一律同屆入隊、同屆畢業,詳見 App 招生流程說明)。
export const GRADUATION_GRADE = 3

export interface AdvanceGradesResult {
  roster: Player[]
  graduates: Player[]
}

/** 每學年結束呼叫一次:全隊年級 +1,超過畢業年級的球員從名冊移除、回傳為 graduates。 */
export function advanceGrades(roster: Player[]): AdvanceGradesResult {
  const advanced = roster.map((player) => ({ ...player, grade: player.grade + 1 }))
  const graduates = advanced.filter((player) => player.grade > GRADUATION_GRADE)
  const remaining = advanced.filter((player) => player.grade <= GRADUATION_GRADE)
  return { roster: remaining, graduates }
}

export type GraduateDestination = 'proOpportunity' | 'collegeLeague' | 'furtherStudy'

const DESTINATION_TEMPLATES: Record<GraduateDestination, (name: string) => string> = {
  proOpportunity: (name) => `${name} 畢業後獲得職業球隊試訓邀約,球探們對他的未來充滿期待。`,
  collegeLeague: (name) => `${name} 進入大學籃球隊繼續打球,期待在大專聯賽發光發熱。`,
  furtherStudy: (name) => `${name} 選擇專心升學,球衣掛回衣櫃,但球場上的回憶會留一輩子。`,
}

function overallAttributeAverage(player: Player): number {
  const values = Object.values(player.attributes)
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

// 依球員最終屬性、個性標籤、當時球隊聲望做加權隨機判定去向(原創數值,待調校)。
function destinationWeights(player: Player, reputation: number): Record<GraduateDestination, number> {
  const strength = overallAttributeAverage(player)
  const reputationFactor = reputation / 100

  let proOpportunity = Math.max(0, (strength - 70) * 1.5 + reputationFactor * 10)
  if (player.personality === 'genius') proOpportunity *= 1.4

  const collegeLeague = Math.max(1, strength - 40 + reputationFactor * 5)
  const furtherStudy = Math.max(1, 100 - strength)

  return { proOpportunity, collegeLeague, furtherStudy }
}

function weightedPick(weights: Record<GraduateDestination, number>, rng: Rng): GraduateDestination {
  const entries = Object.entries(weights) as Array<[GraduateDestination, number]>
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [destination, weight] of entries) {
    if (roll < weight) return destination
    roll -= weight
  }
  return entries[entries.length - 1][0]
}

export function decideGraduateDestination(player: Player, reputation: number, rng: Rng): GraduateDestination {
  return weightedPick(destinationWeights(player, reputation), rng)
}

/** 產生一段畢業生後日談文字;純敘事彩蛋,不影響任何主線數值。 */
export function describeGraduate(player: Player, reputation: number, rng: Rng): string {
  const destination = decideGraduateDestination(player, reputation, rng)
  return DESTINATION_TEMPLATES[destination](player.name)
}

import { lineupRole, lineupWeight, type GameLineup } from './lineup'
import type { Rng } from './rng'
import type { Player } from './types'

export interface PlayerBoxLine {
  playerId: string
  points: number
  rebounds: number
  assists: number
}

// 原創數值,待調校:全隊籃板/助攻總量的基準值與隨機抖動範圍,兩者跟得分不同,不受
// simulateQuarters 的官方分數限制,單純是為了讓個人數據看起來合理而抓的原創值。
const TEAM_REBOUND_BASE = 34
const TEAM_REBOUND_VARIANCE = 6
const TEAM_ASSIST_BASE = 15
const TEAM_ASSIST_VARIANCE = 4
// 個人數據份額抖動:避免每人數據都精準跟屬性成正比,看起來太機械。
const SHARE_JITTER_RANGE = 0.3
const SHARE_JITTER_BASE = 0.85

function scoringWeight(player: Player): number {
  return (player.attributes.shooting + player.attributes.three) / 2
}

/**
 * 用「最大餘數法」把 total 依權重分配成整數:先算出每人應得的精確浮點份額,無條件捨去
 * 到整數,再把捨去掉的餘額(total 減去所有整數份額的和)依小數餘數大小由高到低,一份一份
 * 補給小數餘數最大的人。確保分配結果加總後精確等於 total,不會因為四捨五入產生誤差。
 */
function weightedIntegerSplit(total: number, weights: Array<{ id: string; weight: number }>): Map<string, number> {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
  if (weights.length === 0) return new Map()
  if (totalWeight <= 0) {
    const share = Math.floor(total / weights.length)
    const result = new Map(weights.map((w) => [w.id, share]))
    let remaining = total - share * weights.length
    for (let i = 0; i < remaining; i++) {
      const id = weights[i % weights.length].id
      result.set(id, (result.get(id) ?? 0) + 1)
    }
    return result
  }

  const exact = weights.map((w) => ({ id: w.id, value: (w.weight / totalWeight) * total }))
  const floored = exact.map((e) => ({ id: e.id, value: Math.floor(e.value), remainder: e.value - Math.floor(e.value) }))
  const result = new Map(floored.map((f) => [f.id, f.value]))
  let remaining = total - floored.reduce((sum, f) => sum + f.value, 0)
  const byRemainderDesc = [...floored].sort((a, b) => b.remainder - a.remainder)
  for (let i = 0; i < remaining && byRemainderDesc.length > 0; i++) {
    const id = byRemainderDesc[i % byRemainderDesc.length].id
    result.set(id, (result.get(id) ?? 0) + 1)
  }
  return result
}

/**
 * 把「已經算好的全隊得分」(來自 simulateQuarters 的官方最終比分,加總後必須精確相符)
 * 依出賽權重(先發/輪替,沿用 lineup.ts 既有的 6:3 戰力加權比例)與對應屬性(得分看投籃/
 * 三分平均、籃板看籃板、助攻看傳球)分配給每位有上場的球員,搭配小幅隨機抖動避免每人數據
 * 都精準跟屬性成正比。籃板/助攻的全隊總量是獨立的原創基準值,不受官方比分限制。
 * 未上場(bench)球員不出現在回傳結果中,呼應賽後摘要既有「先發與主要輪替」名單的範圍。
 */
export function distributePlayerStats(
  teamPoints: number,
  roster: Player[],
  lineup: GameLineup,
  rng: Rng,
): PlayerBoxLine[] {
  const onCourt = roster.filter((player) => lineupRole(player.id, lineup) !== 'bench')
  if (onCourt.length === 0) return []

  function weightedShare(weightFn: (player: Player) => number): Array<{ id: string; weight: number }> {
    return onCourt.map((player) => {
      const jitter = SHARE_JITTER_BASE + rng() * SHARE_JITTER_RANGE
      return { id: player.id, weight: lineupWeight(player.id, lineup) * Math.max(1, weightFn(player)) * jitter }
    })
  }

  const teamRebounds = Math.max(0, Math.round(TEAM_REBOUND_BASE + (rng() * 2 - 1) * TEAM_REBOUND_VARIANCE))
  const teamAssists = Math.max(0, Math.round(TEAM_ASSIST_BASE + (rng() * 2 - 1) * TEAM_ASSIST_VARIANCE))

  const points = weightedIntegerSplit(teamPoints, weightedShare(scoringWeight))
  const rebounds = weightedIntegerSplit(teamRebounds, weightedShare((p) => p.attributes.rebound))
  const assists = weightedIntegerSplit(teamAssists, weightedShare((p) => p.attributes.pass))

  return onCourt.map((player) => ({
    playerId: player.id,
    points: points.get(player.id) ?? 0,
    rebounds: rebounds.get(player.id) ?? 0,
    assists: assists.get(player.id) ?? 0,
  }))
}

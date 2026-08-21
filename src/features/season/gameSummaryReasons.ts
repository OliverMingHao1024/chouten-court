import { ATTRIBUTE_LABELS } from '../../domain/types'
import type { GameSummaryResult } from './GameSummaryDialog'

// 先發疲勞達到這個門檻,視為拖累本場戰力的主要原因之一(原創數值,待調校)。
const HIGH_FATIGUE_THRESHOLD = 80

/**
 * 從既有的賽後資料(疲勞、成長、新傷)組出最多 3 個主要原因,依重要性排序:
 * 新傷 > 先發過度疲勞 > 本場成長。不引入任何額外計算或劇本化敘事。
 */
export function deriveGameSummaryReasons(result: GameSummaryResult): string[] {
  const reasons: string[] = []

  for (const injury of result.newInjuries) {
    reasons.push(`${injury.playerName} 新傷(受傷前疲勞 ${injury.fatigueBeforeGame}),影響下一場輪替`)
  }

  for (const player of result.players) {
    if (player.role === 'starter' && player.fatigueAfter >= HIGH_FATIGUE_THRESHOLD) {
      reasons.push(`${player.playerName} 疲勞過高(${player.fatigueAfter}),拖累體能`)
    }
  }

  for (const player of result.players) {
    if (player.grewAttribute) {
      reasons.push(`${player.playerName} 本場成長 ${ATTRIBUTE_LABELS[player.grewAttribute]}+1`)
    }
  }

  return reasons.slice(0, 3)
}

/** 下一步建議只點出最需要處理的一件事,不重複列出上面已經看得到的所有原因。 */
export function deriveGameSummaryNextStep(result: GameSummaryResult): string {
  if (result.newInjuries.length > 0) {
    const names = result.newInjuries.map((injury) => injury.playerName).join('、')
    return `安排休養或調整輪替,留意 ${names} 的傷勢。`
  }

  const exhaustedStarters = result.players.filter(
    (player) => player.role === 'starter' && player.fatigueAfter >= HIGH_FATIGUE_THRESHOLD,
  )
  if (exhaustedStarters.length > 0) {
    const names = exhaustedStarters.map((player) => player.playerName).join('、')
    return `考慮讓 ${names} 休養或減少上場時間。`
  }

  if (result.outcome === 'loss') return '檢視戰術與陣容,準備下一場。'
  return '保持現有節奏,準備下一場。'
}

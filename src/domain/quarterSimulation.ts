import type { Rng } from './rng'

export interface QuarterScore {
  us: number
  them: number
}

export interface QuarterSimulationResult {
  quarters: QuarterScore[]
  final: QuarterScore
  outcome: 'win' | 'loss'
}

const QUARTER_COUNT = 4
// 原創數值,待調校:每節基礎分數、獨立抖動範圍,以及戰力差換算成分差的縮放比例。
const QUARTER_BASE_SCORE = 17
const QUARTER_SCORE_JITTER = 6
const STRENGTH_GAP_TO_MARGIN_SCALE = 0.35

function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/**
 * 正式賽逐節模擬:輸贏不再是單次擲骰決定,而是四節分數真實累加的結果。每節重新對我方
 * 戰力疊加一次隨機噪音(沿用 computePerformanceVarianceRange 決定的波動範圍,呼叫方負責
 * 算好傳進來),換算成這節的分差,再各自加上基礎分數與獨立抖動生成兩隊這節的比分,四節
 * 加總得出最終比分與輸贏——取代原本 computeMatchWinProbability 的單次擲骰模式。
 * 單場固定消耗 4 * 3 = 12 次 rng()(偶爾平手時再多 1 次當延長賽銅板決定勝方),呼叫方
 * 需固定呼叫順序才能維持「同種子可重現」。
 */
export function simulateQuarters(
  teamStrength: number,
  opponentStrength: number,
  varianceRange: number,
  rng: Rng,
): QuarterSimulationResult {
  const quarters: QuarterScore[] = []
  for (let i = 0; i < QUARTER_COUNT; i++) {
    const noise = (rng() * 2 - 1) * varianceRange
    const margin = (teamStrength + noise - opponentStrength) * STRENGTH_GAP_TO_MARGIN_SCALE
    const us = Math.max(
      0,
      Math.round(QUARTER_BASE_SCORE + margin / 2 + randomInt(rng, -QUARTER_SCORE_JITTER, QUARTER_SCORE_JITTER)),
    )
    const them = Math.max(
      0,
      Math.round(QUARTER_BASE_SCORE - margin / 2 + randomInt(rng, -QUARTER_SCORE_JITTER, QUARTER_SCORE_JITTER)),
    )
    quarters.push({ us, them })
  }

  const final = quarters.reduce((sum, q) => ({ us: sum.us + q.us, them: sum.them + q.them }), { us: 0, them: 0 })

  // 分差用連續值換算再取整,理論上仍可能撞出平手;用一次額外的 rng() 當延長賽銅板決定
  // 勝方,不重擲整場四節,避免為了避開平手而扭曲既有的四節敘事。
  const outcome: 'win' | 'loss' =
    final.us === final.them ? (rng() < 0.5 ? 'win' : 'loss') : final.us > final.them ? 'win' : 'loss'

  return { quarters, final, outcome }
}

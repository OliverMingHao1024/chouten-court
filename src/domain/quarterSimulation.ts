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

export const QUARTER_COUNT = 4
// 原創數值,待調校:每節基礎分數、獨立抖動範圍,以及戰力差換算成分差的縮放比例。
const QUARTER_BASE_SCORE = 17
const QUARTER_SCORE_JITTER = 6
const STRENGTH_GAP_TO_MARGIN_SCALE = 0.35

/** 關鍵回合決策對這一節的效果:固定加在分差上的加成,以及疊加在噪音上的波動倍率。 */
export interface QuarterModifier {
  marginBonus: number
  varianceMultiplier: number
}

export const NEUTRAL_QUARTER_MODIFIER: QuarterModifier = { marginBonus: 0, varianceMultiplier: 1 }

function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/**
 * 單節模擬:對我方戰力疊加一次隨機噪音(沿用 computePerformanceVarianceRange 決定的波動
 * 範圍,可被 modifier.varianceMultiplier 放大/縮小),換算成這節的分差(可再疊加
 * modifier.marginBonus,供關鍵回合決策使用),最後各自加上基礎分數與獨立抖動生成兩隊
 * 這節的比分。固定消耗 3 次 rng()(噪音 1 次 + 兩隊抖動各 1 次),呼叫方需固定呼叫順序
 * 才能維持「同種子可重現」。
 */
export function simulateOneQuarter(
  teamStrength: number,
  opponentStrength: number,
  varianceRange: number,
  rng: Rng,
  modifier: QuarterModifier = NEUTRAL_QUARTER_MODIFIER,
): QuarterScore {
  const noise = (rng() * 2 - 1) * varianceRange * modifier.varianceMultiplier
  const margin = (teamStrength + noise - opponentStrength) * STRENGTH_GAP_TO_MARGIN_SCALE + modifier.marginBonus
  const us = Math.max(
    0,
    Math.round(QUARTER_BASE_SCORE + margin / 2 + randomInt(rng, -QUARTER_SCORE_JITTER, QUARTER_SCORE_JITTER)),
  )
  const them = Math.max(
    0,
    Math.round(QUARTER_BASE_SCORE - margin / 2 + randomInt(rng, -QUARTER_SCORE_JITTER, QUARTER_SCORE_JITTER)),
  )
  return { us, them }
}

export function sumQuarters(quarters: QuarterScore[]): QuarterScore {
  return quarters.reduce((sum, q) => ({ us: sum.us + q.us, them: sum.them + q.them }), { us: 0, them: 0 })
}

/**
 * 四節分數加總後決定輸贏;分差用連續值換算再取整,理論上仍可能撞出平手,用一次額外的
 * rng() 當延長賽銅板決定勝方,不重擲整場四節,避免為了避開平手而扭曲既有的四節敘事。
 */
export function decideOutcome(final: QuarterScore, rng: Rng): 'win' | 'loss' {
  if (final.us === final.them) return rng() < 0.5 ? 'win' : 'loss'
  return final.us > final.them ? 'win' : 'loss'
}

/**
 * 正式賽逐節模擬(全自動版):輸贏不再是單次擲骰決定,而是四節分數真實累加的結果——取代
 * 原本 computeMatchWinProbability 的單次擲骰模式。單場固定消耗 4 * 3 = 12 次 rng()
 * (偶爾平手時再多 1 次當延長賽銅板決定勝方)。逐節搭配關鍵回合決策的互動版路徑改用
 * simulateOneQuarter/decideOutcome 自行分次呼叫,不走這個函式。
 */
export function simulateQuarters(
  teamStrength: number,
  opponentStrength: number,
  varianceRange: number,
  rng: Rng,
): QuarterSimulationResult {
  const quarters: QuarterScore[] = []
  for (let i = 0; i < QUARTER_COUNT; i++) {
    quarters.push(simulateOneQuarter(teamStrength, opponentStrength, varianceRange, rng))
  }
  const final = sumQuarters(quarters)
  const outcome = decideOutcome(final, rng)
  return { quarters, final, outcome }
}

import { generatePersonName } from './nameGenerator'
import { createSeededRng, type Rng } from './rng'

export interface OpponentAce {
  name: string
  scoring: number
  shooting: number
}

const SCORING_RANGE = { min: 70, max: 99 }
const SHOOTING_RANGE = { min: 60, max: 95 }

// 王牌對對手強度的加成(原創數值,待調校):(得分+三分)/2 * 0.15,約在 9.75~14.85 之間。
const ACE_STRENGTH_SCALE = 0.15

function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/** 依種子生成一名對手王牌選手,固定屬性。 */
export function generateOpponentAce(seed: number): OpponentAce {
  const rng = createSeededRng(seed)
  return {
    name: generatePersonName(rng),
    scoring: randomInt(rng, SCORING_RANGE.min, SCORING_RANGE.max),
    shooting: randomInt(rng, SHOOTING_RANGE.min, SHOOTING_RANGE.max),
  }
}

export function computeAceStrengthBonus(ace: OpponentAce): number {
  return ((ace.scoring + ace.shooting) / 2) * ACE_STRENGTH_SCALE
}

/** 球探情資用的一句話弱點描述:單純比較王牌自己的兩項屬性,較低的那項當作弱點。 */
export function describeAceWeakness(ace: OpponentAce): string {
  return ace.scoring < ace.shooting ? '得分能力較弱' : '三分準度較弱'
}

// 王牌選手「每屆重新生成一次,同屆 3 年不變」與名冊招生/畢業的「屆」是兩個獨立概念
// (名冊自從交錯分佈後幾乎每年都有畢業生,不再對應 3 年週期):王牌固定每 3 個實際生涯年
// 換一次,直接依生涯年數計算,不受招生/畢業事件影響。
export const ACE_ERA_LENGTH_YEARS = 3

export function opponentAceEraIndex(careerYear: number): number {
  return Math.floor((careerYear - 1) / ACE_ERA_LENGTH_YEARS)
}

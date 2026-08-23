import { learnableAbilitiesForPlayer, SPECIAL_ABILITY_ATTRIBUTE, type SpecialAbilityKey } from './specialAbilities'
import {
  cardCost,
  cardEffectTier,
  MAX_CARDS_PER_WEEK,
  type PoolCard,
  type TrainingCardPoolState,
} from './trainingCardPool'
import type { CardSelection } from './trainingCardResolution'
import { computeTeamFocusStyle } from './trainingDirection'
import { ATTRIBUTE_KEYS, type Player } from './types'
import { PRACTICE_STRENGTHS, type PracticeStrength } from './weeklyAction'

// 練習賽強度預設值(原創決策):中等強度是「有成長機會、風險可控」的折衷選擇,不偏向
// 保守的最弱或高風險的最強,呼應「快速選擇」定位是給不想每週細調的玩家的合理預設。
const DEFAULT_PRACTICE_STRENGTH: PracticeStrength = PRACTICE_STRENGTHS[Math.floor(PRACTICE_STRENGTHS.length / 2)]

function isTrainable(player: Player): boolean {
  return player.injuryStatus === 'healthy' || player.injuryStatus === 'returning'
}

function overallAttributeAverage(player: Player): number {
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + player.attributes[key], 0) / ATTRIBUTE_KEYS.length
}

/** 選出這名球員目前學得到的能力裡,對應屬性最高(學習成功率最高)的一項。 */
function bestLearnableAbility(player: Player, learnable: SpecialAbilityKey[]): SpecialAbilityKey {
  return learnable.reduce((best, ability) =>
    player.attributes[SPECIAL_ABILITY_ATTRIBUTE[ability]] > player.attributes[SPECIAL_ABILITY_ATTRIBUTE[best]]
      ? ability
      : best,
  )
}

/** 綜合屬性最高、且目前還有能力可學的球員優先,找不到就回傳 null(留給畫面提示手動選)。 */
function suggestIndividualTrainingTarget(
  players: Player[],
  reputation: number,
  bonusAbilitySlots: number,
): { playerId: string; ability: SpecialAbilityKey } | null {
  const candidates = players.filter(isTrainable).sort((a, b) => overallAttributeAverage(b) - overallAttributeAverage(a))
  for (const player of candidates) {
    const learnable = learnableAbilitiesForPlayer(player, reputation, bonusAbilitySlots)
    if (learnable.length > 0) {
      return { playerId: player.id, ability: bestLearnableAbility(player, learnable) }
    }
  }
  return null
}

/**
 * 「快速選擇」的核心邏輯:依「效果強度/花費」的性價比由高到低貪心選卡,在預算與每週
 * 上限內選好選滿,個別訓練/練習賽的子選項也一併給出合理預設——不是最優解,而是不想
 * 每週細調時可以直接採用、也可以再手動調整的起點,呼應既有陣容畫面「一鍵建議陣容」的精神。
 */
export function suggestTrainingCardSelections(
  pool: TrainingCardPoolState,
  players: Player[],
  trainingPoints: number,
  reputation: number,
  maxCardsPerWeek: number = MAX_CARDS_PER_WEEK,
  bonusAbilitySlots = 0,
): CardSelection[] {
  const focusStyle = computeTeamFocusStyle(players)

  const ranked = [...pool.cards]
    .map((card) => ({ card, cost: cardCost(card, focusStyle), tier: cardEffectTier(card) }))
    .sort((a, b) => b.tier / b.cost - a.tier / a.cost || a.cost - b.cost)

  const chosen: PoolCard[] = []
  let remaining = trainingPoints
  for (const { card, cost } of ranked) {
    if (chosen.length >= maxCardsPerWeek) break
    if (cost > remaining) continue
    chosen.push(card)
    remaining -= cost
  }

  return chosen.map((card): CardSelection => {
    if (card.kind === 'individualTraining') {
      const target = suggestIndividualTrainingTarget(players, reputation, bonusAbilitySlots)
      return target ? { card, playerId: target.playerId, ability: target.ability } : { card }
    }
    if (card.kind === 'practiceMatch') {
      return { card, strength: DEFAULT_PRACTICE_STRENGTH }
    }
    return { card }
  })
}

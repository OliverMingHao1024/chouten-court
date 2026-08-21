import { REPUTATION_MAX } from './reputation'
import type { Rng } from './rng'
import { focusDiscountForAttribute } from './trainingDirection'
import { ATTRIBUTE_KEYS, type AttributeKey, type StyleKey } from './types'

// 白球のキセキ研究(docs/training-card-pool-plan.md)交叉驗證過上限/回復量隨評判連續變化,
// 但沒有任何來源公開過個別卡片的起始成本/效果或衰減幅度,以下數值皆為本專案原創,待調校。

export const CARD_POOL_SIZE = 9
export const MAX_CARDS_PER_WEEK = 3
export const MAX_EFFECT_TIER = 3
export const MIN_EFFECT_TIER = 1
export const MIN_CARD_COST = 1
export const MAX_CARD_AGE = CARD_POOL_SIZE - 1

export const CARD_KINDS = ['teamTraining', 'individualTraining', 'practiceMatch', 'rest'] as const
export type CardKind = (typeof CARD_KINDS)[number]

const BASE_COST: Record<CardKind, number> = {
  teamTraining: 3,
  individualTraining: 2,
  practiceMatch: 4,
  rest: 1,
}

// 訓練點數上限/回復量隨聲望(0~100)連續內插,對齊研究到的白球範圍(弱小 7/3 ~ 超名門 12/8)。
const MIN_MAX_POINTS = 7
const MAX_MAX_POINTS = 12
const MIN_RECOVERY = 3
const MAX_RECOVERY = 8

export interface PoolCard {
  id: string
  kind: CardKind
  /** 只有 teamTraining 會設定;其他卡種選中後才在畫面上額外決定球員/屬性/強度。 */
  attribute: AttributeKey | null
  /** 這張卡在池中待了幾週還沒被選中;0 表示剛補進來的新卡。 */
  age: number
}

export interface TrainingCardPoolState {
  cards: PoolCard[]
  nextCardId: number
}

/**
 * focusStyle 為選填的「本月焦點」(見 trainingDirection.ts):即時算出的球風分類,
 * 對應屬性的全隊訓練卡會拿到固定折扣。省略時行為與過去完全相同。
 */
export function cardCost(card: PoolCard, focusStyle: StyleKey | null = null): number {
  const base = Math.max(MIN_CARD_COST, BASE_COST[card.kind] - card.age)
  if (card.kind !== 'teamTraining' || !card.attribute) return base
  const discount = focusDiscountForAttribute(card.attribute, focusStyle)
  return Math.max(MIN_CARD_COST, base - discount)
}

export function cardEffectTier(card: PoolCard): number {
  return Math.max(MIN_EFFECT_TIER, MAX_EFFECT_TIER - card.age)
}

/** 0~1 的效果倍率,由卡片新鮮度(effectTier)換算,套用在既有的成長/恢復計算上。 */
export function cardEffectMultiplier(card: PoolCard): number {
  return cardEffectTier(card) / MAX_EFFECT_TIER
}

export function maxTrainingPoints(reputation: number): number {
  return Math.round(MIN_MAX_POINTS + (reputation / REPUTATION_MAX) * (MAX_MAX_POINTS - MIN_MAX_POINTS))
}

export function trainingPointsRecovery(reputation: number): number {
  return Math.round(MIN_RECOVERY + (reputation / REPUTATION_MAX) * (MAX_RECOVERY - MIN_RECOVERY))
}

export function recoverTrainingPoints(current: number, reputation: number): number {
  return Math.min(maxTrainingPoints(reputation), current + trainingPointsRecovery(reputation))
}

export function totalCost(cards: PoolCard[], focusStyle: StyleKey | null = null): number {
  return cards.reduce((sum, card) => sum + cardCost(card, focusStyle), 0)
}

/** 是否能同時選這些卡:張數不超過每週上限,且總花費不超過剩餘點數。 */
export function canSelectCards(cards: PoolCard[], remainingPoints: number, focusStyle: StyleKey | null = null): boolean {
  return cards.length > 0 && cards.length <= MAX_CARDS_PER_WEEK && totalCost(cards, focusStyle) <= remainingPoints
}

// 同類卡疊加時額外再乘一次的效果倍率(原創數值,待調校)。
export const COMBO_BONUS_MULTIPLIER = 1.3

/** 同時選中兩張以上同屬性的全隊訓練卡,才算成立同類疊加(對應官方確認過的「△」)。 */
export function comboAttributes(selectedCards: PoolCard[]): AttributeKey[] {
  const counts = new Map<AttributeKey, number>()
  for (const card of selectedCards) {
    if (card.kind !== 'teamTraining' || !card.attribute) continue
    counts.set(card.attribute, (counts.get(card.attribute) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([attribute]) => attribute)
}

function randomCardTemplate(rng: Rng): { kind: CardKind; attribute: AttributeKey | null } {
  // 10 種等機率模板:7 個屬性各自一種、加上個別訓練/練習賽/休養(原創分佈,待調校)。
  const roll = Math.floor(rng() * (ATTRIBUTE_KEYS.length + 3))
  if (roll < ATTRIBUTE_KEYS.length) {
    return { kind: 'teamTraining', attribute: ATTRIBUTE_KEYS[roll] }
  }
  const otherKinds: CardKind[] = ['individualTraining', 'practiceMatch', 'rest']
  return { kind: otherKinds[roll - ATTRIBUTE_KEYS.length], attribute: null }
}

export function createInitialCardPool(seedRng: Rng): TrainingCardPoolState {
  const cards: PoolCard[] = []
  for (let i = 0; i < CARD_POOL_SIZE; i++) {
    const template = randomCardTemplate(seedRng)
    cards.push({ id: `card-${i}`, kind: template.kind, attribute: template.attribute, age: 0 })
  }
  return { cards, nextCardId: CARD_POOL_SIZE }
}

export interface AdvanceCardPoolResult {
  state: TrainingCardPoolState
  /** 這次結算才消失的卡(存活太久沒被選中),回傳出來方便畫面顯示原因。 */
  expired: PoolCard[]
}

/**
 * 把已選中的卡從池中移除,其餘卡片年齡 +1(成本/效果隨之遞減);超過存活上限的卡消失,
 * 空出的位置補新卡,補到 CARD_POOL_SIZE 張滿。
 */
export function advanceCardPool(
  state: TrainingCardPoolState,
  selectedIds: string[],
  rng: Rng,
): AdvanceCardPoolResult {
  const selected = new Set(selectedIds)
  const aged = state.cards
    .filter((card) => !selected.has(card.id))
    .map((card) => ({ ...card, age: card.age + 1 }))

  const expired = aged.filter((card) => card.age > MAX_CARD_AGE)
  const remaining = aged.filter((card) => card.age <= MAX_CARD_AGE)

  let nextCardId = state.nextCardId
  const freshCards: PoolCard[] = []
  for (let i = remaining.length; i < CARD_POOL_SIZE; i++) {
    const template = randomCardTemplate(rng)
    freshCards.push({ id: `card-${nextCardId}`, kind: template.kind, attribute: template.attribute, age: 0 })
    nextCardId += 1
  }

  return { state: { cards: [...remaining, ...freshCards], nextCardId }, expired }
}

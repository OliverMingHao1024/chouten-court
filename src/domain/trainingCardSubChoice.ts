import type { SpecialAbilityKey } from './specialAbilities'
import type { PoolCard } from './trainingCardPool'
import type { CardSelection } from './trainingCardResolution'
import type { PracticeStrength } from './weeklyAction'

/**
 * 個別訓練卡需要選球員+能力、練習賽卡需要選強度,這條「哪種卡對應哪種子選項欄位」的規則
 * 只在這裡出現一次;呼叫端(畫面/快速選擇)只認得 SubChoiceState 這個統一容器,不必各自
 * 知道欄位形狀。
 */
export type SubChoiceValue =
  | { kind: 'individualTraining'; playerId?: string; ability?: SpecialAbilityKey }
  | { kind: 'practiceMatch'; strength: PracticeStrength }

export type SubChoiceState = Record<string, SubChoiceValue>

export function isSubChoiceComplete(card: PoolCard, choices: SubChoiceState): boolean {
  const choice = choices[card.id]
  if (card.kind === 'individualTraining') {
    return choice?.kind === 'individualTraining' && !!choice.playerId && !!choice.ability
  }
  if (card.kind === 'practiceMatch') {
    return choice?.kind === 'practiceMatch' && !!choice.strength
  }
  return true
}

export function toCardSelection(card: PoolCard, choices: SubChoiceState): CardSelection {
  const choice = choices[card.id]
  if (card.kind === 'individualTraining' && choice?.kind === 'individualTraining') {
    return { card, playerId: choice.playerId, ability: choice.ability }
  }
  if (card.kind === 'practiceMatch' && choice?.kind === 'practiceMatch') {
    return { card, strength: choice.strength }
  }
  return { card }
}

/** 把「快速選擇」建議的 CardSelection 換算回子選項狀態,填入畫面上的 select/按鈕。 */
export function subChoiceFromSelection(selection: CardSelection): SubChoiceValue | undefined {
  if (selection.card.kind === 'individualTraining') {
    return { kind: 'individualTraining', playerId: selection.playerId, ability: selection.ability }
  }
  if (selection.card.kind === 'practiceMatch' && selection.strength) {
    return { kind: 'practiceMatch', strength: selection.strength }
  }
  return undefined
}

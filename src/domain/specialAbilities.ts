import { ATTRIBUTE_MAX } from './matchEngine'
import { REPUTATION_MAX } from './reputation'
import type { Rng } from './rng'
import type { AttributeKey, Player } from './types'

// 特殊能力是後天習得、可同時持有多項的系統,跟天生固定、單一的「個性」完全獨立
// (見 docs/special-abilities-plan.md、ADR 0003)。12/13(關鍵殺手/關鍵三分)需要比賽引擎
// 有分差資料才能生效,目前保留在型別裡但不開放學習,等比賽引擎升級後再納入 LEARNABLE 清單。

export const SPECIAL_ABILITY_KEYS = [
  'deadeyeShooter',
  'paintBeast',
  'reboundMachine',
  'passingArtist',
  'ironWall',
  'teamSoul',
  'chokeHold',
  'steadyAnchor',
  'ironBody',
  'ironHeart',
  'clutchAce',
  'gameWinner',
  'clutchThree',
  'inGameGrower',
  'quickRecovery',
] as const

export type SpecialAbilityKey = (typeof SPECIAL_ABILITY_KEYS)[number]

export const SPECIAL_ABILITY_LABELS: Record<SpecialAbilityKey, string> = {
  deadeyeShooter: '神射手',
  paintBeast: '禁區怪力',
  reboundMachine: '籤板機器',
  passingArtist: '傳球藝術家',
  ironWall: '鐵閘',
  teamSoul: '隊魂領袖',
  chokeHold: '鎖喉夾擊',
  steadyAnchor: '定海神針',
  ironBody: '玄鐵之軀',
  ironHeart: '鋼鐵般的心臟',
  clutchAce: '抗壓王牌',
  gameWinner: '關鍵殺手',
  clutchThree: '關鍵三分',
  inGameGrower: '實戰成長者',
  quickRecovery: '快速回復',
}

/** 決定學習成功率的對應屬性;每項能力都掛在一個既有屬性上。 */
export const SPECIAL_ABILITY_ATTRIBUTE: Record<SpecialAbilityKey, AttributeKey> = {
  deadeyeShooter: 'three',
  paintBeast: 'shooting',
  reboundMachine: 'rebound',
  passingArtist: 'pass',
  ironWall: 'defense',
  teamSoul: 'iq',
  chokeHold: 'defense',
  steadyAnchor: 'athletic',
  ironBody: 'athletic',
  ironHeart: 'athletic',
  clutchAce: 'pass',
  gameWinner: 'shooting',
  clutchThree: 'three',
  inGameGrower: 'iq',
  quickRecovery: 'iq',
}

// 12(關鍵殺手)、13(關鍵三分)需要比賽引擎有分差資料才能生效,先不開放學習,避免玩家
// 練成一個目前什麼都不會做的能力。
const DEFERRED_SPECIAL_ABILITIES: readonly SpecialAbilityKey[] = ['gameWinner', 'clutchThree']

export const LEARNABLE_SPECIAL_ABILITY_KEYS: readonly SpecialAbilityKey[] = SPECIAL_ABILITY_KEYS.filter(
  (key) => !DEFERRED_SPECIAL_ABILITIES.includes(key),
)

// 能力池大小隨聲望連續內插(原創數值,待調校),風格比照 trainingCardPool.ts 的
// maxTrainingPoints:不做監督清單持久化,直接用聲望決定目前解鎖到清單的第幾項。
const MIN_UNLOCKED_ABILITIES = 3
const MAX_UNLOCKED_ABILITIES = LEARNABLE_SPECIAL_ABILITY_KEYS.length

export function unlockedAbilityCount(reputation: number): number {
  return Math.round(
    MIN_UNLOCKED_ABILITIES + (reputation / REPUTATION_MAX) * (MAX_UNLOCKED_ABILITIES - MIN_UNLOCKED_ABILITIES),
  )
}

/** 目前聲望下已解鎖、可嘗試教學的能力清單(依固定順序解鎖,不是隨機挑選)。 */
export function unlockedAbilities(reputation: number): readonly SpecialAbilityKey[] {
  return LEARNABLE_SPECIAL_ABILITY_KEYS.slice(0, unlockedAbilityCount(reputation))
}

/** 該球員目前還能學的能力:已解鎖清單裡,扣掉他已經有的。 */
export function learnableAbilitiesForPlayer(player: Player, reputation: number): SpecialAbilityKey[] {
  return unlockedAbilities(reputation).filter((key) => !player.specialAbilities.includes(key))
}

// 學習成功率下限(原創數值,待調校):即使對應屬性很低,也保留一點機會,不完全鎖死。
const MIN_LEARN_CHANCE = 0.1

export function specialAbilityLearnChance(attributeValue: number): number {
  return Math.max(MIN_LEARN_CHANCE, attributeValue / ATTRIBUTE_MAX)
}

export interface LearnAbilityAttemptResult {
  succeeded: boolean
  chance: number
}

/** 依球員在該能力對應屬性上的數值滾一次學習判定。 */
export function attemptLearnAbility(player: Player, ability: SpecialAbilityKey, rng: Rng): LearnAbilityAttemptResult {
  const attribute = SPECIAL_ABILITY_ATTRIBUTE[ability]
  const chance = specialAbilityLearnChance(player.attributes[attribute])
  return { succeeded: rng() < chance, chance }
}

export function hasAbility(player: Player, ability: SpecialAbilityKey): boolean {
  return player.specialAbilities.includes(ability)
}

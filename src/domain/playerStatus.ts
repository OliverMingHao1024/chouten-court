import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type AttributeKey, type Player, type PersonalityKey } from './types'

export type PlayerStatusTone = 'injury' | 'fatigue' | 'thriving' | 'steady'

export interface PlayerStatusSummary {
  tone: PlayerStatusTone
  text: string
}

// 疲勞判定門檻(原創數值,待調校):高於此值視為需要休養,低於此值視為狀態正好。
const FATIGUE_HIGH_THRESHOLD = 70
const FATIGUE_LOW_THRESHOLD = 20

const PERSONALITY_FLAVOR: Record<PersonalityKey, string> = {
  steady: '一如既往地穩定發揮',
  genius: '練什麼都吸收得特別快',
  scorer: '手感火燙,得分嗅覺越來越準',
  captain: '默默扛起球隊的士氣',
  clutch: '越到關鍵時刻越冷靜',
  fragile: '拼勁十足,但得留意他的傷勢',
}

function bestAttribute(player: Player): AttributeKey {
  return ATTRIBUTE_KEYS.reduce((best, key) =>
    player.attributes[key] > player.attributes[best] ? key : best,
  )
}

/**
 * 純衍生自球員目前狀態(傷勢/疲勞/屬性/個性)的一句「近況」敘述,不依賴任何額外持久化紀錄;
 * 不影響任何主線數值,單純給名冊畫面一個比生冷數字更有代入感的摘要。
 */
export function describePlayerStatus(player: Player): PlayerStatusSummary {
  if (player.injuryStatus === 'major') {
    return {
      tone: 'injury',
      text: `${player.name}正在養傷,預計還要 ${player.injuryWeeksRemaining} 週才能歸隊。`,
    }
  }
  if (player.injuryStatus === 'minor') {
    return {
      tone: 'injury',
      text: `${player.name}輕傷休養中,還有 ${player.injuryWeeksRemaining} 週才能上場。`,
    }
  }
  if (player.injuryStatus === 'returning') {
    return {
      tone: 'injury',
      text: `${player.name}剛傷癒歸隊,狀態還沒完全恢復,先讓他打適應賽比較保險。`,
    }
  }
  if (player.fatigue >= FATIGUE_HIGH_THRESHOLD) {
    return {
      tone: 'fatigue',
      text: `${player.name}這陣子練得很兇,體力亮紅燈,該讓他喘口氣了。`,
    }
  }

  const attribute = bestAttribute(player)
  const attributeLabel = ATTRIBUTE_LABELS[attribute]
  const flavor = PERSONALITY_FLAVOR[player.personality]

  if (player.fatigue <= FATIGUE_LOW_THRESHOLD) {
    return {
      tone: 'thriving',
      text: `${player.name}狀態正好,${flavor},${attributeLabel}是他目前最亮眼的武器。`,
    }
  }
  return {
    tone: 'steady',
    text: `${player.name}狀態穩定,${flavor}。`,
  }
}

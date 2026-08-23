import { ATTRIBUTE_MAX, clamp, FATIGUE_MAX, FATIGUE_MIN } from './matchEngine'
import type { Rng } from './rng'
import { ATTRIBUTE_KEYS, type AttributeKey, type Player } from './types'

// 隨機事件卡系統:每個非賽季週有機率觸發一張情境卡,教練需在三檔風險中擇一應對。
// 純原創設計(分類、卡牌內容、數值皆為本專案原創),概念上參考「分類事件 + 風險選項」
// 這種常見經營模擬遊戲的通用系統設計,不引用任何外部專案的既有文本或程式碼。

export const EVENT_CATEGORIES = ['training', 'team', 'campus'] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  training: '訓練花絮',
  team: '球隊風波',
  campus: '校園瑣事',
}

export const EVENT_RISKS = ['safe', 'balanced', 'bold'] as const
export type EventRisk = (typeof EVENT_RISKS)[number]

export const EVENT_RISK_LABELS: Record<EventRisk, string> = {
  safe: '穩妥處理',
  balanced: '折衷應對',
  bold: '放手一搏',
}

// 每張卡的三檔風險統一用這個成功率(原創數值),不再逐卡各自設定。
export const EVENT_RISK_SUCCESS_RATE: Record<EventRisk, number> = {
  safe: 0.7,
  balanced: 0.5,
  bold: 0.3,
}

export interface EventOutcome {
  text: string
  attribute?: AttributeKey
  attributeDelta?: number
  fatigueDelta?: number
  reputationDelta?: number
}

export interface EventChoice {
  risk: EventRisk
  label: string
  successChance: number
  onSuccess: EventOutcome
  onFailure: EventOutcome
}

export interface EventCard {
  id: string
  category: EventCategory
  title: string
  prompt: string
  choices: EventChoice[]
}

// 卡牌內容以 {player} 代稱事件主角,實際觸發時會替換成該球隊當週隨機選中的球員姓名。
export const EVENT_CARDS: EventCard[] = [
  {
    id: 'training-extra-practice',
    category: 'training',
    title: '加練狂魔',
    prompt: '{player} 在例行訓練結束後遲遲不肯下場,吵著要教練陪他加練到熄燈。',
    choices: [
      {
        risk: 'safe',
        label: '先讓他回宿舍休息',
        successChance: 0.7,
        onSuccess: { text: '你安撫了他的求勝心切,{player} 乖乖回去休息,隔天精神反而更好。', fatigueDelta: -5 },
        onFailure: { text: '{player} 一臉不甘願地離開,情緒有點低落。', fatigueDelta: -2, reputationDelta: -1 },
      },
      {
        risk: 'balanced',
        label: '陪他加練半小時',
        successChance: 0.5,
        onSuccess: {
          text: '額外的半小時讓 {player} 抓到手感,投籃動作變得更扎實。',
          attribute: 'shooting',
          attributeDelta: 2,
          fatigueDelta: 4,
        },
        onFailure: { text: '加練到一半 {player} 動作開始變形,你趕緊喊停。', fatigueDelta: 6 },
      },
      {
        risk: 'bold',
        label: '讓他練到熄燈前',
        successChance: 0.3,
        onSuccess: {
          text: '{player} 練出了破繭而出的專注力,整個人脫胎換骨。',
          attribute: 'shooting',
          attributeDelta: 4,
          fatigueDelta: 10,
        },
        onFailure: { text: '過度的加練讓 {player} 隔天渾身痠痛,狀態明顯下滑。', fatigueDelta: 14 },
      },
    ],
  },
  {
    id: 'training-nervous-rookie',
    category: 'training',
    title: '畏戰的新人',
    prompt: '練習賽前,{player} 手心冒汗,一直找藉口想蹲在板凳上。',
    choices: [
      {
        risk: 'safe',
        label: '讓他先在旁邊看學長打',
        successChance: 0.7,
        onSuccess: { text: '{player} 冷靜地在場邊觀察,賽後對你說想通了很多。', attribute: 'iq', attributeDelta: 2 },
        onFailure: { text: '{player} 看起來還是有點心不在焉。' },
      },
      {
        risk: 'balanced',
        label: '給他簡單的角色先上場',
        successChance: 0.5,
        onSuccess: {
          text: '{player} 完成了幾次簡單的任務,信心明顯提升。',
          attribute: 'iq',
          attributeDelta: 1,
          fatigueDelta: 6,
        },
        onFailure: { text: '{player} 上場後手忙腳亂,失誤連連。', fatigueDelta: 8, reputationDelta: -1 },
      },
      {
        risk: 'bold',
        label: '直接把他放進先發',
        successChance: 0.3,
        onSuccess: {
          text: '{player} 頂著壓力打出超乎預期的表現,一戰成名。',
          attribute: 'iq',
          attributeDelta: 3,
          fatigueDelta: 8,
        },
        onFailure: { text: '{player} 被壓力壓垮,整場比賽都放不開。', fatigueDelta: 10, reputationDelta: -2 },
      },
    ],
  },
  {
    id: 'training-forgotten-playbook',
    category: 'training',
    title: '戰術本忘了帶',
    prompt: '教練你發現今天的戰術筆記本忘在辦公室,球員們已經在等你開始訓練。',
    choices: [
      {
        risk: 'safe',
        label: '先跑基本體能,晚點補戰術',
        successChance: 0.7,
        onSuccess: { text: '體能訓練扎實完成,大家士氣不受影響。', fatigueDelta: 6 },
        onFailure: { text: '球員們覺得今天訓練有點鬆散。', reputationDelta: -1 },
      },
      {
        risk: 'balanced',
        label: '憑記憶帶一次簡化版戰術',
        successChance: 0.5,
        onSuccess: { text: '你即興帶出的簡化戰術意外地讓大家理解得更透徹。', attribute: 'iq', attributeDelta: 2 },
        onFailure: { text: '少了筆記本,講解有點卡卡的,球員一頭霧水。' },
      },
      {
        risk: 'bold',
        label: '衝回辦公室拿',
        successChance: 0.3,
        onSuccess: {
          text: '你及時趕回來,完整的訓練內容一項不缺。',
          attribute: 'iq',
          attributeDelta: 3,
          fatigueDelta: 4,
        },
        onFailure: { text: '你來回奔波累壞了自己,訓練節奏也被打亂。', reputationDelta: -1 },
      },
    ],
  },
  {
    id: 'team-locker-room-argument',
    category: 'team',
    title: '更衣室口角',
    prompt: '{player} 跟另一位主力球員因為戰術分配的問題,在更衣室吵了起來。',
    choices: [
      {
        risk: 'safe',
        label: '把兩人叫來個別談',
        successChance: 0.7,
        onSuccess: { text: '你耐心聽完雙方想法,兩人握手言和,{player} 狀態也穩定下來。', attribute: 'pass', attributeDelta: 2 },
        onFailure: { text: '談話沒有真正化解心結,氣氛還是有點僵。' },
      },
      {
        risk: 'balanced',
        label: '當場開一次全隊檢討會',
        successChance: 0.5,
        onSuccess: {
          text: '坦承布公的檢討會讓全隊更團結,{player} 也重新振作。',
          attribute: 'pass',
          attributeDelta: 3,
          fatigueDelta: 3,
        },
        onFailure: { text: '檢討會反而讓場面更難堪,{player} 情緒受挫。', fatigueDelta: 4, reputationDelta: -1 },
      },
      {
        risk: 'bold',
        label: '讓兩人直接單挑決勝負',
        successChance: 0.3,
        onSuccess: {
          text: '一場男子漢式的單挑意外地讓兩人惺惺相惜。',
          attribute: 'athletic',
          attributeDelta: 3,
          fatigueDelta: 8,
        },
        onFailure: { text: '單挑演變成更激烈的衝突,你得花更多心力善後。', fatigueDelta: 10, reputationDelta: -2 },
      },
    ],
  },
  {
    id: 'team-captain-request',
    category: 'team',
    title: '隊長的請求',
    prompt: '隊長私下找上你,希望你多給 {player} 一些上場機會。',
    choices: [
      {
        risk: 'safe',
        label: '先觀察再做決定',
        successChance: 0.7,
        onSuccess: { text: '你的謹慎讓隊長感受到被尊重,{player} 也默默努力著。', attribute: 'iq', attributeDelta: 2 },
        onFailure: { text: '遲遲沒有下文讓隊長有點失望。', reputationDelta: -1 },
      },
      {
        risk: 'balanced',
        label: '答應在練習賽給他機會',
        successChance: 0.5,
        onSuccess: {
          text: '{player} 把握機會打出亮眼表現,隊長也很欣慰。',
          attribute: 'defense',
          attributeDelta: 2,
          fatigueDelta: 5,
        },
        onFailure: { text: '{player} 表現不如預期,場面一度有點尷尬。', fatigueDelta: 6 },
      },
      {
        risk: 'bold',
        label: '直接答應讓他打先發',
        successChance: 0.3,
        onSuccess: {
          text: '{player} 沒有讓任何人失望,直接坐穩先發位置。',
          attribute: 'defense',
          attributeDelta: 4,
          fatigueDelta: 8,
        },
        onFailure: { text: '倉促的決定讓 {player} 壓力過大,反而亂了陣腳。', fatigueDelta: 10, reputationDelta: -1 },
      },
    ],
  },
  {
    id: 'team-alumni-visit',
    category: 'team',
    title: '畢業學長回娘家',
    prompt: '已經畢業的學長回校探望,想跟學弟們分享心得,{player} 顯得特別興奮。',
    choices: [
      {
        risk: 'safe',
        label: '安排簡短的交流時間',
        successChance: 0.7,
        onSuccess: { text: '學長的分享讓 {player} 收穫良多,士氣大振。', fatigueDelta: -4 },
        onFailure: { text: '時間太趕,交流有點流於形式。' },
      },
      {
        risk: 'balanced',
        label: '邀請學長留下來看訓練',
        successChance: 0.5,
        onSuccess: { text: '學長在旁邊的指點讓 {player} 的動作更細膩。', attribute: 'shooting', attributeDelta: 2 },
        onFailure: { text: '學長的建議跟你的戰術方向有點衝突,球員反而困惑。' },
      },
      {
        risk: 'bold',
        label: '請學長客串一日教練',
        successChance: 0.3,
        onSuccess: {
          text: '學長帶來的全新視角讓全隊耳目一新,{player} 也大有進步。',
          attribute: 'shooting',
          attributeDelta: 3,
          reputationDelta: 1,
        },
        onFailure: { text: '兩種風格的訓練理念讓球員無所適從。', fatigueDelta: 4, reputationDelta: -1 },
      },
    ],
  },
  {
    id: 'campus-parent-concern',
    category: 'campus',
    title: '家長會的關切',
    prompt: '{player} 的家長來電,擔心訓練強度會不會太吃重。',
    choices: [
      {
        risk: 'safe',
        label: '耐心解釋訓練計畫',
        successChance: 0.7,
        onSuccess: { text: '家長放下心中的疑慮,對球隊更加信任。', reputationDelta: 2 },
        onFailure: { text: '家長還是半信半疑,你得再多花些心力溝通。' },
      },
      {
        risk: 'balanced',
        label: '邀請家長來看一次訓練',
        successChance: 0.5,
        onSuccess: { text: '親眼看到訓練內容後,家長對你讚譽有加。', reputationDelta: 3 },
        onFailure: { text: '家長看到高強度的訓練反而更擔心了。', reputationDelta: -1 },
      },
      {
        risk: 'bold',
        label: '直接調整訓練菜單',
        successChance: 0.3,
        onSuccess: {
          text: '調整後的菜單意外地讓 {player} 狀態更好。',
          attribute: 'iq',
          attributeDelta: 2,
          fatigueDelta: -6,
        },
        onFailure: { text: '臨時更動菜單打亂了 {player} 的訓練節奏。', fatigueDelta: 4 },
      },
    ],
  },
  {
    id: 'campus-festival-invite',
    category: 'campus',
    title: '校慶表演邀約',
    prompt: '校方希望籃球隊在校慶時表演一段花式扣籃秀,{player} 自告奮勇想上場。',
    choices: [
      {
        risk: 'safe',
        label: '婉拒表演邀約',
        successChance: 0.7,
        onSuccess: { text: '婉拒讓球隊能專心備戰,校方也表示理解。', fatigueDelta: -3 },
        onFailure: { text: '校方對婉拒有點不諒解。', reputationDelta: -1 },
      },
      {
        risk: 'balanced',
        label: '派幾位球員簡單表演',
        successChance: 0.5,
        onSuccess: { text: '{player} 的演出贏得滿堂彩,球隊聲望跟著水漲船高。', reputationDelta: 3 },
        onFailure: { text: '表演出了點小差錯,場面有點尷尬。', reputationDelta: -1 },
      },
      {
        risk: 'bold',
        label: '讓他主演高難度花式扣籃',
        successChance: 0.3,
        onSuccess: {
          text: '{player} 的精彩演出成為校慶最大話題,全校為之瘋狂。',
          reputationDelta: 5,
          attribute: 'athletic',
          attributeDelta: 2,
        },
        onFailure: { text: '高難度動作失手讓 {player} 摔了一跤,所幸沒有大礙。', reputationDelta: -2, fatigueDelta: 6 },
      },
    ],
  },
  {
    id: 'campus-budget-cut',
    category: 'campus',
    title: '器材預算吃緊',
    prompt: '體育組長告知你,這學期的球具預算被砍了一大半。',
    choices: [
      {
        risk: 'safe',
        label: '先用舊器材撐過這學期',
        successChance: 0.7,
        onSuccess: { text: '球員們體諒球隊的難處,反而更加珍惜訓練機會。', reputationDelta: 1 },
        onFailure: { text: '老舊的器材讓訓練效率打了折扣。' },
      },
      {
        risk: 'balanced',
        label: '發起小額募款',
        successChance: 0.5,
        onSuccess: { text: '校友與家長熱情響應,器材問題順利解決。', reputationDelta: 2 },
        onFailure: { text: '募款反應冷淡,問題還是沒有解決。', reputationDelta: -1 },
      },
      {
        risk: 'bold',
        label: '自掏腰包補足缺口',
        successChance: 0.3,
        onSuccess: { text: '球員們對教練的用心銘記在心,訓練士氣大振。', fatigueDelta: -5, reputationDelta: 1 },
        onFailure: { text: '這筆開銷讓你心疼了好一陣子,但球隊運作總算正常。' },
      },
    ],
  },
  {
    id: 'training-team-doctor-checkup',
    category: 'training',
    title: '校醫的建議',
    prompt: '隨隊校醫做完例行檢查後提醒你,{player} 的疲勞指數偏高,建議盡快安排休養。',
    choices: [
      {
        risk: 'safe',
        label: '全隊放假一天徹底休息',
        successChance: 0.7,
        onSuccess: { text: '全隊確實放鬆了一整天,{player} 精神飽滿地歸隊。', fatigueDelta: -12 },
        onFailure: { text: '放假日還是有人閒不下來偷偷加練,{player} 沒有完全休息到。', fatigueDelta: -5 },
      },
      {
        risk: 'balanced',
        label: '安排靜態伸展與按摩',
        successChance: 0.5,
        onSuccess: { text: '伸展與按摩讓 {player} 的痠痛感明顯緩解。', fatigueDelta: -8 },
        onFailure: { text: '按摩師臨時來得晚,效果打了折扣。', fatigueDelta: -3 },
      },
      {
        risk: 'bold',
        label: '婉拒建議,照常進行原定訓練',
        successChance: 0.3,
        onSuccess: { text: '{player} 展現出乎意料的韌性,狀態意外維持得不錯。', fatigueDelta: 2 },
        onFailure: { text: '疲勞持續累積,{player} 明顯操過頭了。', fatigueDelta: 10 },
      },
    ],
  },
  {
    id: 'campus-hot-spring-treat',
    category: 'campus',
    title: '溫泉招待',
    prompt: '地方溫泉業者提供球隊一次免費泡湯招待,{player} 特別期待這趟行程。',
    choices: [
      {
        risk: 'safe',
        label: '安排全隊放鬆泡湯',
        successChance: 0.7,
        onSuccess: { text: '暖呼呼的溫泉讓全隊疲勞一掃而空,{player} 直呼太舒服了。', fatigueDelta: -10, reputationDelta: 1 },
        onFailure: { text: '泡湯池人多擁擠,休息效果不如預期。', fatigueDelta: -4 },
      },
      {
        risk: 'balanced',
        label: '只讓體力吃緊的球員去',
        successChance: 0.5,
        onSuccess: { text: '{player} 等人得到充分休息,回來後狀態明顯回穩。', fatigueDelta: -7 },
        onFailure: { text: '沒去成的球員有點失落,氣氛略顯尷尬。', reputationDelta: -1 },
      },
      {
        risk: 'bold',
        label: '婉拒招待,把時間留給訓練',
        successChance: 0.3,
        onSuccess: { text: '{player} 展現高度自律,多出來的時間練得更扎實。', attribute: 'iq', attributeDelta: 2 },
        onFailure: { text: '球員們對婉拒好意有點失望,士氣略受影響。', reputationDelta: -2 },
      },
    ],
  },
]

// 每個非賽季週觸發一張事件卡的機率(原創數值,待調校)。
export const EVENT_TRIGGER_CHANCE = 0.25

export function rollForWeeklyEvent(rng: Rng): boolean {
  return rng() < EVENT_TRIGGER_CHANCE
}

export function pickEventCard(rng: Rng): EventCard {
  return EVENT_CARDS[Math.floor(rng() * EVENT_CARDS.length)]
}

export function fillEventTemplate(text: string, playerName: string): string {
  return text.replaceAll('{player}', playerName)
}

export interface EventResolution {
  succeeded: boolean
  text: string
  attribute?: AttributeKey
  attributeDelta: number
  fatigueDelta: number
  reputationDelta: number
}

// 事件成功率的球員修正(原創數值,待調校):同一張卡、同一個風險選項,不同球員處理起來
// 難度不同——不再是全隊共用一個固定成功率。以「該選項成功結果會成長的屬性」(沒有指定屬性
// 的選項退回綜合屬性平均)相對 50 分的落差,小幅推高/拉低基礎成功率;個性再疊加一次小幅
// 修正:抗壓型在「放手一搏」較穩、穩健型在「穩妥處理」較穩、玻璃體質整體略不穩定,呼應
// 這兩型個性原本就與抗壓/風險相關的設定。上下限夾住,任何情況都不會變成必成功或必失敗。
export const EVENT_ATTRIBUTE_SUCCESS_SCALE = 0.004
export const EVENT_PERSONALITY_SUCCESS_BONUS = 0.1
export const EVENT_MIN_SUCCESS_CHANCE = 0.1
export const EVENT_MAX_SUCCESS_CHANCE = 0.95

function relevantAttributeValue(choice: EventChoice, player: Player): number {
  const key = choice.onSuccess.attribute
  if (key) return player.attributes[key]
  return ATTRIBUTE_KEYS.reduce((sum, k) => sum + player.attributes[k], 0) / ATTRIBUTE_KEYS.length
}

function personalitySuccessAdjustment(risk: EventRisk, player: Player): number {
  if (player.personality === 'fragile') return -EVENT_PERSONALITY_SUCCESS_BONUS / 2
  if (risk === 'bold' && player.personality === 'clutch') return EVENT_PERSONALITY_SUCCESS_BONUS
  if (risk === 'safe' && player.personality === 'steady') return EVENT_PERSONALITY_SUCCESS_BONUS
  return 0
}

/** 這名球員面對這個選項的實際成功率;供畫面顯示與 resolveEventChoice 共用同一套計算。 */
export function computeEventSuccessChance(choice: EventChoice, player: Player): number {
  const attributeAdjustment = (relevantAttributeValue(choice, player) - 50) * EVENT_ATTRIBUTE_SUCCESS_SCALE
  const adjusted = choice.successChance + attributeAdjustment + personalitySuccessAdjustment(choice.risk, player)
  return clamp(adjusted, EVENT_MIN_SUCCESS_CHANCE, EVENT_MAX_SUCCESS_CHANCE)
}

export function resolveEventChoice(card: EventCard, risk: EventRisk, player: Player, rng: Rng): EventResolution {
  const choice = card.choices.find((c) => c.risk === risk)
  if (!choice) throw new Error(`event card ${card.id} has no choice for risk ${risk}`)

  const succeeded = rng() < computeEventSuccessChance(choice, player)
  const outcome = succeeded ? choice.onSuccess : choice.onFailure

  return {
    succeeded,
    text: fillEventTemplate(outcome.text, player.name),
    attribute: outcome.attribute,
    attributeDelta: outcome.attributeDelta ?? 0,
    fatigueDelta: outcome.fatigueDelta ?? 0,
    reputationDelta: outcome.reputationDelta ?? 0,
  }
}

export function clampAttribute(value: number): number {
  return clamp(value, 0, ATTRIBUTE_MAX)
}

export function clampFatigue(value: number): number {
  return clamp(value, FATIGUE_MIN, FATIGUE_MAX)
}

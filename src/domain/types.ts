export const ATTRIBUTE_KEYS = [
  'shooting',
  'three',
  'rebound',
  'pass',
  'defense',
  'athletic',
  'iq',
] as const

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number]

export type AttributeSet = Record<AttributeKey, number>

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  shooting: '投籃',
  three: '三分',
  rebound: '籃板',
  pass: '傳球',
  defense: '防守',
  athletic: '運動能力',
  iq: 'IQ',
}

export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const

export type Position = (typeof POSITIONS)[number]

export const PERSONALITY_KEYS = [
  'steady',
  'genius',
  'scorer',
  'captain',
  'clutch',
  'fragile',
] as const

export type PersonalityKey = (typeof PERSONALITY_KEYS)[number]

export const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  steady: '穩健型',
  genius: '天才型',
  scorer: '飆分型',
  captain: '隊長型',
  clutch: '抗壓型',
  fragile: '玻璃體質',
}

export const STYLE_KEYS = ['scoring', 'shooting', 'playmaking', 'defense', 'rebounding'] as const

export type StyleKey = (typeof STYLE_KEYS)[number]

export interface StyleTag {
  primary: StyleKey
  secondary: StyleKey
  label: string
}

export const INJURY_STATUSES = ['healthy', 'minor', 'major', 'returning'] as const

export type InjuryStatus = (typeof INJURY_STATUSES)[number]

export const INJURY_STATUS_LABELS: Record<InjuryStatus, string> = {
  healthy: '健康',
  minor: '輕傷',
  major: '重傷',
  returning: '復出過渡期',
}

export interface Player {
  id: string
  name: string
  position: Position
  attributes: AttributeSet
  personality: PersonalityKey
  fatigue: number
  styleTag: StyleTag
  injuryStatus: InjuryStatus
  injuryWeeksRemaining: number
  /** 1~3 年級;每學年結束(每年推進一次)加 1,超過 3 即畢業離隊。 */
  grade: number
}

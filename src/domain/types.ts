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

export const STYLE_KEYS = ['scoring', 'shooting', 'playmaking', 'defense', 'rebounding'] as const

export type StyleKey = (typeof STYLE_KEYS)[number]

export interface StyleTag {
  primary: StyleKey
  secondary: StyleKey
  label: string
}

export interface Player {
  id: string
  name: string
  position: Position
  attributes: AttributeSet
  personality: PersonalityKey
  fatigue: number
  styleTag: StyleTag
}

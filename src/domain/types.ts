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

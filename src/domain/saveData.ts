import type { CareerEndReason } from './career'
import type { GameLineup } from './lineup'
import { PHASE_GAME_COUNT } from './officialMatch'
import type { Candidate } from './recruiting'
import type { RivalRecord } from './rivals'
import { SCHOOL_ASSET_KEYS, type SchoolAssetKey } from './schoolAssets'
import type { SeasonGameLogEntry } from './season'
import type { SeasonRecord, SeasonSummaryResult } from './seasonSummary'
import { SPECIAL_ABILITY_KEYS } from './specialAbilities'
import { CARD_KINDS, type PoolCard, type TrainingCardPoolState } from './trainingCardPool'
import {
  ATTRIBUTE_KEYS,
  INJURY_STATUSES,
  PERSONALITY_KEYS,
  POSITIONS,
  STYLE_KEYS,
  type AttributeKey,
  type Player,
} from './types'

export const SAVE_STORAGE_KEY = 'chouten-court:save'
export const SAVE_FORMAT_VERSION = 12

const OFFICIAL_PHASES = Object.keys(PHASE_GAME_COUNT)
const FINAL4_PLACEMENTS = ['champion', 'runnerUp', 'third', 'fourth']
const CAREER_END_REASONS = ['champion', 'insuranceCap']

export interface SaveData {
  version: number
  teamName: string
  coachName: string
  seed: number
  totalWeek: number
  players: Player[]
  lastResult: string | null
  seasonGameLog: SeasonGameLogEntry[]
  cardPool: TrainingCardPoolState
  trainingPoints: number
  reputation: number
  graduateLog: string[]
  recruitingCandidates: Candidate[] | null
  careerLog: SeasonRecord[]
  eraCount: number
  pendingSeasonSummary: SeasonSummaryResult | null
  careerEnded: CareerEndReason | null
  lastLineup: GameLineup | null
  rivals: RivalRecord[]
  schoolAssets: SchoolAssetKey[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidPlayer(value: unknown): value is Player {
  if (!isPlainObject(value)) return false
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (typeof value.position !== 'string' || !(POSITIONS as readonly string[]).includes(value.position)) return false
  if (typeof value.height !== 'number') return false

  if (!isPlainObject(value.attributes)) return false
  for (const key of ATTRIBUTE_KEYS) {
    if (typeof value.attributes[key] !== 'number') return false
  }

  if (typeof value.personality !== 'string' || !(PERSONALITY_KEYS as readonly string[]).includes(value.personality)) {
    return false
  }
  if (
    !Array.isArray(value.specialAbilities) ||
    !value.specialAbilities.every((key) => (SPECIAL_ABILITY_KEYS as readonly string[]).includes(key))
  ) {
    return false
  }
  if (typeof value.fatigue !== 'number') return false

  if (!isPlainObject(value.styleTag)) return false
  const { primary, secondary, label } = value.styleTag
  if (typeof primary !== 'string' || !(STYLE_KEYS as readonly string[]).includes(primary)) return false
  if (typeof secondary !== 'string' || !(STYLE_KEYS as readonly string[]).includes(secondary)) return false
  if (typeof label !== 'string') return false

  if (typeof value.injuryStatus !== 'string' || !(INJURY_STATUSES as readonly string[]).includes(value.injuryStatus)) {
    return false
  }
  if (typeof value.injuryWeeksRemaining !== 'number') return false
  if (typeof value.grade !== 'number') return false

  return true
}

function isValidAttributeRange(value: unknown): value is { min: number; max: number } {
  if (!isPlainObject(value)) return false
  return typeof value.min === 'number' && typeof value.max === 'number'
}

function isValidCandidate(value: unknown): value is Candidate {
  if (!isPlainObject(value)) return false
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (typeof value.position !== 'string' || !(POSITIONS as readonly string[]).includes(value.position)) return false
  if (typeof value.height !== 'number') return false
  if (typeof value.personality !== 'string' || !(PERSONALITY_KEYS as readonly string[]).includes(value.personality)) {
    return false
  }

  if (!isPlainObject(value.trueAttributes)) return false
  for (const key of ATTRIBUTE_KEYS) {
    if (typeof value.trueAttributes[key] !== 'number') return false
  }

  if (!isPlainObject(value.attributeRanges)) return false
  for (const key of ATTRIBUTE_KEYS) {
    if (!isValidAttributeRange(value.attributeRanges[key])) return false
  }

  return true
}

function isValidGameLogEntry(value: unknown): value is SeasonGameLogEntry {
  if (!isPlainObject(value)) return false
  if (typeof value.totalWeek !== 'number') return false
  if (typeof value.phase !== 'string' || !OFFICIAL_PHASES.includes(value.phase)) return false
  if (value.outcome !== 'win' && value.outcome !== 'loss') return false
  return true
}

function isValidSeasonRecord(value: unknown): value is SeasonRecord {
  if (!isPlainObject(value)) return false
  if (typeof value.year !== 'number') return false
  if (typeof value.wins !== 'number' || typeof value.losses !== 'number') return false
  if (typeof value.finalPhaseReached !== 'string' || !OFFICIAL_PHASES.includes(value.finalPhaseReached)) return false
  if (value.placement !== null && !FINAL4_PLACEMENTS.includes(value.placement as string)) return false
  if (typeof value.reputationAfter !== 'number') return false
  return true
}

function isValidPoolCard(value: unknown): value is PoolCard {
  if (!isPlainObject(value)) return false
  if (typeof value.id !== 'string') return false
  if (typeof value.kind !== 'string' || !(CARD_KINDS as readonly string[]).includes(value.kind)) return false
  if (value.attribute !== null && !(ATTRIBUTE_KEYS as readonly string[]).includes(value.attribute as AttributeKey)) {
    return false
  }
  if (typeof value.age !== 'number') return false
  return true
}

function isValidCardPool(value: unknown): value is TrainingCardPoolState {
  if (!isPlainObject(value)) return false
  if (typeof value.nextCardId !== 'number') return false
  return Array.isArray(value.cards) && value.cards.every(isValidPoolCard)
}

function isValidGameLineup(value: unknown): value is GameLineup {
  if (!isPlainObject(value)) return false
  const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((id) => typeof id === 'string')
  return isStringArray(value.starters) && isStringArray(value.rotation)
}

function isValidRivalRecord(value: unknown): value is RivalRecord {
  if (!isPlainObject(value)) return false
  if (typeof value.name !== 'string') return false
  if (typeof value.wins !== 'number' || typeof value.losses !== 'number') return false
  if (value.biggestComebackMargin !== null && typeof value.biggestComebackMargin !== 'number') return false
  if (typeof value.pinnedAtWeek !== 'number') return false
  return true
}

function isValidAwardWinner(value: unknown): boolean {
  if (!isPlainObject(value)) return false
  return typeof value.title === 'string' && typeof value.playerName === 'string'
}

function isValidSeasonSummaryResult(value: unknown): value is SeasonSummaryResult {
  if (!isPlainObject(value)) return false
  if (!isValidSeasonRecord(value.record)) return false
  if (typeof value.reputationDelta !== 'number' || typeof value.reputationAfter !== 'number') return false
  if (!Array.isArray(value.awards) || !value.awards.every(isValidAwardWinner)) return false
  return true
}

/** 匯入/讀檔共用的格式驗證:必要欄位缺漏或型別錯誤一律回傳 null,拒絕載入。 */
export function parseSaveData(raw: unknown): SaveData | null {
  if (!isPlainObject(raw)) return null
  if (raw.version !== SAVE_FORMAT_VERSION) return null
  if (typeof raw.teamName !== 'string' || raw.teamName.trim().length === 0) return null
  if (typeof raw.coachName !== 'string' || raw.coachName.trim().length === 0) return null
  if (typeof raw.seed !== 'number') return null
  if (typeof raw.totalWeek !== 'number' || raw.totalWeek < 1) return null
  if (!Array.isArray(raw.players) || raw.players.length === 0 || !raw.players.every(isValidPlayer)) return null
  if (raw.lastResult !== null && typeof raw.lastResult !== 'string') return null
  if (!Array.isArray(raw.seasonGameLog) || !raw.seasonGameLog.every(isValidGameLogEntry)) return null
  if (!isValidCardPool(raw.cardPool)) return null
  if (typeof raw.trainingPoints !== 'number') return null
  if (typeof raw.reputation !== 'number') return null
  if (!Array.isArray(raw.graduateLog) || !raw.graduateLog.every((entry) => typeof entry === 'string')) return null
  if (raw.recruitingCandidates !== null) {
    if (!Array.isArray(raw.recruitingCandidates) || !raw.recruitingCandidates.every(isValidCandidate)) return null
  }
  if (!Array.isArray(raw.careerLog) || !raw.careerLog.every(isValidSeasonRecord)) return null
  if (typeof raw.eraCount !== 'number') return null
  if (raw.pendingSeasonSummary !== null && !isValidSeasonSummaryResult(raw.pendingSeasonSummary)) return null
  if (raw.careerEnded !== null && !CAREER_END_REASONS.includes(raw.careerEnded as string)) return null
  if (raw.lastLineup !== null && !isValidGameLineup(raw.lastLineup)) return null
  if (!Array.isArray(raw.rivals) || !raw.rivals.every(isValidRivalRecord)) return null
  if (
    !Array.isArray(raw.schoolAssets) ||
    !raw.schoolAssets.every((key) => (SCHOOL_ASSET_KEYS as readonly string[]).includes(key as string))
  ) {
    return null
  }

  return {
    version: raw.version,
    teamName: raw.teamName,
    coachName: raw.coachName,
    seed: raw.seed,
    totalWeek: raw.totalWeek,
    players: raw.players as Player[],
    lastResult: raw.lastResult as string | null,
    seasonGameLog: raw.seasonGameLog as SeasonGameLogEntry[],
    cardPool: raw.cardPool as TrainingCardPoolState,
    trainingPoints: raw.trainingPoints,
    reputation: raw.reputation,
    graduateLog: raw.graduateLog as string[],
    recruitingCandidates: raw.recruitingCandidates as Candidate[] | null,
    careerLog: raw.careerLog as SeasonRecord[],
    eraCount: raw.eraCount,
    pendingSeasonSummary: raw.pendingSeasonSummary as SeasonSummaryResult | null,
    careerEnded: raw.careerEnded as CareerEndReason | null,
    lastLineup: raw.lastLineup as GameLineup | null,
    rivals: raw.rivals as RivalRecord[],
    schoolAssets: raw.schoolAssets as SchoolAssetKey[],
  }
}

export function serializeSaveData(data: SaveData): string {
  return JSON.stringify(data, null, 2)
}

export function loadSaveFromStorage(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY)
    if (!raw) return null
    return parseSaveData(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeSaveToStorage(data: SaveData): void {
  window.localStorage.setItem(SAVE_STORAGE_KEY, serializeSaveData(data))
}

export function clearSaveFromStorage(): void {
  window.localStorage.removeItem(SAVE_STORAGE_KEY)
}

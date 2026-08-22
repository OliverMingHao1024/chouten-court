import { ACHIEVEMENT_KEYS, type AchievementKey } from './achievements'
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
export const SAVE_FORMAT_VERSION = 14

// 最舊還願意嘗試升級的存檔版本(原創決策,待調校):版本 10 是這輪功能開始疊加欄位之前的
// 基準線,再更早的版本沒有留下每次改動的確切欄位差異記錄,升級會不可靠,所以不試著救回來,
// 沿用既有「格式不符一律拒絕」的行為。10 以後每一版新增了什麼欄位都很清楚,值得補救。
export const MIN_SUPPORTED_SAVE_VERSION = 10

type RawSaveData = Record<string, unknown>

/**
 * 每個 key 是「升級前」的版本號,value 是把該版本的存檔資料補上下一版新增欄位的預設值。
 * 只需要「新增欄位給預設值」,不需要處理欄位重新命名/型別改變——這輪的版本升級都只是
 * 新增功能,沒有動到既有欄位,所以每個 migration 都很單純。
 */
const MIGRATIONS: Record<number, (raw: RawSaveData) => RawSaveData> = {
  10: (raw) => ({ ...raw, version: 11, rivals: [] }),
  11: (raw) => ({ ...raw, version: 12, schoolAssets: [] }),
  12: (raw) => ({ ...raw, version: 13, challengeMode: 'long', pendingChallengeDecision: false }),
  13: (raw) => ({ ...raw, version: 14, achievements: [], seasonHadInjury: false }),
}

/**
 * 沿著 MIGRATIONS 鏈一路升級到 SAVE_FORMAT_VERSION;版本低於 MIN_SUPPORTED_SAVE_VERSION,
 * 或鏈中斷(某個版本沒有對應的 migration)時,原樣退回,讓後續的版本號檢查照舊拒絕載入。
 */
function migrateSaveData(raw: RawSaveData): RawSaveData {
  let current = raw
  while (typeof current.version === 'number' && current.version < SAVE_FORMAT_VERSION) {
    if (current.version < MIN_SUPPORTED_SAVE_VERSION) return current
    const migrate = MIGRATIONS[current.version]
    if (!migrate) return current
    current = migrate(current)
  }
  return current
}

const CHALLENGE_MODES = ['short', 'long']

const OFFICIAL_PHASES = Object.keys(PHASE_GAME_COUNT)
const FINAL4_PLACEMENTS = ['champion', 'runnerUp', 'third', 'fourth']
const CAREER_END_REASONS = ['champion', 'insuranceCap', 'shortChallengeComplete']

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
  challengeMode: 'short' | 'long'
  pendingChallengeDecision: boolean
  achievements: AchievementKey[]
  /** 本季至今是否已有球員新增傷勢;每季開始重置為 false,純粹用來判定「零傷賽季」成就。 */
  seasonHadInjury: boolean
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
export function parseSaveData(rawInput: unknown): SaveData | null {
  if (!isPlainObject(rawInput)) return null
  const raw = migrateSaveData(rawInput)
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
  if (typeof raw.challengeMode !== 'string' || !CHALLENGE_MODES.includes(raw.challengeMode)) return null
  if (typeof raw.pendingChallengeDecision !== 'boolean') return null
  if (
    !Array.isArray(raw.achievements) ||
    !raw.achievements.every((key) => (ACHIEVEMENT_KEYS as readonly string[]).includes(key as string))
  ) {
    return null
  }
  if (typeof raw.seasonHadInjury !== 'boolean') return null

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
    challengeMode: raw.challengeMode as 'short' | 'long',
    pendingChallengeDecision: raw.pendingChallengeDecision,
    achievements: raw.achievements as AchievementKey[],
    seasonHadInjury: raw.seasonHadInjury,
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

// ---- 多存檔槽位 ----
// 舊版只有單一固定 key(SAVE_STORAGE_KEY)存一份存檔。新版每個槽位各自一個 key
// (SAVE_SLOT_KEY_PREFIX + id),另外用一個索引 key 記錄所有槽位的 id/名稱/最後更新時間,
// 方便在還沒載入任何一份存檔內容時就能列出清單。

export interface SaveSlotMeta {
  id: string
  label: string
  updatedAt: number
}

const SAVE_SLOTS_INDEX_KEY = 'chouten-court:save-slots'
const SAVE_SLOT_KEY_PREFIX = 'chouten-court:save:'
const ACTIVE_SLOT_KEY = 'chouten-court:active-slot'

function slotStorageKey(id: string): string {
  return `${SAVE_SLOT_KEY_PREFIX}${id}`
}

function isValidSaveSlotMeta(value: unknown): value is SaveSlotMeta {
  if (!isPlainObject(value)) return false
  return typeof value.id === 'string' && typeof value.label === 'string' && typeof value.updatedAt === 'number'
}

export function listSaveSlots(): SaveSlotMeta[] {
  try {
    const raw = window.localStorage.getItem(SAVE_SLOTS_INDEX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidSaveSlotMeta)
  } catch {
    return []
  }
}

function writeSaveSlotsIndex(slots: SaveSlotMeta[]): void {
  window.localStorage.setItem(SAVE_SLOTS_INDEX_KEY, JSON.stringify(slots))
}

export function readActiveSlotId(): string | null {
  return window.localStorage.getItem(ACTIVE_SLOT_KEY)
}

export function writeActiveSlotId(id: string | null): void {
  if (id === null) window.localStorage.removeItem(ACTIVE_SLOT_KEY)
  else window.localStorage.setItem(ACTIVE_SLOT_KEY, id)
}

/** 新增一個空槽位並設為目前作用中的槽位,回傳新槽位的 id。實際存檔內容要另外呼叫 writeSaveToSlot。 */
export function createSaveSlot(label: string): string {
  const id = `slot-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  writeSaveSlotsIndex([...listSaveSlots(), { id, label, updatedAt: Date.now() }])
  writeActiveSlotId(id)
  return id
}

export function loadSaveFromSlot(id: string): SaveData | null {
  try {
    const raw = window.localStorage.getItem(slotStorageKey(id))
    if (!raw) return null
    return parseSaveData(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeSaveToSlot(id: string, data: SaveData): void {
  window.localStorage.setItem(slotStorageKey(id), serializeSaveData(data))
  const label = listSaveSlots().find((slot) => slot.id === id)?.label ?? data.teamName
  const others = listSaveSlots().filter((slot) => slot.id !== id)
  writeSaveSlotsIndex([...others, { id, label, updatedAt: Date.now() }])
}

export function deleteSaveSlot(id: string): void {
  window.localStorage.removeItem(slotStorageKey(id))
  writeSaveSlotsIndex(listSaveSlots().filter((slot) => slot.id !== id))
  if (readActiveSlotId() === id) writeActiveSlotId(null)
}

/**
 * 把舊版單一固定 key 的存檔搬進槽位系統,只在「還沒有任何槽位」時執行一次;
 * 舊版存檔搬移後設為作用中槽位並清掉舊 key,讓既有玩家的進度自動接上新系統。
 */
export function migrateLegacySingleSlotSave(): void {
  if (listSaveSlots().length > 0) return
  const legacy = loadSaveFromStorage()
  if (!legacy) return
  const id = createSaveSlot(legacy.teamName)
  writeSaveToSlot(id, legacy)
  clearSaveFromStorage()
}

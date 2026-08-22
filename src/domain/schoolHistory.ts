import type { CareerEndReason } from './career'
import { POSITIONS, type Position } from './types'

export interface HistoricalPlayerSnapshot {
  name: string
  position: Position
  overallGrade: string
}

export interface SchoolHistoryEntry {
  coachName: string
  reason: CareerEndReason
  totalSeasons: number
  totalWins: number
  totalLosses: number
  bestPlacementLabel: string
  /** 只有奪冠生涯才會保留當時的奪冠隊陣容快照(「歷史隊」);其餘生涯結束時為 null。 */
  championRoster: HistoricalPlayerSnapshot[] | null
}

const SCHOOL_HISTORY_STORAGE_KEY = 'chouten-court:school-history'

// 校史最多保留幾筆生涯紀錄(原創數值,待調校):避免無上限累積佔用 localStorage,
// 超過上限時捨棄最舊的一筆,新紀錄優先保留。
export const MAX_SCHOOL_HISTORY_ENTRIES = 20

const CAREER_END_REASONS = ['champion', 'insuranceCap', 'shortChallengeComplete']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidHistoricalPlayerSnapshot(value: unknown): value is HistoricalPlayerSnapshot {
  if (!isPlainObject(value)) return false
  if (typeof value.name !== 'string') return false
  if (typeof value.position !== 'string' || !(POSITIONS as readonly string[]).includes(value.position)) return false
  if (typeof value.overallGrade !== 'string') return false
  return true
}

function isValidSchoolHistoryEntry(value: unknown): value is SchoolHistoryEntry {
  if (!isPlainObject(value)) return false
  if (typeof value.coachName !== 'string') return false
  if (typeof value.reason !== 'string' || !CAREER_END_REASONS.includes(value.reason)) return false
  if (typeof value.totalSeasons !== 'number') return false
  if (typeof value.totalWins !== 'number' || typeof value.totalLosses !== 'number') return false
  if (typeof value.bestPlacementLabel !== 'string') return false
  if (value.championRoster !== null) {
    if (!Array.isArray(value.championRoster) || !value.championRoster.every(isValidHistoricalPlayerSnapshot)) {
      return false
    }
  }
  return true
}

/** 讀取失敗(從未寫入、格式毀損)一律視為空校史,不拋錯,呼應存檔驗證失敗即拒絕載入的既有慣例。 */
export function loadSchoolHistory(): SchoolHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(SCHOOL_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isValidSchoolHistoryEntry)) return []
    return parsed
  } catch {
    return []
  }
}

/**
 * 校史存在獨立的 localStorage 鍵,刻意跟單一生涯存檔(saveData.ts)分開:「開始新生涯」清除
 * 的是當前生涯進度,不該連同校史一起洗掉——這正是校史存在的意義,要跨越生涯重來仍然保留。
 */
export function appendSchoolHistoryEntry(entry: SchoolHistoryEntry): SchoolHistoryEntry[] {
  const next = [...loadSchoolHistory(), entry].slice(-MAX_SCHOOL_HISTORY_ENTRIES)
  window.localStorage.setItem(SCHOOL_HISTORY_STORAGE_KEY, JSON.stringify(next))
  return next
}

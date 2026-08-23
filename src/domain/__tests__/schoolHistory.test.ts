import { beforeEach, describe, expect, it } from 'vitest'
import { appendSchoolHistoryEntry, loadSchoolHistory, MAX_SCHOOL_HISTORY_ENTRIES, type SchoolHistoryEntry } from '../schoolHistory'

const SCHOOL_HISTORY_STORAGE_KEY = 'chouten-court:school-history'

function makeEntry(overrides: Partial<SchoolHistoryEntry> = {}): SchoolHistoryEntry {
  return {
    coachName: '山田',
    reason: 'insuranceCap',
    totalSeasons: 5,
    totalWins: 10,
    totalLosses: 8,
    bestPlacementLabel: '亞軍',
    championRoster: null,
    notableGraduates: [],
    ...overrides,
  }
}

describe('loadSchoolHistory', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns an empty array when nothing has been saved', () => {
    expect(loadSchoolHistory()).toEqual([])
  })

  it('returns an empty array and does not throw for corrupted JSON', () => {
    window.localStorage.setItem(SCHOOL_HISTORY_STORAGE_KEY, '{not valid json')
    expect(loadSchoolHistory()).toEqual([])
  })

  it('returns an empty array when the stored value is not an array of valid entries', () => {
    window.localStorage.setItem(SCHOOL_HISTORY_STORAGE_KEY, JSON.stringify([{ coachName: 123 }]))
    expect(loadSchoolHistory()).toEqual([])
  })

  it('normalizes a pre-existing entry with no notableGraduates field to an empty array, instead of rejecting the whole history', () => {
    const { notableGraduates: _omitted, ...legacyEntry } = makeEntry({ coachName: '舊資料教練' })
    window.localStorage.setItem(SCHOOL_HISTORY_STORAGE_KEY, JSON.stringify([legacyEntry]))
    const history = loadSchoolHistory()
    expect(history).toHaveLength(1)
    expect(history[0].coachName).toBe('舊資料教練')
    expect(history[0].notableGraduates).toEqual([])
  })
})

describe('appendSchoolHistoryEntry', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('round-trips a single entry through localStorage', () => {
    const entry = makeEntry()
    appendSchoolHistoryEntry(entry)
    expect(loadSchoolHistory()).toEqual([entry])
  })

  it('accumulates entries across multiple calls, preserving order', () => {
    appendSchoolHistoryEntry(makeEntry({ coachName: '第一任' }))
    appendSchoolHistoryEntry(makeEntry({ coachName: '第二任' }))
    const history = loadSchoolHistory()
    expect(history.map((e) => e.coachName)).toEqual(['第一任', '第二任'])
  })

  it('preserves a champion roster snapshot when provided', () => {
    const entry = makeEntry({
      reason: 'champion',
      championRoster: [{ name: '王小明', position: 'PG', overallGrade: 'S' }],
    })
    appendSchoolHistoryEntry(entry)
    expect(loadSchoolHistory()[0].championRoster).toEqual([{ name: '王小明', position: 'PG', overallGrade: 'S' }])
  })

  it('round-trips notableGraduates when provided', () => {
    const entry = makeEntry({ notableGraduates: ['王小明畢業後獲得職業球隊試訓邀約。'] })
    appendSchoolHistoryEntry(entry)
    expect(loadSchoolHistory()[0].notableGraduates).toEqual(['王小明畢業後獲得職業球隊試訓邀約。'])
  })

  it('caps the stored history at MAX_SCHOOL_HISTORY_ENTRIES, dropping the oldest first', () => {
    for (let i = 0; i < MAX_SCHOOL_HISTORY_ENTRIES + 5; i++) {
      appendSchoolHistoryEntry(makeEntry({ coachName: `教練${i}` }))
    }
    const history = loadSchoolHistory()
    expect(history).toHaveLength(MAX_SCHOOL_HISTORY_ENTRIES)
    expect(history[0].coachName).toBe('教練5')
    expect(history[history.length - 1].coachName).toBe(`教練${MAX_SCHOOL_HISTORY_ENTRIES + 4}`)
  })
})

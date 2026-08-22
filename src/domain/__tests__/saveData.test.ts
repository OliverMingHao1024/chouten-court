import { beforeEach, describe, expect, it } from 'vitest'
import { generateCandidatePool } from '../recruiting'
import { createInitialRoster } from '../roster'
import { createSeededRng } from '../rng'
import {
  SAVE_FORMAT_VERSION,
  SAVE_STORAGE_KEY,
  clearSaveFromStorage,
  loadSaveFromStorage,
  parseSaveData,
  serializeSaveData,
  writeSaveToStorage,
  type SaveData,
} from '../saveData'
import { createInitialCardPool } from '../trainingCardPool'

function makeSaveData(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: SAVE_FORMAT_VERSION,
    teamName: '淡水高中',
    coachName: '王小明',
    seed: 42,
    totalWeek: 5,
    players: createInitialRoster(42),
    lastResult: '本週訓練重點:三分(照常執行)',
    seasonGameLog: [{ totalWeek: 27, phase: 'qualifying', outcome: 'win' }],
    cardPool: createInitialCardPool(createSeededRng(42)),
    trainingPoints: 7,
    reputation: 50,
    graduateLog: [],
    recruitingCandidates: null,
    careerLog: [],
    eraCount: 0,
    pendingSeasonSummary: null,
    careerEnded: null,
    lastLineup: null,
    rivals: [],
    schoolAssets: [],
    ...overrides,
  }
}

describe('parseSaveData', () => {
  it('accepts a well-formed save round-tripped through JSON', () => {
    const data = makeSaveData()
    const parsed = parseSaveData(JSON.parse(serializeSaveData(data)))
    expect(parsed).toEqual(data)
  })

  it('rejects non-object input', () => {
    expect(parseSaveData(null)).toBeNull()
    expect(parseSaveData('not json')).toBeNull()
    expect(parseSaveData([1, 2, 3])).toBeNull()
  })

  it('rejects a mismatched format version', () => {
    expect(parseSaveData(makeSaveData({ version: 999 }))).toBeNull()
  })

  it('rejects a missing/blank team name', () => {
    expect(parseSaveData(makeSaveData({ teamName: '' }))).toBeNull()
    const { teamName: _teamName, ...withoutTeamName } = makeSaveData()
    expect(parseSaveData(withoutTeamName)).toBeNull()
  })

  it('rejects an empty roster', () => {
    expect(parseSaveData(makeSaveData({ players: [] }))).toBeNull()
  })

  it('rejects a player missing a required field', () => {
    const data = makeSaveData()
    const { fatigue: _fatigue, ...brokenPlayer } = data.players[0]
    expect(parseSaveData({ ...data, players: [brokenPlayer, ...data.players.slice(1)] })).toBeNull()
  })

  it('rejects a player missing height', () => {
    const data = makeSaveData()
    const { height: _height, ...brokenPlayer } = data.players[0]
    expect(parseSaveData({ ...data, players: [brokenPlayer, ...data.players.slice(1)] })).toBeNull()
  })

  it('rejects a player missing specialAbilities, and one with an unknown ability key', () => {
    const data = makeSaveData()
    const { specialAbilities: _specialAbilities, ...withoutAbilities } = data.players[0]
    expect(parseSaveData({ ...data, players: [withoutAbilities, ...data.players.slice(1)] })).toBeNull()

    const withBadAbility = { ...data.players[0], specialAbilities: ['not-a-real-ability'] }
    expect(parseSaveData({ ...data, players: [withBadAbility, ...data.players.slice(1)] })).toBeNull()
  })

  it('accepts a player with a valid, non-empty specialAbilities list', () => {
    const data = makeSaveData()
    const withAbility = { ...data.players[0], specialAbilities: ['ironWall' as const] }
    const modified = { ...data, players: [withAbility, ...data.players.slice(1)] }
    expect(parseSaveData(JSON.parse(serializeSaveData(modified)))).toEqual(modified)
  })

  it('rejects a player with an invalid enum value', () => {
    const data = makeSaveData()
    const brokenPlayer = { ...data.players[0], injuryStatus: 'deceased' }
    expect(parseSaveData({ ...data, players: [brokenPlayer, ...data.players.slice(1)] })).toBeNull()
  })

  it('rejects a game log entry with a bad phase or outcome', () => {
    const data = makeSaveData()
    expect(
      parseSaveData({ ...data, seasonGameLog: [{ totalWeek: 1, phase: 'not-a-phase', outcome: 'win' }] }),
    ).toBeNull()
    expect(
      parseSaveData({ ...data, seasonGameLog: [{ totalWeek: 1, phase: 'qualifying', outcome: 'draw' }] }),
    ).toBeNull()
  })

  it('accepts a null lastResult but rejects a non-string one', () => {
    expect(parseSaveData(makeSaveData({ lastResult: null }))).not.toBeNull()
    expect(parseSaveData({ ...makeSaveData(), lastResult: 123 })).toBeNull()
  })

  it('accepts a save mid-recruiting with a valid candidate pool', () => {
    const candidates = generateCandidatePool(50, 4, 7)
    const data = makeSaveData({ recruitingCandidates: candidates })
    expect(parseSaveData(JSON.parse(serializeSaveData(data)))).toEqual(data)
  })

  it('rejects a candidate pool with a malformed candidate', () => {
    const candidates = generateCandidatePool(50, 2, 7)
    const broken = { ...candidates[0], attributeRanges: 'nope' } as unknown as (typeof candidates)[number]
    expect(parseSaveData(makeSaveData({ recruitingCandidates: [broken, candidates[1]] }))).toBeNull()
  })

  it('rejects a save missing the reputation or graduateLog fields', () => {
    const { reputation: _reputation, ...withoutReputation } = makeSaveData()
    expect(parseSaveData(withoutReputation)).toBeNull()
    const { graduateLog: _graduateLog, ...withoutGraduateLog } = makeSaveData()
    expect(parseSaveData(withoutGraduateLog)).toBeNull()
  })

  it('accepts a non-null lastLineup and rejects a malformed one', () => {
    const withLineup = makeSaveData({ lastLineup: { starters: ['p1'], rotation: ['p2'] } })
    expect(parseSaveData(JSON.parse(serializeSaveData(withLineup)))).toEqual(withLineup)
    expect(parseSaveData(makeSaveData({ lastLineup: { starters: ['p1'] } as never }))).toBeNull()
  })

  it('rejects a save format version older than the current one (e.g. a pre-recruiting save)', () => {
    expect(parseSaveData(makeSaveData({ version: SAVE_FORMAT_VERSION - 1 }))).toBeNull()
  })

  it('rejects a save missing the training card pool or training points', () => {
    const { cardPool: _cardPool, ...withoutCardPool } = makeSaveData()
    expect(parseSaveData(withoutCardPool)).toBeNull()
    const { trainingPoints: _trainingPoints, ...withoutPoints } = makeSaveData()
    expect(parseSaveData(withoutPoints)).toBeNull()
  })

  it('rejects a card pool with a malformed card (bad kind, or an attribute outside AttributeKey)', () => {
    const data = makeSaveData()
    const brokenKind = { ...data.cardPool, cards: [{ ...data.cardPool.cards[0], kind: 'not-a-kind' }] }
    expect(parseSaveData({ ...data, cardPool: brokenKind })).toBeNull()

    const brokenAttribute = { ...data.cardPool, cards: [{ ...data.cardPool.cards[0], attribute: 'not-an-attribute' }] }
    expect(parseSaveData({ ...data, cardPool: brokenAttribute })).toBeNull()
  })
})

describe('localStorage read/write', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when nothing has been saved', () => {
    expect(loadSaveFromStorage()).toBeNull()
  })

  it('round-trips a save through localStorage', () => {
    const data = makeSaveData()
    writeSaveToStorage(data)
    expect(loadSaveFromStorage()).toEqual(data)
  })

  it('returns null and does not throw for corrupted JSON already in storage', () => {
    window.localStorage.setItem(SAVE_STORAGE_KEY, '{not valid json')
    expect(loadSaveFromStorage()).toBeNull()
  })

  it('clearSaveFromStorage removes the save', () => {
    writeSaveToStorage(makeSaveData())
    clearSaveFromStorage()
    expect(loadSaveFromStorage()).toBeNull()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { generateCandidatePool } from '../recruiting'
import { createInitialRoster } from '../roster'
import { createSeededRng } from '../rng'
import {
  MIN_SUPPORTED_SAVE_VERSION,
  SAVE_FORMAT_VERSION,
  SAVE_STORAGE_KEY,
  clearSaveFromStorage,
  createSaveSlot,
  deleteSaveSlot,
  listSaveSlots,
  loadSaveFromSlot,
  loadSaveFromStorage,
  migrateLegacySingleSlotSave,
  parseSaveData,
  readActiveSlotId,
  serializeSaveData,
  writeActiveSlotId,
  writeSaveToSlot,
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
    challengeMode: 'long',
    pendingChallengeDecision: false,
    achievements: [],
    seasonHadInjury: false,
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

  it('rejects a save from a future format version (cannot downgrade)', () => {
    expect(parseSaveData(makeSaveData({ version: SAVE_FORMAT_VERSION + 1 }))).toBeNull()
  })

  it('rejects a save format version older than MIN_SUPPORTED_SAVE_VERSION, even with all current fields present', () => {
    expect(parseSaveData(makeSaveData({ version: MIN_SUPPORTED_SAVE_VERSION - 1 }))).toBeNull()
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

  describe('migration from older-but-supported versions', () => {
    it('upgrades a v10 save (pre-rivals/schoolAssets/challengeMode) with sensible defaults', () => {
      const current = makeSaveData()
      const { rivals: _rivals, schoolAssets: _schoolAssets, challengeMode: _challengeMode, pendingChallengeDecision: _pendingChallengeDecision, ...v10Fields } = current
      const v10Save = { ...v10Fields, version: 10 }

      expect(parseSaveData(v10Save)).toEqual({
        ...current,
        rivals: [],
        schoolAssets: [],
        challengeMode: 'long',
        pendingChallengeDecision: false,
      })
    })

    it('upgrades a v11 save (pre-schoolAssets/challengeMode) with sensible defaults', () => {
      const current = makeSaveData()
      const { schoolAssets: _schoolAssets, challengeMode: _challengeMode, pendingChallengeDecision: _pendingChallengeDecision, ...v11Fields } = current
      const v11Save = { ...v11Fields, version: 11 }

      expect(parseSaveData(v11Save)).toEqual({
        ...current,
        schoolAssets: [],
        challengeMode: 'long',
        pendingChallengeDecision: false,
      })
    })

    it('upgrades a v12 save (pre-challengeMode) with sensible defaults', () => {
      const current = makeSaveData()
      const { challengeMode: _challengeMode, pendingChallengeDecision: _pendingChallengeDecision, ...v12Fields } = current
      const v12Save = { ...v12Fields, version: 12 }

      expect(parseSaveData(v12Save)).toEqual({
        ...current,
        challengeMode: 'long',
        pendingChallengeDecision: false,
      })
    })

    it('rejects a save older than MIN_SUPPORTED_SAVE_VERSION outright', () => {
      const current = makeSaveData()
      const { rivals: _rivals, schoolAssets: _schoolAssets, challengeMode: _challengeMode, pendingChallengeDecision: _pendingChallengeDecision, ...oldFields } = current
      expect(parseSaveData({ ...oldFields, version: 9 })).toBeNull()
    })

    it('round-trips a migrated save through localStorage exactly like a native current-version save', () => {
      const current = makeSaveData()
      const { rivals: _rivals, schoolAssets: _schoolAssets, challengeMode: _challengeMode, pendingChallengeDecision: _pendingChallengeDecision, ...v10Fields } = current
      expect(parseSaveData({ ...v10Fields, version: 10 })).toEqual(parseSaveData(current))
    })
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

describe('save slots', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with no slots and no active slot', () => {
    expect(listSaveSlots()).toEqual([])
    expect(readActiveSlotId()).toBeNull()
  })

  it('createSaveSlot registers the slot and makes it active', () => {
    const id = createSaveSlot('淡水高中')
    expect(readActiveSlotId()).toBe(id)
    const slots = listSaveSlots()
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({ id, label: '淡水高中' })
  })

  it('writeSaveToSlot then loadSaveFromSlot round-trips the save data', () => {
    const id = createSaveSlot('淡水高中')
    const data = makeSaveData()
    writeSaveToSlot(id, data)
    expect(loadSaveFromSlot(id)).toEqual(data)
  })

  it('writeSaveToSlot keeps the slot label and bumps updatedAt', () => {
    const id = createSaveSlot('淡水高中')
    const before = listSaveSlots()[0].updatedAt
    writeSaveToSlot(id, makeSaveData())
    const after = listSaveSlots().find((slot) => slot.id === id)
    expect(after?.label).toBe('淡水高中')
    expect(after?.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('supports multiple independent slots', () => {
    const idA = createSaveSlot('淡水高中')
    const idB = createSaveSlot('陽明高中')
    writeSaveToSlot(idA, makeSaveData({ teamName: '淡水高中' }))
    writeSaveToSlot(idB, makeSaveData({ teamName: '陽明高中' }))

    expect(listSaveSlots()).toHaveLength(2)
    expect(loadSaveFromSlot(idA)?.teamName).toBe('淡水高中')
    expect(loadSaveFromSlot(idB)?.teamName).toBe('陽明高中')
  })

  it('loadSaveFromSlot returns null for an unknown or empty slot', () => {
    expect(loadSaveFromSlot('does-not-exist')).toBeNull()
  })

  it('deleteSaveSlot removes the slot and clears the active pointer when it was active', () => {
    const id = createSaveSlot('淡水高中')
    writeSaveToSlot(id, makeSaveData())

    deleteSaveSlot(id)

    expect(listSaveSlots()).toEqual([])
    expect(loadSaveFromSlot(id)).toBeNull()
    expect(readActiveSlotId()).toBeNull()
  })

  it('deleteSaveSlot leaves the active pointer untouched when deleting a non-active slot', () => {
    const idA = createSaveSlot('淡水高中')
    const idB = createSaveSlot('陽明高中')
    writeActiveSlotId(idA)

    deleteSaveSlot(idB)

    expect(readActiveSlotId()).toBe(idA)
    expect(listSaveSlots().map((slot) => slot.id)).toEqual([idA])
  })

  it('migrateLegacySingleSlotSave moves an old single-key save into a new slot and clears the old key', () => {
    const data = makeSaveData()
    writeSaveToStorage(data)

    migrateLegacySingleSlotSave()

    expect(loadSaveFromStorage()).toBeNull()
    const slots = listSaveSlots()
    expect(slots).toHaveLength(1)
    expect(slots[0].label).toBe(data.teamName)
    expect(readActiveSlotId()).toBe(slots[0].id)
    expect(loadSaveFromSlot(slots[0].id)).toEqual(data)
  })

  it('migrateLegacySingleSlotSave is a no-op when slots already exist', () => {
    createSaveSlot('既有存檔')
    writeSaveToStorage(makeSaveData())

    migrateLegacySingleSlotSave()

    expect(listSaveSlots()).toHaveLength(1)
    expect(listSaveSlots()[0].label).toBe('既有存檔')
    expect(loadSaveFromStorage()).not.toBeNull()
  })

  it('migrateLegacySingleSlotSave is a no-op when there is no legacy save', () => {
    migrateLegacySingleSlotSave()
    expect(listSaveSlots()).toEqual([])
  })
})

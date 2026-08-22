import { ATTRIBUTE_KEYS, POSITIONS, type Player, type Position } from './types'

export const STARTER_COUNT = 5
export const ROTATION_COUNT = 3

// 先發/主要輪替對隊伍戰力的加權比例(原創數值,待調校):先發6:輪替3,未上場球員不計入戰力。
export const STARTER_WEIGHT = 6
export const ROTATION_WEIGHT = 3

export interface GameLineup {
  starters: string[]
  rotation: string[]
}

export type LineupRole = 'starter' | 'rotation' | 'bench'

export function lineupRole(playerId: string, lineup: GameLineup): LineupRole {
  if (lineup.starters.includes(playerId)) return 'starter'
  if (lineup.rotation.includes(playerId)) return 'rotation'
  return 'bench'
}

export function lineupWeight(playerId: string, lineup: GameLineup): number {
  const role = lineupRole(playerId, lineup)
  if (role === 'starter') return STARTER_WEIGHT
  if (role === 'rotation') return ROTATION_WEIGHT
  return 0
}

function overallAttributeAverage(player: Player): number {
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + player.attributes[key], 0) / ATTRIBUTE_KEYS.length
}

/**
 * 依可上場球員名單,把玩家手動選擇的先發/輪替補滿到上限:可上場人數不足 8 人時
 * (例如傷兵潮),沒有明確指定的名額直接補上。自動補滿的排序規則是「綜合屬性由高到低」,
 * 而非單純依名冊陣列順序,確保結果可以說明(優先補進較強的可用球員)。
 */
export function completeLineup(availablePlayers: Player[], starters: string[], rotation: string[]): GameLineup {
  const availableIds = availablePlayers.map((player) => player.id)
  const chosenStarters = starters.filter((id) => availableIds.includes(id)).slice(0, STARTER_COUNT)
  const chosenRotation = rotation
    .filter((id) => availableIds.includes(id) && !chosenStarters.includes(id))
    .slice(0, ROTATION_COUNT)

  const chosen = new Set([...chosenStarters, ...chosenRotation])
  const remaining = availablePlayers
    .filter((player) => !chosen.has(player.id))
    .sort((a, b) => overallAttributeAverage(b) - overallAttributeAverage(a))
    .map((player) => player.id)

  const filledStarters = [...chosenStarters]
  while (filledStarters.length < STARTER_COUNT && remaining.length > 0) {
    filledStarters.push(remaining.shift()!)
  }

  const filledRotation = [...chosenRotation]
  while (filledRotation.length < ROTATION_COUNT && remaining.length > 0) {
    filledRotation.push(remaining.shift()!)
  }

  return { starters: filledStarters, rotation: filledRotation }
}

/** 把已存的陣容依目前可上場名單過濾:排除已受傷、畢業或轉隊等已不存在的球員。 */
export function sanitizeLineup(lineup: GameLineup | null, availablePlayers: Player[]): GameLineup {
  if (!lineup) return { starters: [], rotation: [] }
  const availableIds = new Set(availablePlayers.map((player) => player.id))
  return {
    starters: lineup.starters.filter((id) => availableIds.has(id)),
    rotation: lineup.rotation.filter((id) => availableIds.has(id)),
  }
}

export type LineupSuggestionStrategy = 'bestStrength' | 'lowFatigue' | 'developRookies'

const SUGGESTION_COMPARATORS: Record<LineupSuggestionStrategy, (a: Player, b: Player) => number> = {
  bestStrength: (a, b) => overallAttributeAverage(b) - overallAttributeAverage(a),
  lowFatigue: (a, b) => a.fatigue - b.fatigue || overallAttributeAverage(b) - overallAttributeAverage(a),
  developRookies: (a, b) => a.grade - b.grade || overallAttributeAverage(b) - overallAttributeAverage(a),
}

/** 依策略對可上場球員排序後,取前 5 名為先發、接下來 3 名為主要輪替的一鍵建議陣容。 */
export function suggestLineup(availablePlayers: Player[], strategy: LineupSuggestionStrategy): GameLineup {
  const sorted = [...availablePlayers].sort(SUGGESTION_COMPARATORS[strategy])
  return {
    starters: sorted.slice(0, STARTER_COUNT).map((player) => player.id),
    rotation: sorted.slice(STARTER_COUNT, STARTER_COUNT + ROTATION_COUNT).map((player) => player.id),
  }
}

export interface LineupCompositionWarnings {
  missingBallHandler: boolean
  missingInterior: boolean
  overconcentrated: boolean
}

const BALL_HANDLER_POSITIONS: Position[] = ['PG']
const INTERIOR_POSITIONS: Position[] = ['C', 'PF']
// 8 個上場名額中,單一位置佔 4 個(含)以上視為過度集中(原創門檻,待調校)。
const OVERCONCENTRATION_THRESHOLD = 4

/**
 * MVP 不強制固定位置組合(避免傷病時無法開打),但提示缺主要持球者、缺內線、
 * 或位置過度集中,供玩家參考,不阻擋開打。
 */
export function analyzeLineupComposition(roster: Player[], lineup: GameLineup): LineupCompositionWarnings {
  const ids = new Set([...lineup.starters, ...lineup.rotation])
  const players = roster.filter((player) => ids.has(player.id))
  const counts = players.reduce<Partial<Record<Position, number>>>((acc, player) => {
    acc[player.position] = (acc[player.position] ?? 0) + 1
    return acc
  }, {})

  return {
    missingBallHandler: !BALL_HANDLER_POSITIONS.some((position) => (counts[position] ?? 0) > 0),
    missingInterior: !INTERIOR_POSITIONS.some((position) => (counts[position] ?? 0) > 0),
    overconcentrated: Object.values(counts).some((count) => (count ?? 0) >= OVERCONCENTRATION_THRESHOLD),
  }
}

// 先發位置涵蓋懲罰(原創數值,待調校):先發五人中,每個位置(PG/SG/SF/PF/C)「完全缺席」
// 或「重複超過一人」都各算一次問題,每次問題讓隊伍有效戰力打折。刻意設計成軟性懲罰,不是
// 強制五個位置各排一人——傷病潮時仍要能湊出先發正常開打,只是戰力會受影響,呼應
// analyzeLineupComposition 一直以來「不阻擋開打」的設計精神,只是這次是真的會影響戰力,
// 不再只是純文字提示。只看先發(不含輪替/未上場),因為只有先發才承受完整比賽負荷與戰力權重。
export const POSITION_MISMATCH_PENALTY = 0.03

export function countStarterPositionMismatches(roster: Player[], starters: string[]): number {
  const counts = new Map<Position, number>()
  for (const id of starters) {
    const player = roster.find((candidate) => candidate.id === id)
    if (!player) continue
    counts.set(player.position, (counts.get(player.position) ?? 0) + 1)
  }
  return POSITIONS.reduce((problems, position) => {
    const count = counts.get(position) ?? 0
    return count === 0 || count >= 2 ? problems + 1 : problems
  }, 0)
}

/** 每一次位置問題讓隊伍有效戰力打折 POSITION_MISMATCH_PENALTY,下限 0(不會變成負戰力)。 */
export function positionMismatchMultiplier(mismatchCount: number): number {
  return Math.max(0, 1 - mismatchCount * POSITION_MISMATCH_PENALTY)
}

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

/**
 * 依可上場球員名單,把玩家手動選擇的先發/輪替補滿到上限:可上場人數不足 8 人時
 * (例如傷兵潮),沒有明確指定的名額直接依序自動填入,不會卡住流程或阻擋開打。
 */
export function completeLineup(
  availablePlayerIds: string[],
  starters: string[],
  rotation: string[],
): GameLineup {
  const chosenStarters = starters.filter((id) => availablePlayerIds.includes(id)).slice(0, STARTER_COUNT)
  const chosenRotation = rotation
    .filter((id) => availablePlayerIds.includes(id) && !chosenStarters.includes(id))
    .slice(0, ROTATION_COUNT)

  const chosen = new Set([...chosenStarters, ...chosenRotation])
  const remaining = availablePlayerIds.filter((id) => !chosen.has(id))

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

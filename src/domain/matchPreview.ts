import { lineupRole, type GameLineup } from './lineup'
import {
  BASELINE_RECOVERY,
  computeTeamStrength,
  computeWinProbability,
  HIGH_FATIGUE_RISK_THRESHOLD,
} from './matchEngine'
import { computeAceStrengthBonus, type OpponentAce } from './opponentAce'
import { OFFICIAL_MATCH_LOAD, PHASE_OPPONENT_STRENGTH, ROTATION_MATCH_LOAD, type OfficialPhase } from './officialMatch'
import { getOpponentTier, type OpponentTier } from './opponentTier'
import { computeTacticAttributeWeights, type GameTactics } from './tactics'
import { ATTRIBUTE_KEYS, type AttributeKey, type Player } from './types'

export interface RoleFatigueDelta {
  starter: number
  rotation: number
  bench: number
}

export interface MatchPreview {
  /** 目前陣容的基礎戰力(含戰術權重、先發/輪替加權與目前疲勞折損)。 */
  teamStrength: number
  /** 疲勞造成的戰力折損:與同一份名冊在疲勞值全為 0 時的戰力差距。 */
  fatiguePenalty: number
  opponentStrength: number
  opponentTier: OpponentTier
  /** 不含正式模擬時一次性隨機表現噪音的基準勝率,單純供賽前參考,不消耗亂數。 */
  baselineWinProbability: number
  /** 目前戰術主要強化的屬性(權重 > 1 者)。 */
  boostedAttributes: AttributeKey[]
  /** 先發/輪替/未上場三種角色,本場結束後的預估疲勞淨變化。 */
  roleFatigueDelta: RoleFatigueDelta
  /** 疲勞值已達警戒門檻、賽前應留意受傷風險的球員 id。 */
  highRiskPlayerIds: string[]
}

export function computeMatchPreview(
  roster: Player[],
  lineup: GameLineup,
  tactics: GameTactics,
  phase: OfficialPhase,
  opponentAce: OpponentAce,
): MatchPreview {
  const tacticWeights = computeTacticAttributeWeights(tactics)
  const teamStrength = computeTeamStrength(roster, tacticWeights, lineup)
  const restedRoster = roster.map((player) => ({ ...player, fatigue: 0 }))
  const teamStrengthWithoutFatigue = computeTeamStrength(restedRoster, tacticWeights, lineup)
  const opponentStrength = PHASE_OPPONENT_STRENGTH[phase] + computeAceStrengthBonus(opponentAce)

  return {
    teamStrength,
    fatiguePenalty: teamStrengthWithoutFatigue - teamStrength,
    opponentStrength,
    opponentTier: getOpponentTier(opponentStrength),
    baselineWinProbability: computeWinProbability(teamStrength, opponentStrength),
    boostedAttributes: ATTRIBUTE_KEYS.filter((key) => (tacticWeights[key] ?? 1) > 1),
    roleFatigueDelta: {
      starter: OFFICIAL_MATCH_LOAD - BASELINE_RECOVERY,
      rotation: ROTATION_MATCH_LOAD - BASELINE_RECOVERY,
      bench: -BASELINE_RECOVERY,
    },
    highRiskPlayerIds: roster
      .filter((player) => lineupRole(player.id, lineup) !== 'bench')
      .filter((player) => player.fatigue >= HIGH_FATIGUE_RISK_THRESHOLD)
      .map((player) => player.id),
  }
}

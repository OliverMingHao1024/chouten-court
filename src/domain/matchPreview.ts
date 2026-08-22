import { countStarterPositionMismatches, lineupRole, type GameLineup } from './lineup'
import { computeRecoveryRate, computeTeamStrength, computeWinProbability, HIGH_FATIGUE_RISK_THRESHOLD } from './matchEngine'
import { computeAceStrengthBonus, type OpponentAce } from './opponentAce'
import {
  isClutchPhase,
  OFFICIAL_MATCH_LOAD,
  PHASE_OPPONENT_STRENGTH,
  ROTATION_MATCH_LOAD,
  type OfficialPhase,
} from './officialMatch'
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
  /** 先發/輪替/未上場三種角色,本場結束後的預估疲勞淨變化(以目前名冊的平均恢復力估算,
   * 實際結算時每位球員仍依各自的恢復力計算,兩者可能有小幅落差)。 */
  roleFatigueDelta: RoleFatigueDelta
  /** 疲勞值已達警戒門檻、賽前應留意受傷風險的球員 id。 */
  highRiskPlayerIds: string[]
  /** 先發陣容中是否有隊長型球員(團隊戰力加成是否生效)。 */
  captainBonusActive: boolean
  /** 目前賽制階段是否讓抗壓型球員的加成生效(僅八強/四強)。 */
  clutchBonusActive: boolean
  /** 先發五人位置涵蓋問題數(缺席或重複的位置各算一次);已反映在 teamStrength 裡,
   * 這裡額外提供給賽前畫面顯示具體問題數與換算後的戰力折損百分比。 */
  positionMismatchCount: number
}

export function computeMatchPreview(
  roster: Player[],
  lineup: GameLineup,
  tactics: GameTactics,
  phase: OfficialPhase,
  opponentAce: OpponentAce,
): MatchPreview {
  const tacticWeights = computeTacticAttributeWeights(tactics)
  const clutchActive = isClutchPhase(phase)
  const teamStrength = computeTeamStrength(roster, tacticWeights, lineup, clutchActive)
  const restedRoster = roster.map((player) => ({ ...player, fatigue: 0 }))
  const teamStrengthWithoutFatigue = computeTeamStrength(restedRoster, tacticWeights, lineup, clutchActive)
  const opponentStrength = PHASE_OPPONENT_STRENGTH[phase] + computeAceStrengthBonus(opponentAce)
  const averageRecovery = roster.reduce((sum, player) => sum + computeRecoveryRate(player), 0) / roster.length

  return {
    teamStrength,
    fatiguePenalty: teamStrengthWithoutFatigue - teamStrength,
    opponentStrength,
    opponentTier: getOpponentTier(opponentStrength),
    baselineWinProbability: computeWinProbability(teamStrength, opponentStrength),
    boostedAttributes: ATTRIBUTE_KEYS.filter((key) => (tacticWeights[key] ?? 1) > 1),
    roleFatigueDelta: {
      starter: OFFICIAL_MATCH_LOAD - averageRecovery,
      rotation: ROTATION_MATCH_LOAD - averageRecovery,
      bench: -averageRecovery,
    },
    highRiskPlayerIds: roster
      .filter((player) => lineupRole(player.id, lineup) !== 'bench')
      .filter((player) => player.fatigue >= HIGH_FATIGUE_RISK_THRESHOLD)
      .map((player) => player.id),
    captainBonusActive: lineup.starters.some(
      (id) => roster.find((player) => player.id === id)?.personality === 'captain',
    ),
    clutchBonusActive: clutchActive,
    positionMismatchCount: countStarterPositionMismatches(roster, lineup.starters),
  }
}

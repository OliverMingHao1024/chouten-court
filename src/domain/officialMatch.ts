import { getPhaseWeekRange, type SeasonPhase } from './calendar'
import { lineupRole, type GameLineup } from './lineup'
import {
  advancePlayerWeek,
  ATTRIBUTE_MAX,
  clamp,
  computeMatchWinProbability,
  type InjuryDurationRange,
} from './matchEngine'
import { computeAceStrengthBonus, type OpponentAce } from './opponentAce'
import { createSeededRng, type Rng } from './rng'
import { computeStyleTag } from './styleTag'
import { computeTacticAttributeWeights, type GameTactics } from './tactics'
import { ATTRIBUTE_KEYS, type AttributeKey, type Player } from './types'

export type OfficialPhase = Exclude<SeasonPhase, 'offseason'>

/** 抗壓型(clutch)個性只在八強與四強階段生效。 */
export function isClutchPhase(phase: OfficialPhase): boolean {
  return phase === 'quarterfinal' || phase === 'final4'
}

// 每階段我方視角要打的場次:資格賽/預賽/複賽/準決賽對應原始 HBL 分組單循環的場次數,
// 四強賽只算「我方會打到的場次」(準決賽 + 冠軍賽或季軍賽,不含另一半對戰組合)。
export const PHASE_GAME_COUNT: Record<OfficialPhase, number> = {
  qualifying: 4,
  preliminary: 4,
  group: 5,
  quarterfinal: 6,
  final4: 2,
}

// 對手強度隨階段遞增(原創配置,尚未依實際隊伍精細調校)。
export const PHASE_OPPONENT_STRENGTH: Record<OfficialPhase, number> = {
  qualifying: 55,
  preliminary: 62,
  group: 70,
  quarterfinal: 78,
  final4: 88,
}

// 重傷缺賽週數隨賽制階段遞增(原創配置,尚未依實際隊伍精細調校):愈晚期比賽強度愈高,
// 傷勢恢復期也愈長。
export const PHASE_MAJOR_INJURY_WEEKS: Record<OfficialPhase, InjuryDurationRange> = {
  qualifying: { min: 3, max: 5 },
  preliminary: { min: 4, max: 6 },
  group: { min: 4, max: 7 },
  quarterfinal: { min: 5, max: 8 },
  final4: { min: 6, max: 9 },
}

export const OFFICIAL_MATCH_LOAD = 20
// 主要輪替球員負荷減半:上場但不像先發那麼吃重(原創數值,待調校)。
export const ROTATION_MATCH_LOAD = Math.round(OFFICIAL_MATCH_LOAD / 2)

// 正式賽實戰養成(原創數值,待調校):先發成長機率最高,主要輪替次之,未上場沒有機會成長。
// 初期採隨機屬性 +1,不沿用當週訓練重點,避免比賽與訓練選擇產生不自然的耦合。
const STARTER_GAME_GROWTH_CHANCE = 0.4
const ROTATION_GAME_GROWTH_CHANCE = 0.2
const GAME_GROWTH_AMOUNT = 1

export interface GameGrowthEntry {
  playerId: string
  attribute: AttributeKey
}

function rollGameGrowthAttribute(rng: Rng): AttributeKey {
  return ATTRIBUTE_KEYS[Math.floor(rng() * ATTRIBUTE_KEYS.length)]
}

/**
 * Which game (0-based) of the current phase falls on this week, or null if this
 * week has no official game scheduled (offseason, or a spare week past the phase's
 * game count, e.g. final4's 3rd week after both of the team's games are done).
 */
export function getGameIndexForWeek(phase: SeasonPhase, weekOfYear: number): number | null {
  if (phase === 'offseason') return null
  const range = getPhaseWeekRange(phase)
  const gameIndex = weekOfYear - range.start
  return gameIndex < PHASE_GAME_COUNT[phase] ? gameIndex : null
}

export interface OfficialGameResult {
  outcome: 'win' | 'loss'
  roster: Player[]
  /** 本場依出賽角色取得實戰成長的球員清單,供比賽結果摘要顯示。 */
  growth: GameGrowthEntry[]
}

export function simulateOfficialGame(
  roster: Player[],
  phase: OfficialPhase,
  seed: number,
  tactics: GameTactics,
  opponentAce: OpponentAce,
  lineup: GameLineup,
): OfficialGameResult {
  const rng = createSeededRng(seed)
  const opponentStrength = PHASE_OPPONENT_STRENGTH[phase] + computeAceStrengthBonus(opponentAce)
  const winProbability = computeMatchWinProbability(
    roster,
    opponentStrength,
    rng,
    computeTacticAttributeWeights(tactics),
    lineup,
    isClutchPhase(phase),
  )
  const outcome: 'win' | 'loss' = rng() < winProbability ? 'win' : 'loss'
  const majorInjuryWeeks = PHASE_MAJOR_INJURY_WEEKS[phase]
  const growth: GameGrowthEntry[] = []
  const fatiguedRoster = roster.map((player) => {
    if (player.injuryStatus === 'minor' || player.injuryStatus === 'major') {
      return advancePlayerWeek(player, 0, rng, false)
    }
    // 先發承受完整負荷、主要輪替減半,兩者都會被判定是否受傷;未列入陣容的球員本場沒上場,
    // 直接淨恢復,不參與這場的受傷判定,也沒有實戰成長機會。
    const role = lineupRole(player.id, lineup)
    const fatigued =
      role === 'starter'
        ? advancePlayerWeek(player, OFFICIAL_MATCH_LOAD, rng, true, majorInjuryWeeks)
        : role === 'rotation'
          ? advancePlayerWeek(player, ROTATION_MATCH_LOAD, rng, true, majorInjuryWeeks)
          : advancePlayerWeek(player, 0, rng, false)

    const growthChance =
      role === 'starter' ? STARTER_GAME_GROWTH_CHANCE : role === 'rotation' ? ROTATION_GAME_GROWTH_CHANCE : 0
    if (growthChance > 0 && rng() < growthChance) {
      const attribute = rollGameGrowthAttribute(rng)
      const attributes = {
        ...fatigued.attributes,
        [attribute]: clamp(fatigued.attributes[attribute] + GAME_GROWTH_AMOUNT, 0, ATTRIBUTE_MAX),
      }
      growth.push({ playerId: player.id, attribute })
      return { ...fatigued, attributes, styleTag: computeStyleTag(attributes) }
    }
    return fatigued
  })
  return { outcome, roster: fatiguedRoster, growth }
}

/**
 * 簡化版晉級判斷:同階段勝場數需嚴格多於敗場數才晉級。真實 HBL 依分組排名與其他
 * 27 校戰績決定名次,本遊戲不模擬其他學校,以勝率門檻近似晉級難度。
 */
export function didAdvancePhase(_phase: OfficialPhase, wins: number, losses: number): boolean {
  return wins > losses
}

export type Final4Placement = 'champion' | 'runnerUp' | 'third' | 'fourth'

export function getFinal4Placement(
  semifinal: 'win' | 'loss',
  secondGame: 'win' | 'loss',
): Final4Placement {
  if (semifinal === 'win') return secondGame === 'win' ? 'champion' : 'runnerUp'
  return secondGame === 'win' ? 'third' : 'fourth'
}

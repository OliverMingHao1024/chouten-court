import {
  ACHIEVEMENT_LABELS,
  isBackToBackFinal8,
  isComebackWin,
  isUndefeatedSeason,
  newlyUnlockedAchievements,
  unlockAchievement,
  type AchievementKey,
} from './achievements'
import { computeOverallGrade } from './attributeGrade'
import { getCalendarPosition } from './calendar'
import {
  hasReachedInsuranceCap,
  hasReachedShortChallengeMilestone,
  isChampionRun,
  summarizeCareer,
  type CareerEndReason,
} from './career'
import { advanceGrades, describeGraduate } from './graduation'
import { describePermanentAftereffects } from './matchEngine'
import type { GameGrowthEntry, OfficialGameResult } from './officialMatch'
import { generateCandidatePool, type Candidate } from './recruiting'
import { applyReputationDelta, computeSeasonReputationDelta } from './reputation'
import { computeComebackMargin } from './rivals'
import { ROSTER_SIZE } from './roster'
import { createSeededRng, hashSeed, type Rng } from './rng'
import {
  evaluateSchoolAssetUnlocks,
  hasSchoolAsset,
  newlyUnlockedAssets,
  SCHOOL_ASSET_LABELS,
  type SchoolAssetKey,
} from './schoolAssets'
import { appendSchoolHistoryEntry, type SchoolHistoryEntry } from './schoolHistory'
import { advanceSeasonWeek, FINAL4_PLACEMENT_LABEL, type SeasonGameLogEntry } from './season'
import { computeSeasonAwards, type SeasonRecord, type SeasonSummaryResult } from './seasonSummary'
import { ATTRIBUTE_LABELS, INJURY_STATUS_LABELS, type Player } from './types'

export function describeNewInjuries(before: Player[], after: Player[]): string {
  const newlyInjured = after.filter(
    (player, index) => player.injuryStatus !== 'healthy' && before[index].injuryStatus === 'healthy',
  )
  if (newlyInjured.length === 0) return ''
  return (
    ' ' +
    newlyInjured
      .map((player) => `${player.name}${INJURY_STATUS_LABELS[player.injuryStatus]}(預計缺賽 ${player.injuryWeeksRemaining} 週)`)
      .join('、')
  )
}

export function describeGameGrowth(roster: Player[], growth: GameGrowthEntry[]): string {
  if (growth.length === 0) return ''
  const nameById = new Map(roster.map((player) => [player.id, player.name]))
  return (
    ' 實戰成長:' +
    growth.map((entry) => `${nameById.get(entry.playerId) ?? ''}(${ATTRIBUTE_LABELS[entry.attribute]}+1)`).join('、')
  )
}

/**
 * 生涯結束(奪冠或達到保險上限/三年挑戰結束)時組出一筆校史紀錄:只有奪冠生涯才附上當時的
 * 奪冠隊陣容快照(「歷史隊」),其餘生涯結束只留戰績摘要,不佔用歷史隊的資料空間。
 */
export function buildSchoolHistoryEntry(
  coachName: string,
  careerLog: SeasonRecord[],
  reason: CareerEndReason,
  championRoster: Player[] | null,
  graduateLog: string[] = [],
): SchoolHistoryEntry {
  const summary = summarizeCareer(careerLog, reason)
  return {
    coachName,
    reason,
    totalSeasons: summary.totalSeasons,
    totalWins: summary.totalWins,
    totalLosses: summary.totalLosses,
    bestPlacementLabel: summary.bestPlacement ? FINAL4_PLACEMENT_LABEL[summary.bestPlacement] : '未曾闖進四強',
    notableGraduates: graduateLog.slice(-5),
    championRoster: championRoster
      ? championRoster.map((player) => ({
          name: player.name,
          position: player.position,
          overallGrade: computeOverallGrade(player.attributes),
        }))
      : null,
  }
}

export interface OfficialGameWeekState {
  totalWeek: number
  players: Player[]
  seasonGameLog: SeasonGameLogEntry[]
  reputation: number
  graduateLog: string[]
  careerLog: SeasonRecord[]
  eraCount: number
  schoolAssets: SchoolAssetKey[]
  pendingSeasonSummary: SeasonSummaryResult | null
  challengeMode: 'short' | 'long'
  pendingChallengeDecision: boolean
  coachName: string
  seed: number
  achievements: AchievementKey[]
  seasonHadInjury: boolean
}

export interface OfficialGameWeekResult {
  nextTotalWeek: number
  players: Player[]
  reputation: number
  graduateLog: string[]
  recruitingCandidates: Candidate[] | null
  careerLog: SeasonRecord[]
  eraCount: number
  pendingSeasonSummary: SeasonSummaryResult | null
  careerEnded: CareerEndReason | null
  schoolAssets: SchoolAssetKey[]
  pendingChallengeDecision: boolean
  message: string
  seasonGameLog: SeasonGameLogEntry[]
  growth: GameGrowthEntry[]
  achievements: AchievementKey[]
  seasonHadInjury: boolean
}

export interface GraduationAdvanceState {
  players: Player[]
  graduateLog: string[]
  eraCount: number
  careerLog: SeasonRecord[]
  coachName: string
  reputation: number
  schoolAssets: SchoolAssetKey[]
  challengeMode: 'short' | 'long'
  pendingChallengeDecision: boolean
}

export interface GraduationAdvanceResult {
  players: Player[]
  graduateLog: string[]
  eraCount: number
  recruitingCandidates: Candidate[] | null
  careerEnded: CareerEndReason | null
  pendingChallengeDecision: boolean
  /** 有畢業才非空;沒有球員畢業時是空字串,呼叫端直接串接到既有訊息尾端即可。 */
  message: string
}

/**
 * 「球員畢業→檢查是否達到保險上限(屆滿即結束生涯,寫入校史)→沒屆滿就檢查三年挑戰里程碑、
 * 開招生名單補人」——這條規則有兩個呼叫時機:每季結束時(resolveOfficialGameWeek)、以及
 * 王朝模式續季時(奪冠後選擇不開新生涯,直接接下一季,見 App.tsx 的 onContinueDynasty)。
 * 抽成共用 module 是刻意的架構決策:王朝模式續季原本手刻了一份幾乎相同但獨立維護的邏輯,
 * 兩份實作已經觀察到漂移(王朝模式那份沒有三年挑戰里程碑檢查),統一成一份後兩條路徑
 * 自動同步,調規則也只需要改一個地方。
 */
export function advanceGraduationAndRecruiting(
  state: GraduationAdvanceState,
  graduationRng: Rng,
  recruitsSeed: number,
): GraduationAdvanceResult {
  const { roster: advancedRoster, graduates } = advanceGrades(state.players)
  let players = advancedRoster
  let graduateLog = state.graduateLog
  let eraCount = state.eraCount
  let recruitingCandidates: Candidate[] | null = null
  let careerEnded: CareerEndReason | null = null
  let pendingChallengeDecision = state.pendingChallengeDecision
  let message = ''

  if (graduates.length > 0) {
    eraCount += 1
    graduateLog = [
      ...graduateLog,
      ...graduates.map((graduate) => describeGraduate(graduate, state.reputation, graduationRng)),
    ]

    if (hasReachedInsuranceCap(eraCount)) {
      careerEnded = 'insuranceCap'
      appendSchoolHistoryEntry(buildSchoolHistoryEntry(state.coachName, state.careerLog, careerEnded, null, graduateLog))
    } else {
      if (
        state.challengeMode === 'short' &&
        !state.pendingChallengeDecision &&
        !hasReachedShortChallengeMilestone(state.eraCount) &&
        hasReachedShortChallengeMilestone(eraCount)
      ) {
        pendingChallengeDecision = true
      }
      const vacancies = ROSTER_SIZE - players.length
      const candidatePoolMultiplier = hasSchoolAsset(state.schoolAssets, 'scoutingNetwork') ? 4 : 2
      recruitingCandidates = generateCandidatePool(state.reputation, vacancies * candidatePoolMultiplier, recruitsSeed)
      message = ` 本屆畢業 ${graduates.length} 人,請完成招生補齊名冊。`
    }
  }

  return { players, graduateLog, eraCount, recruitingCandidates, careerEnded, pendingChallengeDecision, message }
}

/**
 * 一場正式賽結束後的完整結算:先跑既有的 advanceSeasonWeek 拿到戰績簿記,再疊上疲勞/受傷/
 * 實戰成長的文字摘要,最後才是季末才會發生的部分(聲望、學校資產解鎖、生涯紀錄、畢業/招生、
 * 三年挑戰里程碑、生涯結束判定,生涯真的結束時寫入校史)。
 *
 * 抽成純函式(校史寫入這個 side effect 例外,呼應 schoolHistory.ts 本來就封裝了 localStorage
 * 存取)是刻意的架構決策:原本這整段邏輯內嵌在 App.tsx 的 onComplete 事件處理常式裡,只能
 * 透過完整的 UI 互動流程間接測試;抽出來後可以直接餵一個 Player[] 陣列跟結果物件單元測試,
 * 不必每次都跑過畫面點擊。
 */
export function resolveOfficialGameWeek(
  state: OfficialGameWeekState,
  gameResult: OfficialGameResult,
): OfficialGameWeekResult {
  const result = advanceSeasonWeek(state.totalWeek, state.seasonGameLog, gameResult)

  let players = result.roster
  let reputation = state.reputation
  let graduateLog = state.graduateLog
  let recruitingCandidates: Candidate[] | null = null
  let careerLog = state.careerLog
  let eraCount = state.eraCount
  let pendingSeasonSummary = state.pendingSeasonSummary
  let careerEnded: CareerEndReason | null = null
  let schoolAssets = state.schoolAssets
  let pendingChallengeDecision = state.pendingChallengeDecision
  let achievements = state.achievements
  let seasonHadInjury = state.seasonHadInjury || describeNewInjuries(state.players, result.roster) !== ''
  let message =
    result.message +
    describeNewInjuries(state.players, result.roster) +
    describeGameGrowth(result.roster, result.growth) +
    describePermanentAftereffects(state.players, result.roster)

  const comebackMargin = computeComebackMargin(gameResult.boxScore.quarters, gameResult.outcome)
  if (isComebackWin(comebackMargin)) {
    achievements = unlockAchievement(achievements, 'comebackWin')
  }

  if (result.seasonEnded && result.finalPhaseReached) {
    const seasonYear = getCalendarPosition(state.totalWeek).year
    const seasonGames = [...state.seasonGameLog, result.gameLogEntry].filter(
      (entry) => getCalendarPosition(entry.totalWeek).year === seasonYear,
    )
    const reputationDelta = computeSeasonReputationDelta(result.finalPhaseReached, result.placement)
    reputation = applyReputationDelta(reputation, reputationDelta)
    schoolAssets = evaluateSchoolAssetUnlocks(schoolAssets, reputation)
    const unlockedThisSeason = newlyUnlockedAssets(state.schoolAssets, schoolAssets)
    if (unlockedThisSeason.length > 0) {
      message += ` 永久解鎖學校資產:${unlockedThisSeason.map((key) => SCHOOL_ASSET_LABELS[key]).join('、')}!`
    }

    const seasonRecord: SeasonRecord = {
      year: seasonYear,
      wins: seasonGames.filter((entry) => entry.outcome === 'win').length,
      losses: seasonGames.filter((entry) => entry.outcome === 'loss').length,
      finalPhaseReached: result.finalPhaseReached,
      placement: result.placement,
      reputationAfter: reputation,
    }
    careerLog = [...careerLog, seasonRecord]

    if (isUndefeatedSeason(seasonRecord)) achievements = unlockAchievement(achievements, 'undefeatedSeason')
    if (!seasonHadInjury) achievements = unlockAchievement(achievements, 'zeroInjurySeason')
    if (isBackToBackFinal8(careerLog)) achievements = unlockAchievement(achievements, 'backToBackFinal8')
    seasonHadInjury = false

    pendingSeasonSummary = {
      record: seasonRecord,
      reputationDelta,
      reputationAfter: reputation,
      awards: computeSeasonAwards(players),
    }

    if (isChampionRun(result.placement)) {
      careerEnded = 'champion'
      appendSchoolHistoryEntry(buildSchoolHistoryEntry(state.coachName, careerLog, careerEnded, players, graduateLog))
    } else {
      const graduation = advanceGraduationAndRecruiting(
        {
          players,
          graduateLog,
          eraCount,
          careerLog,
          coachName: state.coachName,
          reputation,
          schoolAssets,
          challengeMode: state.challengeMode,
          pendingChallengeDecision: state.pendingChallengeDecision,
        },
        createSeededRng(hashSeed(`${state.seed}-${result.nextTotalWeek}-graduation`)),
        hashSeed(`${state.seed}-${result.nextTotalWeek}-recruits`),
      )
      players = graduation.players
      graduateLog = graduation.graduateLog
      eraCount = graduation.eraCount
      recruitingCandidates = graduation.recruitingCandidates
      careerEnded = graduation.careerEnded
      pendingChallengeDecision = graduation.pendingChallengeDecision
      message += graduation.message
    }
  }

  const newlyUnlocked = newlyUnlockedAchievements(state.achievements, achievements)
  if (newlyUnlocked.length > 0) {
    message += ` 解鎖成就:${newlyUnlocked.map((key) => ACHIEVEMENT_LABELS[key]).join('、')}!`
  }

  return {
    nextTotalWeek: result.nextTotalWeek,
    players,
    reputation,
    graduateLog,
    recruitingCandidates,
    careerLog,
    eraCount,
    pendingSeasonSummary,
    careerEnded,
    schoolAssets,
    pendingChallengeDecision,
    message,
    seasonGameLog: [...state.seasonGameLog, result.gameLogEntry],
    growth: result.growth,
    achievements,
    seasonHadInjury,
  }
}

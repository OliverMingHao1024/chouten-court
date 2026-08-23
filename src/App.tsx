import { useEffect, useState, type ReactNode } from 'react'
import { getCalendarPosition, getMonthLabel, getSeasonPhase, PHASE_LABELS } from './domain/calendar'
import { generateOpponentName } from './domain/opponentName'
import { distributePlayerStats } from './domain/boxScoreStats'
import { generateOpponentAce, opponentAceEraIndex } from './domain/opponentAce'
import { generateOpponentStyle } from './domain/opponentStyle'
import { generateOpponentRoster } from './domain/opponentRoster'
import type { QuarterScore } from './domain/quarterSimulation'
import { computeComebackMargin, pickOpponentName, pinRival, recordRivalGame, unpinRival, type RivalRecord } from './domain/rivals'
import {
  evaluateSchoolAssetUnlocks,
  hasSchoolAsset,
  newlyUnlockedAssets,
  SCHOOL_ASSET_LABELS,
  type SchoolAssetKey,
} from './domain/schoolAssets'
import {
  getGameIndexForWeek,
  isClutchPhase,
  PHASE_GAME_COUNT,
  type GameGrowthEntry,
  type OfficialGameResult,
  type OfficialPhase,
} from './domain/officialMatch'
import type { GameLineup } from './domain/lineup'
import { computeTeamStrength, describePermanentAftereffects, RECOVERY_CENTER_BONUS } from './domain/matchEngine'
import type { AchievementKey } from './domain/achievements'
import { computeTacticAttributeWeights, type GameTactics } from './domain/tactics'
import type { CareerEndReason } from './domain/career'
import { appendSchoolHistoryEntry, loadSchoolHistory } from './domain/schoolHistory'
import {
  advanceGraduationAndRecruiting,
  buildSchoolHistoryEntry,
  describeNewInjuries,
  resolveOfficialGameWeek,
} from './domain/officialGameWeek'
import {
  clampAttribute,
  clampFatigue,
  pickEventCard,
  resolveEventChoice,
  rollForWeeklyEvent,
  type EventCard,
  type EventRisk,
} from './domain/events'
import { signCandidates, type Candidate } from './domain/recruiting'
import { applyReputationDelta } from './domain/reputation'
import { STARTING_SCENARIO_ATTRIBUTE_SHIFT, STARTING_SCENARIO_REPUTATION } from './domain/startingScenario'
import { createInitialRoster, ROSTER_SIZE } from './domain/roster'
import { createSeededRng, hashSeed } from './domain/rng'
import { computeScheduleStrip, weeksUntilNextOfficialMatch } from './domain/schedule'
import { SPECIAL_ABILITY_LABELS } from './domain/specialAbilities'
import {
  createSaveSlot,
  deleteSaveSlot,
  listSaveSlots,
  loadSaveFromSlot,
  migrateLegacySingleSlotSave,
  parseSaveData,
  readActiveSlotId,
  SAVE_FORMAT_VERSION,
  serializeSaveData,
  writeActiveSlotId,
  writeSaveToSlot,
  type SaveData,
  type SaveSlotMeta,
} from './domain/saveData'
import { SaveSlotScreen } from './features/setup/SaveSlotScreen'
import type { SeasonGameLogEntry } from './domain/season'
import type { SeasonRecord } from './domain/seasonSummary'
import { computeStyleTag } from './domain/styleTag'
import {
  advanceCardPool,
  createInitialCardPool,
  MAX_CARDS_PER_WEEK,
  maxTrainingPoints,
  recoverTrainingPoints,
  totalCost,
  type TrainingCardPoolState,
} from './domain/trainingCardPool'
import { resolveCardSelections, type CardSelection } from './domain/trainingCardResolution'
import { computeTeamFocusStyle } from './domain/trainingDirection'
import { ATTRIBUTE_LABELS, type Player } from './domain/types'
import { PRACTICE_STRENGTHS, type PracticeStrength } from './domain/weeklyAction'
import { CareerSummaryScreen } from './features/career/CareerSummaryScreen'
import { ChallengeDecisionDialog } from './features/career/ChallengeDecisionDialog'
import { EventResultDialog, type EventRevealResult } from './features/events/EventResultDialog'
import { EventScreen } from './features/events/EventScreen'
import { RecruitingScreen } from './features/recruiting/RecruitingScreen'
import { RosterScreen } from './features/roster/RosterScreen'
import { GameSummaryDialog, type GameSummaryResult } from './features/season/GameSummaryDialog'
import { KeyMomentGameScreen } from './features/season/KeyMomentGameScreen'
import { SeasonMatchScreen } from './features/season/SeasonMatchScreen'
import { SeasonSummaryDialog, type SeasonSummaryResult } from './features/season/SeasonSummaryDialog'
import { SetupScreen } from './features/setup/SetupScreen'
import { AppShell } from './features/shell/AppShell'
import { SaveControls } from './features/shell/SaveControls'
import { ScheduleStrip } from './features/shell/ScheduleStrip'
import { TrainingCardPoolScreen } from './features/week/TrainingCardPoolScreen'
import { TrainingCardResultDialog, type TrainingCardWeekResult } from './features/week/TrainingCardResultDialog'

interface Team {
  teamName: string
  coachName: string
  seed: number
  totalWeek: number
  players: Player[]
  lastResult: string | null
  seasonGameLog: SeasonGameLogEntry[]
  cardPool: TrainingCardPoolState
  trainingPoints: number
  /**
   * 本週訓練卡池結算結果:非阻斷式,週數在選卡當下就已經套用,這裡只是拿來顯示這次選擇的
   * 原因與影響。純執行期狀態,不寫入存檔(比照 eventRevealResult)。
   */
  cardPoolResult: TrainingCardWeekResult | null
  /** 事件揭曉:非阻斷式,週數在選擇當下就已經套用,這裡只是拿來顯示這次選擇的原因與影響。 */
  eventRevealResult: EventRevealResult | null
  reputation: number
  graduateLog: string[]
  recruitingCandidates: Candidate[] | null
  careerLog: SeasonRecord[]
  eraCount: number
  pendingSeasonSummary: SeasonSummaryResult | null
  careerEnded: CareerEndReason | null
  /** 最近一次正式賽使用的陣容,做為下一場的預設起點;尚未打過正式賽時為 null。 */
  lastLineup: GameLineup | null
  /** 玩家釘選的宿敵學校,跨屆保存交手戰績與最大逆轉分差。 */
  rivals: RivalRecord[]
  /** 聲望達門檻永久解鎖的學校資產,只會增加不會因聲望下降而收回。 */
  schoolAssets: SchoolAssetKey[]
  /** 開局選擇的執教模式;短局(three)在達到里程碑時會跳出繼續/結束的提示。 */
  challengeMode: 'short' | 'long'
  /** 三年挑戰達到里程碑、等待玩家決定繼續或結束;選「繼續」後不會再次出現。 */
  pendingChallengeDecision: boolean
  /** 純紀錄性質的成就/稱號,只會增加不會被收回,不影響任何數值運算。 */
  achievements: AchievementKey[]
  /** 本季至今是否已有球員新增傷勢;每季結束時重置為 false,純粹用來判定「零傷賽季」成就。 */
  seasonHadInjury: boolean
  /**
   * 賽後摘要待確認:比賽結果已算好,但要等玩家確認摘要後才會真正套用(進入下一週)。
   * 純執行期狀態,不寫入存檔(比照 eventRevealResult)。
   */
  pendingGameSummary: PendingGameSummary | null
  /**
   * 玩家確認開打、進入逐節互動畫面後鎖定的戰術/陣容,比賽本身(含逐節模擬與可能的關鍵
   * 回合決策)完成前維持這個畫面。純執行期狀態,不寫入存檔(比照 eventRevealResult)——
   * 進行到一半離開/重整會直接放棄這場比賽,回到賽前畫面重新開打。
   */
  livePlay: { lineup: GameLineup; tactics: GameTactics } | null
}

interface PendingGameSummary {
  display: GameSummaryResult
  nextTeamState: Team
}

/**
 * Team 就是 SaveData 加這 4 個執行期專用欄位(見 Team 介面上各自的註解:賽後/訓練/事件揭曉
 * 彈窗與進行中比賽,都不寫入存檔)。用排除法列出「哪些欄位不存」,新增 Team 欄位時要不要存檔
 * 只需要決定一次;若改回逐一列出「哪些欄位要存」,漏改這裡跟 saveDataToTeam 兩處任一邊都不會
 * 讓 TypeScript 報錯,只會安靜漏存或漏讀——回傳型別仍是 SaveData,拿掉/多出欄位還是會被
 * 型別檢查擋下來。
 */
function teamToSaveData(team: Team): SaveData {
  const { cardPoolResult: _cardPoolResult, eventRevealResult: _eventRevealResult, pendingGameSummary: _pendingGameSummary, livePlay: _livePlay, ...persisted } = team
  return { version: SAVE_FORMAT_VERSION, ...persisted }
}

function saveDataToTeam(data: SaveData): Team {
  return { ...data, cardPoolResult: null, eventRevealResult: null, pendingGameSummary: null, livePlay: null }
}

function loadInitialTeam(): Team | null {
  migrateLegacySingleSlotSave()
  const activeId = readActiveSlotId()
  if (!activeId) return null
  const saved = loadSaveFromSlot(activeId)
  if (saved) return saveDataToTeam(saved)
  // 槽位存在但內容解析失敗(格式毀損):自動移除這個槽位,避免存檔選單留著一筆點了也打不開的紀錄。
  deleteSaveSlot(activeId)
  return null
}

function downloadJson(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function opponentNameForWeek(team: Team): string {
  const rng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-opponent`))
  const fallbackName = generateOpponentName(rng)
  return pickOpponentName(team.rivals, fallbackName, rng)
}

/**
 * 組出賽後摘要彈窗的顯示資料:先發/輪替疲勞增減與成長、新傷勢與受傷前疲勞值、
 * 比賽前後(以同一套戰術/陣容權重計算)的球隊有效戰力差異。before/after 陣列由
 * simulateOfficialGame 的 roster.map 產生,索引一一對應。
 */
function buildGameSummaryDisplay(
  before: Player[],
  after: Player[],
  lineup: GameLineup,
  tactics: GameTactics,
  growth: GameGrowthEntry[],
  outcome: 'win' | 'loss',
  phase: OfficialPhase,
  boxScore: { quarters: QuarterScore[]; final: QuarterScore },
  statsSeed: number,
): GameSummaryResult {
  const afterById = new Map(after.map((player) => [player.id, player]))
  const growthById = new Map(growth.map((entry) => [entry.playerId, entry.attribute]))
  const statsById = new Map(
    distributePlayerStats(boxScore.final.us, before, lineup, createSeededRng(statsSeed)).map((entry) => [
      entry.playerId,
      entry,
    ]),
  )

  const roleEntries: Array<{ id: string; role: 'starter' | 'rotation' }> = [
    ...lineup.starters.map((id) => ({ id, role: 'starter' as const })),
    ...lineup.rotation.map((id) => ({ id, role: 'rotation' as const })),
  ]

  const players = roleEntries
    .map(({ id, role }) => {
      const beforePlayer = before.find((player) => player.id === id)
      const afterPlayer = afterById.get(id)
      if (!beforePlayer || !afterPlayer) return null
      const stats = statsById.get(id)
      return {
        playerId: id,
        playerName: afterPlayer.name,
        role,
        fatigueBefore: beforePlayer.fatigue,
        fatigueAfter: afterPlayer.fatigue,
        grewAttribute: growthById.get(id) ?? null,
        points: stats?.points ?? 0,
        rebounds: stats?.rebounds ?? 0,
        assists: stats?.assists ?? 0,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const newInjuries = after
    .map((player, index) => ({ player, beforePlayer: before[index] }))
    .filter(
      ({ player, beforePlayer }) => player.injuryStatus !== 'healthy' && beforePlayer.injuryStatus === 'healthy',
    )
    .map(({ player, beforePlayer }) => ({
      playerName: player.name,
      status: player.injuryStatus as 'minor' | 'major',
      weeksRemaining: player.injuryWeeksRemaining,
      fatigueBeforeGame: beforePlayer.fatigue,
    }))

  const tacticWeights = computeTacticAttributeWeights(tactics)
  const clutchActive = isClutchPhase(phase)
  return {
    outcome,
    strengthBefore: computeTeamStrength(before, tacticWeights, lineup, clutchActive),
    strengthAfter: computeTeamStrength(after, tacticWeights, lineup, clutchActive),
    players,
    newInjuries,
    boxScore,
  }
}

/**
 * 一場正式賽完賽後,把宿敵戰績、resolveOfficialGameWeek 的季末結算、與待確認的賽後摘要
 * 顯示資料組成下一個 Team 部分更新。抽成純函式(同 runTrainingCardWeek 的形狀),讓「完賽
 * 後狀態怎麼變」可以直接餵 Player[]/OfficialGameResult 單元測試,不必透過 KeyMomentGameScreen
 * 的完整互動流程間接驗證。
 */
function runOfficialGameCompletion(
  team: Team,
  gameResult: OfficialGameResult,
  lineup: GameLineup,
  tactics: GameTactics,
  phase: OfficialPhase,
): Pick<Team, 'livePlay' | 'pendingGameSummary'> {
  const comebackMargin = computeComebackMargin(gameResult.boxScore.quarters, gameResult.outcome)
  const rivals = recordRivalGame(team.rivals, opponentNameForWeek(team), gameResult.outcome, comebackMargin)
  const resolved = resolveOfficialGameWeek(
    {
      totalWeek: team.totalWeek,
      players: team.players,
      seasonGameLog: team.seasonGameLog,
      reputation: team.reputation,
      graduateLog: team.graduateLog,
      careerLog: team.careerLog,
      eraCount: team.eraCount,
      schoolAssets: team.schoolAssets,
      pendingSeasonSummary: team.pendingSeasonSummary,
      challengeMode: team.challengeMode,
      pendingChallengeDecision: team.pendingChallengeDecision,
      coachName: team.coachName,
      seed: team.seed,
      achievements: team.achievements,
      seasonHadInjury: team.seasonHadInjury,
    },
    gameResult,
  )

  const nextTeamState: Team = {
    ...team,
    totalWeek: resolved.nextTotalWeek,
    players: resolved.players,
    reputation: resolved.reputation,
    graduateLog: resolved.graduateLog,
    recruitingCandidates: resolved.recruitingCandidates,
    careerLog: resolved.careerLog,
    eraCount: resolved.eraCount,
    pendingSeasonSummary: resolved.pendingSeasonSummary,
    careerEnded: resolved.careerEnded,
    lastLineup: lineup,
    lastResult: resolved.message,
    seasonGameLog: resolved.seasonGameLog,
    pendingGameSummary: null,
    livePlay: null,
    rivals,
    schoolAssets: resolved.schoolAssets,
    pendingChallengeDecision: resolved.pendingChallengeDecision,
    achievements: resolved.achievements,
    seasonHadInjury: resolved.seasonHadInjury,
  }

  return {
    livePlay: null,
    pendingGameSummary: {
      display: buildGameSummaryDisplay(
        team.players,
        gameResult.roster,
        lineup,
        tactics,
        gameResult.growth,
        gameResult.outcome,
        phase,
        gameResult.boxScore,
        hashSeed(`${team.seed}-${team.totalWeek}-boxstats`),
      ),
      nextTeamState,
    },
  }
}

interface WeeklyEvent {
  card: EventCard
  featuredPlayer: Player
}

function weeklyEventForWeek(team: Team): WeeklyEvent | null {
  const triggerRng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-event-trigger`))
  if (!rollForWeeklyEvent(triggerRng)) return null

  const cardRng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-event-card`))
  const card = pickEventCard(cardRng)

  const playerRng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-event-player`))
  const featuredPlayer = team.players[Math.floor(playerRng() * team.players.length)]

  return { card, featuredPlayer }
}

/**
 * 事件卡選擇後的完整結算(當事人屬性/疲勞、聲望、學校資產解鎖、揭曉彈窗資料)。
 * 抽成純函式(同 runTrainingCardWeek 的形狀),原本整段內嵌在 EventScreen 的 onChoose
 * 事件處理常式裡,只能透過渲染 EventScreen 間接測試「選了放手一搏、失敗了會怎樣」。
 */
function runEventChoice(
  team: Team,
  card: EventCard,
  featuredPlayer: Player,
  risk: EventRisk,
): Pick<Team, 'totalWeek' | 'players' | 'reputation' | 'schoolAssets' | 'lastResult' | 'eventRevealResult'> {
  const resolutionRng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-event-resolve`))
  const resolution = resolveEventChoice(card, risk, featuredPlayer, resolutionRng)

  const players = team.players.map((player) => {
    if (player.id !== featuredPlayer.id) return player
    const fatigue = clampFatigue(player.fatigue + resolution.fatigueDelta)
    if (!resolution.attribute) return { ...player, fatigue }
    const attributes = {
      ...player.attributes,
      [resolution.attribute]: clampAttribute(player.attributes[resolution.attribute] + resolution.attributeDelta),
    }
    return { ...player, fatigue, attributes, styleTag: computeStyleTag(attributes) }
  })

  const reputation = applyReputationDelta(team.reputation, resolution.reputationDelta)
  const schoolAssets = evaluateSchoolAssetUnlocks(team.schoolAssets, reputation)
  const unlockedNow = newlyUnlockedAssets(team.schoolAssets, schoolAssets)
  const lastResult =
    resolution.text +
    (unlockedNow.length > 0
      ? ` 永久解鎖學校資產:${unlockedNow.map((key) => SCHOOL_ASSET_LABELS[key]).join('、')}!`
      : '')

  return {
    totalWeek: team.totalWeek + 1,
    players,
    reputation,
    schoolAssets,
    lastResult,
    eventRevealResult: {
      cardTitle: card.title,
      risk,
      succeeded: resolution.succeeded,
      text: resolution.text,
      attribute: resolution.attribute ?? null,
      attributeDelta: resolution.attributeDelta,
      fatigueDelta: resolution.fatigueDelta,
      reputationDelta: resolution.reputationDelta,
    },
  }
}

function practiceOpponentNamesForWeek(team: Team): Record<PracticeStrength, string> {
  const entries = PRACTICE_STRENGTHS.map((strength) => {
    const rng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-opponent-${strength}`))
    return [strength, generateOpponentName(rng)] as const
  })
  return Object.fromEntries(entries) as Record<PracticeStrength, string>
}

function summarizeResolvedCards(resolvedCards: TrainingCardWeekResult['resolvedCards']): string {
  return resolvedCards
    .map((card) => {
      if (card.kind === 'teamTraining') return `全隊訓練·${ATTRIBUTE_LABELS[card.attribute]}`
      if (card.kind === 'individualTraining') {
        return `個別訓練:${card.succeeded ? '學會' : '嘗試'}${SPECIAL_ABILITY_LABELS[card.ability]}`
      }
      if (card.kind === 'practiceMatch') return `練習賽${card.outcome === 'win' ? '獲勝' : '落敗'}`
      return '全隊休養'
    })
    .join('、')
}

function runTrainingCardWeek(team: Team, selections: CardSelection[]) {
  const resolution = resolveCardSelections(team.players, selections, team.seed + team.totalWeek, team.reputation, {
    bonusAbilitySlots: hasSchoolAsset(team.schoolAssets, 'coachSpecialization') ? 1 : 0,
    recoveryBonus: hasSchoolAsset(team.schoolAssets, 'recoveryCenter') ? RECOVERY_CENTER_BONUS : 0,
  })

  const poolRng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-cardpool`))
  const advance = advanceCardPool(team.cardPool, selections.map((selection) => selection.card.id), poolRng)

  // 用選卡當下(訓練結算前)的名冊算焦點,跟畫面上顯示、玩家實際看到並依此決策的折扣保持一致。
  const focusStyle = computeTeamFocusStyle(team.players)
  const spent = totalCost(selections.map((selection) => selection.card), focusStyle)
  const trainingPoints = recoverTrainingPoints(team.trainingPoints - spent, team.reputation)

  const playerNameById = Object.fromEntries(team.players.map((player) => [player.id, player.name]))

  return {
    totalWeek: team.totalWeek + 1,
    players: resolution.roster,
    cardPool: advance.state,
    trainingPoints,
    lastResult: summarizeResolvedCards(resolution.resolvedCards) + describePermanentAftereffects(team.players, resolution.roster),
    cardPoolResult: { resolvedCards: resolution.resolvedCards, playerNameById },
    seasonHadInjury: team.seasonHadInjury || describeNewInjuries(team.players, resolution.roster) !== '',
  }
}

function App() {
  const [team, setTeam] = useState<Team | null>(loadInitialTeam)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(readActiveSlotId)
  const [slots, setSlots] = useState<SaveSlotMeta[]>(listSaveSlots)
  const [creatingNewSlot, setCreatingNewSlot] = useState(false)

  useEffect(() => {
    if (team && activeSlotId) writeSaveToSlot(activeSlotId, teamToSaveData(team))
  }, [team, activeSlotId])

  if (!team) {
    if (slots.length > 0 && !creatingNewSlot) {
      return (
        <SaveSlotScreen
          slots={slots}
          onLoad={(id) => {
            writeActiveSlotId(id)
            setActiveSlotId(id)
            const saved = loadSaveFromSlot(id)
            setTeam(saved ? saveDataToTeam(saved) : null)
          }}
          onDelete={(id) => {
            deleteSaveSlot(id)
            setSlots(listSaveSlots())
            if (activeSlotId === id) setActiveSlotId(null)
          }}
          onCreateNew={() => setCreatingNewSlot(true)}
        />
      )
    }
    return (
      <SetupScreen
        schoolHistory={loadSchoolHistory()}
        onSubmit={(teamName, coachName, seedInput, challengeMode, scenario) => {
          const seed = hashSeed(seedInput ?? `${teamName}:${coachName}`)
          const slotId = createSaveSlot(`${teamName}・${coachName}`)
          setActiveSlotId(slotId)
          setSlots(listSaveSlots())
          setCreatingNewSlot(false)
          const startingReputation = STARTING_SCENARIO_REPUTATION[scenario]
          setTeam({
            teamName,
            coachName,
            seed,
            totalWeek: 1,
            players: createInitialRoster(seed, ROSTER_SIZE, STARTING_SCENARIO_ATTRIBUTE_SHIFT[scenario]),
            lastResult: null,
            seasonGameLog: [],
            cardPool: createInitialCardPool(createSeededRng(hashSeed(`${seed}-cardpool-init`))),
            trainingPoints: maxTrainingPoints(startingReputation),
            cardPoolResult: null,
            eventRevealResult: null,
            reputation: startingReputation,
            graduateLog: [],
            recruitingCandidates: null,
            careerLog: [],
            eraCount: 0,
            pendingSeasonSummary: null,
            careerEnded: null,
            lastLineup: null,
            pendingGameSummary: null,
            livePlay: null,
            rivals: [],
            schoolAssets: [],
            challengeMode,
            pendingChallengeDecision: false,
            achievements: [],
            seasonHadInjury: false,
          })
        }}
      />
    )
  }

  if (team.careerEnded) {
    return (
      <CareerSummaryScreen
        teamName={team.teamName}
        coachName={team.coachName}
        reason={team.careerEnded}
        careerLog={team.careerLog}
        graduateLog={team.graduateLog}
        achievements={team.achievements}
        onNewCareer={() => {
          if (activeSlotId) deleteSaveSlot(activeSlotId)
          setActiveSlotId(null)
          setSlots(listSaveSlots())
          setTeam(null)
        }}
        onContinueDynasty={
          team.careerEnded === 'champion'
            ? () => {
                // 王朝模式:不清存檔、不開新生涯,直接以奪冠當下的球隊狀態接續下一季——
                // team.totalWeek/reputation/careerLog 早在確認賽後摘要時就已經套用到位,
                // 這裡只需要補做原本奪冠會跳過的畢業/招生流程,跟正規季末走同一份
                // advanceGraduationAndRecruiting(見 officialGameWeek.ts)。
                const graduation = advanceGraduationAndRecruiting(
                  {
                    players: team.players,
                    graduateLog: team.graduateLog,
                    eraCount: team.eraCount,
                    careerLog: team.careerLog,
                    coachName: team.coachName,
                    reputation: team.reputation,
                    schoolAssets: team.schoolAssets,
                    challengeMode: team.challengeMode,
                    pendingChallengeDecision: team.pendingChallengeDecision,
                  },
                  createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-graduation-dynasty`)),
                  hashSeed(`${team.seed}-${team.totalWeek}-recruits-dynasty`),
                )
                setTeam({
                  ...team,
                  players: graduation.players,
                  graduateLog: graduation.graduateLog,
                  recruitingCandidates: graduation.recruitingCandidates,
                  eraCount: graduation.eraCount,
                  careerEnded: graduation.careerEnded,
                  pendingChallengeDecision: graduation.pendingChallengeDecision,
                  lastResult: graduation.careerEnded
                    ? team.lastResult
                    : `王朝模式:帶著奪冠榮耀邁向新的一季。${graduation.message}`,
                })
              }
            : undefined
        }
      />
    )
  }

  const { year, weekOfYear } = getCalendarPosition(team.totalWeek)
  const phase = getSeasonPhase(weekOfYear)
  const gameIndex = getGameIndexForWeek(phase, weekOfYear)
  const opponentAce = generateOpponentAce(hashSeed(`${team.seed}-ace-${opponentAceEraIndex(year)}`))
  const opponentStyle = generateOpponentStyle(hashSeed(`${team.seed}-style-${opponentAceEraIndex(year)}`))
  const opponentRoster = generateOpponentRoster(hashSeed(`${team.seed}-roster-${opponentAceEraIndex(year)}`))
  const weeklyEvent =
    phase === 'offseason' && gameIndex === null && !team.recruitingCandidates ? weeklyEventForWeek(team) : null

  let actionPanel: ReactNode
  if (team.recruitingCandidates) {
    const vacancies = ROSTER_SIZE - team.players.length
    actionPanel = (
      <RecruitingScreen
        candidates={team.recruitingCandidates}
        vacancies={vacancies}
        announcement={team.lastResult}
        onConfirm={(selectedIds) => {
          const signed = signCandidates(team.recruitingCandidates!, selectedIds)
          setTeam({
            ...team,
            players: [...team.players, ...signed],
            recruitingCandidates: null,
          })
        }}
      />
    )
  } else if (phase !== 'offseason' && gameIndex !== null && team.livePlay) {
    const { lineup, tactics } = team.livePlay
    actionPanel = (
      <KeyMomentGameScreen
        roster={team.players}
        phase={phase}
        seed={team.seed + team.totalWeek}
        tactics={tactics}
        opponentAce={opponentAce}
        opponentName={opponentNameForWeek(team)}
        lineup={lineup}
        recoveryBonus={hasSchoolAsset(team.schoolAssets, 'recoveryCenter') ? RECOVERY_CENTER_BONUS : 0}
        onComplete={(gameResult) => {
          // 賽後摘要待玩家確認後才真正套用(進入下一週);在那之前畫面維持原本這場比賽的狀態。
          setTeam({ ...team, ...runOfficialGameCompletion(team, gameResult, lineup, tactics, phase) })
        }}
      />
    )
  } else if (phase !== 'offseason' && gameIndex !== null) {
    actionPanel = (
      <SeasonMatchScreen
        gameNumber={gameIndex + 1}
        totalGamesInPhase={PHASE_GAME_COUNT[phase]}
        opponentName={opponentNameForWeek(team)}
        phase={phase}
        opponentAce={opponentAce}
        opponentStyle={opponentStyle}
        reputation={team.reputation}
        alwaysScouted={hasSchoolAsset(team.schoolAssets, 'videoAnalysis')}
        opponentRoster={opponentRoster}
        players={team.players}
        initialLineup={team.lastLineup}
        lastResult={team.lastResult}
        rivals={team.rivals}
        onPinRival={(name) => setTeam({ ...team, rivals: pinRival(team.rivals, name, team.totalWeek) })}
        onUnpinRival={(name) => setTeam({ ...team, rivals: unpinRival(team.rivals, name) })}
        onPlayGame={(tactics, lineup) => {
          setTeam({ ...team, livePlay: { tactics, lineup } })
        }}
      />
    )
  } else if (weeklyEvent) {
    const { card, featuredPlayer } = weeklyEvent
    actionPanel = (
      <EventScreen
        key={team.totalWeek}
        card={card}
        featuredPlayer={featuredPlayer}
        lastResult={team.lastResult}
        onChoose={(risk) => {
          setTeam({ ...team, ...runEventChoice(team, card, featuredPlayer, risk) })
        }}
      />
    )
  } else {
    actionPanel = (
      <TrainingCardPoolScreen
        pool={team.cardPool}
        trainingPoints={team.trainingPoints}
        maxTrainingPoints={maxTrainingPoints(team.reputation)}
        players={team.players}
        reputation={team.reputation}
        opponentNames={practiceOpponentNamesForWeek(team)}
        maxCardsPerWeek={hasSchoolAsset(team.schoolAssets, 'trainingFacility') ? MAX_CARDS_PER_WEEK + 1 : MAX_CARDS_PER_WEEK}
        bonusAbilitySlots={hasSchoolAsset(team.schoolAssets, 'coachSpecialization') ? 1 : 0}
        onConfirm={(selections) => {
          setTeam({ ...team, ...runTrainingCardWeek(team, selections) })
        }}
      />
    )
  }

  return (
    <AppShell
      teamName={team.teamName}
      coachName={team.coachName}
      reputation={team.reputation}
      year={year}
      weekOfYear={weekOfYear}
      monthLabel={getMonthLabel(weekOfYear)}
      phaseLabel={PHASE_LABELS[phase]}
      schoolAssetLabels={team.schoolAssets.map((key) => SCHOOL_ASSET_LABELS[key])}
      scheduleStrip={
        <ScheduleStrip
          currentTotalWeek={team.totalWeek}
          slots={computeScheduleStrip(team.totalWeek)}
          weeksUntilNextMatch={weeksUntilNextOfficialMatch(team.totalWeek)}
        />
      }
      actions={
        <SaveControls
          onExport={() => {
            downloadJson(`chouten-court-${team.teamName}-w${team.totalWeek}.json`, serializeSaveData(teamToSaveData(team)))
          }}
          onImport={(file) => {
            const reader = new FileReader()
            reader.onload = () => {
              let parsed: SaveData | null = null
              try {
                parsed = parseSaveData(JSON.parse(String(reader.result)))
              } catch {
                parsed = null
              }
              if (!parsed) {
                window.alert('存檔格式錯誤,無法匯入。')
                return
              }
              const slotId = createSaveSlot(parsed.teamName)
              setActiveSlotId(slotId)
              setSlots(listSaveSlots())
              setTeam(saveDataToTeam(parsed))
            }
            reader.readAsText(file)
          }}
          onSwitchSlot={() => {
            setSlots(listSaveSlots())
            setCreatingNewSlot(false)
            setTeam(null)
          }}
          onNewGame={() => {
            if (!window.confirm('確定要放棄目前進度,開始新遊戲嗎?')) return
            if (activeSlotId) deleteSaveSlot(activeSlotId)
            setActiveSlotId(null)
            setSlots(listSaveSlots())
            setTeam(null)
          }}
        />
      }
      roster={
        <RosterScreen
          players={team.players}
          recoveryBonus={hasSchoolAsset(team.schoolAssets, 'recoveryCenter') ? RECOVERY_CENTER_BONUS : 0}
        />
      }
    >
      <GameSummaryDialog
        result={team.pendingGameSummary?.display ?? null}
        onConfirm={() => setTeam(team.pendingGameSummary!.nextTeamState)}
      />
      <SeasonSummaryDialog
        result={team.pendingSeasonSummary}
        onClose={() => setTeam({ ...team, pendingSeasonSummary: null })}
      />
      <EventResultDialog result={team.eventRevealResult} />
      <TrainingCardResultDialog result={team.cardPoolResult} />
      <ChallengeDecisionDialog
        // 等玩家看完並關掉單季總結後才跳出這個提示,避免兩個非阻斷式對話框同時疊在畫面上。
        open={team.pendingChallengeDecision && !team.pendingSeasonSummary}
        onContinue={() => setTeam({ ...team, pendingChallengeDecision: false })}
        onEnd={() => {
          appendSchoolHistoryEntry(
            buildSchoolHistoryEntry(team.coachName, team.careerLog, 'shortChallengeComplete', null, team.graduateLog),
          )
          setTeam({ ...team, pendingChallengeDecision: false, careerEnded: 'shortChallengeComplete' })
        }}
      />
      {actionPanel}
    </AppShell>
  )
}

export default App

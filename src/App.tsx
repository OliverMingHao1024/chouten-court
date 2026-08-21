import { useEffect, useState, type ReactNode } from 'react'
import {
  canScheduleAnotherPracticeMatch,
  getCalendarPosition,
  getSeasonPhase,
  PHASE_LABELS,
} from './domain/calendar'
import { generateOpponentName } from './domain/opponentName'
import { generateOpponentAce, opponentAceEraIndex } from './domain/opponentAce'
import {
  getGameIndexForWeek,
  isClutchPhase,
  PHASE_GAME_COUNT,
  type GameGrowthEntry,
  type OfficialPhase,
} from './domain/officialMatch'
import type { GameLineup } from './domain/lineup'
import { computeTeamStrength } from './domain/matchEngine'
import { computeTacticAttributeWeights, type GameTactics } from './domain/tactics'
import { advanceGrades, describeGraduate } from './domain/graduation'
import { hasReachedInsuranceCap, isChampionRun, type CareerEndReason } from './domain/career'
import {
  clampAttribute,
  clampFatigue,
  pickEventCard,
  resolveEventChoice,
  rollForWeeklyEvent,
  type EventCard,
} from './domain/events'
import { generateCandidatePool, signCandidates, type Candidate } from './domain/recruiting'
import { applyReputationDelta, computeSeasonReputationDelta, INITIAL_REPUTATION } from './domain/reputation'
import { createInitialRoster, ROSTER_SIZE } from './domain/roster'
import { createSeededRng, hashSeed } from './domain/rng'
import { computeScheduleStrip, weeksUntilNextOfficialMatch } from './domain/schedule'
import {
  clearSaveFromStorage,
  loadSaveFromStorage,
  parseSaveData,
  SAVE_FORMAT_VERSION,
  serializeSaveData,
  writeSaveToStorage,
  type SaveData,
} from './domain/saveData'
import { advanceSeasonWeek, type SeasonGameLogEntry } from './domain/season'
import { computeSeasonAwards, type SeasonRecord } from './domain/seasonSummary'
import { computeStyleTag } from './domain/styleTag'
import { ATTRIBUTE_LABELS, INJURY_STATUS_LABELS, type AttributeKey, type Player } from './domain/types'
import {
  applyPracticeMatch,
  applyTeamRest,
  applyTraining,
  PRACTICE_STRENGTHS,
  type PracticeStrength,
} from './domain/weeklyAction'
import { CareerSummaryScreen } from './features/career/CareerSummaryScreen'
import { EventResultDialog, type EventRevealResult } from './features/events/EventResultDialog'
import { EventScreen } from './features/events/EventScreen'
import { RecruitingScreen } from './features/recruiting/RecruitingScreen'
import { RosterScreen } from './features/roster/RosterScreen'
import { GameSummaryDialog, type GameSummaryResult } from './features/season/GameSummaryDialog'
import { SeasonMatchScreen } from './features/season/SeasonMatchScreen'
import { SeasonSummaryDialog, type SeasonSummaryResult } from './features/season/SeasonSummaryDialog'
import { SetupScreen } from './features/setup/SetupScreen'
import { AppShell } from './features/shell/AppShell'
import { SaveControls } from './features/shell/SaveControls'
import { ScheduleStrip } from './features/shell/ScheduleStrip'
import { WeekScreen } from './features/week/WeekScreen'
import type { TrainingRollResult } from './features/week/TrainingResultDialog'

interface Team {
  teamName: string
  coachName: string
  seed: number
  totalWeek: number
  players: Player[]
  lastResult: string | null
  practiceMatchTotalWeeks: number[]
  seasonGameLog: SeasonGameLogEntry[]
  trainingRollResult: TrainingRollResult | null
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
  /**
   * 賽後摘要待確認:比賽結果已算好,但要等玩家確認摘要後才會真正套用(進入下一週)。
   * 純執行期狀態,不寫入存檔(比照 trainingRollResult)。
   */
  pendingGameSummary: PendingGameSummary | null
}

interface PendingGameSummary {
  display: GameSummaryResult
  nextTeamState: Team
}

function teamToSaveData(team: Team): SaveData {
  return {
    version: SAVE_FORMAT_VERSION,
    teamName: team.teamName,
    coachName: team.coachName,
    seed: team.seed,
    totalWeek: team.totalWeek,
    players: team.players,
    lastResult: team.lastResult,
    practiceMatchTotalWeeks: team.practiceMatchTotalWeeks,
    seasonGameLog: team.seasonGameLog,
    reputation: team.reputation,
    graduateLog: team.graduateLog,
    recruitingCandidates: team.recruitingCandidates,
    careerLog: team.careerLog,
    eraCount: team.eraCount,
    pendingSeasonSummary: team.pendingSeasonSummary,
    careerEnded: team.careerEnded,
    lastLineup: team.lastLineup,
  }
}

function saveDataToTeam(data: SaveData): Team {
  return { ...data, trainingRollResult: null, eventRevealResult: null, pendingGameSummary: null }
}

function loadInitialTeam(): Team | null {
  const saved = loadSaveFromStorage()
  return saved ? saveDataToTeam(saved) : null
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
  return generateOpponentName(rng)
}

function describeNewInjuries(before: Player[], after: Player[]): string {
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

function describeGameGrowth(roster: Player[], growth: GameGrowthEntry[]): string {
  if (growth.length === 0) return ''
  const nameById = new Map(roster.map((player) => [player.id, player.name]))
  return (
    ' 實戰成長:' +
    growth
      .map((entry) => `${nameById.get(entry.playerId) ?? ''}(${ATTRIBUTE_LABELS[entry.attribute]}+1)`)
      .join('、')
  )
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
): GameSummaryResult {
  const afterById = new Map(after.map((player) => [player.id, player]))
  const growthById = new Map(growth.map((entry) => [entry.playerId, entry.attribute]))

  const roleEntries: Array<{ id: string; role: 'starter' | 'rotation' }> = [
    ...lineup.starters.map((id) => ({ id, role: 'starter' as const })),
    ...lineup.rotation.map((id) => ({ id, role: 'rotation' as const })),
  ]

  const players = roleEntries
    .map(({ id, role }) => {
      const beforePlayer = before.find((player) => player.id === id)
      const afterPlayer = afterById.get(id)
      if (!beforePlayer || !afterPlayer) return null
      return {
        playerId: id,
        playerName: afterPlayer.name,
        role,
        fatigueBefore: beforePlayer.fatigue,
        fatigueAfter: afterPlayer.fatigue,
        grewAttribute: growthById.get(id) ?? null,
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

function runTrainingWeek(team: Team, attribute: AttributeKey) {
  const result = applyTraining(team.players, attribute, team.seed + team.totalWeek)
  const playerNameById = new Map(team.players.map((player) => [player.id, player.name]))
  return {
    totalWeek: team.totalWeek + 1,
    players: result.roster,
    lastResult: `本週訓練重點:${ATTRIBUTE_LABELS[attribute]}`,
    trainingRollResult: {
      attributeLabel: ATTRIBUTE_LABELS[attribute],
      successCount: result.successCount,
      totalPlayers: result.totalPlayers,
      totalGain: result.totalGain,
      rolls: result.rolls.map((roll) => ({
        playerName: playerNameById.get(roll.playerId) ?? '',
        roll: roll.roll,
        succeeded: roll.succeeded,
        gain: roll.gain,
        bonusLabel: roll.bonusLabel,
      })),
    },
  }
}

function runTeamRestWeek(team: Team) {
  const result = applyTeamRest(team.players, team.seed + team.totalWeek)
  return {
    totalWeek: team.totalWeek + 1,
    players: result.roster,
    lastResult: '本週全隊休養,沒有成長,體力大幅恢復。',
    trainingRollResult: null,
  }
}

function practiceOpponentNamesForWeek(team: Team): Record<PracticeStrength, string> {
  const entries = PRACTICE_STRENGTHS.map((strength) => {
    const rng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-opponent-${strength}`))
    return [strength, generateOpponentName(rng)] as const
  })
  return Object.fromEntries(entries) as Record<PracticeStrength, string>
}

function App() {
  const [team, setTeam] = useState<Team | null>(loadInitialTeam)

  useEffect(() => {
    if (team) writeSaveToStorage(teamToSaveData(team))
  }, [team])

  if (!team) {
    return (
      <SetupScreen
        onSubmit={(teamName, coachName, seedInput) => {
          const seed = hashSeed(seedInput ?? `${teamName}:${coachName}`)
          setTeam({
            teamName,
            coachName,
            seed,
            totalWeek: 1,
            players: createInitialRoster(seed),
            lastResult: null,
            practiceMatchTotalWeeks: [],
            seasonGameLog: [],
            trainingRollResult: null,
            eventRevealResult: null,
            reputation: INITIAL_REPUTATION,
            graduateLog: [],
            recruitingCandidates: null,
            careerLog: [],
            eraCount: 0,
            pendingSeasonSummary: null,
            careerEnded: null,
            lastLineup: null,
            pendingGameSummary: null,
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
        onNewCareer={() => {
          clearSaveFromStorage()
          setTeam(null)
        }}
      />
    )
  }

  const { year, weekOfYear } = getCalendarPosition(team.totalWeek)
  const phase = getSeasonPhase(weekOfYear)
  const gameIndex = getGameIndexForWeek(phase, weekOfYear)
  const opponentAce = generateOpponentAce(hashSeed(`${team.seed}-ace-${opponentAceEraIndex(year)}`))
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
  } else if (phase !== 'offseason' && gameIndex !== null) {
    actionPanel = (
      <SeasonMatchScreen
        gameNumber={gameIndex + 1}
        totalGamesInPhase={PHASE_GAME_COUNT[phase]}
        opponentName={opponentNameForWeek(team)}
        phase={phase}
        opponentAce={opponentAce}
        players={team.players}
        initialLineup={team.lastLineup}
        lastResult={team.lastResult}
        onPlayGame={(tactics, lineup) => {
          const result = advanceSeasonWeek(
            team.players,
            team.totalWeek,
            team.seasonGameLog,
            team.seed + team.totalWeek,
            tactics,
            opponentAce,
            lineup,
          )
          let players = result.roster
          let reputation = team.reputation
          let graduateLog = team.graduateLog
          let recruitingCandidates: Candidate[] | null = null
          let careerLog = team.careerLog
          let eraCount = team.eraCount
          let pendingSeasonSummary = team.pendingSeasonSummary
          let careerEnded: CareerEndReason | null = null
          let message =
            result.message +
            describeNewInjuries(team.players, result.roster) +
            describeGameGrowth(result.roster, result.growth)

          if (result.seasonEnded && result.finalPhaseReached) {
            const seasonYear = getCalendarPosition(team.totalWeek).year
            const seasonGames = [...team.seasonGameLog, result.gameLogEntry].filter(
              (entry) => getCalendarPosition(entry.totalWeek).year === seasonYear,
            )
            const reputationDelta = computeSeasonReputationDelta(result.finalPhaseReached, result.placement)
            reputation = applyReputationDelta(reputation, reputationDelta)

            const seasonRecord: SeasonRecord = {
              year: seasonYear,
              wins: seasonGames.filter((entry) => entry.outcome === 'win').length,
              losses: seasonGames.filter((entry) => entry.outcome === 'loss').length,
              finalPhaseReached: result.finalPhaseReached,
              placement: result.placement,
              reputationAfter: reputation,
            }
            careerLog = [...careerLog, seasonRecord]

            pendingSeasonSummary = {
              record: seasonRecord,
              reputationDelta,
              reputationAfter: reputation,
              awards: computeSeasonAwards(players),
            }

            if (isChampionRun(result.placement)) {
              careerEnded = 'champion'
            } else {
              const { roster: advancedRoster, graduates } = advanceGrades(players)
              players = advancedRoster

              if (graduates.length > 0) {
                eraCount += 1
                const graduationRng = createSeededRng(hashSeed(`${team.seed}-${result.nextTotalWeek}-graduation`))
                graduateLog = [
                  ...graduateLog,
                  ...graduates.map((graduate) => describeGraduate(graduate, reputation, graduationRng)),
                ]

                if (hasReachedInsuranceCap(eraCount)) {
                  careerEnded = 'insuranceCap'
                } else {
                  const vacancies = ROSTER_SIZE - players.length
                  recruitingCandidates = generateCandidatePool(
                    reputation,
                    vacancies * 2,
                    hashSeed(`${team.seed}-${result.nextTotalWeek}-recruits`),
                  )
                  message += ` 本屆畢業 ${graduates.length} 人,請完成招生補齊名冊。`
                }
              }
            }
          }

          const nextTeamState: Team = {
            ...team,
            totalWeek: result.nextTotalWeek,
            players,
            reputation,
            graduateLog,
            recruitingCandidates,
            careerLog,
            eraCount,
            pendingSeasonSummary,
            careerEnded,
            lastLineup: lineup,
            lastResult: message,
            seasonGameLog: [...team.seasonGameLog, result.gameLogEntry],
            pendingGameSummary: null,
          }

          // 賽後摘要待玩家確認後才真正套用(進入下一週);在那之前畫面維持原本這場比賽的狀態。
          setTeam({
            ...team,
            pendingGameSummary: {
              display: buildGameSummaryDisplay(
                team.players,
                result.roster,
                lineup,
                tactics,
                result.growth,
                result.gameLogEntry.outcome,
                phase,
              ),
              nextTeamState,
            },
          })
        }}
      />
    )
  } else if (weeklyEvent) {
    const { card, featuredPlayer } = weeklyEvent
    actionPanel = (
      <EventScreen
        key={team.totalWeek}
        card={card}
        featuredPlayerName={featuredPlayer.name}
        lastResult={team.lastResult}
        onChoose={(risk) => {
          const resolutionRng = createSeededRng(hashSeed(`${team.seed}-${team.totalWeek}-event-resolve`))
          const resolution = resolveEventChoice(card, risk, featuredPlayer.name, resolutionRng)

          const players = team.players.map((player) => {
            if (player.id !== featuredPlayer.id) return player
            const fatigue = clampFatigue(player.fatigue + resolution.fatigueDelta)
            if (!resolution.attribute) return { ...player, fatigue }
            const attributes = {
              ...player.attributes,
              [resolution.attribute]: clampAttribute(
                player.attributes[resolution.attribute] + resolution.attributeDelta,
              ),
            }
            return { ...player, fatigue, attributes, styleTag: computeStyleTag(attributes) }
          })

          setTeam({
            ...team,
            totalWeek: team.totalWeek + 1,
            players,
            reputation: applyReputationDelta(team.reputation, resolution.reputationDelta),
            lastResult: resolution.text,
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
          })
        }}
      />
    )
  } else {
    const practiceMatchWeeksThisYear = team.practiceMatchTotalWeeks
      .filter((totalWeek) => getCalendarPosition(totalWeek).year === year)
      .map((totalWeek) => getCalendarPosition(totalWeek).weekOfYear)
    const practiceMatchAllowed = canScheduleAnotherPracticeMatch(weekOfYear, practiceMatchWeeksThisYear)

    actionPanel = (
      <WeekScreen
        practiceMatchAllowed={practiceMatchAllowed}
        opponentNames={practiceOpponentNamesForWeek(team)}
        lastResult={team.lastResult}
        trainingRollResult={team.trainingRollResult}
        onTrain={(attribute) => {
          setTeam({ ...team, ...runTrainingWeek(team, attribute) })
        }}
        onTeamRest={() => {
          setTeam({ ...team, ...runTeamRestWeek(team) })
        }}
        onPracticeMatch={(strength: PracticeStrength) => {
          const result = applyPracticeMatch(team.players, strength, team.seed + team.totalWeek)
          const outcomeMessage = result.outcome === 'win' ? '練習賽獲勝!' : '練習賽落敗'
          setTeam({
            ...team,
            totalWeek: team.totalWeek + 1,
            players: result.roster,
            lastResult: outcomeMessage + describeNewInjuries(team.players, result.roster),
            practiceMatchTotalWeeks: [...team.practiceMatchTotalWeeks, team.totalWeek],
          })
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
      phaseLabel={PHASE_LABELS[phase]}
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
              setTeam(saveDataToTeam(parsed))
            }
            reader.readAsText(file)
          }}
          onNewGame={() => {
            if (!window.confirm('確定要放棄目前進度,開始新遊戲嗎?')) return
            clearSaveFromStorage()
            setTeam(null)
          }}
        />
      }
      roster={<RosterScreen players={team.players} />}
    >
      <GameSummaryDialog
        result={team.pendingGameSummary?.display ?? null}
        onConfirm={() => setTeam(team.pendingGameSummary!.nextTeamState)}
      />
      <SeasonSummaryDialog result={team.pendingSeasonSummary} />
      <EventResultDialog result={team.eventRevealResult} />
      {actionPanel}
    </AppShell>
  )
}

export default App

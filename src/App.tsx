import { useState, type ReactNode } from 'react'
import { canScheduleAnotherPracticeMatch, getCalendarPosition, getSeasonPhase } from './domain/calendar'
import { PHASE_GAME_COUNT, getGameIndexForWeek } from './domain/officialMatch'
import { createInitialRoster } from './domain/roster'
import { hashSeed } from './domain/rng'
import { advanceSeasonWeek, type SeasonGameLogEntry } from './domain/season'
import { ATTRIBUTE_LABELS, type Player } from './domain/types'
import { applyPracticeMatch, applyTraining, type PracticeStrength } from './domain/weeklyAction'
import { RosterScreen } from './features/roster/RosterScreen'
import { SeasonMatchScreen } from './features/season/SeasonMatchScreen'
import { SetupScreen } from './features/setup/SetupScreen'
import { WeekScreen } from './features/week/WeekScreen'

interface Team {
  teamName: string
  coachName: string
  seed: number
  totalWeek: number
  players: Player[]
  lastResult: string | null
  practiceMatchTotalWeeks: number[]
  seasonGameLog: SeasonGameLogEntry[]
}

function App() {
  const [team, setTeam] = useState<Team | null>(null)

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
          })
        }}
      />
    )
  }

  const { year, weekOfYear } = getCalendarPosition(team.totalWeek)
  const phase = getSeasonPhase(weekOfYear)
  const gameIndex = getGameIndexForWeek(phase, weekOfYear)

  let actionPanel: ReactNode
  if (phase !== 'offseason' && gameIndex !== null) {
    actionPanel = (
      <SeasonMatchScreen
        year={year}
        weekOfYear={weekOfYear}
        phase={phase}
        gameNumber={gameIndex + 1}
        totalGamesInPhase={PHASE_GAME_COUNT[phase]}
        lastResult={team.lastResult}
        onPlayGame={() => {
          const result = advanceSeasonWeek(
            team.players,
            team.totalWeek,
            team.seasonGameLog,
            team.seed + team.totalWeek,
          )
          setTeam({
            ...team,
            totalWeek: result.nextTotalWeek,
            players: result.roster,
            lastResult: result.message,
            seasonGameLog: [...team.seasonGameLog, result.gameLogEntry],
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
        year={year}
        weekOfYear={weekOfYear}
        phase={phase}
        practiceMatchAllowed={practiceMatchAllowed}
        lastResult={team.lastResult}
        onTrain={(attribute, intensity) => {
          const players = applyTraining(team.players, attribute, intensity)
          setTeam({
            ...team,
            totalWeek: team.totalWeek + 1,
            players,
            lastResult: `本週訓練重點:${ATTRIBUTE_LABELS[attribute]}`,
          })
        }}
        onPracticeMatch={(strength: PracticeStrength) => {
          const result = applyPracticeMatch(team.players, strength, team.seed + team.totalWeek)
          setTeam({
            ...team,
            totalWeek: team.totalWeek + 1,
            players: result.roster,
            lastResult: result.outcome === 'win' ? '練習賽獲勝!' : '練習賽落敗',
            practiceMatchTotalWeeks: [...team.practiceMatchTotalWeeks, team.totalWeek],
          })
        }}
      />
    )
  }

  return (
    <>
      {actionPanel}
      <RosterScreen teamName={team.teamName} coachName={team.coachName} players={team.players} />
    </>
  )
}

export default App

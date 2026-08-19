import { useState } from 'react'
import {
  canScheduleAnotherPracticeMatch,
  getCalendarPosition,
  getSeasonPhase,
} from './domain/calendar'
import { createInitialRoster } from './domain/roster'
import { hashSeed } from './domain/rng'
import { ATTRIBUTE_LABELS, type Player } from './domain/types'
import { applyPracticeMatch, applyTraining, type PracticeStrength } from './domain/weeklyAction'
import { SetupScreen } from './features/setup/SetupScreen'
import { RosterScreen } from './features/roster/RosterScreen'
import { WeekScreen } from './features/week/WeekScreen'

interface Team {
  teamName: string
  coachName: string
  seed: number
  totalWeek: number
  players: Player[]
  lastResult: string | null
  practiceMatchTotalWeeks: number[]
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
          })
        }}
      />
    )
  }

  const { year, weekOfYear } = getCalendarPosition(team.totalWeek)
  const phase = getSeasonPhase(weekOfYear)
  const practiceMatchWeeksThisYear = team.practiceMatchTotalWeeks
    .filter((totalWeek) => getCalendarPosition(totalWeek).year === year)
    .map((totalWeek) => getCalendarPosition(totalWeek).weekOfYear)
  const practiceMatchAllowed = canScheduleAnotherPracticeMatch(weekOfYear, practiceMatchWeeksThisYear)

  return (
    <>
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
      <RosterScreen teamName={team.teamName} coachName={team.coachName} players={team.players} />
    </>
  )
}

export default App

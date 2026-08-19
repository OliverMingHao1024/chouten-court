import { useState } from 'react'
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
  week: number
  players: Player[]
  lastResult: string | null
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
            week: 1,
            players: createInitialRoster(seed),
            lastResult: null,
          })
        }}
      />
    )
  }

  return (
    <>
      <WeekScreen
        week={team.week}
        lastResult={team.lastResult}
        onTrain={(attribute, intensity) => {
          const players = applyTraining(team.players, attribute, intensity)
          setTeam({
            ...team,
            week: team.week + 1,
            players,
            lastResult: `本週訓練重點:${ATTRIBUTE_LABELS[attribute]}`,
          })
        }}
        onPracticeMatch={(strength: PracticeStrength) => {
          const result = applyPracticeMatch(team.players, strength, team.seed + team.week)
          setTeam({
            ...team,
            week: team.week + 1,
            players: result.roster,
            lastResult: result.outcome === 'win' ? '練習賽獲勝!' : '練習賽落敗',
          })
        }}
      />
      <RosterScreen teamName={team.teamName} coachName={team.coachName} players={team.players} />
    </>
  )
}

export default App

import { useState } from 'react'
import { createInitialRoster } from './domain/roster'
import { hashSeed } from './domain/rng'
import type { Player } from './domain/types'
import { SetupScreen } from './features/setup/SetupScreen'
import { RosterScreen } from './features/roster/RosterScreen'

interface Team {
  teamName: string
  coachName: string
  players: Player[]
}

function App() {
  const [team, setTeam] = useState<Team | null>(null)

  if (!team) {
    return (
      <SetupScreen
        onSubmit={(teamName, coachName) => {
          const seed = hashSeed(`${teamName}:${coachName}`)
          setTeam({ teamName, coachName, players: createInitialRoster(seed) })
        }}
      />
    )
  }

  return (
    <RosterScreen teamName={team.teamName} coachName={team.coachName} players={team.players} />
  )
}

export default App

import type { Player } from '../../domain/types'

export interface RosterScreenProps {
  teamName: string
  coachName: string
  players: Player[]
}

export function RosterScreen({ teamName, coachName, players }: RosterScreenProps) {
  return (
    <div>
      <h1>{teamName}</h1>
      <p>{coachName} 教練</p>
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            {player.name} · {player.position} · {player.styleTag.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

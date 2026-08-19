import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type Player } from '../../domain/types'

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
            <p>
              {player.name} · {player.position} · {player.styleTag.label}
            </p>
            <dl>
              {ATTRIBUTE_KEYS.map((key) => (
                <div key={key}>
                  <dt>{ATTRIBUTE_LABELS[key]}</dt>
                  <dd>{player.attributes[key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

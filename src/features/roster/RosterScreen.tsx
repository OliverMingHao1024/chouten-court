import { ATTRIBUTE_MAX } from '../../domain/matchEngine'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type Player } from '../../domain/types'
import { AttributeBar } from './AttributeBar'
import './RosterScreen.css'

export interface RosterScreenProps {
  players: Player[]
}

export function RosterScreen({ players }: RosterScreenProps) {
  return (
    <ul className="roster">
      {players.map((player) => (
        <li key={player.id} className="roster__card">
          <p className="roster__headline">
            <span className="roster__name">{player.name}</span>
            <span className="roster__position">{player.position}</span>
            <span className="roster__style">{player.styleTag.label}</span>
          </p>
          <div className="roster__attributes">
            {ATTRIBUTE_KEYS.map((key) => (
              <AttributeBar
                key={key}
                label={ATTRIBUTE_LABELS[key]}
                value={player.attributes[key]}
                max={ATTRIBUTE_MAX}
              />
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

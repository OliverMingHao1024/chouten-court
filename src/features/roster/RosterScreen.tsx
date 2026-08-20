import { useRef, useState } from 'react'
import { computeOverallGrade } from '../../domain/attributeGrade'
import { ATTRIBUTE_MAX } from '../../domain/matchEngine'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, INJURY_STATUS_LABELS, type Player } from '../../domain/types'
import { AttributeBar } from './AttributeBar'
import { PlayerAvatar } from './PlayerAvatar'
import './RosterScreen.css'

export interface RosterScreenProps {
  players: Player[]
}

export function RosterScreen({ players }: RosterScreenProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  return (
    <div className="roster">
      <ul className="roster-grid">
        {players.map((player) => (
          <li key={player.id}>
            <button
              type="button"
              className="roster-tile"
              onClick={() => {
                setSelectedPlayer(player)
                dialogRef.current?.showModal()
              }}
            >
              <PlayerAvatar seed={player.id} size={56} />
              <span className="roster-tile__name">{player.name}</span>
              <span className="roster-tile__position">
                {player.position} · 高{player.grade}
              </span>
              <span className="roster-tile__grade">{computeOverallGrade(player.attributes)}</span>
              {player.injuryStatus !== 'healthy' && (
                <span className={`roster-tile__injury roster-tile__injury--${player.injuryStatus}`}>
                  {INJURY_STATUS_LABELS[player.injuryStatus]}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialogRef} className="roster-dialog" onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}>
        {selectedPlayer && (
          <div className="roster-dialog__content">
            <header className="roster-dialog__header">
              <PlayerAvatar seed={selectedPlayer.id} size={64} />
              <div>
                <h3>{selectedPlayer.name}</h3>
                <p>
                  {selectedPlayer.position} · 高{selectedPlayer.grade} · {selectedPlayer.styleTag.label}
                </p>
                {selectedPlayer.injuryStatus !== 'healthy' && (
                  <p className={`roster-dialog__injury roster-dialog__injury--${selectedPlayer.injuryStatus}`}>
                    {INJURY_STATUS_LABELS[selectedPlayer.injuryStatus]}
                    {selectedPlayer.injuryWeeksRemaining > 0 &&
                      `(剩 ${selectedPlayer.injuryWeeksRemaining} 週)`}
                  </p>
                )}
              </div>
            </header>
            <div className="roster-dialog__attributes">
              {ATTRIBUTE_KEYS.map((key) => (
                <AttributeBar
                  key={key}
                  label={ATTRIBUTE_LABELS[key]}
                  value={selectedPlayer.attributes[key]}
                  max={ATTRIBUTE_MAX}
                />
              ))}
            </div>
            <button type="button" className="button-primary" onClick={() => dialogRef.current?.close()}>
              關閉
            </button>
          </div>
        )}
      </dialog>
    </div>
  )
}

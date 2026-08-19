import type { OpponentTier } from '../../domain/opponentTier'
import './SeasonMatchScreen.css'

export interface SeasonMatchScreenProps {
  gameNumber: number
  totalGamesInPhase: number
  opponentName: string
  opponentTier: OpponentTier
  lastResult: string | null
  onPlayGame: () => void
}

export function SeasonMatchScreen({
  gameNumber,
  totalGamesInPhase,
  opponentName,
  opponentTier,
  lastResult,
  onPlayGame,
}: SeasonMatchScreenProps) {
  return (
    <section className="matchup-card">
      <p className="matchup-card__progress">
        第 {gameNumber} / {totalGamesInPhase} 戰
      </p>
      <div className="matchup-card__versus">
        <span className="matchup-card__side matchup-card__side--us">我方</span>
        <span className="matchup-card__vs">VS</span>
        <span className="matchup-card__side matchup-card__side--them">
          {opponentName}
          <span className="matchup-card__tier">{opponentTier}</span>
        </span>
      </div>
      {lastResult && <p className="result-banner">{lastResult}</p>}
      <button className="button-primary" type="button" onClick={onPlayGame}>
        開打
      </button>
    </section>
  )
}

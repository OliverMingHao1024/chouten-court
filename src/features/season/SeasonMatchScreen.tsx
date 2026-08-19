import './SeasonMatchScreen.css'

export interface SeasonMatchScreenProps {
  gameNumber: number
  totalGamesInPhase: number
  lastResult: string | null
  onPlayGame: () => void
}

export function SeasonMatchScreen({
  gameNumber,
  totalGamesInPhase,
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
        <span className="matchup-card__side matchup-card__side--them">對手校</span>
      </div>
      {lastResult && <p className="result-banner">{lastResult}</p>}
      <button className="button-primary" type="button" onClick={onPlayGame}>
        開打
      </button>
    </section>
  )
}

import type { OfficialPhase } from '../../domain/officialMatch'

export interface SeasonMatchScreenProps {
  year: number
  weekOfYear: number
  phase: OfficialPhase
  gameNumber: number
  totalGamesInPhase: number
  lastResult: string | null
  onPlayGame: () => void
}

const PHASE_LABELS: Record<OfficialPhase, string> = {
  qualifying: '資格賽',
  preliminary: '預賽',
  group: '複賽',
  quarterfinal: '八強賽',
  final4: '四強賽',
}

export function SeasonMatchScreen({
  year,
  weekOfYear,
  phase,
  gameNumber,
  totalGamesInPhase,
  lastResult,
  onPlayGame,
}: SeasonMatchScreenProps) {
  return (
    <section>
      <h2>
        第 {year} 年 第 {weekOfYear} 週
      </h2>
      <p>{PHASE_LABELS[phase]}</p>
      <p>
        第 {gameNumber} / {totalGamesInPhase} 戰
      </p>
      {lastResult && <p>{lastResult}</p>}
      <button type="button" onClick={onPlayGame}>
        開打
      </button>
    </section>
  )
}

import { PHASE_LABELS } from './calendar'
import type { Final4Placement, OfficialPhase } from './officialMatch'
import { FINAL4_PLACEMENT_LABEL } from './season'
import type { Player } from './types'

export interface SeasonRecord {
  year: number
  wins: number
  losses: number
  finalPhaseReached: OfficialPhase
  placement: Final4Placement | null
}

export interface AwardWinner {
  title: string
  playerName: string
}

// 目前沒有逐場數據模擬,獎項以當季屬性做代理指標(原創簡化,待調校)。
const AWARD_DEFINITIONS: Array<{ title: string; scorer: (player: Player) => number }> = [
  { title: '得分王', scorer: (player) => player.attributes.shooting + player.attributes.three },
  { title: '籃板王', scorer: (player) => player.attributes.rebound },
  { title: '助攻王', scorer: (player) => player.attributes.pass },
  { title: '防守王', scorer: (player) => player.attributes.defense },
]

export function computeSeasonAwards(roster: Player[]): AwardWinner[] {
  return AWARD_DEFINITIONS.map(({ title, scorer }) => {
    const winner = roster.reduce((best, player) => (scorer(player) > scorer(best) ? player : best), roster[0])
    return { title, playerName: winner.name }
  })
}

export interface SeasonSummaryResult {
  record: SeasonRecord
  reputationDelta: number
  reputationAfter: number
  awards: AwardWinner[]
}

export function describeSeasonRecord(record: SeasonRecord): string {
  const placementText = record.placement ? `,${FINAL4_PLACEMENT_LABEL[record.placement]}` : ''
  return `${PHASE_LABELS[record.finalPhaseReached]}止步 ${record.wins}勝${record.losses}敗${placementText}`
}

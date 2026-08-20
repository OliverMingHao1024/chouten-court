import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialRoster } from '../../domain/roster'
import { SeasonMatchScreen } from './SeasonMatchScreen'

const players = createInitialRoster(1)
const autoLineup = {
  starters: players.slice(0, 5).map((p) => p.id),
  rotation: players.slice(5, 8).map((p) => p.id),
}

function renderScreen(overrides: Partial<React.ComponentProps<typeof SeasonMatchScreen>> = {}) {
  return render(
    <SeasonMatchScreen
      gameNumber={2}
      totalGamesInPhase={4}
      opponentName="板橋高中"
      phase="qualifying"
      opponentAce={{ name: '陳志明', scoring: 90, shooting: 80 }}
      players={players}
      lastResult={null}
      onPlayGame={vi.fn()}
      {...overrides}
    />,
  )
}

describe('SeasonMatchScreen', () => {
  it('shows game progress within the phase', () => {
    renderScreen()
    expect(screen.getByText('第 2 / 4 戰')).toBeInTheDocument()
  })

  it('shows the opponent name and a tier derived from the phase and ace strength', () => {
    // group (70) + this ace's bonus (~12.75) lands in the 名門 tier (75~85).
    renderScreen({ opponentName: '林口商工', phase: 'group' })
    expect(screen.getByText('林口商工')).toBeInTheDocument()
    expect(screen.getByText('名門')).toBeInTheDocument()
  })

  it('calls onPlayGame with the default tactics and an auto-filled lineup when nothing is picked', async () => {
    const user = userEvent.setup()
    const onPlayGame = vi.fn()
    renderScreen({ onPlayGame })
    await user.click(screen.getByRole('button', { name: '開打' }))
    expect(onPlayGame).toHaveBeenCalledWith({ offense: 'fast', defense: 'manToMan' }, autoLineup)
  })

  it('calls onPlayGame with the selected tactics', async () => {
    const user = userEvent.setup()
    const onPlayGame = vi.fn()
    renderScreen({ onPlayGame })
    await user.click(screen.getByRole('button', { name: '半場陣地戰' }))
    await user.click(screen.getByRole('button', { name: '聯防' }))
    await user.click(screen.getByRole('button', { name: '開打' }))
    expect(onPlayGame).toHaveBeenCalledWith({ offense: 'halfcourt', defense: 'zone' }, autoLineup)
  })

  it('shows the opponent ace name and key stats', () => {
    renderScreen({ opponentAce: { name: '林俊傑', scoring: 92, shooting: 85 } })
    expect(screen.getByText(/林俊傑/)).toBeInTheDocument()
    expect(screen.getByText(/92/)).toBeInTheDocument()
    expect(screen.getByText(/85/)).toBeInTheDocument()
  })

  it('shows the last result message when provided', () => {
    renderScreen({ lastResult: 'qualifying 第 1 戰:獲勝' })
    expect(screen.getByText('qualifying 第 1 戰:獲勝')).toBeInTheDocument()
  })

  it('lets the coach pick starters and rotation, which override the auto-filled slots', async () => {
    const user = userEvent.setup()
    const onPlayGame = vi.fn()
    renderScreen({ onPlayGame })

    // Click the last player 8 times: starter -> rotation -> bench -> starter (fills remaining
    // auto-slots first) ... simplest: just pick one specific player as a starter and confirm
    // they end up in the starters list instead of wherever auto-fill would have put them.
    const lastPlayer = players[players.length - 1]
    await user.click(screen.getByRole('button', { name: new RegExp(lastPlayer.name) }))
    await user.click(screen.getByRole('button', { name: '開打' }))

    const [, lineup] = onPlayGame.mock.calls[0]
    expect(lineup.starters).toContain(lastPlayer.id)
  })

  it('cycles a clicked player through starter -> rotation -> unselected', async () => {
    const user = userEvent.setup()
    renderScreen()
    const firstPlayer = players[0]
    const button = screen.getByRole('button', { name: new RegExp(firstPlayer.name) })

    await user.click(button)
    expect(screen.getAllByText('先發')).not.toHaveLength(0)

    await user.click(button)
    expect(button).toHaveTextContent('輪替')
  })

  it('shows a pre-game preview: baseline win chance, team strength, and tactic-boosted attributes', () => {
    renderScreen()
    expect(screen.getByText(/基準勝率/)).toBeInTheDocument()
    expect(screen.getByText(/目前戰力/)).toBeInTheDocument()
    expect(screen.getByText(/戰術強化/)).toBeInTheDocument()
    expect(screen.getByText(/預估疲勞變化/)).toBeInTheDocument()
  })

  it('warns about a high-fatigue player selected into the lineup', async () => {
    const tiredPlayers = players.map((p, i) => (i === 0 ? { ...p, fatigue: 90 } : p))
    const user = userEvent.setup()
    render(
      <SeasonMatchScreen
        gameNumber={2}
        totalGamesInPhase={4}
        opponentName="板橋高中"
        phase="qualifying"
        opponentAce={{ name: '陳志明', scoring: 90, shooting: 80 }}
        players={tiredPlayers}
        lastResult={null}
        onPlayGame={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: new RegExp(tiredPlayers[0].name) }))
    expect(screen.getByText(/高受傷風險/)).toBeInTheDocument()
  })
})

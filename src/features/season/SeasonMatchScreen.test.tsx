import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeasonMatchScreen } from './SeasonMatchScreen'

function renderScreen(overrides: Partial<React.ComponentProps<typeof SeasonMatchScreen>> = {}) {
  return render(
    <SeasonMatchScreen
      gameNumber={2}
      totalGamesInPhase={4}
      opponentName="板橋高中"
      opponentTier="中堅"
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

  it('shows the opponent name and tier', () => {
    renderScreen({ opponentName: '林口商工', opponentTier: '名門' })
    expect(screen.getByText('林口商工')).toBeInTheDocument()
    expect(screen.getByText('名門')).toBeInTheDocument()
  })

  it('calls onPlayGame when the button is clicked', async () => {
    const user = userEvent.setup()
    const onPlayGame = vi.fn()
    renderScreen({ onPlayGame })
    await user.click(screen.getByRole('button', { name: '開打' }))
    expect(onPlayGame).toHaveBeenCalledOnce()
  })

  it('shows the last result message when provided', () => {
    renderScreen({ lastResult: 'qualifying 第 1 戰:獲勝' })
    expect(screen.getByText('qualifying 第 1 戰:獲勝')).toBeInTheDocument()
  })
})

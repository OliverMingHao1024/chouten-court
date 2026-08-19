import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeasonMatchScreen } from './SeasonMatchScreen'

describe('SeasonMatchScreen', () => {
  it('shows the year, week, phase, and game progress', () => {
    render(
      <SeasonMatchScreen
        year={1}
        weekOfYear={30}
        phase="qualifying"
        gameNumber={2}
        totalGamesInPhase={4}
        lastResult={null}
        onPlayGame={vi.fn()}
      />,
    )
    expect(screen.getByText('第 1 年 第 30 週')).toBeInTheDocument()
    expect(screen.getByText('資格賽')).toBeInTheDocument()
    expect(screen.getByText('第 2 / 4 戰')).toBeInTheDocument()
  })

  it('calls onPlayGame when the button is clicked', async () => {
    const user = userEvent.setup()
    const onPlayGame = vi.fn()
    render(
      <SeasonMatchScreen
        year={1}
        weekOfYear={27}
        phase="qualifying"
        gameNumber={1}
        totalGamesInPhase={4}
        lastResult={null}
        onPlayGame={onPlayGame}
      />,
    )
    await user.click(screen.getByRole('button', { name: '開打' }))
    expect(onPlayGame).toHaveBeenCalledOnce()
  })

  it('shows the last result message when provided', () => {
    render(
      <SeasonMatchScreen
        year={1}
        weekOfYear={27}
        phase="qualifying"
        gameNumber={1}
        totalGamesInPhase={4}
        lastResult="qualifying 第 1 戰:獲勝"
        onPlayGame={vi.fn()}
      />,
    )
    expect(screen.getByText('qualifying 第 1 戰:獲勝')).toBeInTheDocument()
  })
})

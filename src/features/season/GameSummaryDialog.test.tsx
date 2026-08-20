import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GameSummaryDialog, type GameSummaryResult } from './GameSummaryDialog'

function makeResult(overrides: Partial<GameSummaryResult> = {}): GameSummaryResult {
  return {
    outcome: 'win',
    strengthBefore: 60,
    strengthAfter: 58.5,
    players: [
      {
        playerId: 'p1',
        playerName: '球員01',
        role: 'starter',
        fatigueBefore: 20,
        fatigueAfter: 30,
        grewAttribute: 'three',
      },
      {
        playerId: 'p2',
        playerName: '球員02',
        role: 'rotation',
        fatigueBefore: 10,
        fatigueAfter: 15,
        grewAttribute: null,
      },
    ],
    newInjuries: [],
    ...overrides,
  }
}

describe('GameSummaryDialog', () => {
  it('opens and shows the outcome, strength change, and per-player fatigue/growth', () => {
    render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText('本場獲勝')).toBeInTheDocument()
    expect(screen.getByText(/60\.0 → 58\.5/)).toBeInTheDocument()
    expect(screen.getByText('球員01')).toBeInTheDocument()
    expect(screen.getByText(/20 → 30/)).toBeInTheDocument()
    expect(screen.getByText('三分 +1')).toBeInTheDocument()
  })

  it('shows new injuries with pre-game fatigue as the contributing factor', () => {
    render(
      <GameSummaryDialog
        result={makeResult({
          newInjuries: [{ playerName: '球員03', status: 'minor', weeksRemaining: 2, fatigueBeforeGame: 85 }],
        })}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText(/球員03/)).toBeInTheDocument()
    expect(screen.getByText(/受傷前疲勞值 85/)).toBeInTheDocument()
  })

  it('does not show an injuries section when nobody got hurt', () => {
    render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)
    expect(screen.queryByText('新發生的傷勢')).not.toBeInTheDocument()
  })

  it('stays closed when there is no result yet', () => {
    render(<GameSummaryDialog result={null} onConfirm={() => {}} />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).not.toHaveAttribute('open')
  })

  it('calls onConfirm only when the coach clicks 繼續, not before', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<GameSummaryDialog result={makeResult()} onConfirm={onConfirm} />)

    expect(onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '繼續' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('reopens for a new result even if the values are identical to the last one', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)

    const dialog = screen.getByRole('dialog')
    await user.click(screen.getByRole('button', { name: '繼續' }))
    expect(dialog).not.toHaveAttribute('open')

    rerender(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)
    expect(dialog).toHaveAttribute('open')
  })
})

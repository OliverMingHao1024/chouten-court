import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GameSummaryDialog, type GameSummaryResult } from './GameSummaryDialog'

function makeResult(overrides: Partial<GameSummaryResult> = {}): GameSummaryResult {
  return {
    outcome: 'win',
    strengthBefore: 60,
    strengthAfter: 58.5,
    boxScore: { quarters: [{ us: 18, them: 15 }, { us: 17, them: 16 }, { us: 16, them: 15 }, { us: 19, them: 17 }], final: { us: 70, them: 63 } },
    players: [
      {
        playerId: 'p1',
        playerName: '球員01',
        role: 'starter',
        fatigueBefore: 20,
        fatigueAfter: 30,
        grewAttribute: 'three', points: 10, rebounds: 5, assists: 2,
      },
      {
        playerId: 'p2',
        playerName: '球員02',
        role: 'rotation',
        fatigueBefore: 10,
        fatigueAfter: 15,
        grewAttribute: null, points: 10, rebounds: 5, assists: 2,
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

  it('shows each player individual box line (points/rebounds/assists)', () => {
    render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)
    expect(screen.getAllByText('10分 5籃 2助攻').length).toBeGreaterThan(0)
  })

  it('shows the final score and all 4 quarters from the box score', () => {
    render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)

    expect(screen.getByText('最終比分 70 - 63')).toBeInTheDocument()
    expect(screen.getByText('第1節')).toBeInTheDocument()
    expect(screen.getByText('第4節')).toBeInTheDocument()
    expect(screen.getByText('19 - 17')).toBeInTheDocument()
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
    expect(screen.getAllByText(/球員03/).length).toBeGreaterThan(0)
    expect(screen.getByText(/受傷前疲勞值 85/)).toBeInTheDocument()
  })

  it('does not show an injuries section when nobody got hurt', () => {
    render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)
    expect(screen.queryByText('新發生的傷勢')).not.toBeInTheDocument()
  })

  it('explains the outcome with a ranked list of reasons drawn from the same data already shown', () => {
    render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)
    expect(screen.getByText('主要原因')).toBeInTheDocument()
    expect(screen.getByText(/球員01 本場成長 三分\+1/)).toBeInTheDocument()
  })

  it('does not show a reasons section when nothing notable happened', () => {
    render(
      <GameSummaryDialog
        result={makeResult({ players: [{ playerId: 'p1', playerName: '球員01', role: 'starter', fatigueBefore: 20, fatigueAfter: 30, grewAttribute: null, points: 10, rebounds: 5, assists: 2 }] })}
        onConfirm={() => {}}
      />,
    )
    expect(screen.queryByText('主要原因')).not.toBeInTheDocument()
  })

  it('always suggests a concrete next step', () => {
    render(<GameSummaryDialog result={makeResult()} onConfirm={() => {}} />)
    expect(screen.getByText(/^下一步:/)).toBeInTheDocument()
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

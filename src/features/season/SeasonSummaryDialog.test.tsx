import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SeasonSummaryDialog, type SeasonSummaryResult } from './SeasonSummaryDialog'

function makeResult(overrides: Partial<SeasonSummaryResult> = {}): SeasonSummaryResult {
  return {
    record: { year: 1, wins: 3, losses: 1, finalPhaseReached: 'qualifying', placement: null, reputationAfter: 44 },
    reputationDelta: -6,
    reputationAfter: 44,
    awards: [
      { title: '得分王', playerName: '球員01' },
      { title: '籃板王', playerName: '球員02' },
      { title: '助攻王', playerName: '球員03' },
      { title: '防守王', playerName: '球員04' },
    ],
    ...overrides,
  }
}

describe('SeasonSummaryDialog', () => {
  it('opens and shows the season record, reputation change, and awards', () => {
    render(<SeasonSummaryDialog result={makeResult()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText(/資格賽止步 3勝1敗/)).toBeInTheDocument()
    expect(screen.getByText(/-6/)).toBeInTheDocument()
    expect(screen.getByText(/44/)).toBeInTheDocument()
    expect(screen.getByText('得分王:球員01')).toBeInTheDocument()
  })

  it('stays closed when there is no result yet', () => {
    render(<SeasonSummaryDialog result={null} />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).not.toHaveAttribute('open')
  })

  it('reopens for a new result even if the values are identical to the last one', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SeasonSummaryDialog result={makeResult()} />)

    const dialog = screen.getByRole('dialog')
    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(dialog).not.toHaveAttribute('open')

    rerender(<SeasonSummaryDialog result={makeResult()} />)
    expect(dialog).toHaveAttribute('open')
  })
})

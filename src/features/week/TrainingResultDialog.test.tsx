import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TrainingResultDialog } from './TrainingResultDialog'

function makeRolls(count: number, threshold: number) {
  return Array.from({ length: count }, (_, index) => {
    const roll = (index % 6) + 1
    return { playerName: `球員${String(index + 1).padStart(2, '0')}`, roll, succeeded: roll >= threshold }
  })
}

function makeResult(overrides: Partial<React.ComponentProps<typeof TrainingResultDialog>['result']> = {}) {
  return {
    attributeLabel: '三分',
    successCount: 8,
    totalPlayers: 12,
    totalGain: 16,
    rolls: makeRolls(12, 3),
    ...overrides,
  }
}

describe('TrainingResultDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens and shows the roll summary when a result is provided', () => {
    render(<TrainingResultDialog result={makeResult()} />)
    act(() => vi.runAllTimers())

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText('本週練習重點:三分')).toBeInTheDocument()
    expect(screen.getByText('8 / 12 位球員練習成功')).toBeInTheDocument()
  })

  it('gives each trained player their own die, settling on their individual roll', () => {
    const { container } = render(<TrainingResultDialog result={makeResult({ rolls: makeRolls(3, 3) })} />)
    act(() => vi.runAllTimers())

    const dice = container.querySelectorAll('.training-result-dialog__die-slot')
    expect(dice).toHaveLength(3)

    // Rolls 1, 2, 3 -> pip counts 1, 2, 3 respectively, matching the per-player die values.
    const pipCounts = Array.from(dice).map(
      (die) => die.querySelectorAll('.training-result-dialog__pip--visible').length,
    )
    expect(pipCounts).toEqual([1, 2, 3])
  })

  it('marks each player with their own success/failure verdict, not a shared one', () => {
    render(
      <TrainingResultDialog
        result={makeResult({
          rolls: [
            { playerName: '球員01', roll: 5, succeeded: true },
            { playerName: '球員02', roll: 1, succeeded: false },
          ],
        })}
      />,
    )
    act(() => vi.runAllTimers())

    expect(screen.getByTitle('球員01:5 點')).toHaveClass('training-result-dialog__die-slot--success')
    expect(screen.getByTitle('球員02:1 點')).not.toHaveClass('training-result-dialog__die-slot--success')
  })

  it('stays closed when there is no result yet', () => {
    render(<TrainingResultDialog result={null} />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).not.toHaveAttribute('open')
  })

  it('reopens for a new result even if the values are identical to the last one', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { rerender } = render(<TrainingResultDialog result={makeResult()} />)

    const dialog = screen.getByRole('dialog')
    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(dialog).not.toHaveAttribute('open')

    // Same values, but App always passes a fresh object for a fresh roll.
    rerender(<TrainingResultDialog result={makeResult()} />)
    expect(dialog).toHaveAttribute('open')
  })
})

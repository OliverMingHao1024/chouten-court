import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TrainingResultDialog } from './TrainingResultDialog'

function makeResult(overrides: Partial<React.ComponentProps<typeof TrainingResultDialog>['result']> = {}) {
  return {
    attributeLabel: '三分',
    intensityLabel: '照常執行',
    successCount: 8,
    totalPlayers: 12,
    totalGain: 16,
    ...overrides,
  }
}

describe('TrainingResultDialog', () => {
  it('opens and shows the roll summary when a result is provided', () => {
    render(<TrainingResultDialog result={makeResult()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText('照常執行')).toBeInTheDocument()
    expect(screen.getByText('8 / 12 位球員練習成功')).toBeInTheDocument()
    expect(screen.getByText(/三分/)).toBeInTheDocument()
    expect(screen.getByText(/\+16/)).toBeInTheDocument()
  })

  it('stays closed when there is no result yet', () => {
    render(<TrainingResultDialog result={null} />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).not.toHaveAttribute('open')
  })

  it('reopens for a new result even if the values are identical to the last one', async () => {
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

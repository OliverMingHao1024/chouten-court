import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WeekScreen } from './WeekScreen'

function renderScreen(overrides: Partial<React.ComponentProps<typeof WeekScreen>> = {}) {
  return render(
    <WeekScreen
      practiceMatchAllowed={true}
      opponentNames={{ weak: '板橋高中', medium: '三重高工', strong: '新莊家商' }}
      onTrain={vi.fn()}
      onPracticeMatch={vi.fn()}
      lastResult={null}
      {...overrides}
    />,
  )
}

describe('WeekScreen', () => {
  it('starts with the two entry buttons and no sub-options visible', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: '訓練' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '練習賽' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /保守應對/ })).not.toBeInTheDocument()
  })

  it('reveals the attribute picker and 3 risk options after clicking 訓練, and submits on click', async () => {
    const user = userEvent.setup()
    const onTrain = vi.fn()
    renderScreen({ onTrain })

    await user.click(screen.getByRole('button', { name: '訓練' }))
    await user.selectOptions(screen.getByLabelText('訓練重點'), '三分')
    await user.click(screen.getByRole('button', { name: /全力一搏/ }))

    expect(onTrain).toHaveBeenCalledWith('three', 'intense')
  })

  it('submits the moderate-risk option as 照常執行', async () => {
    const user = userEvent.setup()
    const onTrain = vi.fn()
    renderScreen({ onTrain })

    await user.click(screen.getByRole('button', { name: '訓練' }))
    await user.click(screen.getByRole('button', { name: /照常執行/ }))

    expect(onTrain).toHaveBeenCalledWith('three', 'moderate')
  })

  it('reveals 3 opponent buttons, each a different school, after clicking 練習賽', async () => {
    const user = userEvent.setup()
    const onPracticeMatch = vi.fn()
    renderScreen({
      onPracticeMatch,
      opponentNames: { weak: '板橋高中', medium: '三重高工', strong: '新莊家商' },
    })

    await user.click(screen.getByRole('button', { name: '練習賽' }))

    expect(screen.getByRole('button', { name: /板橋高中/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /三重高工/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新莊家商/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /新莊家商/ }))

    expect(onPracticeMatch).toHaveBeenCalledWith('strong')
  })

  it('disables the 練習賽 entry button when not allowed', () => {
    renderScreen({ practiceMatchAllowed: false })
    expect(screen.getByRole('button', { name: '練習賽' })).toBeDisabled()
  })

  it('shows the last result message when provided', () => {
    renderScreen({ lastResult: '練習賽獲勝!' })
    expect(screen.getByText('練習賽獲勝!')).toBeInTheDocument()
  })
})

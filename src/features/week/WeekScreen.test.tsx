import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WeekScreen } from './WeekScreen'

function renderScreen(overrides: Partial<React.ComponentProps<typeof WeekScreen>> = {}) {
  return render(
    <WeekScreen
      year={1}
      weekOfYear={3}
      phase="offseason"
      practiceMatchAllowed={true}
      onTrain={vi.fn()}
      onPracticeMatch={vi.fn()}
      lastResult={null}
      {...overrides}
    />,
  )
}

describe('WeekScreen', () => {
  it('shows the current year, week, and phase', () => {
    renderScreen({ year: 2, weekOfYear: 5, phase: 'qualifying' })
    expect(screen.getByText('第 2 年 第 5 週')).toBeInTheDocument()
    expect(screen.getByText('資格賽')).toBeInTheDocument()
  })

  it('submits the chosen training attribute and intensity', async () => {
    const user = userEvent.setup()
    const onTrain = vi.fn()
    renderScreen({ onTrain })

    await user.click(screen.getByRole('radio', { name: '訓練' }))
    await user.selectOptions(screen.getByLabelText('訓練重點'), '三分')
    await user.selectOptions(screen.getByLabelText('訓練強度'), '重')
    await user.click(screen.getByRole('button', { name: '執行這一週' }))

    expect(onTrain).toHaveBeenCalledWith('three', 'intense')
  })

  it('defaults training intensity to moderate', async () => {
    const user = userEvent.setup()
    const onTrain = vi.fn()
    renderScreen({ onTrain })

    await user.click(screen.getByRole('radio', { name: '訓練' }))
    await user.click(screen.getByRole('button', { name: '執行這一週' }))

    expect(onTrain).toHaveBeenCalledWith('three', 'moderate')
  })

  it('submits the chosen practice match strength when allowed', async () => {
    const user = userEvent.setup()
    const onPracticeMatch = vi.fn()
    renderScreen({ practiceMatchAllowed: true, onPracticeMatch })

    await user.click(screen.getByRole('radio', { name: '練習賽' }))
    await user.selectOptions(screen.getByLabelText('對手強度'), '強')
    await user.click(screen.getByRole('button', { name: '執行這一週' }))

    expect(onPracticeMatch).toHaveBeenCalledWith('strong')
  })

  it('disables the practice match option when not allowed', () => {
    renderScreen({ practiceMatchAllowed: false })
    expect(screen.getByRole('radio', { name: '練習賽' })).toBeDisabled()
  })

  it('shows the last result message when provided', () => {
    renderScreen({ lastResult: '練習賽獲勝!' })
    expect(screen.getByText('練習賽獲勝!')).toBeInTheDocument()
  })

  it('does not submit a practice match if the gate closes after the radio was selected', async () => {
    const user = userEvent.setup()
    const onPracticeMatch = vi.fn()
    const onTrain = vi.fn()

    const { rerender } = renderScreen({ practiceMatchAllowed: true, onPracticeMatch, onTrain })
    await user.click(screen.getByRole('radio', { name: '練習賽' }))

    rerender(
      <WeekScreen
        year={1}
        weekOfYear={24}
        phase="offseason"
        practiceMatchAllowed={false}
        onTrain={onTrain}
        onPracticeMatch={onPracticeMatch}
        lastResult={null}
      />,
    )

    await user.click(screen.getByRole('button', { name: '執行這一週' }))

    expect(onPracticeMatch).not.toHaveBeenCalled()
  })
})

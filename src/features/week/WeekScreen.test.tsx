import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WeekScreen } from './WeekScreen'

describe('WeekScreen', () => {
  it('shows the current week number', () => {
    render(<WeekScreen week={3} onTrain={vi.fn()} onPracticeMatch={vi.fn()} lastResult={null} />)
    expect(screen.getByText('第 3 週')).toBeInTheDocument()
  })

  it('submits the chosen training attribute', async () => {
    const user = userEvent.setup()
    const onTrain = vi.fn()
    render(
      <WeekScreen week={1} onTrain={onTrain} onPracticeMatch={vi.fn()} lastResult={null} />,
    )

    await user.click(screen.getByRole('radio', { name: '訓練' }))
    await user.selectOptions(screen.getByLabelText('訓練重點'), '三分')
    await user.click(screen.getByRole('button', { name: '執行這一週' }))

    expect(onTrain).toHaveBeenCalledWith('three')
  })

  it('submits the chosen practice match strength', async () => {
    const user = userEvent.setup()
    const onPracticeMatch = vi.fn()
    render(
      <WeekScreen week={1} onTrain={vi.fn()} onPracticeMatch={onPracticeMatch} lastResult={null} />,
    )

    await user.click(screen.getByRole('radio', { name: '練習賽' }))
    await user.selectOptions(screen.getByLabelText('對手強度'), '強')
    await user.click(screen.getByRole('button', { name: '執行這一週' }))

    expect(onPracticeMatch).toHaveBeenCalledWith('strong')
  })

  it('shows the last result message when provided', () => {
    render(
      <WeekScreen week={2} onTrain={vi.fn()} onPracticeMatch={vi.fn()} lastResult="練習賽獲勝!" />,
    )
    expect(screen.getByText('練習賽獲勝!')).toBeInTheDocument()
  })
})

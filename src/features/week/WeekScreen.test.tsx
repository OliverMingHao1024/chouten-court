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
      onTeamRest={vi.fn()}
      onPracticeMatch={vi.fn()}
      lastResult={null}
      trainingRollResult={null}
      {...overrides}
    />,
  )
}

describe('WeekScreen', () => {
  it('always shows the attribute picker, the rest button, and the practice-match entry', () => {
    renderScreen()
    expect(screen.getByRole('group', { name: '訓練重點' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '投籃' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全隊休養' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '練習賽' })).toBeInTheDocument()
  })

  it('starts training immediately when an attribute button is clicked, no extra confirmation step', async () => {
    const user = userEvent.setup()
    const onTrain = vi.fn()
    renderScreen({ onTrain })

    await user.click(screen.getByRole('button', { name: '三分' }))

    expect(onTrain).toHaveBeenCalledWith('three')
  })

  it('starts team rest immediately when the rest button is clicked', async () => {
    const user = userEvent.setup()
    const onTeamRest = vi.fn()
    renderScreen({ onTeamRest })

    await user.click(screen.getByRole('button', { name: '全隊休養' }))

    expect(onTeamRest).toHaveBeenCalledOnce()
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

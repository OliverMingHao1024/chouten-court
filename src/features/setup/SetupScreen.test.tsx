import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  it('shows the opening story naming the fixed team, and submits that team name', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { container } = render(<SetupScreen schoolHistory={[]} onSubmit={onSubmit} />)

    const story = container.querySelector('.setup__story')
    expect(story).not.toBeNull()
    expect(story?.textContent).toContain('淡水高中')
    expect(story?.textContent).toContain('場邊的教練')

    await user.clear(screen.getByLabelText('教練名稱'))
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.type(screen.getByLabelText('種子碼(選填)'), 'lucky-seed')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(onSubmit).toHaveBeenCalledWith('淡水高中', '山田', 'lucky-seed', 'long')
  })

  it('submits undefined seed when the seed field is left blank', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SetupScreen schoolHistory={[]} onSubmit={onSubmit} />)

    await user.clear(screen.getByLabelText('教練名稱'))
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(onSubmit).toHaveBeenCalledWith('淡水高中', '山田', undefined, 'long')
  })

  it('defaults to 長期生涯 mode and submits 短局 mode once switched', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SetupScreen schoolHistory={[]} onSubmit={onSubmit} />)

    expect(screen.getByRole('radio', { name: '長期生涯' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '三年挑戰' })).not.toBeChecked()

    await user.click(screen.getByRole('radio', { name: '三年挑戰' }))
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(onSubmit).toHaveBeenCalledWith('淡水高中', expect.any(String), undefined, 'short')
  })

  it('pre-fills the coach name field with a randomly generated name', () => {
    render(<SetupScreen schoolHistory={[]} onSubmit={vi.fn()} />)
    expect((screen.getByLabelText('教練名稱') as HTMLInputElement).value.trim().length).toBeGreaterThan(0)
  })

  it('rerolls the coach name when the dice button is clicked', async () => {
    const user = userEvent.setup()
    render(<SetupScreen schoolHistory={[]} onSubmit={vi.fn()} />)

    const input = screen.getByLabelText('教練名稱') as HTMLInputElement
    const before = input.value

    // Roll a few times; with a small name pool a single reroll could coincidentally repeat.
    let changed = false
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: '隨機產生教練名稱' }))
      if (input.value !== before) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })

  it('shows no 校史 section when there is no school history yet', () => {
    render(<SetupScreen schoolHistory={[]} onSubmit={vi.fn()} />)
    expect(screen.queryByText('校史')).not.toBeInTheDocument()
  })

  it('lists past careers, most recent first, including a champion roster snapshot', () => {
    render(
      <SetupScreen
        schoolHistory={[
          {
            coachName: '第一任',
            reason: 'insuranceCap',
            totalSeasons: 5,
            totalWins: 10,
            totalLosses: 8,
            bestPlacementLabel: '亞軍',
            championRoster: null,
          },
          {
            coachName: '第二任',
            reason: 'champion',
            totalSeasons: 3,
            totalWins: 20,
            totalLosses: 2,
            bestPlacementLabel: '冠軍',
            championRoster: [{ name: '王小明', position: 'PG', overallGrade: 'S' }],
          },
        ]}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('校史')).toBeInTheDocument()
    const entries = screen.getAllByText(/教練・/)
    expect(entries[0]).toHaveTextContent('第二任')
    expect(entries[1]).toHaveTextContent('第一任')
    expect(screen.getByText(/王小明\(S\)/)).toBeInTheDocument()
  })
})

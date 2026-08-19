import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  it('shows a fixed team name and submits it along with a custom coach name and seed', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SetupScreen onSubmit={onSubmit} />)

    expect(screen.getByText('淡水高中')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('教練名稱'))
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.type(screen.getByLabelText('種子碼(選填)'), 'lucky-seed')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(onSubmit).toHaveBeenCalledWith('淡水高中', '山田', 'lucky-seed')
  })

  it('submits undefined seed when the seed field is left blank', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SetupScreen onSubmit={onSubmit} />)

    await user.clear(screen.getByLabelText('教練名稱'))
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(onSubmit).toHaveBeenCalledWith('淡水高中', '山田', undefined)
  })

  it('pre-fills the coach name field with a randomly generated name', () => {
    render(<SetupScreen onSubmit={vi.fn()} />)
    expect((screen.getByLabelText('教練名稱') as HTMLInputElement).value.trim().length).toBeGreaterThan(0)
  })

  it('rerolls the coach name when the dice button is clicked', async () => {
    const user = userEvent.setup()
    render(<SetupScreen onSubmit={vi.fn()} />)

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
})

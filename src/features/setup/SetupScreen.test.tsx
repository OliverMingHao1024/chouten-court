import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  it('passes the optional seed code to onSubmit when filled in', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SetupScreen onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.type(screen.getByLabelText('種子碼(選填)'), 'lucky-seed')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(onSubmit).toHaveBeenCalledWith('頂點高中', '山田', 'lucky-seed')
  })

  it('submits undefined seed when the seed field is left blank', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SetupScreen onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(onSubmit).toHaveBeenCalledWith('頂點高中', '山田', undefined)
  })
})

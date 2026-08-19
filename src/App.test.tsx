import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('lets the player name their team and coach, then shows the generated roster', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(await screen.findByText('頂點高中')).toBeInTheDocument()
    expect(screen.getByText('山田 教練')).toBeInTheDocument()

    const roster = screen.getAllByRole('listitem')
    expect(roster).toHaveLength(12)
  })
})

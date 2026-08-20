import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('shows team identity and calendar position in the header, and renders children', () => {
    render(
      <AppShell teamName="頂點高中" coachName="山田" reputation={50} year={1} weekOfYear={5} phaseLabel="非賽季">
        <p>content here</p>
      </AppShell>,
    )

    expect(screen.getByText('頂點高中')).toBeInTheDocument()
    expect(screen.getByText(/山田 教練/)).toBeInTheDocument()
    expect(screen.getByText(/聲望 50/)).toBeInTheDocument()
    expect(screen.getByText('第 1 年 第 5 週')).toBeInTheDocument()
    expect(screen.getByText('非賽季')).toBeInTheDocument()
    expect(screen.getByText('content here')).toBeInTheDocument()
  })

  it('does not show a menu toggle when no actions are provided', () => {
    render(
      <AppShell teamName="頂點高中" coachName="山田" reputation={50} year={1} weekOfYear={5} phaseLabel="非賽季">
        <p>content here</p>
      </AppShell>,
    )

    expect(screen.queryByRole('button', { name: '更多選項' })).not.toBeInTheDocument()
  })

  it('hides actions inside a collapsed menu, revealed by the more-options toggle in the header', async () => {
    const user = userEvent.setup()
    render(
      <AppShell
        teamName="頂點高中"
        coachName="山田"
        reputation={50}
        year={1}
        weekOfYear={5}
        phaseLabel="非賽季"
        actions={<button type="button">重新開始</button>}
      >
        <p>content here</p>
      </AppShell>,
    )

    expect(screen.queryByRole('button', { name: '重新開始' })).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: '更多選項' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: '重新開始' })).toBeInTheDocument()
  })
})

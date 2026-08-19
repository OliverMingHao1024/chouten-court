import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('shows team identity and calendar position in the header, and renders children', () => {
    render(
      <AppShell teamName="頂點高中" coachName="山田" year={1} weekOfYear={5} phaseLabel="非賽季">
        <p>content here</p>
      </AppShell>,
    )

    expect(screen.getByText('頂點高中')).toBeInTheDocument()
    expect(screen.getByText('山田 教練')).toBeInTheDocument()
    expect(screen.getByText('第 1 年 第 5 週')).toBeInTheDocument()
    expect(screen.getByText('非賽季')).toBeInTheDocument()
    expect(screen.getByText('content here')).toBeInTheDocument()
  })
})

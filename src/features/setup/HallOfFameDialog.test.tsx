import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { SchoolHistoryEntry } from '../../domain/schoolHistory'
import { HallOfFameDialog } from './HallOfFameDialog'

function makeEntry(overrides: Partial<SchoolHistoryEntry> = {}): SchoolHistoryEntry {
  return {
    coachName: '山田',
    reason: 'insuranceCap',
    totalSeasons: 5,
    totalWins: 10,
    totalLosses: 8,
    bestPlacementLabel: '亞軍',
    championRoster: null,
    notableGraduates: [],
    ...overrides,
  }
}

describe('HallOfFameDialog', () => {
  it('shows an empty-state message when there is no school history yet', async () => {
    const user = userEvent.setup()
    render(<HallOfFameDialog schoolHistory={[]} />)

    await user.click(screen.getByRole('button', { name: '名人堂' }))
    expect(screen.getByText('還沒有任何生涯留下紀錄。')).toBeInTheDocument()
  })

  it('aggregates total careers, championships, and win/loss record across every entry', async () => {
    const user = userEvent.setup()
    const schoolHistory = [
      makeEntry({ coachName: '第一任', totalWins: 10, totalLosses: 8, reason: 'insuranceCap' }),
      makeEntry({
        coachName: '第二任',
        totalWins: 20,
        totalLosses: 2,
        reason: 'champion',
        championRoster: [{ name: '王小明', position: 'PG', overallGrade: 'S' }],
      }),
    ]
    render(<HallOfFameDialog schoolHistory={schoolHistory} />)

    await user.click(screen.getByRole('button', { name: '名人堂' }))
    expect(screen.getByText('2')).toBeInTheDocument() // 歷屆執教
    expect(screen.getByText('1')).toBeInTheDocument() // 總冠軍數
    expect(screen.getByText('30 勝 10 敗')).toBeInTheDocument()
  })

  it('lists champion rosters, most recent first', async () => {
    const user = userEvent.setup()
    const schoolHistory = [
      makeEntry({
        coachName: '第一任冠軍教練',
        reason: 'champion',
        championRoster: [{ name: '舊隊員', position: 'C', overallGrade: 'A' }],
      }),
      makeEntry({
        coachName: '第二任冠軍教練',
        reason: 'champion',
        championRoster: [{ name: '新隊員', position: 'PG', overallGrade: 'S' }],
      }),
    ]
    render(<HallOfFameDialog schoolHistory={schoolHistory} />)

    await user.click(screen.getByRole('button', { name: '名人堂' }))
    const headlines = screen.getAllByText(/教練・第 \d+ 季奪冠/)
    expect(headlines[0]).toHaveTextContent('第二任冠軍教練')
    expect(headlines[1]).toHaveTextContent('第一任冠軍教練')
  })

  it('shows pooled notable graduates from across every entry', async () => {
    const user = userEvent.setup()
    const schoolHistory = [
      makeEntry({ notableGraduates: ['球員A的後日談。'] }),
      makeEntry({ notableGraduates: ['球員B的後日談。'] }),
    ]
    render(<HallOfFameDialog schoolHistory={schoolHistory} />)

    await user.click(screen.getByRole('button', { name: '名人堂' }))
    expect(screen.getByText('球員A的後日談。')).toBeInTheDocument()
    expect(screen.getByText('球員B的後日談。')).toBeInTheDocument()
  })

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup()
    render(<HallOfFameDialog schoolHistory={[]} />)

    await user.click(screen.getByRole('button', { name: '名人堂' }))
    expect(screen.getByRole('heading', { name: '名人堂' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '關閉' }))
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { computeScheduleStrip } from '../../domain/schedule'
import { ScheduleStrip } from './ScheduleStrip'

describe('ScheduleStrip', () => {
  it('labels each slot relative to the current week', () => {
    const slots = computeScheduleStrip(10)
    render(<ScheduleStrip currentTotalWeek={10} slots={slots} weeksUntilNextMatch={17} />)

    expect(screen.getByText('上週')).toBeInTheDocument()
    expect(screen.getByText('本週')).toBeInTheDocument()
    expect(screen.getByText('下週')).toBeInTheDocument()
    expect(screen.getByText('+2 週')).toBeInTheDocument()
  })

  it('shows a countdown to the next official match', () => {
    const slots = computeScheduleStrip(10)
    render(<ScheduleStrip currentTotalWeek={10} slots={slots} weeksUntilNextMatch={17} />)
    expect(screen.getByText('距離下一場正式賽 17 週')).toBeInTheDocument()
  })

  it('announces the current week itself being a match instead of a "0 週" countdown', () => {
    const slots = computeScheduleStrip(27)
    render(<ScheduleStrip currentTotalWeek={27} slots={slots} weeksUntilNextMatch={0} />)
    expect(screen.getByText('本週就是正式賽!')).toBeInTheDocument()
  })

  it('shows the offseason phase label for a future slot with no scheduled game', () => {
    const slots = computeScheduleStrip(10)
    render(<ScheduleStrip currentTotalWeek={10} slots={slots} weeksUntilNextMatch={17} />)
    expect(screen.getAllByText('非賽季').length).toBeGreaterThan(0)
  })

  it('reveals the known match schedule for a future slot that lands on a game week, without inventing anything random', () => {
    const slots = computeScheduleStrip(25)
    render(<ScheduleStrip currentTotalWeek={25} slots={slots} weeksUntilNextMatch={2} />)
    expect(screen.getByText('資格賽 第1戰')).toBeInTheDocument()
  })

  it('marks a future slot with no scheduled game as unknown, not as a guess', () => {
    const slots = computeScheduleStrip(1)
    render(<ScheduleStrip currentTotalWeek={1} slots={slots} weeksUntilNextMatch={26} />)
    expect(screen.getAllByText('未知').length).toBeGreaterThan(0)
  })
})

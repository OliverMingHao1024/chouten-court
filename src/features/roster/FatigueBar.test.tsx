import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FatigueBar } from './FatigueBar'

describe('FatigueBar', () => {
  it('shows a full bar when fatigue is 0 (fresh)', () => {
    render(<FatigueBar fatigue={0} />)
    const fill = screen.getByRole('progressbar', { name: '疲勞值' }).firstChild as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('recedes as fatigue rises, reaching empty at max fatigue', () => {
    render(<FatigueBar fatigue={100} />)
    const fill = screen.getByRole('progressbar', { name: '疲勞值' }).firstChild as HTMLElement
    expect(fill.style.width).toBe('0%')
  })

  it('shows half the bar at half fatigue', () => {
    render(<FatigueBar fatigue={50} />)
    const fill = screen.getByRole('progressbar', { name: '疲勞值' }).firstChild as HTMLElement
    expect(fill.style.width).toBe('50%')
  })
})

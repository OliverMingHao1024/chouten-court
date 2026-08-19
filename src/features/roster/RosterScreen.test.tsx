import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RosterScreen } from './RosterScreen'
import type { Player } from '../../domain/types'

const player: Player = {
  id: 'p-1',
  name: '球員01',
  position: 'PG',
  attributes: {
    shooting: 61,
    three: 72,
    rebound: 44,
    pass: 80,
    defense: 55,
    athletic: 68,
    iq: 77,
  },
  personality: 'steady',
  fatigue: 0,
  styleTag: { primary: 'playmaking', secondary: 'shooting', label: '組織射手型' },
}

describe('RosterScreen', () => {
  it('shows a compact row per player with name, position, style, and overall grade', () => {
    render(<RosterScreen players={[player]} />)

    expect(screen.getByText('球員01')).toBeInTheDocument()
    expect(screen.getByText('PG')).toBeInTheDocument()
    expect(screen.getByText('組織射手型')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument() // average(61,72,44,80,55,68,77) ≈ 65.3 -> C
  })

  it('does not expand the per-attribute breakdown until clicked', () => {
    render(<RosterScreen players={[player]} />)
    const details = screen.getByText('球員01').closest('details')
    expect(details).not.toHaveAttribute('open')
  })

  it('reveals every attribute value after clicking the row to expand it', async () => {
    const user = userEvent.setup()
    render(<RosterScreen players={[player]} />)

    await user.click(screen.getByText('球員01'))

    const details = screen.getByText('球員01').closest('details')
    expect(details).toHaveAttribute('open')

    const expected: Array<[string, number]> = [
      ['投籃', 61],
      ['三分', 72],
      ['籃板', 44],
      ['傳球', 80],
      ['防守', 55],
      ['運動能力', 68],
      ['IQ', 77],
    ]
    for (const [label, value] of expected) {
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(String(value))).toBeInTheDocument()
    }
  })
})

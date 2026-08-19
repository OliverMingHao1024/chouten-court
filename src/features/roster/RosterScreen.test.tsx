import { render, screen } from '@testing-library/react'
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
  it('shows every attribute value for each player', () => {
    render(<RosterScreen players={[player]} />)

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

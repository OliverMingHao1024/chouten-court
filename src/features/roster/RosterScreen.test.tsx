import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RosterScreen } from './RosterScreen'
import type { Player } from '../../domain/types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
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
    ...overrides,
  }
}

describe('RosterScreen', () => {
  it('shows one block per player with name, position, and overall grade, but no attribute detail yet', () => {
    render(<RosterScreen players={[makePlayer()]} />)

    expect(screen.getByText('球員01')).toBeInTheDocument()
    expect(screen.getByText('PG')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument() // average(61,72,44,80,55,68,77) ≈ 65.3 -> C
    expect(screen.queryByText('投籃')).not.toBeInTheDocument()
  })

  it('opens a dialog with the full attribute breakdown when a block is clicked', async () => {
    const user = userEvent.setup()
    render(<RosterScreen players={[makePlayer()]} />)

    await user.click(screen.getByRole('button', { name: /球員01/ }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeVisible()
    const within_ = within(dialog)
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
      expect(within_.getByText(label)).toBeInTheDocument()
      expect(within_.getByText(String(value))).toBeInTheDocument()
    }
  })

  it('shows the right player when a different block is clicked', async () => {
    const user = userEvent.setup()
    render(
      <RosterScreen
        players={[makePlayer({ id: 'p-1', name: '球員01' }), makePlayer({ id: 'p-2', name: '球員02' })]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /球員02/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('球員02')).toBeInTheDocument()
  })

  it('closes the dialog when the backdrop (the dialog element itself, not its content) is clicked', async () => {
    const user = userEvent.setup()
    render(<RosterScreen players={[makePlayer()]} />)

    await user.click(screen.getByRole('button', { name: /球員01/ }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')

    await user.click(dialog)

    expect(dialog).not.toHaveAttribute('open')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeDecisionDialog } from './ChallengeDecisionDialog'

describe('ChallengeDecisionDialog', () => {
  it('stays closed when open is false', () => {
    render(<ChallengeDecisionDialog open={false} onContinue={vi.fn()} onEnd={vi.fn()} />)
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it('opens and shows both choices when open is true', () => {
    render(<ChallengeDecisionDialog open={true} onContinue={vi.fn()} onEnd={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
    expect(screen.getByRole('button', { name: '繼續帶下去' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '在此結束,寫進校史' })).toBeInTheDocument()
  })

  it('calls onContinue when the coach chooses to keep going', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<ChallengeDecisionDialog open={true} onContinue={onContinue} onEnd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '繼續帶下去' }))
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('calls onEnd when the coach chooses to stop here', async () => {
    const user = userEvent.setup()
    const onEnd = vi.fn()
    render(<ChallengeDecisionDialog open={true} onContinue={vi.fn()} onEnd={onEnd} />)

    await user.click(screen.getByRole('button', { name: '在此結束,寫進校史' }))
    expect(onEnd).toHaveBeenCalledOnce()
  })
})

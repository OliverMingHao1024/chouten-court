import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EventResultDialog, type EventRevealResult } from './EventResultDialog'

function makeResult(overrides: Partial<EventRevealResult> = {}): EventRevealResult {
  return {
    cardTitle: '加練狂魔',
    risk: 'balanced',
    succeeded: true,
    text: '額外的半小時讓小明抓到手感,投籃動作變得更扎實。',
    attribute: 'shooting',
    attributeDelta: 2,
    fatigueDelta: 4,
    reputationDelta: 0,
    ...overrides,
  }
}

describe('EventResultDialog', () => {
  it('opens and shows the card title, chosen risk, verdict, and narrative text', () => {
    render(<EventResultDialog result={makeResult()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText('加練狂魔')).toBeInTheDocument()
    expect(screen.getByText('折衷應對 · 成功')).toBeInTheDocument()
    expect(screen.getByText(/額外的半小時/)).toBeInTheDocument()
  })

  it('shows the attribute, fatigue, and reputation deltas that actually changed', () => {
    render(<EventResultDialog result={makeResult({ reputationDelta: -1 })} />)

    expect(screen.getByText('投籃 +2')).toBeInTheDocument()
    expect(screen.getByText('疲勞 +4')).toBeInTheDocument()
    expect(screen.getByText('聲望 -1')).toBeInTheDocument()
  })

  it('does not show an effects list when nothing actually changed', () => {
    render(
      <EventResultDialog
        result={makeResult({ attribute: null, attributeDelta: 0, fatigueDelta: 0, reputationDelta: 0 })}
      />,
    )
    expect(document.querySelector('.event-result-dialog__effects')).not.toBeInTheDocument()
  })

  it('shows a failure verdict distinctly from success', () => {
    render(<EventResultDialog result={makeResult({ succeeded: false })} />)
    expect(screen.getByText('折衷應對 · 失敗')).toBeInTheDocument()
  })

  it('stays closed when there is no result yet', () => {
    render(<EventResultDialog result={null} />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).not.toHaveAttribute('open')
  })

  it('reopens for a new result even if the values are identical to the last one', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<EventResultDialog result={makeResult()} />)
    const dialog = screen.getByRole('dialog')

    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(dialog).not.toHaveAttribute('open')

    rerender(<EventResultDialog result={makeResult()} />)
    expect(dialog).toHaveAttribute('open')
  })
})

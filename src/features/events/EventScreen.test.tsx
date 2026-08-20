import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EVENT_CARDS } from '../../domain/events'
import { EventScreen } from './EventScreen'

const card = EVENT_CARDS[0]

describe('EventScreen', () => {
  it('shows the card title, category, and prompt with the featured player filled in', () => {
    render(<EventScreen card={card} featuredPlayerName="小明" lastResult={null} onChoose={() => {}} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getByText(/小明/)).toBeInTheDocument()
    expect(screen.queryByText(/\{player\}/)).not.toBeInTheDocument()
  })

  it('shows one button per risk choice', () => {
    render(<EventScreen card={card} featuredPlayerName="小明" lastResult={null} onChoose={() => {}} />)
    card.choices.forEach((choice) => {
      expect(screen.getByText(choice.label)).toBeInTheDocument()
    })
  })

  it('shows the success rate (70/50/30%) for each risk tier', () => {
    render(<EventScreen card={card} featuredPlayerName="小明" lastResult={null} onChoose={() => {}} />)
    expect(screen.getByText('成功率 70%')).toBeInTheDocument()
    expect(screen.getByText('成功率 50%')).toBeInTheDocument()
    expect(screen.getByText('成功率 30%')).toBeInTheDocument()
  })

  it('calls onChoose with the risk tier of the clicked choice', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(<EventScreen card={card} featuredPlayerName="小明" lastResult={null} onChoose={onChoose} />)

    await user.click(screen.getByText(card.choices[1].label))
    expect(onChoose).toHaveBeenCalledWith(card.choices[1].risk)
  })
})

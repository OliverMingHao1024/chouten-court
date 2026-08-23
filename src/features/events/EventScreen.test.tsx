import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EVENT_CARDS } from '../../domain/events'
import { createInitialRoster } from '../../domain/roster'
import type { Player } from '../../domain/types'
import { EventScreen } from './EventScreen'

const card = EVENT_CARDS[0]

// 屬性全部設 50、個性設 'captain'(不觸發任何事件個性加成),讓成功率剛好等於卡片的
// 基礎成功率,方便斷言具體數字;實際球員的成功率會依屬性/個性而不同(見 events.test.ts)。
function neutralPlayer(): Player {
  const base = createInitialRoster(1)[0]
  return {
    ...base,
    name: '小明',
    personality: 'captain',
    attributes: Object.fromEntries(Object.keys(base.attributes).map((key) => [key, 50])) as Player['attributes'],
  }
}

describe('EventScreen', () => {
  it('shows the card title, category, and prompt with the featured player filled in', () => {
    render(<EventScreen card={card} featuredPlayer={neutralPlayer()} lastResult={null} onChoose={() => {}} />)

    expect(screen.getByText(card.title)).toBeInTheDocument()
    expect(screen.getAllByText(/小明/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/\{player\}/)).not.toBeInTheDocument()
  })

  it('shows one button per risk choice', () => {
    render(<EventScreen card={card} featuredPlayer={neutralPlayer()} lastResult={null} onChoose={() => {}} />)
    card.choices.forEach((choice) => {
      expect(screen.getByText(choice.label)).toBeInTheDocument()
    })
  })

  it('shows the base success rate (70/50/30%) for a neutral player with average attributes', () => {
    render(<EventScreen card={card} featuredPlayer={neutralPlayer()} lastResult={null} onChoose={() => {}} />)
    expect(screen.getByText(/成功率 70%/)).toBeInTheDocument()
    expect(screen.getByText(/成功率 50%/)).toBeInTheDocument()
    expect(screen.getByText(/成功率 30%/)).toBeInTheDocument()
  })

  it('shows a personalized success rate for a player who is not neutral', () => {
    const strongPlayer: Player = {
      ...neutralPlayer(),
      attributes: Object.fromEntries(Object.keys(neutralPlayer().attributes).map((key) => [key, 99])) as Player['attributes'],
    }
    render(<EventScreen card={card} featuredPlayer={strongPlayer} lastResult={null} onChoose={() => {}} />)
    const rates = screen
      .getAllByText(/成功率 \d+%/)
      .map((node) => Number(node.textContent!.match(/(\d+)%/)![1]))
    expect(rates).not.toEqual([70, 50, 30])
    rates.forEach((rate) => expect(rate).toBeGreaterThan(30))
  })

  it('calls onChoose with the risk tier of the clicked choice', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(<EventScreen card={card} featuredPlayer={neutralPlayer()} lastResult={null} onChoose={onChoose} />)

    await user.click(screen.getByText(card.choices[1].label))
    expect(onChoose).toHaveBeenCalledWith(card.choices[1].risk)
  })

  it('locks all choices after the first one is picked, so a fast double-click cannot resolve the same event twice', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(<EventScreen card={card} featuredPlayer={neutralPlayer()} lastResult={null} onChoose={onChoose} />)

    const firstChoice = screen.getByRole('button', { name: new RegExp(card.choices[0].label) })
    await user.click(firstChoice)
    await user.click(firstChoice)
    await user.click(screen.getByRole('button', { name: new RegExp(card.choices[1].label) }))

    expect(onChoose).toHaveBeenCalledOnce()
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled())
  })
})

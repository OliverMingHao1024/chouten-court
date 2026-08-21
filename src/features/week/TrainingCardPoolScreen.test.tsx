import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialRoster } from '../../domain/roster'
import { MAX_CARDS_PER_WEEK, type PoolCard, type TrainingCardPoolState } from '../../domain/trainingCardPool'
import { TrainingCardPoolScreen } from './TrainingCardPoolScreen'

function makeCard(overrides: Partial<PoolCard> = {}): PoolCard {
  return { id: 'card-x', kind: 'teamTraining', attribute: 'three', age: 0, ...overrides }
}

function makePool(cards: PoolCard[]): TrainingCardPoolState {
  return { cards, nextCardId: cards.length }
}

const players = createInitialRoster(1)
const opponentNames = { weak: '弱校聯', medium: '中堅高校', strong: '名門學院' }

describe('TrainingCardPoolScreen', () => {
  it('renders every card in the pool with its cost', () => {
    const cards = Array.from({ length: 9 }, (_, i) => makeCard({ id: `c${i}`, attribute: 'three' }))
    render(
      <TrainingCardPoolScreen pool={makePool(cards)} trainingPoints={10} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={() => {}} />,
    )
    expect(screen.getAllByText('三分')).toHaveLength(9)
  })

  it('selects a card on click and shows it as selected, then deselects on a second click', async () => {
    const user = userEvent.setup()
    const cards = [makeCard({ id: 'a', kind: 'rest', attribute: null })]
    render(
      <TrainingCardPoolScreen pool={makePool(cards)} trainingPoints={10} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={() => {}} />,
    )
    const card = screen.getByRole('button', { name: /休養/ })
    await user.click(card)
    expect(card).toHaveClass('training-card-pool__card--selected')
    await user.click(card)
    expect(card).not.toHaveClass('training-card-pool__card--selected')
  })

  it(`refuses to select more than ${MAX_CARDS_PER_WEEK} cards`, async () => {
    const user = userEvent.setup()
    const cards = Array.from({ length: MAX_CARDS_PER_WEEK + 1 }, (_, i) => makeCard({ id: `c${i}`, kind: 'rest', attribute: null }))
    render(
      <TrainingCardPoolScreen pool={makePool(cards)} trainingPoints={999} maxTrainingPoints={999} players={players} opponentNames={opponentNames} onConfirm={() => {}} />,
    )
    const buttons = screen.getAllByRole('button', { name: /休養/ })
    for (const button of buttons) await user.click(button)
    const selected = buttons.filter((button) => button.classList.contains('training-card-pool__card--selected'))
    expect(selected).toHaveLength(MAX_CARDS_PER_WEEK)
  })

  it('disables a card whose cost would exceed the remaining points', () => {
    const cards = [makeCard({ id: 'a', kind: 'practiceMatch', attribute: null })]
    render(
      <TrainingCardPoolScreen pool={makePool(cards)} trainingPoints={1} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /練習賽/ })).toBeDisabled()
  })

  it('keeps 確認本週訓練 disabled until at least one card is selected', () => {
    const cards = [makeCard({ id: 'a', kind: 'rest', attribute: null })]
    render(
      <TrainingCardPoolScreen pool={makePool(cards)} trainingPoints={10} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '確認本週訓練' })).toBeDisabled()
  })

  it('calls onConfirm with a plain teamTraining selection and no sub-choice required', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const card = makeCard({ id: 'a', attribute: 'three' })
    render(
      <TrainingCardPoolScreen pool={makePool([card])} trainingPoints={10} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={onConfirm} />,
    )
    await user.click(screen.getByRole('button', { name: /三分/ }))
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))
    expect(onConfirm).toHaveBeenCalledWith([{ card }])
  })

  it('requires a player and attribute before confirming an individualTraining card', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const card = makeCard({ id: 'a', kind: 'individualTraining', attribute: null })
    render(
      <TrainingCardPoolScreen pool={makePool([card])} trainingPoints={10} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={onConfirm} />,
    )
    await user.click(screen.getByRole('button', { name: /個別訓練/ }))
    expect(screen.getByRole('button', { name: '確認本週訓練' })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('a-player'), players[0].id)
    expect(screen.getByRole('button', { name: '確認本週訓練' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'IQ' }))
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))
    expect(onConfirm).toHaveBeenCalledWith([{ card, playerId: players[0].id, attribute: 'iq' }])
  })

  it('requires a strength before confirming a practiceMatch card', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const card = makeCard({ id: 'a', kind: 'practiceMatch', attribute: null })
    render(
      <TrainingCardPoolScreen pool={makePool([card])} trainingPoints={10} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={onConfirm} />,
    )
    await user.click(screen.getByRole('button', { name: /練習賽/ }))
    expect(screen.getByRole('button', { name: '確認本週訓練' })).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: /弱校|中堅|名門|籃球名校/ })[0])
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))
    expect(onConfirm).toHaveBeenCalledWith([{ card, strength: 'weak' }])
  })

  it('resets the selection after confirming', async () => {
    const user = userEvent.setup()
    const card = makeCard({ id: 'a', kind: 'rest', attribute: null })
    render(
      <TrainingCardPoolScreen pool={makePool([card])} trainingPoints={10} maxTrainingPoints={10} players={players} opponentNames={opponentNames} onConfirm={() => {}} />,
    )
    const cardButton = screen.getByRole('button', { name: /休養/ })
    await user.click(cardButton)
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))
    expect(cardButton).not.toHaveClass('training-card-pool__card--selected')
  })
})

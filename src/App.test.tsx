import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { REGIONS, SUFFIXES } from './domain/opponentName'
import { OPPONENT_TIERS } from './domain/opponentTier'

const OPPONENT_NAME_PATTERN = new RegExp(`(${REGIONS.join('|')})(${SUFFIXES.join('|')})`)
const OPPONENT_TIER_PATTERN = new RegExp(`^(${OPPONENT_TIERS.join('|')})$`)

async function buildTeam(user: ReturnType<typeof userEvent.setup>, seed?: string) {
  render(<App />)
  await user.clear(screen.getByLabelText('教練名稱'))
  await user.type(screen.getByLabelText('教練名稱'), '山田')
  if (seed) {
    await user.type(screen.getByLabelText('種子碼(選填)'), seed)
  }
  await user.click(screen.getByRole('button', { name: '建隊' }))
}

// Opens the 訓練 panel once, then trains repeatedly by clicking 照常執行 (the panel
// stays open across weeks, so only the first click needs to open it).
async function trainRepeatedly(user: ReturnType<typeof userEvent.setup>, times: number) {
  await user.click(screen.getByRole('button', { name: '訓練' }))
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: /照常執行/ }))
  }
}

describe('App', () => {
  it('lets the player name the coach, then shows the generated roster', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    expect(await screen.findByText('淡水高中')).toBeInTheDocument()
    expect(screen.getByText('山田 教練')).toBeInTheDocument()

    const roster = screen.getAllByRole('button', { name: /球員/ })
    expect(roster).toHaveLength(12)
  })

  it('reproduces the same roster when the same seed code is entered again', async () => {
    async function buildWithSeed() {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await user.clear(screen.getByLabelText('教練名稱'))
      await user.type(screen.getByLabelText('教練名稱'), '山田')
      await user.type(screen.getByLabelText('種子碼(選填)'), 'same-luck')
      await user.click(screen.getByRole('button', { name: '建隊' }))
      const roster = (await screen.findAllByRole('button', { name: /球員/ })).map(
        (item) => item.textContent,
      )
      unmount()
      return roster
    }

    const first = await buildWithSeed()
    const second = await buildWithSeed()
    expect(first).toEqual(second)
  })

  it('advances the week and reports the result after a training week', async () => {
    const user = userEvent.setup()
    await buildTeam(user)
    await screen.findByText('第 1 年 第 1 週')

    await user.click(screen.getByRole('button', { name: '訓練' }))
    await user.selectOptions(screen.getByLabelText('訓練重點'), '三分')
    await user.click(screen.getByRole('button', { name: /照常執行/ }))

    expect(await screen.findByText('第 1 年 第 2 週')).toBeInTheDocument()
    expect(screen.getByText('本週訓練重點:三分(照常執行)')).toBeInTheDocument()
  })

  it('switches to the season match screen once the offseason ends, replacing the train/practice panel', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    // Fast-forward through the 26-week offseason into the season by training every week.
    await trainRepeatedly(user, 26)

    expect(await screen.findByText('資格賽')).toBeInTheDocument()
    expect(screen.getByText('第 1 / 4 戰')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '開打' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '練習賽' })).not.toBeInTheDocument()
  })

  it('plays through official season games and reports each result', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    await trainRepeatedly(user, 26)

    await screen.findByText('第 1 / 4 戰')
    await user.click(screen.getByRole('button', { name: '開打' }))

    expect(await screen.findByText('第 2 / 4 戰')).toBeInTheDocument()
  })

  it('shows a generated opponent school name for a practice match', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    await user.click(screen.getByRole('button', { name: '練習賽' }))

    expect(screen.getAllByText(OPPONENT_NAME_PATTERN).length).toBeGreaterThan(0)
  })

  it('shows a generated opponent school name and tier for an official season game', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    await trainRepeatedly(user, 26)
    await screen.findByText('第 1 / 4 戰')

    expect(screen.getByText(OPPONENT_NAME_PATTERN)).toBeInTheDocument()
    expect(screen.getByText(OPPONENT_TIER_PATTERN)).toBeInTheDocument()
  })
})

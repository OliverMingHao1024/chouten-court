import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('lets the player name their team and coach, then shows the generated roster', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    expect(await screen.findByText('頂點高中')).toBeInTheDocument()
    expect(screen.getByText('山田 教練')).toBeInTheDocument()

    const roster = screen.getAllByRole('listitem')
    expect(roster).toHaveLength(12)
  })

  it('reproduces the same roster when the same seed code is entered again', async () => {
    async function buildWithSeed() {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
      await user.type(screen.getByLabelText('教練名稱'), '山田')
      await user.type(screen.getByLabelText('種子碼(選填)'), 'same-luck')
      await user.click(screen.getByRole('button', { name: '建隊' }))
      const roster = (await screen.findAllByRole('listitem')).map((item) => item.textContent)
      unmount()
      return roster
    }

    const first = await buildWithSeed()
    const second = await buildWithSeed()
    expect(first).toEqual(second)
  })

  it('advances the week and reports the result after a training week', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))
    await screen.findByText('第 1 年 第 1 週')

    await user.click(screen.getByRole('radio', { name: '訓練' }))
    await user.selectOptions(screen.getByLabelText('訓練重點'), '三分')
    await user.click(screen.getByRole('button', { name: '執行這一週' }))

    expect(await screen.findByText('第 1 年 第 2 週')).toBeInTheDocument()
    expect(screen.getByText('本週訓練重點:三分')).toBeInTheDocument()
  })

  it('switches to the season match screen once the offseason ends, replacing the train/practice form', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    // Fast-forward through the 26-week offseason into the season by training every week.
    for (let i = 0; i < 26; i++) {
      await user.click(screen.getByRole('button', { name: '執行這一週' }))
    }

    expect(await screen.findByText('資格賽')).toBeInTheDocument()
    expect(screen.getByText('第 1 / 4 戰')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '開打' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: '練習賽' })).not.toBeInTheDocument()
  })

  it('plays through official season games and reports each result', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('球隊名稱'), '頂點高中')
    await user.type(screen.getByLabelText('教練名稱'), '山田')
    await user.click(screen.getByRole('button', { name: '建隊' }))

    for (let i = 0; i < 26; i++) {
      await user.click(screen.getByRole('button', { name: '執行這一週' }))
    }

    await screen.findByText('第 1 / 4 戰')
    await user.click(screen.getByRole('button', { name: '開打' }))

    expect(await screen.findByText('第 2 / 4 戰')).toBeInTheDocument()
  })
})

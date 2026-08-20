import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { getCalendarPosition } from './domain/calendar'
import { simulateOfficialGame } from './domain/officialMatch'
import { REGIONS, SUFFIXES } from './domain/opponentName'
import { OPPONENT_TIERS } from './domain/opponentTier'
import { createInitialRoster, ROSTER_SIZE } from './domain/roster'
import { SAVE_FORMAT_VERSION, SAVE_STORAGE_KEY } from './domain/saveData'
import { ATTRIBUTE_KEYS, type AttributeSet } from './domain/types'

const OPPONENT_NAME_PATTERN = new RegExp(`(${REGIONS.join('|')})(${SUFFIXES.join('|')})`)
const OPPONENT_TIER_PATTERN = new RegExp(`^(${OPPONENT_TIERS.join('|')})$`)

// week 143 = year 3, week-of-year 47: the last (2nd) final4 game of the team's 3rd
// and final year with this cohort, with the semifinal (game 0, week 142) already won.
const LAST_YEAR3_FINAL4_WEEK = 143

function seedSaveAtGraduationEve() {
  expect(getCalendarPosition(LAST_YEAR3_FINAL4_WEEK)).toEqual({ year: 3, weekOfYear: 47 })
  const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3 }))
  window.localStorage.setItem(
    SAVE_STORAGE_KEY,
    JSON.stringify({
      version: SAVE_FORMAT_VERSION,
      teamName: '淡水高中',
      coachName: '山田',
      seed: 1,
      totalWeek: LAST_YEAR3_FINAL4_WEEK,
      players,
      lastResult: null,
      practiceMatchTotalWeeks: [],
      seasonGameLog: [{ totalWeek: LAST_YEAR3_FINAL4_WEEK - 1, phase: 'final4', outcome: 'win' }],
      reputation: 50,
      graduateLog: [],
      recruitingCandidates: null,
      careerLog: [],
      eraCount: 0,
      pendingSeasonSummary: null,
      careerEnded: null,
    }),
  )
}

async function buildTeam(user: ReturnType<typeof userEvent.setup>, seed?: string) {
  const rendered = render(<App />)
  await user.clear(screen.getByLabelText('教練名稱'))
  await user.type(screen.getByLabelText('教練名稱'), '山田')
  if (seed) {
    await user.type(screen.getByLabelText('種子碼(選填)'), seed)
  }
  await user.click(screen.getByRole('button', { name: '建隊' }))
  return rendered
}

// A ~25% chance random event can appear on any offseason week instead of the
// train/practice panel; resolve it (any choice) so tests can reach the screen they expect.
async function resolveLeadingEvents(user: ReturnType<typeof userEvent.setup>) {
  let choice = document.querySelector<HTMLButtonElement>('.event-card__choice')
  while (choice) {
    await user.click(choice)
    choice = document.querySelector<HTMLButtonElement>('.event-card__choice')
  }
}

// Advances exactly `times` weeks by training (照常執行) every week, transparently
// resolving any random event that appears instead of the train/practice panel on a
// given week (an event still consumes that week, same as training does).
async function trainRepeatedly(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    const eventChoice = document.querySelector<HTMLButtonElement>('.event-card__choice')
    if (eventChoice) {
      await user.click(eventChoice)
      continue
    }
    // Each risk tier now renders two buttons (run now / add to plan); the run-now
    // button is the one whose accessible name also shows the success rate.
    if (!screen.queryByRole('button', { name: /照常執行/ })) {
      await user.click(screen.getByRole('button', { name: '訓練' }))
    }
    await user.click(screen.getByRole('button', { name: /照常執行/ }))
  }
}

describe('App', () => {
  it('lets the player name the coach, then shows the generated roster', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    expect(await screen.findByText('淡水高中')).toBeInTheDocument()
    expect(screen.getByText(/山田 教練/)).toBeInTheDocument()

    const roster = document.querySelectorAll('.roster-tile')
    expect(roster).toHaveLength(12)
  })

  it('reproduces the same roster when the same seed code is entered again', async () => {
    async function buildWithSeed() {
      window.localStorage.clear()
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await user.clear(screen.getByLabelText('教練名稱'))
      await user.type(screen.getByLabelText('教練名稱'), '山田')
      await user.type(screen.getByLabelText('種子碼(選填)'), 'same-luck')
      await user.click(screen.getByRole('button', { name: '建隊' }))
      await screen.findByText('淡水高中')
      const roster = Array.from(document.querySelectorAll('.roster-tile')).map((item) => item.textContent)
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
    await resolveLeadingEvents(user)

    await user.click(screen.getByRole('button', { name: '訓練' }))
    await user.selectOptions(screen.getByLabelText('訓練重點'), '三分')
    await user.click(screen.getByRole('button', { name: /照常執行/ }))

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
    await resolveLeadingEvents(user)

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

  it('persists progress to localStorage and restores it on a fresh mount (e.g. a page reload)', async () => {
    const user = userEvent.setup()
    const { unmount } = await buildTeam(user)
    await trainRepeatedly(user, 1)
    await screen.findByText('第 1 年 第 2 週')
    unmount()

    render(<App />)

    expect(await screen.findByText('第 1 年 第 2 週')).toBeInTheDocument()
    expect(screen.queryByLabelText('教練名稱')).not.toBeInTheDocument()
  })

  it('starts a new game and wipes the save after confirming "重新開始"', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const { unmount } = await buildTeam(user)

    await user.click(screen.getByRole('button', { name: '重新開始' }))

    expect(await screen.findByLabelText('教練名稱')).toBeInTheDocument()
    unmount()

    render(<App />)
    expect(await screen.findByLabelText('教練名稱')).toBeInTheDocument()
  })

  it('keeps the current game when "重新開始" is not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    await buildTeam(user)

    await user.click(screen.getByRole('button', { name: '重新開始' }))

    expect(screen.queryByLabelText('教練名稱')).not.toBeInTheDocument()
    expect(screen.getByText('淡水高中')).toBeInTheDocument()
  })

  it('graduates the whole roster and requires recruiting to fill the roster at the end of the 3rd year', async () => {
    seedSaveAtGraduationEve()
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('第 2 / 2 戰')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '開打' }))

    expect(await screen.findByText(/畢業 12 人/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: `招生 — 選出 ${ROSTER_SIZE} 名新生` })).toBeInTheDocument()
    // the graduated roster is gone until recruiting fills it back up
    expect(document.querySelectorAll('.roster-tile')).toHaveLength(0)

    const candidateButtons = document.querySelectorAll<HTMLButtonElement>('.recruiting-card__candidate')
    for (let i = 0; i < ROSTER_SIZE; i++) {
      await user.click(candidateButtons[i])
    }
    await user.click(screen.getByRole('button', { name: '確認名單' }))

    expect(screen.queryByRole('heading', { name: `招生 — 選出 ${ROSTER_SIZE} 名新生` })).not.toBeInTheDocument()
    expect(await screen.findByText('第 4 年 第 1 週')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '訓練' })).toBeInTheDocument()
  })

  it('ends the career and shows the champion summary when the team wins the final4 final', async () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))

    // find a `teamSeed` (= save.seed + LAST_YEAR3_FINAL4_WEEK) that resolves the deciding
    // final4 game as a win, so the semifinal-win-already-logged scenario ends in a championship.
    let engineSeed = 0
    while (simulateOfficialGame(players, 'final4', engineSeed).outcome !== 'win') engineSeed++

    window.localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        version: SAVE_FORMAT_VERSION,
        teamName: '淡水高中',
        coachName: '山田',
        seed: engineSeed - LAST_YEAR3_FINAL4_WEEK,
        totalWeek: LAST_YEAR3_FINAL4_WEEK,
        players,
        lastResult: null,
        practiceMatchTotalWeeks: [],
        seasonGameLog: [{ totalWeek: LAST_YEAR3_FINAL4_WEEK - 1, phase: 'final4', outcome: 'win' }],
        reputation: 50,
        graduateLog: [],
        recruitingCandidates: null,
        careerLog: [],
        eraCount: 0,
        pendingSeasonSummary: null,
        careerEnded: null,
      }),
    )

    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('第 2 / 2 戰')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '開打' }))

    expect(await screen.findByText('恭喜奪冠!教練生涯圓滿落幕')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '開始新生涯' })).toBeInTheDocument()
    // graduation/recruiting is skipped once the career is already over
    expect(screen.queryByRole('heading', { name: `招生 — 選出 ${ROSTER_SIZE} 名新生` })).not.toBeInTheDocument()
  })

  it('forces the career to end once the insurance cap of eras is reached, without champion', async () => {
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3 }))
    window.localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        version: SAVE_FORMAT_VERSION,
        teamName: '淡水高中',
        coachName: '山田',
        seed: 1,
        totalWeek: LAST_YEAR3_FINAL4_WEEK,
        players,
        lastResult: null,
        practiceMatchTotalWeeks: [],
        seasonGameLog: [{ totalWeek: LAST_YEAR3_FINAL4_WEEK - 1, phase: 'final4', outcome: 'loss' }],
        reputation: 50,
        graduateLog: [],
        recruitingCandidates: null,
        careerLog: [],
        eraCount: 5,
        pendingSeasonSummary: null,
        careerEnded: null,
      }),
    )

    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('第 2 / 2 戰')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '開打' }))

    expect(await screen.findByText('教練生涯屆滿,未能奪冠')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: `招生 — 選出 ${ROSTER_SIZE} 名新生` })).not.toBeInTheDocument()
  })

  // 匯出/匯入存檔 UI 目前先隱藏(見 SaveControls.tsx 的 EXPORT_IMPORT_ENABLED),
  // 這裡先跳過對應測試;恢復功能時記得一併恢復這個測試。
  it.skip('rejects an import with an invalid save file and keeps the current game', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    const user = userEvent.setup()
    await buildTeam(user)

    const badFile = new File(['not valid json'], 'save.json', { type: 'application/json' })
    const fileInput = document.querySelector('.save-controls__file-input') as HTMLInputElement
    await user.upload(fileInput, badFile)

    expect(window.alert).toHaveBeenCalled()
    expect(screen.getByText('淡水高中')).toBeInTheDocument()
  })
})

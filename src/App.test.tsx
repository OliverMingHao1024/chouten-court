import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { getCalendarPosition } from './domain/calendar'
import { INSURANCE_MAX_ERAS } from './domain/career'
import { simulateOfficialGame } from './domain/officialMatch'
import { generateOpponentAce, opponentAceEraIndex } from './domain/opponentAce'
import { REGIONS, SUFFIXES } from './domain/opponentName'
import { OPPONENT_TIERS } from './domain/opponentTier'
import { hashSeed } from './domain/rng'
import { createInitialRoster, ROSTER_SIZE } from './domain/roster'
import { SAVE_FORMAT_VERSION, SAVE_STORAGE_KEY } from './domain/saveData'
import { DEFAULT_TACTICS } from './domain/tactics'
import type { PoolCard } from './domain/trainingCardPool'
import { ATTRIBUTE_KEYS, type AttributeSet } from './domain/types'

const OPPONENT_NAME_PATTERN = new RegExp(`(${REGIONS.join('|')})(${SUFFIXES.join('|')})`)
const OPPONENT_TIER_PATTERN = new RegExp(`^(${OPPONENT_TIERS.join('|')})$`)

// week 143 = year 3, week-of-year 47: the last (2nd) final4 game of the team's 3rd
// and final year with this cohort, with the semifinal (game 0, week 142) already won.
const LAST_YEAR3_FINAL4_WEEK = 143

function baseSaveData(overrides: Record<string, unknown> = {}) {
  return {
    version: SAVE_FORMAT_VERSION,
    teamName: '淡水高中',
    coachName: '山田',
    seed: 1,
    totalWeek: 1,
    players: createInitialRoster(1),
    lastResult: null,
    seasonGameLog: [],
    cardPool: { cards: [], nextCardId: 0 },
    trainingPoints: 10,
    reputation: 50,
    graduateLog: [],
    recruitingCandidates: null,
    careerLog: [],
    eraCount: 0,
    pendingSeasonSummary: null,
    careerEnded: null,
    lastLineup: null,
    rivals: [],
    schoolAssets: [],
    ...overrides,
  }
}

function seedSaveWithCard(card: PoolCard, extra: Record<string, unknown> = {}) {
  window.localStorage.setItem(
    SAVE_STORAGE_KEY,
    JSON.stringify(baseSaveData({ cardPool: { cards: [card], nextCardId: 1 }, ...extra })),
  )
}

function seedSaveAtGraduationEve() {
  expect(getCalendarPosition(LAST_YEAR3_FINAL4_WEEK)).toEqual({ year: 3, weekOfYear: 47 })
  const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3 }))
  window.localStorage.setItem(
    SAVE_STORAGE_KEY,
    JSON.stringify(
      baseSaveData({
        totalWeek: LAST_YEAR3_FINAL4_WEEK,
        players,
        seasonGameLog: [{ totalWeek: LAST_YEAR3_FINAL4_WEEK - 1, phase: 'final4', outcome: 'win' }],
      }),
    ),
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
// training-card panel; resolve it (any choice) so tests can reach the screen they expect.
async function resolveLeadingEvents(user: ReturnType<typeof userEvent.setup>) {
  let choice = document.querySelector<HTMLButtonElement>('.event-card__choice')
  while (choice) {
    await user.click(choice)
    choice = document.querySelector<HTMLButtonElement>('.event-card__choice')
  }
}

// Picks the first affordable card in this week's training pool (up to MAX_CARDS_PER_WEEK is
// not exercised here; one card is enough to advance a week) and confirms it, filling in
// whichever sub-choice the card needs (individual training: player + attribute; practice
// match: strength). Assumes the training-card panel (not an event or match) is showing.
async function advanceOneCardWeek(user: ReturnType<typeof userEvent.setup>) {
  const cardButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.training-card-pool__card'))
  const affordable = cardButtons.find((button) => !button.disabled)
  if (!affordable) throw new Error('no affordable training card this week')
  await user.click(affordable)

  const playerSelect = document.querySelector<HTMLSelectElement>('.training-card-pool__sub-choice select')
  if (playerSelect) {
    await user.selectOptions(playerSelect, playerSelect.options[1].value)
    await user.click(document.querySelectorAll<HTMLButtonElement>('.training-card-pool__attribute-button')[0])
  }
  const strengthButtons = document.querySelectorAll<HTMLButtonElement>('.training-card-pool__option')
  if (strengthButtons.length > 0) await user.click(strengthButtons[0])

  await user.click(screen.getByRole('button', { name: '確認本週訓練' }))
}

// Advances exactly `times` weeks, transparently resolving any random event that appears
// instead of the training-card panel on a given week (an event still consumes that week,
// same as a training card does).
async function advanceWeeksRepeatedly(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    const eventChoice = document.querySelector<HTMLButtonElement>('.event-card__choice')
    if (eventChoice) {
      await user.click(eventChoice)
      continue
    }
    await advanceOneCardWeek(user)
  }
}

// Clicking 開打 enters the quarter-by-quarter key-moment screen instead of resolving the
// game immediately; "快速結果" skips straight to the final result. The week only actually
// advances once the coach confirms the resulting game-summary dialog via "繼續".
async function playOutTheGame(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '開打' }))
  // React flushes the key-moment screen's chained auto-advance effects synchronously, so by
  // the time the click above resolves the game may already be fully decided (no key moment
  // was close enough to trigger a decision) and the skip button will already be gone.
  const skipButton = screen.queryByRole('button', { name: /快速結果/ })
  if (skipButton) await user.click(skipButton)
  await confirmGameSummary(user)
}

async function confirmGameSummary(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '繼續' }))
}

describe('App', () => {
  it('lets the player name the coach, then shows the generated roster', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    expect(await screen.findByText('淡水高中')).toBeInTheDocument()
    expect(screen.getByText(/山田 教練/)).toBeInTheDocument()

    // The roster is collapsed by default; the HUD's "名冊" toggle reveals it.
    await user.click(screen.getByRole('button', { name: '名冊' }))
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
      await user.click(screen.getByRole('button', { name: '名冊' }))
      const roster = Array.from(document.querySelectorAll('.roster-tile')).map((item) => item.textContent)
      unmount()
      return roster
    }

    const first = await buildWithSeed()
    const second = await buildWithSeed()
    expect(first).toEqual(second)
  })

  it('shows the schedule strip counting down to the season opener from week 1', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    expect(screen.getByText('距離下一場正式賽 26 週')).toBeInTheDocument()
    expect(screen.getByText('本週')).toBeInTheDocument()
    expect(screen.getAllByText('未知').length).toBeGreaterThan(0)
  })

  it('advances the week and reports the result after a team-training card', async () => {
    seedSaveWithCard({ id: 'card-1', kind: 'teamTraining', attribute: 'three', age: 0 })
    const user = userEvent.setup()
    render(<App />)
    await resolveLeadingEvents(user)

    await user.click(screen.getByRole('button', { name: /三分/ }))
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))

    expect(screen.getByText(/全隊訓練·三分/)).toBeInTheDocument()
    expect(await screen.findByText('本週訓練結果')).toBeInTheDocument()
  })

  it('advances the week and reports the result after a rest card', async () => {
    seedSaveWithCard({ id: 'card-1', kind: 'rest', attribute: null, age: 0 })
    const user = userEvent.setup()
    render(<App />)
    await resolveLeadingEvents(user)

    await user.click(screen.getByRole('button', { name: /休養/ }))
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))

    expect(screen.getByText(/全隊休養/)).toBeInTheDocument()
  })

  it('advances the week and reports the result after an individualTraining card', async () => {
    seedSaveWithCard({ id: 'card-1', kind: 'individualTraining', attribute: null, age: 0 })
    const user = userEvent.setup()
    render(<App />)
    await resolveLeadingEvents(user)

    await user.click(screen.getByRole('button', { name: /個別訓練/ }))
    const playerSelect = screen.getByRole('combobox')
    await user.selectOptions(playerSelect, (playerSelect as HTMLSelectElement).options[1].value)
    await user.click(screen.getByRole('button', { name: '神射手' }))
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))

    expect(screen.getByText(/個別訓練:.*神射手/)).toBeInTheDocument()
  })

  it('advances the week and reports the result after a practiceMatch card', async () => {
    seedSaveWithCard({ id: 'card-1', kind: 'practiceMatch', attribute: null, age: 0 })
    const user = userEvent.setup()
    render(<App />)
    await resolveLeadingEvents(user)

    await user.click(screen.getByRole('button', { name: /練習賽/ }))
    expect(screen.getAllByText(OPPONENT_NAME_PATTERN).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: /弱校|中堅|名門|籃球名校/ })[0])
    await user.click(screen.getByRole('button', { name: '確認本週訓練' }))

    expect(screen.getByText(/練習賽:(獲勝|落敗)/)).toBeInTheDocument()
  })

  it('shows an event reveal dialog explaining the outcome once a random event is resolved', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    let eventChoice = document.querySelector<HTMLButtonElement>('.event-card__choice')
    for (let i = 0; i < 26 && !eventChoice; i++) {
      await advanceOneCardWeek(user)
      eventChoice = document.querySelector<HTMLButtonElement>('.event-card__choice')
    }
    expect(eventChoice).not.toBeNull()

    await user.click(eventChoice!)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText(/成功|失敗/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '關閉' })).toBeInTheDocument()

    // The week already advanced when the choice was made (non-blocking reveal): closing
    // the dialog does not gate progress, unlike the official-game summary dialog's "繼續".
    await user.click(screen.getByRole('button', { name: '關閉' }))
    expect(dialog).not.toHaveAttribute('open')
  })

  it('switches to the season match screen once the offseason ends, replacing the training-card panel', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    // Fast-forward through the 26-week offseason into the season.
    await advanceWeeksRepeatedly(user, 26)

    expect(await screen.findByText('資格賽')).toBeInTheDocument()
    expect(screen.getByText('第 1 / 4 戰')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '開打' })).toBeInTheDocument()
    expect(document.querySelector('.training-card-pool')).not.toBeInTheDocument()
  })

  it('plays through official season games and reports each result', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    await advanceWeeksRepeatedly(user, 26)

    await screen.findByText('第 1 / 4 戰')
    await playOutTheGame(user)

    expect(await screen.findByText('第 2 / 4 戰')).toBeInTheDocument()
  })

  it('shows a generated opponent school name and tier for an official season game', async () => {
    const user = userEvent.setup()
    await buildTeam(user)

    await advanceWeeksRepeatedly(user, 26)
    await screen.findByText('第 1 / 4 戰')

    expect(screen.getByText(OPPONENT_NAME_PATTERN)).toBeInTheDocument()
    expect(screen.getByText(OPPONENT_TIER_PATTERN)).toBeInTheDocument()
  })

  it('persists progress to localStorage and restores it on a fresh mount (e.g. a page reload)', async () => {
    const user = userEvent.setup()
    const { unmount } = await buildTeam(user)
    await advanceWeeksRepeatedly(user, 1)
    await screen.findByText(/^第 1 年 第 2 週/)
    unmount()

    render(<App />)

    expect(await screen.findByText(/^第 1 年 第 2 週/)).toBeInTheDocument()
    expect(screen.queryByLabelText('教練名稱')).not.toBeInTheDocument()
  })

  it('starts a new game and wipes the save after confirming "重新開始"', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const { unmount } = await buildTeam(user)

    await user.click(screen.getByRole('button', { name: '更多選項' }))
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

    await user.click(screen.getByRole('button', { name: '更多選項' }))
    await user.click(screen.getByRole('button', { name: '重新開始' }))

    expect(screen.queryByLabelText('教練名稱')).not.toBeInTheDocument()
    expect(screen.getByText('淡水高中')).toBeInTheDocument()
  })

  it('graduates the whole roster and requires recruiting to fill the roster at the end of the 3rd year', async () => {
    seedSaveAtGraduationEve()
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('第 2 / 2 戰')).toBeInTheDocument()
    await playOutTheGame(user)

    expect(await screen.findByText(/畢業 12 人/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: `招生 — 選出 ${ROSTER_SIZE} 名新生` })).toBeInTheDocument()
    // the graduated roster is gone until recruiting fills it back up
    await user.click(screen.getByRole('button', { name: '名冊' }))
    expect(document.querySelectorAll('.roster-tile')).toHaveLength(0)

    const candidateButtons = document.querySelectorAll<HTMLButtonElement>('.recruiting-card__candidate')
    for (let i = 0; i < ROSTER_SIZE; i++) {
      await user.click(candidateButtons[i])
    }
    await user.click(screen.getByRole('button', { name: '確認名單' }))

    expect(screen.queryByRole('heading', { name: `招生 — 選出 ${ROSTER_SIZE} 名新生` })).not.toBeInTheDocument()
    expect(await screen.findByText(/^第 4 年 第 1 週/)).toBeInTheDocument()
    expect(document.querySelector('.training-card-pool')).toBeInTheDocument()
  })

  it('ends the career and shows the champion summary when the team wins the final4 final', async () => {
    const maxAttributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, 99])) as AttributeSet
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3, attributes: maxAttributes }))

    // find a `teamSeed` (= save.seed + LAST_YEAR3_FINAL4_WEEK) that resolves the deciding
    // final4 game as a win, so the semifinal-win-already-logged scenario ends in a championship.
    // The opponent ace is derived purely from (team seed, career year) — year is always 3 here
    // (fixed by LAST_YEAR3_FINAL4_WEEK), so it must be recomputed for each candidate team seed.
    const aceEraIndex = opponentAceEraIndex(getCalendarPosition(LAST_YEAR3_FINAL4_WEEK).year)
    const lineup = {
      starters: players.slice(0, 5).map((p) => p.id),
      rotation: players.slice(5, 8).map((p) => p.id),
    }
    let engineSeed = 0
    let teamSeed = engineSeed - LAST_YEAR3_FINAL4_WEEK
    let opponentAce = generateOpponentAce(hashSeed(`${teamSeed}-ace-${aceEraIndex}`))
    while (
      simulateOfficialGame(players, 'final4', engineSeed, DEFAULT_TACTICS, opponentAce, lineup).outcome !== 'win'
    ) {
      engineSeed++
      teamSeed = engineSeed - LAST_YEAR3_FINAL4_WEEK
      opponentAce = generateOpponentAce(hashSeed(`${teamSeed}-ace-${aceEraIndex}`))
    }

    window.localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify(
        baseSaveData({
          seed: teamSeed,
          totalWeek: LAST_YEAR3_FINAL4_WEEK,
          players,
          seasonGameLog: [{ totalWeek: LAST_YEAR3_FINAL4_WEEK - 1, phase: 'final4', outcome: 'win' }],
        }),
      ),
    )

    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('第 2 / 2 戰')).toBeInTheDocument()
    await playOutTheGame(user)

    expect(await screen.findByText('恭喜奪冠!教練生涯圓滿落幕')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '開始新生涯' })).toBeInTheDocument()
    // graduation/recruiting is skipped once the career is already over
    expect(screen.queryByRole('heading', { name: `招生 — 選出 ${ROSTER_SIZE} 名新生` })).not.toBeInTheDocument()
  })

  it('forces the career to end once the insurance cap of eras is reached, without champion', async () => {
    const players = createInitialRoster(1).map((p) => ({ ...p, grade: 3 }))
    window.localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify(
        baseSaveData({
          totalWeek: LAST_YEAR3_FINAL4_WEEK,
          players,
          seasonGameLog: [{ totalWeek: LAST_YEAR3_FINAL4_WEEK - 1, phase: 'final4', outcome: 'loss' }],
          eraCount: INSURANCE_MAX_ERAS - 1,
        }),
      ),
    )

    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('第 2 / 2 戰')).toBeInTheDocument()
    await playOutTheGame(user)

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

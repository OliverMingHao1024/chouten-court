import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { isKeyMomentTrigger } from '../../domain/keyMoments'
import { STARTER_COUNT, ROTATION_COUNT, type GameLineup } from '../../domain/lineup'
import { setupOfficialGameQuarters } from '../../domain/officialMatch'
import { QUARTER_COUNT, simulateOneQuarter, sumQuarters } from '../../domain/quarterSimulation'
import { createInitialRoster } from '../../domain/roster'
import { DEFAULT_TACTICS } from '../../domain/tactics'
import { ATTRIBUTE_KEYS, type AttributeSet, type Player } from '../../domain/types'
import { KeyMomentGameScreen } from './KeyMomentGameScreen'

const testAce = { name: '測試王牌', scoring: 70, shooting: 60 }

function withUniformAttributes(roster: Player[], value: number): Player[] {
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as AttributeSet
  return roster.map((player) => ({ ...player, attributes }))
}

function fullLineup(roster: Player[]): GameLineup {
  return {
    starters: roster.slice(0, STARTER_COUNT).map((p) => p.id),
    rotation: roster.slice(STARTER_COUNT, STARTER_COUNT + ROTATION_COUNT).map((p) => p.id),
  }
}

const roster = createInitialRoster(1)
const lineup = fullLineup(roster)

/** Finds a seed whose 1st quarter (played with the neutral modifier) ends close enough to trigger a decision. */
function findSeedWithFirstQuarterDecision(): number {
  for (let seed = 0; seed < 2000; seed++) {
    const setup = setupOfficialGameQuarters(roster, 'qualifying', seed, DEFAULT_TACTICS, testAce, lineup)
    const quarter = simulateOneQuarter(setup.teamStrength, setup.opponentStrength, setup.varianceRange, setup.rng)
    if (isKeyMomentTrigger(0, sumQuarters([quarter]))) return seed
  }
  throw new Error('no seed found with a first-quarter decision within the search budget')
}

describe('KeyMomentGameScreen', () => {
  it('shows the opponent name and starts revealing quarters', () => {
    render(
      <KeyMomentGameScreen
        roster={roster}
        phase="qualifying"
        seed={1}
        tactics={DEFAULT_TACTICS}
        opponentAce={testAce}
        opponentName="測試高中"
        lineup={lineup}
        onComplete={vi.fn()}
      />,
    )
    expect(screen.getByText(/測試高中/)).toBeInTheDocument()
    expect(screen.getByLabelText('逐節比分').children.length).toBeGreaterThan(0)
  })

  it('completes on its own (no clicks) for a blowout matchup with no close key moment', () => {
    const onComplete = vi.fn()
    const strongRoster = withUniformAttributes(roster, 99)
    render(
      <KeyMomentGameScreen
        roster={strongRoster}
        phase="qualifying"
        seed={1}
        tactics={DEFAULT_TACTICS}
        opponentAce={testAce}
        opponentName="測試高中"
        lineup={fullLineup(strongRoster)}
        onComplete={onComplete}
      />,
    )
    expect(onComplete).toHaveBeenCalledOnce()
    const result = onComplete.mock.calls[0][0]
    expect(result.boxScore.quarters).toHaveLength(4)
    expect(result.outcome).toBe('win')
  })

  it('shows a decision prompt with 4 options at a close key moment, and resolves it on click', async () => {
    const user = userEvent.setup()
    const seed = findSeedWithFirstQuarterDecision()
    const onComplete = vi.fn()
    render(
      <KeyMomentGameScreen
        roster={roster}
        phase="qualifying"
        seed={seed}
        tactics={DEFAULT_TACTICS}
        opponentAce={testAce}
        opponentName="測試高中"
        lineup={lineup}
        onComplete={onComplete}
      />,
    )

    const decision = screen.getByRole('group', { name: '關鍵回合決策' })
    const options = within(decision).getAllByRole('button')
    expect(options).toHaveLength(4)
    const quartersShownBefore = screen.getByLabelText('逐節比分').children.length

    await user.click(options[0])

    // Resolving the decision always plays the next quarter (whether or not another close
    // key moment immediately follows it with a fresh decision prompt).
    expect(screen.getByLabelText('逐節比分').children.length).toBeGreaterThan(quartersShownBefore)
  })

  it('lets the coach skip straight to the final result at any point', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <KeyMomentGameScreen
        roster={roster}
        phase="qualifying"
        seed={findSeedWithFirstQuarterDecision()}
        tactics={DEFAULT_TACTICS}
        opponentAce={testAce}
        opponentName="測試高中"
        lineup={lineup}
        onComplete={onComplete}
      />,
    )

    await user.click(screen.getByRole('button', { name: /快速結果/ }))
    expect(onComplete).toHaveBeenCalledOnce()
    const result = onComplete.mock.calls[0][0]
    expect(result.boxScore.quarters).toHaveLength(4)
    expect(result.boxScore.final.us === result.boxScore.final.them).toBe(false)
  })

  it('produces the exact same result as skipping when the coach always picks 交給球員自由發揮 (the neutral option)', async () => {
    const seed = findSeedWithFirstQuarterDecision()

    const skipOnComplete = vi.fn()
    const skipRender = render(
      <KeyMomentGameScreen
        roster={roster}
        phase="qualifying"
        seed={seed}
        tactics={DEFAULT_TACTICS}
        opponentAce={testAce}
        opponentName="測試高中"
        lineup={lineup}
        onComplete={skipOnComplete}
      />,
    )
    await userEvent.setup().click(within(skipRender.container).getByRole('button', { name: /快速結果/ }))
    skipRender.unmount()

    const autoOnComplete = vi.fn()
    const user2 = userEvent.setup()
    const autoRender = render(
      <KeyMomentGameScreen
        roster={roster}
        phase="qualifying"
        seed={seed}
        tactics={DEFAULT_TACTICS}
        opponentAce={testAce}
        opponentName="測試高中"
        lineup={lineup}
        onComplete={autoOnComplete}
      />,
    )
    // Up to 3 checkpoints (after quarters 1-3) can each trigger a fresh decision, so allow a
    // click for every checkpoint plus one spare.
    const maxDecisionClicks = QUARTER_COUNT
    for (let clicks = 0; clicks < maxDecisionClicks && autoOnComplete.mock.calls.length === 0; clicks++) {
      const button = within(autoRender.container).queryByRole('button', { name: '交給球員自由發揮' })
      if (!button) break
      // eslint-disable-next-line no-await-in-loop
      await user2.click(button)
    }

    expect(autoOnComplete).toHaveBeenCalledOnce()
    expect(autoOnComplete.mock.calls[0][0].boxScore).toEqual(skipOnComplete.mock.calls[0][0].boxScore)
  })
})

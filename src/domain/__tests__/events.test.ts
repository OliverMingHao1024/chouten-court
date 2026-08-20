import { describe, expect, it } from 'vitest'
import {
  EVENT_CARDS,
  EVENT_RISK_SUCCESS_RATE,
  EVENT_RISKS,
  EVENT_TRIGGER_CHANCE,
  fillEventTemplate,
  pickEventCard,
  resolveEventChoice,
  rollForWeeklyEvent,
} from '../events'
import { createSeededRng } from '../rng'

describe('EVENT_CARDS', () => {
  it('gives every card exactly one choice per risk tier', () => {
    EVENT_CARDS.forEach((card) => {
      const risks = card.choices.map((c) => c.risk).sort()
      expect(risks).toEqual([...EVENT_RISKS].sort())
    })
  })

  it('has a non-empty prompt and success/failure text for every choice', () => {
    EVENT_CARDS.forEach((card) => {
      expect(card.prompt.length).toBeGreaterThan(0)
      card.choices.forEach((choice) => {
        expect(choice.onSuccess.text.length).toBeGreaterThan(0)
        expect(choice.onFailure.text.length).toBeGreaterThan(0)
        expect(choice.successChance).toBeGreaterThan(0)
        expect(choice.successChance).toBeLessThanOrEqual(1)
      })
    })
  })

  it('has unique ids', () => {
    const ids = EVENT_CARDS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the standardized success rate for every risk tier, on every card', () => {
    EVENT_CARDS.forEach((card) => {
      card.choices.forEach((choice) => {
        expect(choice.successChance).toBe(EVENT_RISK_SUCCESS_RATE[choice.risk])
      })
    })
  })
})

describe('rollForWeeklyEvent', () => {
  it('triggers roughly at EVENT_TRIGGER_CHANCE across many seeds', () => {
    let triggered = 0
    const samples = 2000
    for (let seed = 0; seed < samples; seed++) {
      if (rollForWeeklyEvent(createSeededRng(seed))) triggered += 1
    }
    const rate = triggered / samples
    expect(rate).toBeGreaterThan(EVENT_TRIGGER_CHANCE - 0.05)
    expect(rate).toBeLessThan(EVENT_TRIGGER_CHANCE + 0.05)
  })
})

describe('pickEventCard', () => {
  it('always returns a card from EVENT_CARDS', () => {
    for (let seed = 0; seed < 50; seed++) {
      const card = pickEventCard(createSeededRng(seed))
      expect(EVENT_CARDS).toContain(card)
    }
  })
})

describe('fillEventTemplate', () => {
  it('replaces every {player} placeholder with the given name', () => {
    expect(fillEventTemplate('{player} 對 {player} 說話', '小明')).toBe('小明 對 小明 說話')
  })

  it('leaves text without a placeholder untouched', () => {
    expect(fillEventTemplate('沒有佔位符', '小明')).toBe('沒有佔位符')
  })
})

describe('resolveEventChoice', () => {
  const card = EVENT_CARDS[0]

  it('is deterministic for the same seed', () => {
    const a = resolveEventChoice(card, 'balanced', '小明', createSeededRng(1))
    const b = resolveEventChoice(card, 'balanced', '小明', createSeededRng(1))
    expect(a).toEqual(b)
  })

  it('fills the player name into the outcome text', () => {
    const resolution = resolveEventChoice(card, 'safe', '小明', createSeededRng(1))
    expect(resolution.text).toContain('小明')
    expect(resolution.text).not.toContain('{player}')
  })

  it('throws for a risk tier the card does not define', () => {
    const brokenCard = { ...card, choices: card.choices.filter((c) => c.risk !== 'bold') }
    expect(() => resolveEventChoice(brokenCard, 'bold', '小明', createSeededRng(1))).toThrow()
  })

  it('returns zeroed deltas when the outcome does not specify them', () => {
    // find a card/choice/outcome combination with no explicit deltas by scanning for one
    let found = false
    for (const c of EVENT_CARDS) {
      for (const choice of c.choices) {
        for (const seed of [0, 1, 2, 3, 4, 5]) {
          const resolution = resolveEventChoice(c, choice.risk, '小明', createSeededRng(seed))
          const outcome = resolution.succeeded ? choice.onSuccess : choice.onFailure
          if (
            outcome.attributeDelta === undefined &&
            outcome.fatigueDelta === undefined &&
            outcome.reputationDelta === undefined
          ) {
            expect(resolution.attributeDelta).toBe(0)
            expect(resolution.fatigueDelta).toBe(0)
            expect(resolution.reputationDelta).toBe(0)
            found = true
          }
        }
      }
    }
    expect(found).toBe(true)
  })
})

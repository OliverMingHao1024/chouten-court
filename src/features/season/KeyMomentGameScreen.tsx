import { useEffect, useRef, useState } from 'react'
import type { GameLineup } from '../../domain/lineup'
import {
  KEY_MOMENT_MODIFIERS,
  KEY_MOMENT_OPTIONS,
  KEY_MOMENT_OPTION_HINTS,
  KEY_MOMENT_OPTION_LABELS,
  isKeyMomentTrigger,
  type KeyMomentOption,
} from '../../domain/keyMoments'
import {
  resolveOfficialGameAfterQuarters,
  setupOfficialGameQuarters,
  type OfficialGameQuarterSetup,
  type OfficialGameResult,
  type OfficialPhase,
} from '../../domain/officialMatch'
import type { OpponentAce } from '../../domain/opponentAce'
import { decideOutcome, simulateOneQuarter, sumQuarters, QUARTER_COUNT, type QuarterScore } from '../../domain/quarterSimulation'
import type { GameTactics } from '../../domain/tactics'
import type { Player } from '../../domain/types'
import './KeyMomentGameScreen.css'

export interface KeyMomentGameScreenProps {
  roster: Player[]
  phase: OfficialPhase
  /** 這場比賽專屬的種子;固定不變才能讓「逐節搭配決策」跟「快速結果」共用同一套可重現模擬。 */
  seed: number
  tactics: GameTactics
  opponentAce: OpponentAce
  opponentName: string
  lineup: GameLineup
  onComplete: (result: OfficialGameResult) => void
}

/**
 * 正式賽的逐節互動畫面:一節一節模擬,分差夠接近時跳出關鍵回合決策,玩家的選擇會真的
 * 改變剩下那一節的模擬參數(疊加到 simulateOneQuarter 的 margin/variance 上),不是純敘事。
 * 玩家隨時可以按「快速結果」跳過剩餘節數與所有決策,直接拿全自動模擬的結果。
 */
export function KeyMomentGameScreen({
  roster,
  phase,
  seed,
  tactics,
  opponentAce,
  opponentName,
  lineup,
  onComplete,
}: KeyMomentGameScreenProps) {
  const setupRef = useRef<OfficialGameQuarterSetup | null>(null)
  if (!setupRef.current) {
    setupRef.current = setupOfficialGameQuarters(roster, phase, seed, tactics, opponentAce, lineup)
  }
  const setup = setupRef.current

  const [quarters, setQuarters] = useState<QuarterScore[]>([])
  const [awaitingDecisionAt, setAwaitingDecisionAt] = useState<number | null>(null)
  const completedRef = useRef(false)

  function finish(finalQuarters: QuarterScore[]) {
    if (completedRef.current) return
    completedRef.current = true
    const final = sumQuarters(finalQuarters)
    const outcome = decideOutcome(final, setup.rng)
    const result = resolveOfficialGameAfterQuarters(roster, phase, setup.rng, lineup, finalQuarters, final, outcome)
    setQuarters(finalQuarters)
    onComplete(result)
  }

  function advance(nextQuarters: QuarterScore[]) {
    if (completedRef.current) return
    if (nextQuarters.length >= QUARTER_COUNT) {
      finish(nextQuarters)
      return
    }
    setQuarters(nextQuarters)
    const quarterIndexJustPlayed = nextQuarters.length - 1
    if (isKeyMomentTrigger(quarterIndexJustPlayed, sumQuarters(nextQuarters))) {
      setAwaitingDecisionAt(quarterIndexJustPlayed)
    }
  }

  // 自動推進:沒有卡在決策上、也還沒打完 4 節時,用中性參數(不套用任何決策)模擬下一節。
  useEffect(() => {
    if (completedRef.current || awaitingDecisionAt !== null || quarters.length >= QUARTER_COUNT) return
    const quarter = simulateOneQuarter(setup.teamStrength, setup.opponentStrength, setup.varianceRange, setup.rng)
    advance([...quarters, quarter])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quarters, awaitingDecisionAt])

  function chooseOption(option: KeyMomentOption) {
    if (awaitingDecisionAt === null) return
    setAwaitingDecisionAt(null)
    const quarter = simulateOneQuarter(
      setup.teamStrength,
      setup.opponentStrength,
      setup.varianceRange,
      setup.rng,
      KEY_MOMENT_MODIFIERS[option],
    )
    advance([...quarters, quarter])
  }

  function skipToQuickResult() {
    let remaining = quarters
    while (remaining.length < QUARTER_COUNT) {
      remaining = [...remaining, simulateOneQuarter(setup.teamStrength, setup.opponentStrength, setup.varianceRange, setup.rng)]
    }
    finish(remaining)
  }

  const runningFinal = sumQuarters(quarters)

  return (
    <section className="key-moment-game">
      <p className="key-moment-game__opponent">VS {opponentName}</p>
      <p className="key-moment-game__score">
        目前比分 {runningFinal.us} - {runningFinal.them}
      </p>

      <ul className="key-moment-game__quarters" aria-label="逐節比分">
        {quarters.map((quarter, index) => (
          <li key={index}>
            <span className="key-moment-game__quarter-label">第{index + 1}節</span>
            <span className="key-moment-game__quarter-score">
              {quarter.us} - {quarter.them}
            </span>
          </li>
        ))}
      </ul>

      {awaitingDecisionAt !== null && (
        <div className="key-moment-game__decision" role="group" aria-label="關鍵回合決策">
          <p className="key-moment-game__decision-prompt">
            第 {awaitingDecisionAt + 2} 節開打前,雙方只差 {Math.abs(runningFinal.us - runningFinal.them)} 分——這節怎麼打?
          </p>
          {KEY_MOMENT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="key-moment-game__option"
              aria-label={KEY_MOMENT_OPTION_LABELS[option]}
              onClick={() => chooseOption(option)}
            >
              <span className="key-moment-game__option-label">{KEY_MOMENT_OPTION_LABELS[option]}</span>
              <span className="key-moment-game__option-hint">{KEY_MOMENT_OPTION_HINTS[option]}</span>
            </button>
          ))}
        </div>
      )}

      {quarters.length < QUARTER_COUNT && (
        <button type="button" className="key-moment-game__skip" onClick={skipToQuickResult}>
          快速結果(跳過剩餘節數與決策)
        </button>
      )}
    </section>
  )
}

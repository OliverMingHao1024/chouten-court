import { useState } from 'react'
import { getOpponentTier } from '../../domain/opponentTier'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type AttributeKey } from '../../domain/types'
import { PRACTICE_OPPONENT_STRENGTH, PRACTICE_STRENGTHS, type PracticeStrength } from '../../domain/weeklyAction'
import { TrainingResultDialog, type TrainingRollResult } from './TrainingResultDialog'
import './WeekScreen.css'

export interface WeekScreenProps {
  practiceMatchAllowed: boolean
  opponentNames: Record<PracticeStrength, string>
  onTrain: (attribute: AttributeKey) => void
  onTeamRest: () => void
  onPracticeMatch: (strength: PracticeStrength) => void
  lastResult: string | null
  trainingRollResult: TrainingRollResult | null
}

const STRENGTH_LABELS: Record<PracticeStrength, string> = {
  weak: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.weak),
  medium: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.medium),
  strong: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.strong),
}

export function WeekScreen({
  practiceMatchAllowed,
  opponentNames,
  onTrain,
  onTeamRest,
  onPracticeMatch,
  lastResult,
  trainingRollResult,
}: WeekScreenProps) {
  const [practiceOpen, setPracticeOpen] = useState(false)

  return (
    <section className="week-card">
      <TrainingResultDialog result={trainingRollResult} />
      {lastResult && <p className="result-banner week-card__result">{lastResult}</p>}

      <div className="week-card__panel">
        <p className="week-card__panel-label">訓練重點(點擊即開始訓練)</p>
        <div className="week-card__attribute-picker" role="group" aria-label="訓練重點">
          {ATTRIBUTE_KEYS.map((key) => (
            <button key={key} type="button" className="week-card__attribute-button" onClick={() => onTrain(key)}>
              {ATTRIBUTE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="week-card__entry">
        <button type="button" className="week-card__entry-button" onClick={onTeamRest}>
          全隊休養
        </button>
        <button
          type="button"
          className="week-card__entry-button"
          disabled={!practiceMatchAllowed}
          onClick={() => setPracticeOpen((open) => !open)}
        >
          練習賽
        </button>
      </div>
      {!practiceMatchAllowed && (
        <p className="week-card__hint">本週不能安排練習賽(賽季中或即將開打,請專注訓練)。</p>
      )}

      {practiceOpen && practiceMatchAllowed && (
        <div className="week-card__panel">
          <div className="week-card__options">
            {PRACTICE_STRENGTHS.map((strength) => (
              <button
                key={strength}
                type="button"
                className="week-card__option"
                onClick={() => onPracticeMatch(strength)}
              >
                <span className="week-card__option-label">{opponentNames[strength]}</span>
                <span className="week-card__option-rate">{STRENGTH_LABELS[strength]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

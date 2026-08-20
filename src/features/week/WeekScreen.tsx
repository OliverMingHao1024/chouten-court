import { useId, useState } from 'react'
import { getOpponentTier } from '../../domain/opponentTier'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type AttributeKey } from '../../domain/types'
import {
  PRACTICE_OPPONENT_STRENGTH,
  PRACTICE_STRENGTHS,
  TRAINING_INTENSITIES,
  TRAINING_INTENSITY_LABELS,
  TRAINING_SUCCESS_RATE,
  type PracticeStrength,
  type TrainingIntensity,
} from '../../domain/weeklyAction'
import { TrainingResultDialog, type TrainingRollResult } from './TrainingResultDialog'
import './WeekScreen.css'

export interface WeekScreenProps {
  practiceMatchAllowed: boolean
  opponentNames: Record<PracticeStrength, string>
  onTrain: (attribute: AttributeKey, intensity: TrainingIntensity) => void
  onPracticeMatch: (strength: PracticeStrength) => void
  lastResult: string | null
  trainingRollResult: TrainingRollResult | null
}

type Panel = 'closed' | 'train' | 'practice'

const STRENGTH_LABELS: Record<PracticeStrength, string> = {
  weak: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.weak),
  medium: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.medium),
  strong: getOpponentTier(PRACTICE_OPPONENT_STRENGTH.strong),
}

export function WeekScreen({
  practiceMatchAllowed,
  opponentNames,
  onTrain,
  onPracticeMatch,
  lastResult,
  trainingRollResult,
}: WeekScreenProps) {
  const attributeId = useId()
  const [panel, setPanel] = useState<Panel>('closed')
  const [attribute, setAttribute] = useState<AttributeKey>('three')

  return (
    <section className="week-card">
      <TrainingResultDialog result={trainingRollResult} />
      {lastResult && <p className="result-banner week-card__result">{lastResult}</p>}

      <div className="week-card__entry">
        <button
          type="button"
          className="week-card__entry-button"
          onClick={() => setPanel(panel === 'train' ? 'closed' : 'train')}
        >
          訓練
        </button>
        <button
          type="button"
          className="week-card__entry-button"
          disabled={!practiceMatchAllowed}
          onClick={() => setPanel(panel === 'practice' ? 'closed' : 'practice')}
        >
          練習賽
        </button>
      </div>
      {!practiceMatchAllowed && (
        <p className="week-card__hint">本週不能安排練習賽(賽季中或即將開打,請專注訓練)。</p>
      )}

      {panel === 'train' && (
        <div className="week-card__panel">
          <label htmlFor={attributeId}>訓練重點</label>
          <select
            id={attributeId}
            value={attribute}
            onChange={(event) => setAttribute(event.target.value as AttributeKey)}
          >
            {ATTRIBUTE_KEYS.map((key) => (
              <option key={key} value={key}>
                {ATTRIBUTE_LABELS[key]}
              </option>
            ))}
          </select>

          <div className="week-card__options">
            {TRAINING_INTENSITIES.map((intensity) => (
              <button
                key={intensity}
                type="button"
                className="week-card__option"
                onClick={() => onTrain(attribute, intensity)}
              >
                <span className="week-card__option-label">{TRAINING_INTENSITY_LABELS[intensity]}</span>
                <span className="week-card__option-rate">
                  成功率 {Math.round(TRAINING_SUCCESS_RATE[intensity] * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === 'practice' && practiceMatchAllowed && (
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

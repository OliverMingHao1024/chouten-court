import { useId, useState } from 'react'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type AttributeKey } from '../../domain/types'
import type { PracticeStrength, TrainingIntensity } from '../../domain/weeklyAction'
import './WeekScreen.css'

export interface WeekScreenProps {
  practiceMatchAllowed: boolean
  onTrain: (attribute: AttributeKey, intensity: TrainingIntensity) => void
  onPracticeMatch: (strength: PracticeStrength) => void
  lastResult: string | null
}

type Mode = 'train' | 'practice'

const STRENGTH_LABELS: Record<PracticeStrength, string> = {
  weak: '弱',
  medium: '中',
  strong: '強',
}

const INTENSITY_LABELS: Record<TrainingIntensity, string> = {
  light: '輕',
  moderate: '中',
  intense: '重',
}

export function WeekScreen({ practiceMatchAllowed, onTrain, onPracticeMatch, lastResult }: WeekScreenProps) {
  const modeGroupName = useId()
  const attributeId = useId()
  const intensityId = useId()
  const strengthId = useId()

  const [mode, setMode] = useState<Mode>('train')
  const [attribute, setAttribute] = useState<AttributeKey>('three')
  const [intensity, setIntensity] = useState<TrainingIntensity>('moderate')
  const [strength, setStrength] = useState<PracticeStrength>('medium')

  // Derived, not stored: if the gate closes after "practice" was picked, treat this
  // render as "train" without needing an effect to resynchronize state.
  const effectiveMode: Mode = mode === 'practice' && !practiceMatchAllowed ? 'train' : mode

  return (
    <section className="week-card">
      {lastResult && <p className="result-banner week-card__result">{lastResult}</p>}
      <form
        className="week-card__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (effectiveMode === 'train') onTrain(attribute, intensity)
          else onPracticeMatch(strength)
        }}
      >
        <div className="week-card__mode">
          <label className="week-card__mode-option">
            <input
              type="radio"
              name={modeGroupName}
              value="train"
              checked={effectiveMode === 'train'}
              onChange={() => setMode('train')}
            />
            訓練
          </label>
          <label className="week-card__mode-option">
            <input
              type="radio"
              name={modeGroupName}
              value="practice"
              checked={effectiveMode === 'practice'}
              disabled={!practiceMatchAllowed}
              onChange={() => setMode('practice')}
            />
            練習賽
          </label>
        </div>
        {!practiceMatchAllowed && (
          <p className="week-card__hint">本週不能安排練習賽(賽季中或即將開打,請專注訓練)。</p>
        )}

        {effectiveMode === 'train' && (
          <div className="week-card__fields">
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

            <label htmlFor={intensityId}>訓練強度</label>
            <select
              id={intensityId}
              value={intensity}
              onChange={(event) => setIntensity(event.target.value as TrainingIntensity)}
            >
              {(Object.entries(INTENSITY_LABELS) as [TrainingIntensity, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
        )}

        {effectiveMode === 'practice' && (
          <div className="week-card__fields">
            <label htmlFor={strengthId}>對手強度</label>
            <select
              id={strengthId}
              value={strength}
              onChange={(event) => setStrength(event.target.value as PracticeStrength)}
            >
              {(Object.entries(STRENGTH_LABELS) as [PracticeStrength, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
        )}

        <button className="button-primary" type="submit">
          執行這一週
        </button>
      </form>
    </section>
  )
}

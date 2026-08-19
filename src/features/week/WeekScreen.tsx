import { useId, useState } from 'react'
import type { SeasonPhase } from '../../domain/calendar'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type AttributeKey } from '../../domain/types'
import type { PracticeStrength, TrainingIntensity } from '../../domain/weeklyAction'

export interface WeekScreenProps {
  year: number
  weekOfYear: number
  phase: SeasonPhase
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

const PHASE_LABELS: Record<SeasonPhase, string> = {
  offseason: '非賽季',
  qualifying: '資格賽',
  preliminary: '預賽',
  group: '複賽',
  quarterfinal: '八強賽',
  final4: '四強賽',
}

export function WeekScreen({
  year,
  weekOfYear,
  phase,
  practiceMatchAllowed,
  onTrain,
  onPracticeMatch,
  lastResult,
}: WeekScreenProps) {
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
    <section>
      <h2>
        第 {year} 年 第 {weekOfYear} 週
      </h2>
      <p>{PHASE_LABELS[phase]}</p>
      {lastResult && <p>{lastResult}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (effectiveMode === 'train') onTrain(attribute, intensity)
          else onPracticeMatch(strength)
        }}
      >
        <label>
          <input
            type="radio"
            name={modeGroupName}
            value="train"
            checked={effectiveMode === 'train'}
            onChange={() => setMode('train')}
          />
          訓練
        </label>
        <label>
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
        {!practiceMatchAllowed && <p>本週不能安排練習賽(賽季中或即將開打,請專注訓練)。</p>}

        {effectiveMode === 'train' && (
          <div>
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
          <div>
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

        <button type="submit">執行這一週</button>
      </form>
    </section>
  )
}

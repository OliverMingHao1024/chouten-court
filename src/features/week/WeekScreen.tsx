import { useId, useState } from 'react'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type AttributeKey } from '../../domain/types'
import type { PracticeStrength, TrainingIntensity } from '../../domain/weeklyAction'

export interface WeekScreenProps {
  week: number
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

export function WeekScreen({ week, onTrain, onPracticeMatch, lastResult }: WeekScreenProps) {
  const modeGroupName = useId()
  const attributeId = useId()
  const intensityId = useId()
  const strengthId = useId()

  const [mode, setMode] = useState<Mode>('train')
  const [attribute, setAttribute] = useState<AttributeKey>('three')
  const [intensity, setIntensity] = useState<TrainingIntensity>('moderate')
  const [strength, setStrength] = useState<PracticeStrength>('medium')

  return (
    <section>
      <h2>第 {week} 週</h2>
      {lastResult && <p>{lastResult}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (mode === 'train') onTrain(attribute, intensity)
          else onPracticeMatch(strength)
        }}
      >
        <label>
          <input
            type="radio"
            name={modeGroupName}
            value="train"
            checked={mode === 'train'}
            onChange={() => setMode('train')}
          />
          訓練
        </label>
        <label>
          <input
            type="radio"
            name={modeGroupName}
            value="practice"
            checked={mode === 'practice'}
            onChange={() => setMode('practice')}
          />
          練習賽
        </label>

        {mode === 'train' && (
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

        {mode === 'practice' && (
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

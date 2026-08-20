import { FATIGUE_MAX } from '../../domain/matchEngine'
import './FatigueBar.css'

export interface FatigueBarProps {
  fatigue: number
}

// 以「剩餘體力」呈現:精神飽滿時滿條全綠,疲勞值越高,綠色部分越往左消退。
export function FatigueBar({ fatigue }: FatigueBarProps) {
  const staminaPercent = Math.round(((FATIGUE_MAX - fatigue) / FATIGUE_MAX) * 100)
  return (
    <div
      className="fatigue-bar"
      role="progressbar"
      aria-label="疲勞值"
      aria-valuenow={fatigue}
      aria-valuemin={0}
      aria-valuemax={FATIGUE_MAX}
    >
      <div className="fatigue-bar__fill" style={{ width: `${staminaPercent}%` }} />
    </div>
  )
}

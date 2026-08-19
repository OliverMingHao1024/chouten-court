import './AttributeBar.css'

export interface AttributeBarProps {
  label: string
  value: number
  max: number
}

export function AttributeBar({ label, value, max }: AttributeBarProps) {
  const percent = Math.round((value / max) * 100)
  return (
    <div className="attribute-bar">
      <span className="attribute-bar__label">{label}</span>
      <div
        className="attribute-bar__track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="attribute-bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="attribute-bar__value">{value}</span>
    </div>
  )
}

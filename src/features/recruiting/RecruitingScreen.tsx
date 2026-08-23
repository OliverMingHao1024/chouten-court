import { useState } from 'react'
import type { Candidate } from '../../domain/recruiting'
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, PERSONALITY_LABELS } from '../../domain/types'
import './RecruitingScreen.css'

export interface RecruitingScreenProps {
  candidates: Candidate[]
  vacancies: number
  announcement: string | null
  onConfirm: (selectedIds: string[]) => void
}

export function RecruitingScreen({ candidates, vacancies, announcement, onConfirm }: RecruitingScreenProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  function toggle(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((existing) => existing !== id)
      if (current.length >= vacancies) return current
      return [...current, id]
    })
  }

  return (
    <section className="recruiting-card">
      {announcement && <p className="recruiting-card__announcement">{announcement}</p>}
      <header className="recruiting-card__header">
        <h2>招生 — 選出 {vacancies} 名新生</h2>
        <p>
          已選 {selectedIds.length} / {vacancies}(屬性僅顯示可能區間,收隊後才會知道真實數值)
        </p>
      </header>

      <ul className="recruiting-card__grid">
        {candidates.map((candidate) => {
          const selected = selectedIds.includes(candidate.id)
          return (
            <li key={candidate.id}>
              <button
                type="button"
                className={`recruiting-card__candidate${selected ? ' recruiting-card__candidate--selected' : ''}`}
                data-position={candidate.position}
                aria-pressed={selected}
                onClick={() => toggle(candidate.id)}
              >
                <div className="recruiting-card__candidate-name">{candidate.name}</div>
                <div className="recruiting-card__candidate-meta">
                  <span className="recruiting-card__candidate-position">{candidate.position}</span> ·{' '}
                  {candidate.height}cm · {PERSONALITY_LABELS[candidate.personality]}
                </div>
                <ul className="recruiting-card__ranges">
                  {ATTRIBUTE_KEYS.map((key) => {
                    const range = candidate.attributeRanges[key]
                    return (
                      <li key={key}>
                        {ATTRIBUTE_LABELS[key]} {range.min}~{range.max}
                      </li>
                    )
                  })}
                </ul>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className="button-primary"
        disabled={selectedIds.length !== vacancies}
        onClick={() => onConfirm(selectedIds)}
      >
        確認名單
      </button>
    </section>
  )
}

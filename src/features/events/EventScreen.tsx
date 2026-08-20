import { useState } from 'react'
import type { EventCard, EventRisk } from '../../domain/events'
import { EVENT_CATEGORY_LABELS, EVENT_RISK_SUCCESS_RATE, fillEventTemplate } from '../../domain/events'
import './EventScreen.css'

const RISK_LABELS: Record<EventRisk, string> = {
  safe: '穩妥處理',
  balanced: '折衷應對',
  bold: '放手一搏',
}

export interface EventScreenProps {
  card: EventCard
  featuredPlayerName: string
  lastResult: string | null
  onChoose: (risk: EventRisk) => void
}

export function EventScreen({ card, featuredPlayerName, lastResult, onChoose }: EventScreenProps) {
  // 防止同一張事件卡因快速連點(或雙擊)被送出兩次:選過一次後鎖住所有選項,直到父層
  // 換上新一週的事件卡(App.tsx 用 key={totalWeek} 讓這個元件每週重新掛載,狀態自然重置)。
  const [chosen, setChosen] = useState(false)

  return (
    <section className="event-card">
      {lastResult && <p className="result-banner event-card__last-result">{lastResult}</p>}
      <p className="event-card__category">{EVENT_CATEGORY_LABELS[card.category]}</p>
      <h2 className="event-card__title">{card.title}</h2>
      <p className="event-card__prompt">{fillEventTemplate(card.prompt, featuredPlayerName)}</p>

      <div className="event-card__choices">
        {card.choices.map((choice) => (
          <button
            key={choice.risk}
            type="button"
            className="event-card__choice"
            disabled={chosen}
            onClick={() => {
              if (chosen) return
              setChosen(true)
              onChoose(choice.risk)
            }}
          >
            <span className="event-card__choice-risk">{RISK_LABELS[choice.risk]}</span>
            <span className="event-card__choice-label">{choice.label}</span>
            <span className="event-card__choice-rate">
              成功率 {Math.round(EVENT_RISK_SUCCESS_RATE[choice.risk] * 100)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

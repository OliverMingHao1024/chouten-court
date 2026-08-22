import { useState, type ReactNode } from 'react'
import './AppShell.css'

export interface AppShellProps {
  teamName: string
  coachName: string
  reputation: number
  year: number
  weekOfYear: number
  monthLabel: string
  phaseLabel: string
  actions?: ReactNode
  /** 名冊內容;有提供時 HUD 才會顯示獨立的「名冊」收合按鈕,不再固定佔據每個畫面下方。 */
  roster?: ReactNode
  /** 四週行程帶;固定顯示在 HUD 下方,不可收合。 */
  scheduleStrip?: ReactNode
  children: ReactNode
}

export function AppShell({
  teamName,
  coachName,
  reputation,
  year,
  weekOfYear,
  monthLabel,
  phaseLabel,
  actions,
  roster,
  scheduleStrip,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)

  return (
    <div className="app-shell">
      <div className="app-shell__sticky-region">
        <header className="app-shell__hud">
          <div className="app-shell__identity">
            <h1 className="app-shell__team">{teamName}</h1>
            <p className="app-shell__coach">
              {coachName} 教練 · 聲望 {reputation}
            </p>
          </div>
          <div className="app-shell__calendar">
            <p className="app-shell__week">
              第 {year} 年 第 {weekOfYear} 週({monthLabel})
            </p>
            <p className="app-shell__phase">{phaseLabel}</p>
          </div>
          <div className="app-shell__hud-actions">
            {roster && (
              <button
                type="button"
                className="app-shell__roster-toggle"
                aria-expanded={rosterOpen}
                aria-label="名冊"
                onClick={() => setRosterOpen((open) => !open)}
              >
                名冊
              </button>
            )}
            {actions && (
              <div className="app-shell__menu">
                <button
                  type="button"
                  className="app-shell__menu-toggle"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-label="更多選項"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div className="app-shell__menu-panel" onClick={() => setMenuOpen(false)}>
                    {actions}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        {scheduleStrip}
      </div>
      {roster && rosterOpen && <div className="app-shell__roster-panel">{roster}</div>}
      <main className="app-shell__content">{children}</main>
    </div>
  )
}

import type { ReactNode } from 'react'
import './AppShell.css'

export interface AppShellProps {
  teamName: string
  coachName: string
  reputation: number
  year: number
  weekOfYear: number
  phaseLabel: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({
  teamName,
  coachName,
  reputation,
  year,
  weekOfYear,
  phaseLabel,
  actions,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__hud">
        <div className="app-shell__identity">
          <h1 className="app-shell__team">{teamName}</h1>
          <p className="app-shell__coach">
            {coachName} 教練 · 聲望 {reputation}
          </p>
        </div>
        <div className="app-shell__calendar">
          <p className="app-shell__week">
            第 {year} 年 第 {weekOfYear} 週
          </p>
          <p className="app-shell__phase">{phaseLabel}</p>
        </div>
      </header>
      {actions}
      <main className="app-shell__content">{children}</main>
    </div>
  )
}

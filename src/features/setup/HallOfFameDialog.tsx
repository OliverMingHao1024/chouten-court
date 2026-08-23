import { useRef } from 'react'
import type { SchoolHistoryEntry } from '../../domain/schoolHistory'
import './HallOfFameDialog.css'

export interface HallOfFameDialogProps {
  schoolHistory: SchoolHistoryEntry[]
}

/**
 * 名人堂:把跨生涯保存的校史彙整成戰績總表、歷屆奪冠隊(歷史隊)清單,與畢業生後日談精華,
 * 而不是像 SetupScreen 開局畫面那樣逐屆列出。呼應 spec.md 第 13 節原本「MVP 尚未實作」的規劃——
 * 刻意只做「彙整既有校史資料」,不新增逐球員數據排行榜或球星比對彩蛋(那些需要全新的資料
 * 模型,留給後續)。
 */
export function HallOfFameDialog({ schoolHistory }: HallOfFameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const totalCareers = schoolHistory.length
  const totalWins = schoolHistory.reduce((sum, entry) => sum + entry.totalWins, 0)
  const totalLosses = schoolHistory.reduce((sum, entry) => sum + entry.totalLosses, 0)
  const championEntries = schoolHistory.filter((entry) => entry.reason === 'champion' && entry.championRoster)
  const notableGraduates = [...schoolHistory]
    .reverse()
    .flatMap((entry) => entry.notableGraduates)
    .slice(0, 15)

  function open() {
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  return (
    <>
      <button type="button" className="hall-of-fame-trigger" onClick={open}>
        名人堂
      </button>
      <dialog
        ref={dialogRef}
        className="hall-of-fame-dialog"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="hall-of-fame-dialog__content">
          <h2>名人堂</h2>

          <dl className="hall-of-fame-dialog__stats">
            <div>
              <dt>歷屆執教</dt>
              <dd>{totalCareers}</dd>
            </div>
            <div>
              <dt>總冠軍數</dt>
              <dd>{championEntries.length}</dd>
            </div>
            <div>
              <dt>總戰績</dt>
              <dd>
                {totalWins} 勝 {totalLosses} 敗
              </dd>
            </div>
          </dl>

          {championEntries.length > 0 && (
            <div className="hall-of-fame-dialog__section">
              <h3>歷史隊</h3>
              <ul className="hall-of-fame-dialog__champion-list">
                {[...championEntries].reverse().map((entry, index) => (
                  <li key={index} className="hall-of-fame-dialog__champion-entry">
                    <p className="hall-of-fame-dialog__champion-headline">
                      {entry.coachName} 教練・第 {entry.totalSeasons} 季奪冠
                    </p>
                    <p className="hall-of-fame-dialog__champion-roster">
                      {entry.championRoster!.map((player) => `${player.name}(${player.overallGrade})`).join('、')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {notableGraduates.length > 0 && (
            <div className="hall-of-fame-dialog__section">
              <h3>畢業生後日談精華</h3>
              <ul className="hall-of-fame-dialog__graduate-list">
                {notableGraduates.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            </div>
          )}

          {totalCareers === 0 && <p className="hall-of-fame-dialog__empty">還沒有任何生涯留下紀錄。</p>}

          <button type="button" className="button-primary" onClick={close}>
            關閉
          </button>
        </div>
      </dialog>
    </>
  )
}

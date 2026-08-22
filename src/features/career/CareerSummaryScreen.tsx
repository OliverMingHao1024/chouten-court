import { summarizeCareer, type CareerEndReason } from '../../domain/career'
import { FINAL4_PLACEMENT_LABEL } from '../../domain/season'
import type { SeasonRecord } from '../../domain/seasonSummary'
import { downloadDataUrl, renderCareerShareCard } from './shareCard'
import './CareerSummaryScreen.css'

export interface CareerSummaryScreenProps {
  teamName: string
  coachName: string
  reason: CareerEndReason
  careerLog: SeasonRecord[]
  graduateLog: string[]
  onNewCareer: () => void
  /** 只有奪冠結束時提供:選擇不退休,直接以同一支球隊帶入下一季(王朝模式)。 */
  onContinueDynasty?: () => void
}

const REASON_HEADLINE: Record<CareerEndReason, string> = {
  champion: '恭喜奪冠!教練生涯圓滿落幕',
  insuranceCap: '教練生涯屆滿,未能奪冠',
  shortChallengeComplete: '三年挑戰完成,你選擇在此畫下句點',
}

export function CareerSummaryScreen({
  teamName,
  coachName,
  reason,
  careerLog,
  graduateLog,
  onNewCareer,
  onContinueDynasty,
}: CareerSummaryScreenProps) {
  const summary = summarizeCareer(careerLog, reason)
  const bestPlacementLabel = summary.bestPlacement ? FINAL4_PLACEMENT_LABEL[summary.bestPlacement] : '未曾闖進四強'

  return (
    <div className="career-summary">
      <h1>{REASON_HEADLINE[reason]}</h1>
      <p className="career-summary__team">
        {teamName} · {coachName} 教練
      </p>

      <dl className="career-summary__stats">
        <div>
          <dt>生涯戰績</dt>
          <dd>
            {summary.totalWins} 勝 {summary.totalLosses} 敗
          </dd>
        </div>
        <div>
          <dt>執教賽季數</dt>
          <dd>{summary.totalSeasons}</dd>
        </div>
        <div>
          <dt>歷屆最佳戰績</dt>
          <dd>{bestPlacementLabel}</dd>
        </div>
      </dl>

      {careerLog.length > 0 && (
        <div className="career-summary__reputation-curve">
          <h2>聲望曲線</h2>
          <ol>
            {careerLog.map((record) => {
              const height = Math.max(4, Math.round((record.reputationAfter / 100) * 100))
              return (
                <li key={record.year}>
                  <span className="career-summary__reputation-bar" style={{ height: `${height}%` }} />
                  <span className="career-summary__reputation-value">{record.reputationAfter}</span>
                  <span className="career-summary__reputation-year">第{record.year}年</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {graduateLog.length > 0 && (
        <div className="career-summary__hall-of-fame">
          <h2>畢業生後日談精華</h2>
          <ul>
            {graduateLog.slice(-5).map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="career-summary__actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            const dataUrl = renderCareerShareCard({
              teamName,
              coachName,
              headline: REASON_HEADLINE[reason],
              totalSeasons: summary.totalSeasons,
              totalWins: summary.totalWins,
              totalLosses: summary.totalLosses,
              bestPlacementLabel,
            })
            downloadDataUrl(`${teamName}-career-summary.png`, dataUrl)
          }}
        >
          下載戰績分享卡
        </button>
        {onContinueDynasty && (
          <button type="button" className="button-primary" onClick={onContinueDynasty}>
            不退休,繼續帶下去(王朝模式)
          </button>
        )}
        <button type="button" className="career-summary__new-career" onClick={onNewCareer}>
          開始新生涯
        </button>
      </div>
    </div>
  )
}

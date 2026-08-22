import { useId, useState } from 'react'
import { generateCoachName } from '../../domain/nameGenerator'
import type { SchoolHistoryEntry } from '../../domain/schoolHistory'
import './SetupScreen.css'

export type ChallengeMode = 'short' | 'long'

export interface SetupScreenProps {
  /** 跨生涯保存的校史紀錄;第一次開局或從未有生涯結束過時是空陣列。 */
  schoolHistory: SchoolHistoryEntry[]
  onSubmit: (
    teamName: string,
    coachName: string,
    seedInput: string | undefined,
    challengeMode: ChallengeMode,
  ) => void
}

const TEAM_NAME = '淡水高中'

const REASON_LABELS: Record<SchoolHistoryEntry['reason'], string> = {
  champion: '奪冠',
  insuranceCap: '屆滿',
  shortChallengeComplete: '三年挑戰完成',
}

export function SetupScreen({ schoolHistory, onSubmit }: SetupScreenProps) {
  const coachId = useId()
  const seedId = useId()
  const [coachName, setCoachName] = useState(() => generateCoachName(Math.random))
  const [seedInput, setSeedInput] = useState('')
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('long')

  const canSubmit = coachName.trim().length > 0

  return (
    <div className="setup">
      <div className="setup__hero">
        <p className="setup__emoji" aria-hidden="true">
          🏀
        </p>
        <h1 className="setup__title">頂点コート</h1>
        <p className="setup__subtitle">台灣高中籃球生涯模擬</p>
      </div>
      <div className="setup__story">
        <p className="setup__story-line setup__story-line--lead">
          球鞋早已收進衣櫃深處,你以為球員生涯就這樣結束了。
        </p>
        <p className="setup__story-line">
          如今你重新走回球場,只是身分變了——不再是場上的球員,而是場邊的教練。
        </p>
        <p className="setup__story-line">
          {schoolHistory.length === 0
            ? `${TEAM_NAME},一支才剛成立的球隊。從零開始,正是你故事的起點。`
            : `${TEAM_NAME},歷任教練留下了 ${schoolHistory.length} 段紀錄。接下來換你了。`}
        </p>
      </div>

      {schoolHistory.length > 0 && (
        <div className="setup__history">
          <h2 className="setup__history-title">校史</h2>
          <ul className="setup__history-list">
            {[...schoolHistory].reverse().map((entry, index) => (
              <li key={index} className="setup__history-entry">
                <p className="setup__history-entry-headline">
                  {entry.coachName} 教練・{REASON_LABELS[entry.reason]}・{entry.totalSeasons} 季 {entry.totalWins}勝
                  {entry.totalLosses}敗・最佳戰績 {entry.bestPlacementLabel}
                </p>
                {entry.championRoster && (
                  <p className="setup__history-entry-roster">
                    奪冠隊:{entry.championRoster.map((player) => `${player.name}(${player.overallGrade})`).join('、')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <form
        className="setup__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          const trimmedSeed = seedInput.trim()
          onSubmit(TEAM_NAME, coachName.trim(), trimmedSeed.length > 0 ? trimmedSeed : undefined, challengeMode)
        }}
      >
        <div className="setup__field">
          <span>執教模式</span>
          <div className="setup__mode-row" role="radiogroup" aria-label="執教模式">
            <label className="setup__mode-option">
              <input
                type="radio"
                name="challengeMode"
                value="long"
                checked={challengeMode === 'long'}
                onChange={() => setChallengeMode('long')}
              />
              長期生涯
            </label>
            <label className="setup__mode-option">
              <input
                type="radio"
                name="challengeMode"
                value="short"
                checked={challengeMode === 'short'}
                onChange={() => setChallengeMode('short')}
              />
              三年挑戰
            </label>
          </div>
          <p className="setup__mode-hint">
            {challengeMode === 'short'
              ? '三年後會詢問是否就此結束、寫進校史,或轉為長期生涯繼續帶下去。'
              : '持續帶隊直到奪冠或屆滿(約 18 年)為止。'}
          </p>
        </div>
        <div className="setup__field">
          <label htmlFor={coachId}>教練名稱</label>
          <div className="setup__coach-row">
            <input
              id={coachId}
              value={coachName}
              onChange={(event) => setCoachName(event.target.value)}
            />
            <button
              type="button"
              className="setup__dice"
              aria-label="隨機產生教練名稱"
              onClick={() => setCoachName(generateCoachName(Math.random))}
            >
              🎲
            </button>
          </div>
        </div>
        <div className="setup__field">
          <label htmlFor={seedId}>種子碼(選填)</label>
          <input
            id={seedId}
            value={seedInput}
            onChange={(event) => setSeedInput(event.target.value)}
          />
        </div>
        <button className="button-primary" type="submit" disabled={!canSubmit}>
          建隊
        </button>
      </form>
    </div>
  )
}

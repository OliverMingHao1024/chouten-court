import { useId, useState } from 'react'
import { generateCoachName } from '../../domain/nameGenerator'
import './SetupScreen.css'

export interface SetupScreenProps {
  onSubmit: (teamName: string, coachName: string, seedInput: string | undefined) => void
}

// 虛構球隊,之後會補校史/故事內容(暫時只有名字)。
const TEAM_NAME = '淡水高中'

export function SetupScreen({ onSubmit }: SetupScreenProps) {
  const coachId = useId()
  const seedId = useId()
  const [coachName, setCoachName] = useState(() => generateCoachName(Math.random))
  const [seedInput, setSeedInput] = useState('')

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
          {TEAM_NAME},一支才剛成立的球隊。從零開始,正是你故事的起點。
        </p>
      </div>
      <form
        className="setup__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          const trimmedSeed = seedInput.trim()
          onSubmit(TEAM_NAME, coachName.trim(), trimmedSeed.length > 0 ? trimmedSeed : undefined)
        }}
      >
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

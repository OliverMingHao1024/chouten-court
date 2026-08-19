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
      <p className="setup__story">
        <strong>球鞋早已收進衣櫃深處,你曾以為那段球員生涯就此落幕。</strong>
        <br />
        如今,你換了個身分重新走進球場——不再是場上的球員,而是場邊的教練。{TEAM_NAME}
        ,一支剛成立、一切從零開始的球隊,將是你故事真正的起點。
      </p>
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

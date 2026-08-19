import { useId, useState } from 'react'
import './SetupScreen.css'

export interface SetupScreenProps {
  onSubmit: (teamName: string, coachName: string, seedInput: string | undefined) => void
}

export function SetupScreen({ onSubmit }: SetupScreenProps) {
  const teamId = useId()
  const coachId = useId()
  const seedId = useId()
  const [teamName, setTeamName] = useState('')
  const [coachName, setCoachName] = useState('')
  const [seedInput, setSeedInput] = useState('')

  const canSubmit = teamName.trim().length > 0 && coachName.trim().length > 0

  return (
    <div className="setup">
      <div className="setup__hero">
        <p className="setup__emoji" aria-hidden="true">
          🏀
        </p>
        <h1 className="setup__title">頂点コート</h1>
        <p className="setup__subtitle">台灣高中籃球生涯模擬</p>
      </div>
      <form
        className="setup__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          const trimmedSeed = seedInput.trim()
          onSubmit(teamName.trim(), coachName.trim(), trimmedSeed.length > 0 ? trimmedSeed : undefined)
        }}
      >
        <div className="setup__field">
          <label htmlFor={teamId}>球隊名稱</label>
          <input
            id={teamId}
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
          />
        </div>
        <div className="setup__field">
          <label htmlFor={coachId}>教練名稱</label>
          <input
            id={coachId}
            value={coachName}
            onChange={(event) => setCoachName(event.target.value)}
          />
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

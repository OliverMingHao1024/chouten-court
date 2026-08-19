import { useId, useState } from 'react'

export interface SetupScreenProps {
  onSubmit: (teamName: string, coachName: string) => void
}

export function SetupScreen({ onSubmit }: SetupScreenProps) {
  const teamId = useId()
  const coachId = useId()
  const [teamName, setTeamName] = useState('')
  const [coachName, setCoachName] = useState('')

  const canSubmit = teamName.trim().length > 0 && coachName.trim().length > 0

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSubmit) return
        onSubmit(teamName.trim(), coachName.trim())
      }}
    >
      <div>
        <label htmlFor={teamId}>球隊名稱</label>
        <input
          id={teamId}
          value={teamName}
          onChange={(event) => setTeamName(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor={coachId}>教練名稱</label>
        <input
          id={coachId}
          value={coachName}
          onChange={(event) => setCoachName(event.target.value)}
        />
      </div>
      <button type="submit" disabled={!canSubmit}>
        建隊
      </button>
    </form>
  )
}

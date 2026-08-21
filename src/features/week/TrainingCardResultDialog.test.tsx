import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ResolvedCard } from '../../domain/trainingCardResolution'
import { TrainingCardResultDialog, type TrainingCardWeekResult } from './TrainingCardResultDialog'

function makeResult(resolvedCards: ResolvedCard[]): TrainingCardWeekResult {
  return { resolvedCards, playerNameById: { p1: '球員01', p2: '球員02' } }
}

describe('TrainingCardResultDialog', () => {
  it('opens and summarizes a teamTraining card, marking a combo bonus when present', () => {
    const cards: ResolvedCard[] = [
      {
        kind: 'teamTraining',
        attribute: 'three',
        comboBonus: true,
        rolls: [
          { playerId: 'p1', roll: 5, succeeded: true, gain: 2, bonusLabel: null },
          { playerId: 'p2', roll: 1, succeeded: false, gain: 0, bonusLabel: null },
        ],
      },
    ]
    render(<TrainingCardResultDialog result={makeResult(cards)} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText(/全隊訓練·三分/)).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 2 位球員成長/)).toBeInTheDocument()
    expect(screen.getByText('同類疊加加成')).toBeInTheDocument()
  })

  it('summarizes a successful individualTraining card with the player name and ability learned', () => {
    const cards: ResolvedCard[] = [
      { kind: 'individualTraining', playerId: 'p1', ability: 'ironWall', succeeded: true, chance: 0.8 },
    ]
    render(<TrainingCardResultDialog result={makeResult(cards)} />)
    expect(screen.getByText(/球員01 學會了「鐵閘」/)).toBeInTheDocument()
  })

  it('summarizes a failed individualTraining card distinctly from a success', () => {
    const cards: ResolvedCard[] = [
      { kind: 'individualTraining', playerId: 'p1', ability: 'ironWall', succeeded: false, chance: 0.2 },
    ]
    render(<TrainingCardResultDialog result={makeResult(cards)} />)
    expect(screen.getByText(/球員01 嘗試學習「鐵閘」失敗/)).toBeInTheDocument()
  })

  it('summarizes a practiceMatch card with outcome and any beneficiaries', () => {
    const cards: ResolvedCard[] = [
      { kind: 'practiceMatch', strength: 'medium', outcome: 'win', beneficiaries: [{ playerId: 'p2', attribute: 'defense', gain: 2 }] },
    ]
    render(<TrainingCardResultDialog result={makeResult(cards)} />)
    expect(screen.getByText(/練習賽:獲勝/)).toBeInTheDocument()
    expect(screen.getByText(/球員02 防守 \+2/)).toBeInTheDocument()
  })

  it('summarizes a rest card', () => {
    render(<TrainingCardResultDialog result={makeResult([{ kind: 'rest' }])} />)
    expect(screen.getByText('全隊休養,體力恢復')).toBeInTheDocument()
  })

  it('stays closed when there is no result yet', () => {
    render(<TrainingCardResultDialog result={null} />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).not.toHaveAttribute('open')
  })
})

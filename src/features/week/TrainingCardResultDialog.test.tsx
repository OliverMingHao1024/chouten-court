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

  it('summarizes an individualTraining card with the player name and gain', () => {
    const cards: ResolvedCard[] = [
      { kind: 'individualTraining', playerId: 'p1', attribute: 'iq', roll: { playerId: 'p1', roll: 6, succeeded: true, gain: 3, bonusLabel: '天才型加成' } },
    ]
    render(<TrainingCardResultDialog result={makeResult(cards)} />)
    expect(screen.getByText(/個別訓練·IQ/)).toBeInTheDocument()
    expect(screen.getByText(/球員01 \+3/)).toBeInTheDocument()
    expect(screen.getByText('天才型加成')).toBeInTheDocument()
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

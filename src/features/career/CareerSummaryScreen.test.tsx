import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SeasonRecord } from '../../domain/seasonSummary'
import { CareerSummaryScreen } from './CareerSummaryScreen'

const careerLog: SeasonRecord[] = [
  { year: 1, wins: 2, losses: 2, finalPhaseReached: 'qualifying', placement: null, reputationAfter: 44 },
  { year: 2, wins: 6, losses: 1, finalPhaseReached: 'final4', placement: 'champion', reputationAfter: 66 },
]

describe('CareerSummaryScreen', () => {
  it('shows the champion headline and aggregate stats', () => {
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={['球員01 畢業後獲得職業球隊試訓邀約。']}
        achievements={[]}
        onNewCareer={() => {}}
      />,
    )

    expect(screen.getByText('恭喜奪冠!教練生涯圓滿落幕')).toBeInTheDocument()
    expect(screen.getByText('8 勝 3 敗')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('冠軍')).toBeInTheDocument()
    expect(screen.getByText('球員01 畢業後獲得職業球隊試訓邀約。')).toBeInTheDocument()
  })

  it('shows the insurance-cap headline and "never reached final4" when applicable', () => {
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="insuranceCap"
        careerLog={[
          { year: 1, wins: 1, losses: 3, finalPhaseReached: 'qualifying', placement: null, reputationAfter: 44 },
        ]}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={() => {}}
      />,
    )

    expect(screen.getByText('教練生涯屆滿,未能奪冠')).toBeInTheDocument()
    expect(screen.getByText('未曾闖進四強')).toBeInTheDocument()
  })

  it('renders one reputation-curve bar per season in careerLog', () => {
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={() => {}}
      />,
    )

    expect(screen.getByText('聲望曲線')).toBeInTheDocument()
    expect(screen.getByText('44')).toBeInTheDocument()
    expect(screen.getByText('66')).toBeInTheDocument()
    expect(screen.getByText('第1年')).toBeInTheDocument()
    expect(screen.getByText('第2年')).toBeInTheDocument()
  })

  it('calls onNewCareer when the button is clicked', async () => {
    const user = userEvent.setup()
    const onNewCareer = vi.fn()
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={onNewCareer}
      />,
    )

    await user.click(screen.getByRole('button', { name: '開始新生涯' }))
    expect(onNewCareer).toHaveBeenCalled()
  })

  it('shows a 王朝模式 continue button only when onContinueDynasty is provided', () => {
    const { rerender } = render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /王朝模式/ })).not.toBeInTheDocument()

    rerender(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={() => {}}
        onContinueDynasty={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /王朝模式/ })).toBeInTheDocument()
  })

  it('calls onContinueDynasty when the dynasty button is clicked', async () => {
    const user = userEvent.setup()
    const onContinueDynasty = vi.fn()
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={() => {}}
        onContinueDynasty={onContinueDynasty}
      />,
    )

    await user.click(screen.getByRole('button', { name: /王朝模式/ }))
    expect(onContinueDynasty).toHaveBeenCalledOnce()
  })

  it('shows unlocked achievements with their labels and descriptions', () => {
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={['undefeatedSeason', 'comebackWin']}
        onNewCareer={() => {}}
      />,
    )

    expect(screen.getByText('全勝賽季')).toBeInTheDocument()
    expect(screen.getByText('大逆轉')).toBeInTheDocument()
  })

  it('does not show an achievements section when nothing has been unlocked', () => {
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={() => {}}
      />,
    )

    expect(screen.queryByText('成就')).not.toBeInTheDocument()
  })

  it('does not throw when downloading the share card', async () => {
    const user = userEvent.setup()
    render(
      <CareerSummaryScreen
        teamName="淡水高中"
        coachName="山田"
        reason="champion"
        careerLog={careerLog}
        graduateLog={[]}
        achievements={[]}
        onNewCareer={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: '下載戰績分享卡' }))
  })
})

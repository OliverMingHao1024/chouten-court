import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { generateCandidatePool } from '../../domain/recruiting'
import { RecruitingScreen } from './RecruitingScreen'

describe('RecruitingScreen', () => {
  it('shows every candidate with position and attribute ranges', () => {
    const candidates = generateCandidatePool(50, 3, 1)
    render(<RecruitingScreen candidates={candidates} vacancies={2} onConfirm={() => {}} announcement={null} />)

    candidates.forEach((candidate) => {
      expect(screen.getByText(candidate.name)).toBeInTheDocument()
      expect(screen.getByText(new RegExp(`${candidate.height}cm`))).toBeInTheDocument()
    })
    expect(screen.getAllByText(/投籃 \d+~\d+/)).toHaveLength(candidates.length)
  })

  it('keeps the confirm button disabled until exactly `vacancies` candidates are selected', async () => {
    const user = userEvent.setup()
    const candidates = generateCandidatePool(50, 3, 1)
    render(<RecruitingScreen candidates={candidates} vacancies={2} onConfirm={() => {}} announcement={null} />)

    const confirmButton = screen.getByRole('button', { name: '確認名單' })
    expect(confirmButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: new RegExp(candidates[0].name) }))
    expect(confirmButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: new RegExp(candidates[1].name) }))
    expect(confirmButton).toBeEnabled()
  })

  it('does not allow selecting more than `vacancies` candidates', async () => {
    const user = userEvent.setup()
    const candidates = generateCandidatePool(50, 3, 1)
    render(<RecruitingScreen candidates={candidates} vacancies={1} onConfirm={() => {}} announcement={null} />)

    await user.click(screen.getByRole('button', { name: new RegExp(candidates[0].name) }))
    await user.click(screen.getByRole('button', { name: new RegExp(candidates[1].name) }))

    expect(screen.getByText(/已選 1 \/ 1/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(candidates[1].name) })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('lets a selected candidate be deselected', async () => {
    const user = userEvent.setup()
    const candidates = generateCandidatePool(50, 3, 1)
    render(<RecruitingScreen candidates={candidates} vacancies={1} onConfirm={() => {}} announcement={null} />)

    const button = screen.getByRole('button', { name: new RegExp(candidates[0].name) })
    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onConfirm with exactly the selected candidate ids', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const candidates = generateCandidatePool(50, 3, 1)
    render(<RecruitingScreen candidates={candidates} vacancies={2} onConfirm={onConfirm} announcement={null} />)

    await user.click(screen.getByRole('button', { name: new RegExp(candidates[0].name) }))
    await user.click(screen.getByRole('button', { name: new RegExp(candidates[2].name) }))
    await user.click(screen.getByRole('button', { name: '確認名單' }))

    expect(onConfirm).toHaveBeenCalledWith([candidates[0].id, candidates[2].id])
  })
})

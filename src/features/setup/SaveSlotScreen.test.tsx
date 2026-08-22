import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SaveSlotScreen } from './SaveSlotScreen'

describe('SaveSlotScreen', () => {
  const slots = [
    { id: 'a', label: '淡水高中', updatedAt: 1_700_000_000_000 },
    { id: 'b', label: '陽明高中', updatedAt: 1_700_000_100_000 },
  ]

  it('lists every slot sorted by most recently updated first', () => {
    render(<SaveSlotScreen slots={slots} onLoad={() => {}} onDelete={() => {}} onCreateNew={() => {}} />)
    const labels = screen.getAllByText(/高中$/).map((node) => node.textContent)
    expect(labels).toEqual(['陽明高中', '淡水高中'])
  })

  it('loads a slot when its entry is clicked', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    render(<SaveSlotScreen slots={slots} onLoad={onLoad} onDelete={() => {}} onCreateNew={() => {}} />)

    await user.click(screen.getByText('淡水高中'))
    expect(onLoad).toHaveBeenCalledWith('a')
  })

  it('deletes a slot after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<SaveSlotScreen slots={slots} onLoad={() => {}} onDelete={onDelete} onCreateNew={() => {}} />)

    await user.click(screen.getByRole('button', { name: '刪除存檔:淡水高中' }))
    expect(onDelete).toHaveBeenCalledWith('a')
  })

  it('does not delete a slot when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<SaveSlotScreen slots={slots} onLoad={() => {}} onDelete={onDelete} onCreateNew={() => {}} />)

    await user.click(screen.getByRole('button', { name: '刪除存檔:淡水高中' }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('calls onCreateNew when creating a new save', async () => {
    const user = userEvent.setup()
    const onCreateNew = vi.fn()
    render(<SaveSlotScreen slots={slots} onLoad={() => {}} onDelete={() => {}} onCreateNew={onCreateNew} />)

    await user.click(screen.getByRole('button', { name: '新增存檔' }))
    expect(onCreateNew).toHaveBeenCalled()
  })
})

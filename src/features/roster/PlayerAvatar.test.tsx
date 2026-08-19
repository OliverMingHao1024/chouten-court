import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerAvatar } from './PlayerAvatar'

describe('PlayerAvatar', () => {
  it('renders a decorative face image', () => {
    const { container } = render(<PlayerAvatar seed="player-1" />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', expect.stringMatching(/^data:image\/svg\+xml/))
    expect(img).toHaveAttribute('alt', '')
  })

  it('produces the same face for the same seed (deterministic)', () => {
    const { container: a } = render(<PlayerAvatar seed="same-seed" />)
    const { container: b } = render(<PlayerAvatar seed="same-seed" />)
    expect(a.querySelector('img')?.getAttribute('src')).toBe(b.querySelector('img')?.getAttribute('src'))
  })
})

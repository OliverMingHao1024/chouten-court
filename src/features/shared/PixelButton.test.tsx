import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PixelButton } from './PixelButton'

describe('PixelButton', () => {
  it('keeps the visible label as the accessible button name and treats the icon as decorative', () => {
    render(<PixelButton icon="team-create">建隊</PixelButton>)

    const button = screen.getByRole('button', { name: '建隊' })
    expect(button).toHaveClass('pixel-button')
    expect(button.querySelector('img')).toHaveAttribute('aria-hidden', 'true')
    expect(button.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('keeps icon-only button text available to assistive technology', () => {
    render(
      <PixelButton icon="menu" iconOnly>
        更多選項
      </PixelButton>,
    )

    expect(screen.getByRole('button', { name: '更多選項' })).toBeInTheDocument()
    expect(screen.getByText('更多選項')).toHaveClass('sr-only')
  })
})

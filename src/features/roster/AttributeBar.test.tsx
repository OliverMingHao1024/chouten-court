import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttributeBar } from './AttributeBar'

describe('AttributeBar', () => {
  it('shows the label and numeric value', () => {
    render(<AttributeBar label="三分" value={72} max={99} />)
    expect(screen.getByText('三分')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
  })

  it('exposes the value as a progressbar for assistive tech', () => {
    render(<AttributeBar label="三分" value={72} max={99} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '72')
    expect(bar).toHaveAttribute('aria-valuemax', '99')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAccessibleName('三分')
  })
})

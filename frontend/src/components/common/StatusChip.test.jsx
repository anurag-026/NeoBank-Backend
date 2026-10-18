import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusChip from './StatusChip'

describe('StatusChip', () => {
  it('renders known statuses', () => {
    render(<StatusChip status="SUCCESS" />)
    expect(screen.getByText('Success')).toBeInTheDocument()
  })
})

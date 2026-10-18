import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('maps network errors to offline messaging', () => {
    expect(getErrorMessage({ message: 'Network Error' })).toMatch(/offline/i)
  })

  it('maps proxy bad-gateway when containers are down', () => {
    expect(getErrorMessage({ response: { status: 502 } })).toMatch(/offline/i)
  })

  it('does not treat Spring 503 (warming/unhealthy) as offline messaging', () => {
    expect(getErrorMessage({ response: { status: 503, data: 'Service Unavailable' } })).not.toMatch(/offline/i)
  })

  it('maps 403', () => {
    expect(getErrorMessage({ response: { status: 403 } })).toMatch(/permission/i)
  })
})

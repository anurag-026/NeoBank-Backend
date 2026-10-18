import { describe, expect, it } from 'vitest'
import { getAuthorities, isTokenExpired } from './jwt'

function makeToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.sig`
}

describe('jwt helpers', () => {
  it('reads authorities claim', () => {
    const token = makeToken({ authorities: ['CREATE_ACCOUNT', 'ROLE_CUSTOMER'] })
    expect(getAuthorities(token)).toEqual(['CREATE_ACCOUNT', 'ROLE_CUSTOMER'])
  })

  it('detects expired tokens', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 })
    expect(isTokenExpired(token)).toBe(true)
  })
})

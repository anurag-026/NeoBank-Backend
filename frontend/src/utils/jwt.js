import { jwtDecode } from 'jwt-decode'

export function decodeAccessToken(token) {
  if (!token) return null
  try {
    return jwtDecode(token)
  } catch {
    return null
  }
}

export function isTokenExpired(token, skewSeconds = 30) {
  const payload = decodeAccessToken(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000
}

export function getAuthorities(token) {
  const payload = decodeAccessToken(token)
  const authorities = payload?.authorities
  return Array.isArray(authorities) ? authorities : []
}

export function hasAuthority(token, authority) {
  return getAuthorities(token).includes(authority)
}

export function hasRole(token, role) {
  const authorities = getAuthorities(token)
  const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`
  return authorities.includes(normalized) || authorities.includes(role)
}

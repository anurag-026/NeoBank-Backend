import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { exchangeOtpForToken, registerUser, requestOtpLogin } from '../api/authApi'
import { setAccessToken, setUnauthorizedHandler } from '../api/client'
import { decodeAccessToken, getAuthorities, isTokenExpired } from '../utils/jwt'

const TOKEN_KEY = 'neobank.accessToken'
const USER_KEY = 'neobank.username'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY))
  const [username, setUsername] = useState(() => sessionStorage.getItem(USER_KEY) || '')
  const [pendingUsername, setPendingUsername] = useState('')
  const [bootstrapping, setBootstrapping] = useState(true)

  const clearSession = useCallback(() => {
    setToken(null)
    setUsername('')
    setPendingUsername('')
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setAccessToken(null)
  }, [])

  useEffect(() => {
    if (token && !isTokenExpired(token)) {
      setAccessToken(token)
    } else if (token) {
      clearSession()
    }
    setBootstrapping(false)
  }, [token, clearSession])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  const loginWithPassword = useCallback(async (userName, password) => {
    await requestOtpLogin(userName, password)
    setPendingUsername(userName)
    return { otpRequired: true }
  }, [])

  const verifyOtp = useCallback(async (otp, userForOtp) => {
    const name = userForOtp || pendingUsername
    const data = await exchangeOtpForToken(name, otp)
    if (!data?.access_token) {
      throw new Error('Token response did not include an access token.')
    }
    sessionStorage.setItem(TOKEN_KEY, data.access_token)
    sessionStorage.setItem(USER_KEY, name)
    setAccessToken(data.access_token)
    setToken(data.access_token)
    setUsername(name)
    setPendingUsername('')
    return data
  }, [pendingUsername])

  const register = useCallback(async (payload) => {
    const data = await registerUser(payload)
    return data
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const payload = useMemo(() => decodeAccessToken(token), [token])
  const authorities = useMemo(() => getAuthorities(token), [token])
  const isAuthenticated = Boolean(token && !isTokenExpired(token))

  const value = useMemo(
    () => ({
      token,
      username,
      pendingUsername,
      userId: payload?.userId ?? null,
      authorities,
      isAuthenticated,
      bootstrapping,
      loginWithPassword,
      verifyOtp,
      register,
      logout,
      hasAuthority: (a) => authorities.includes(a),
      hasRole: (role) => {
        const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`
        return authorities.includes(normalized) || authorities.includes(role)
      },
    }),
    [
      token,
      username,
      pendingUsername,
      payload,
      authorities,
      isAuthenticated,
      bootstrapping,
      loginWithPassword,
      verifyOtp,
      register,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

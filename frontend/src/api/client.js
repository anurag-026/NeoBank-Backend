import axios from 'axios'
import { getDeviceId } from '../utils/deviceId'
import { isBackendUnreachable } from '../utils/errors'

const useProxy = import.meta.env.VITE_USE_DEV_PROXY !== 'false'

/** Gateway / business APIs */
export const apiClient = axios.create({
  baseURL: useProxy ? '' : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 30000,
})

/** Auth-service APIs (register, login, token) via Vite proxy in dev */
export const authClient = axios.create({
  baseURL: useProxy ? '/auth-proxy' : import.meta.env.VITE_AUTH_URL || 'http://localhost:9000',
  timeout: 30000,
})

let accessToken = null
let onUnauthorized = null
let backendReachable = true
const statusListeners = new Set()

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export function isBackendReachable() {
  return backendReachable
}

export function subscribeBackendStatus(listener) {
  statusListeners.add(listener)
  listener(backendReachable)
  return () => statusListeners.delete(listener)
}

function setBackendReachable(ok) {
  if (backendReachable === ok) return
  backendReachable = ok
  statusListeners.forEach((listener) => listener(ok))
}

/** One-shot health check against the API gateway. Used by the offline banner Retry. */
export async function pingBackend() {
  try {
    await apiClient.get('/actuator/health', { timeout: 5000, skipAuth: true })
    setBackendReachable(true)
    window.dispatchEvent(new Event('neobank-backend-up'))
    return true
  } catch (error) {
    // Any HTTP response means the gateway process is reachable.
    if (error.response) {
      setBackendReachable(true)
      window.dispatchEvent(new Event('neobank-backend-up'))
      return true
    }
    if (isBackendUnreachable(error)) {
      setBackendReachable(false)
      return false
    }
    setBackendReachable(true)
    window.dispatchEvent(new Event('neobank-backend-up'))
    return true
  }
}

function attachInterceptors(client) {
  client.interceptors.request.use((config) => {
    const headers = { ...config.headers }
    headers['X-Device-Id'] = getDeviceId()
    if (config.skipAuth) {
      delete headers.Authorization
      delete headers.authorization
    } else if (accessToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${accessToken}`
    }
    config.headers = headers
    return config
  })

  client.interceptors.response.use(
    (response) => {
      setBackendReachable(true)
      return response
    },
    (error) => {
      if (isBackendUnreachable(error)) {
        setBackendReachable(false)
      } else if (error.response) {
        setBackendReachable(true)
      }
      if (error.response?.status === 401 && typeof onUnauthorized === 'function') {
        onUnauthorized()
      }
      return Promise.reject(error)
    },
  )
}

attachInterceptors(apiClient)
attachInterceptors(authClient)

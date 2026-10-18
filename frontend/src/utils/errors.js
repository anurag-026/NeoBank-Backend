/** True when the backend process/container is unreachable (not an app-level 4xx/5xx from a live service). */
export function isBackendUnreachable(error) {
  if (!error) return false
  if (!error.response) {
    return (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error'
    )
  }
  // Vite/nginx style: target container not listening. Do NOT treat 503 as offline —
  // Spring Boot often returns 503 while the process is up (health still warming).
  return [502, 504].includes(error.response.status)
}

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (isBackendUnreachable(error)) {
    return 'Banking services are offline. Start the backend containers, then retry.'
  }
  const data = error.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data?.message) return data.message
  if (data?.error) return data.error
  if (error.response?.status === 401) return 'Your session is invalid or expired. Please sign in again.'
  if (error.response?.status === 403) return 'You do not have permission for this action.'
  if (error.message) return error.message
  return fallback
}

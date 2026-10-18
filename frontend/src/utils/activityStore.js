const prefix = 'neobank.activity.'

function key(userId) {
  return `${prefix}${userId || 'anonymous'}`
}

export function loadActivity(userId) {
  try {
    const raw = sessionStorage.getItem(key(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function pushActivity(userId, entry) {
  const list = loadActivity(userId)
  const next = [
    {
      ...entry,
      recordedAt: new Date().toISOString(),
      source: 'session',
    },
    ...list,
  ].slice(0, 50)
  sessionStorage.setItem(key(userId), JSON.stringify(next))
  return next
}

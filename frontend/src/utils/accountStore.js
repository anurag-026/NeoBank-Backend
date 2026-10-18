const prefix = 'neobank.accounts.'

function key(userId) {
  return `${prefix}${userId || 'anonymous'}`
}

export function loadKnownAccounts(userId) {
  try {
    const raw = localStorage.getItem(key(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveKnownAccount(userId, account) {
  const list = loadKnownAccounts(userId)
  const next = [
    {
      accountNumber: account.accountNumber,
      type: account.type,
      status: account.status,
      lastKnownBalance: account.balance,
      savedAt: new Date().toISOString(),
    },
    ...list.filter((a) => a.accountNumber !== account.accountNumber),
  ]
  localStorage.setItem(key(userId), JSON.stringify(next))
  return next
}

export function removeKnownAccount(userId, accountNumber) {
  const next = loadKnownAccounts(userId).filter((a) => a.accountNumber !== accountNumber)
  localStorage.setItem(key(userId), JSON.stringify(next))
  return next
}

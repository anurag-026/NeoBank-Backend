import { apiClient } from './client'

export async function createAccount({ accountType, intialDeposit }) {
  const { data } = await apiClient.post('/api/accounts', {
    accountType,
    intialDeposit,
  })
  return data
}

/** Live balance/status lookup (backend internal endpoint exposed via gateway StripPrefix). */
export async function getAccountByNumber(accountNumber) {
  const { data } = await apiClient.get('/api/accounts/internal', {
    params: { accountNumber },
  })
  return data
}

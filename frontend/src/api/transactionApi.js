import { apiClient } from './client'

export async function processTransaction({ referenceId, accountNumber, amount, type }) {
  const { data } = await apiClient.post('/api/transactions', {
    referenceId,
    accountNumber,
    amount,
    type,
  })
  return data
}

export async function reverseTransaction(txnId) {
  const { data } = await apiClient.post(`/api/transactions/reverse/${txnId}`)
  return data
}

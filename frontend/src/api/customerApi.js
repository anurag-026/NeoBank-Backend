import { apiClient } from './client'

export async function createCustomer({ name, phone, email }) {
  const { data } = await apiClient.post('/api/customers', { name, phone, email })
  return data
}

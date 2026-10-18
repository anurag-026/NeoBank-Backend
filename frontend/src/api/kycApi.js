import { apiClient } from './client'

export async function submitKyc(customerId, { panNumber, aadharNumber }) {
  const { data } = await apiClient.post(`/api/kyc/${customerId}`, {
    panNumber,
    aadharNumber,
  })
  return data
}

export async function verifyPan(pan) {
  const { data } = await apiClient.post('/api/kyc/verify_pan', null, {
    params: { pan },
  })
  return data
}

export async function startDigilocker() {
  const { data } = await apiClient.get('/api/kyc/digilocker')
  return data
}

export async function checkDigilockerStatus(id) {
  const { data } = await apiClient.get(`/api/kyc/status/${id}`)
  return data
}

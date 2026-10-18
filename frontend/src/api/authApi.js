import { authClient } from './client'

export async function registerUser(payload) {
  const { data } = await authClient.post('/user/register', {
    username: payload.username,
    password: payload.password,
    branchId: payload.branchId || '',
    employeeCode: payload.employeeCode || '',
    phoneNumber: payload.phoneNumber,
    email: payload.email,
  })
  return data
}

export async function requestOtpLogin(userName, password) {
  const { data } = await authClient.post('/auth/login', null, {
    params: { userName, password },
  })
  return data
}

export async function exchangeOtpForToken(username, otp) {
  const body = new URLSearchParams()
  body.set('grant_type', 'otp')
  body.set('username', username)
  body.set('otp', otp)

  const { data } = await authClient.post('/oauth2/token', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  return data
}

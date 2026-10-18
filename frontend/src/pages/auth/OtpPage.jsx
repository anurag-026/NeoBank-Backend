import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { AuthFrame } from './LoginPage'
import { useAuth } from '../../context/AuthContext'
import ErrorAlert from '../../components/common/ErrorAlert'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  otp: z.string().regex(/^\d{4,8}$/, 'Enter the OTP you received'),
})

export default function OtpPage() {
  const { verifyOtp, pendingUsername } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const username = location.state?.username || pendingUsername
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { otp: '' } })

  if (!username) {
    navigate('/login', { replace: true })
    return null
  }

  const onSubmit = async (values) => {
    setError('')
    setSubmitting(true)
    try {
      await verifyOtp(values.otp, username)
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'OTP verification failed. Use the same device/browser session as login.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame
      title="Enter OTP"
      subtitle={`We sent a one-time password for ${username}. Keep this browser tab open — OTP is bound to your device id.`}
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          <TextField
            label="One-time password"
            inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code' }}
            {...register('otp')}
            error={Boolean(errors.otp)}
            helperText={errors.otp?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify and continue'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            OTP delivery requires configured SMS/email on auth-service. In local setups, check service logs if messages are not delivered.
          </Typography>
        </Stack>
      </Box>
    </AuthFrame>
  )
}

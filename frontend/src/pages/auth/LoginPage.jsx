import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../../context/AuthContext'
import ErrorAlert from '../../components/common/ErrorAlert'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  userName: z.string().min(2, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const { loginWithPassword } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { userName: '', password: '' } })

  const onSubmit = async (values) => {
    setError('')
    setSubmitting(true)
    try {
      await loginWithPassword(values.userName, values.password)
      navigate('/otp', { state: { username: values.userName } })
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Check your username and password.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Sign in" subtitle="Enter your NeoBank credentials to receive a one-time password.">
      <ErrorAlert message={error} onClose={() => setError('')} />
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Username"
            autoComplete="username"
            {...register('userName')}
            error={Boolean(errors.userName)}
            helperText={errors.userName?.message}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={submitting}>
            {submitting ? 'Sending OTP…' : 'Continue'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            New to NeoBank?{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              Create an account
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthFrame>
  )
}

export function AuthFrame({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        background: `
          radial-gradient(800px 300px at 80% 0%, rgba(20,184,166,0.12), transparent),
          #F1F5F9
        `,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="overline" color="secondary" sx={{ letterSpacing: 2 }}>
            NeoBank
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5, mb: 1 }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
          {children}
        </CardContent>
      </Card>
    </Box>
  )
}

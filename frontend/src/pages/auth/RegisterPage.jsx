import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material'
import { AuthFrame } from './LoginPage'
import { useAuth } from '../../context/AuthContext'
import ErrorAlert from '../../components/common/ErrorAlert'
import { getErrorMessage } from '../../utils/errors'

const schema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
    email: z.string().email('Enter a valid email'),
    phoneNumber: z.string().min(8, 'Enter a phone number for OTP SMS'),
    branchId: z.string().optional(),
    employeeCode: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      phoneNumber: '',
      branchId: '',
      employeeCode: '',
    },
  })

  const onSubmit = async (values) => {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const data = await registerUser(values)
      setSuccess(
        `User “${data?.userName || values.username}” created (id ${data?.id ?? 'n/a'}). An administrator must assign roles before banking APIs will authorize you.`,
      )
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Create account" subtitle="Register a NeoBank identity. Role assignment is required after signup.">
      <ErrorAlert message={error} onClose={() => setError('')} />
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          <TextField label="Username" {...register('username')} error={Boolean(errors.username)} helperText={errors.username?.message} />
          <TextField label="Email" {...register('email')} error={Boolean(errors.email)} helperText={errors.email?.message} />
          <TextField label="Phone number" {...register('phoneNumber')} error={Boolean(errors.phoneNumber)} helperText={errors.phoneNumber?.message} />
          <TextField label="Password" type="password" {...register('password')} error={Boolean(errors.password)} helperText={errors.password?.message} />
          <TextField
            label="Confirm password"
            type="password"
            {...register('confirmPassword')}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
          />
          <TextField label="Branch ID (optional)" {...register('branchId')} />
          <TextField label="Employee code (optional)" {...register('employeeCode')} />
          <Button type="submit" variant="contained" size="large" disabled={submitting}>
            {submitting ? 'Creating…' : 'Register'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Already registered?{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              Sign in
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthFrame>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../components/common/PageHeader'
import ErrorAlert from '../components/common/ErrorAlert'
import UnavailableNotice from '../components/common/UnavailableNotice'
import StatusChip from '../components/common/StatusChip'
import { createCustomer } from '../api/customerApi'
import { submitKyc, verifyPan } from '../api/kycApi'
import { getErrorMessage } from '../utils/errors'

const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(8, 'Phone is required'),
  email: z.string().email('Valid email required'),
})

const kycSchema = z.object({
  customerId: z.coerce.number().positive('Customer id required'),
  panNumber: z.string().min(5, 'PAN required'),
  aadharNumber: z.string().min(8, 'Aadhaar required'),
})

export default function OnboardingPage() {
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState(null)
  const [kyc, setKyc] = useState(null)
  const [panResult, setPanResult] = useState('')
  const [busy, setBusy] = useState(false)

  const customerForm = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', phone: '', email: '' },
  })
  const kycForm = useForm({
    resolver: zodResolver(kycSchema),
    defaultValues: { customerId: '', panNumber: '', aadharNumber: '' },
  })

  const onCreateCustomer = async (values) => {
    setBusy(true)
    setError('')
    try {
      const data = await createCustomer(values)
      setCustomer(data)
      kycForm.setValue('customerId', data.id)
    } catch (err) {
      setError(getErrorMessage(err, 'Customer creation failed. One customer per user id.'))
    } finally {
      setBusy(false)
    }
  }

  const onSubmitKyc = async (values) => {
    setBusy(true)
    setError('')
    try {
      const data = await submitKyc(values.customerId, {
        panNumber: values.panNumber,
        aadharNumber: values.aadharNumber,
      })
      setKyc(data)
    } catch (err) {
      setError(getErrorMessage(err, 'KYC submit failed.'))
    } finally {
      setBusy(false)
    }
  }

  const onVerifyPan = async () => {
    const pan = kycForm.getValues('panNumber')
    if (!pan) {
      setError('Enter a PAN first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await verifyPan(pan)
      setPanResult(typeof data === 'string' ? data : JSON.stringify(data))
    } catch (err) {
      setError(getErrorMessage(err, 'PAN verify proxy failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Onboarding & KYC"
        subtitle="Create your customer profile, then submit KYC details required before opening an account."
      />
      <UnavailableNotice title="KYC verification path">
        Backend <code>KycService.submitKyc</code> currently leaves Setu verification commented out, so submit often returns
        REJECTED. PAN verify is a separate proxy call and does not automatically activate the customer.
      </UnavailableNotice>

      <ErrorAlert message={error} onClose={() => setError('')} />

      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              1. Create customer
            </Typography>
            <Box component="form" onSubmit={customerForm.handleSubmit(onCreateCustomer)}>
              <Stack spacing={2}>
                <TextField label="Full name" {...customerForm.register('name')} error={Boolean(customerForm.formState.errors.name)} helperText={customerForm.formState.errors.name?.message} />
                <TextField label="Phone" {...customerForm.register('phone')} error={Boolean(customerForm.formState.errors.phone)} helperText={customerForm.formState.errors.phone?.message} />
                <TextField label="Email" {...customerForm.register('email')} error={Boolean(customerForm.formState.errors.email)} helperText={customerForm.formState.errors.email?.message} />
                <Button type="submit" variant="contained" disabled={busy}>
                  Create customer
                </Button>
              </Stack>
            </Box>
            {customer ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                Customer #{customer.id} · {customer.name} · <StatusChip status={customer.status} />
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Submit KYC
            </Typography>
            <Box component="form" onSubmit={kycForm.handleSubmit(onSubmitKyc)}>
              <Stack spacing={2}>
                <TextField label="Customer ID" type="number" {...kycForm.register('customerId')} error={Boolean(kycForm.formState.errors.customerId)} helperText={kycForm.formState.errors.customerId?.message} />
                <TextField label="PAN" {...kycForm.register('panNumber')} error={Boolean(kycForm.formState.errors.panNumber)} helperText={kycForm.formState.errors.panNumber?.message} />
                <TextField label="Aadhaar" {...kycForm.register('aadharNumber')} error={Boolean(kycForm.formState.errors.aadharNumber)} helperText={kycForm.formState.errors.aadharNumber?.message} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button type="submit" variant="contained" disabled={busy}>
                    Submit KYC
                  </Button>
                  <Button variant="outlined" disabled={busy} onClick={onVerifyPan}>
                    Proxy PAN verify
                  </Button>
                </Stack>
              </Stack>
            </Box>
            {kyc ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                KYC record #{kyc.id} status <StatusChip status={kyc.status} />
              </Alert>
            ) : null}
            {panResult ? (
              <Alert severity="info" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
                PAN proxy response: {panResult}
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}

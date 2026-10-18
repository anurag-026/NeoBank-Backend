import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../components/common/PageHeader'
import ErrorAlert from '../components/common/ErrorAlert'
import ConfirmDialog from '../components/common/ConfirmDialog'
import UnavailableNotice from '../components/common/UnavailableNotice'
import StatusChip from '../components/common/StatusChip'
import { useAuth } from '../context/AuthContext'
import { processTransaction, reverseTransaction } from '../api/transactionApi'
import { getAccountByNumber } from '../api/accountApi'
import { loadKnownAccounts } from '../utils/accountStore'
import { pushActivity } from '../utils/activityStore'
import { formatCurrency } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

const schema = z.object({
  accountNumber: z.string().min(6, 'Account number is required'),
  type: z.enum(['CREDIT', 'DEBIT']),
  amount: z.coerce.number().positive('Amount must be greater than 0').max(50000, 'Backend limit is 50,000'),
  referenceId: z.string().min(3, 'Reference id is required for idempotency'),
})

const steps = ['Details', 'Review', 'Result']

export default function PaymentsPage() {
  const { userId, hasAuthority } = useAuth()
  const known = useMemo(() => loadKnownAccounts(userId), [userId])
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [previewBalance, setPreviewBalance] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      accountNumber: known[0]?.accountNumber || '',
      type: 'CREDIT',
      amount: 100,
      referenceId: `ref-${Date.now()}`,
    },
  })

  if (!hasAuthority('TRANSFER_MONEY')) {
    return (
      <Box>
        <PageHeader title="Payments" subtitle="Debit and credit an account." />
        <Alert severity="warning">Your token does not include TRANSFER_MONEY. Ask an administrator to grant this permission.</Alert>
      </Box>
    )
  }

  const values = form.getValues()

  const goReview = async (data) => {
    setError('')
    setSubmitting(true)
    try {
      const account = await getAccountByNumber(data.accountNumber)
      setPreviewBalance(account)
      setStep(1)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load account for review.'))
    } finally {
      setSubmitting(false)
    }
  }

  const submitPayment = async () => {
    setSubmitting(true)
    setError('')
    const payload = form.getValues()
    try {
      const response = await processTransaction({
        accountNumber: payload.accountNumber,
        amount: payload.amount,
        type: payload.type,
        referenceId: payload.referenceId,
      })
      pushActivity(userId, {
        txnId: response.txnId,
        status: response.status,
        amount: response.amount,
        type: payload.type,
        accountNumber: payload.accountNumber,
        referenceId: payload.referenceId,
      })
      setResult({ ...response, type: payload.type, accountNumber: payload.accountNumber, referenceId: payload.referenceId })
      setConfirmOpen(false)
      setStep(2)
    } catch (err) {
      setError(getErrorMessage(err, 'Payment failed. No success is assumed without a SUCCESS response.'))
      setConfirmOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const onReverse = async () => {
    if (!result?.txnId) return
    setSubmitting(true)
    setError('')
    try {
      const response = await reverseTransaction(result.txnId)
      pushActivity(userId, {
        txnId: response.txnId,
        status: response.status,
        amount: response.amount,
        type: result.type === 'CREDIT' ? 'DEBIT' : 'CREDIT',
        accountNumber: result.accountNumber,
        referenceId: `reverse-${result.txnId}`,
      })
      setResult({
        ...response,
        type: result.type === 'CREDIT' ? 'DEBIT' : 'CREDIT',
        accountNumber: result.accountNumber,
        referenceId: `reverse-of-${result.txnId}`,
        reversedOf: result.txnId,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Reversal failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Payments"
        subtitle="Single-account CREDIT or DEBIT via transaction-service. This is not peer-to-peer transfer."
      />
      <UnavailableNotice title="No NEFT / RTGS / IMPS / beneficiary APIs">
        The backend only supports <strong>DEBIT</strong> and <strong>CREDIT</strong> on one account number, with optional
        reversal of a successful transaction.
      </UnavailableNotice>

      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <ErrorAlert message={error} onClose={() => setError('')} />

      {step === 0 ? (
        <Card>
          <CardContent>
            <Box component="form" onSubmit={form.handleSubmit(goReview)}>
              <Stack spacing={2}>
                {known.length > 0 ? (
                  <TextField
                    select
                    label="Account number"
                    defaultValue={known[0].accountNumber}
                    {...form.register('accountNumber')}
                    error={Boolean(form.formState.errors.accountNumber)}
                    helperText={form.formState.errors.accountNumber?.message}
                  >
                    {known.map((a) => (
                      <MenuItem key={a.accountNumber} value={a.accountNumber}>
                        {a.accountNumber} ({a.type || 'Account'})
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    label="Account number"
                    {...form.register('accountNumber')}
                    error={Boolean(form.formState.errors.accountNumber)}
                    helperText={form.formState.errors.accountNumber?.message}
                  />
                )}
                <TextField select label="Type" defaultValue="CREDIT" {...form.register('type')}>
                  <MenuItem value="CREDIT">Credit (deposit)</MenuItem>
                  <MenuItem value="DEBIT">Debit (withdraw)</MenuItem>
                </TextField>
                <TextField
                  label="Amount"
                  type="number"
                  {...form.register('amount')}
                  error={Boolean(form.formState.errors.amount)}
                  helperText={form.formState.errors.amount?.message || 'Maximum 50,000 per backend rule'}
                />
                <TextField
                  label="Reference ID"
                  {...form.register('referenceId')}
                  error={Boolean(form.formState.errors.referenceId)}
                  helperText={form.formState.errors.referenceId?.message || 'Used for idempotency'}
                />
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Checking account…' : 'Review'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Review payment
            </Typography>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Row label="Account" value={values.accountNumber} />
              <Row label="Current balance" value={formatCurrency(previewBalance?.balance)} />
              <Row label="Account status" value={<StatusChip status={previewBalance?.status} />} />
              <Row label="Type" value={<StatusChip status={values.type} />} />
              <Row label="Amount" value={formatCurrency(values.amount)} />
              <Row label="Reference" value={values.referenceId} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setStep(0)}>Back</Button>
              <Button variant="contained" onClick={() => setConfirmOpen(true)}>
                Confirm payment
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && result ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment result
            </Typography>
            <Alert severity={result.status === 'SUCCESS' ? 'success' : 'warning'} sx={{ mb: 2 }}>
              Backend status: <strong>{result.status}</strong>
            </Alert>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Row label="Transaction ID" value={result.txnId} />
              <Row label="Amount" value={formatCurrency(result.amount)} />
              <Row label="Type" value={result.type} />
              <Row label="Account" value={result.accountNumber} />
              {result.reversedOf ? <Row label="Reversal of" value={result.reversedOf} /> : null}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  setStep(0)
                  setResult(null)
                  form.setValue('referenceId', `ref-${Date.now()}`)
                }}
              >
                New payment
              </Button>
              {result.status === 'SUCCESS' && !result.reversedOf ? (
                <Button color="warning" variant="contained" disabled={submitting} onClick={onReverse}>
                  Reverse this transaction
                </Button>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm payment"
        description={`Submit ${values.type} of ${formatCurrency(values.amount)} on account ${values.accountNumber}? This will call the transaction API once.`}
        confirmLabel="Submit"
        loading={submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitPayment}
      />
    </Box>
  )
}

function Row({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={600} sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}

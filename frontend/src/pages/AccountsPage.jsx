import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import StatusChip from '../components/common/StatusChip'
import UnavailableNotice from '../components/common/UnavailableNotice'
import { useAuth } from '../context/AuthContext'
import { createAccount, getAccountByNumber } from '../api/accountApi'
import { loadKnownAccounts, removeKnownAccount, saveKnownAccount } from '../utils/accountStore'
import { formatCurrency, maskAccountNumber } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

const openSchema = z.object({
  accountType: z.enum(['SAVING', 'CURRENT']),
  intialDeposit: z.coerce.number().min(1000, 'Minimum initial deposit is 1000'),
})

const lookupSchema = z.object({
  accountNumber: z.string().min(6, 'Enter an account number'),
})

export default function AccountsPage() {
  const { userId, hasAuthority } = useAuth()
  const [accounts, setAccounts] = useState(() => loadKnownAccounts(userId))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)

  const openForm = useForm({
    resolver: zodResolver(openSchema),
    defaultValues: { accountType: 'SAVING', intialDeposit: 1000 },
  })
  const lookupForm = useForm({
    resolver: zodResolver(lookupSchema),
    defaultValues: { accountNumber: '' },
  })

  useEffect(() => {
    setAccounts(loadKnownAccounts(userId))
  }, [userId])

  const refreshOne = async (accountNumber, type) => {
    const data = await getAccountByNumber(accountNumber)
    const merged = {
      accountNumber: data.accountNumber,
      balance: data.balance,
      status: data.status,
      type: type || data.type,
    }
    setAccounts(saveKnownAccount(userId, merged))
    return merged
  }

  const onOpenAccount = async (values) => {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const created = await createAccount(values)
      setAccounts(saveKnownAccount(userId, created))
      setSuccess(`Account ${created.accountNumber} opened with balance ${formatCurrency(created.balance)}.`)
      setOpenDialog(false)
      openForm.reset({ accountType: 'SAVING', intialDeposit: 1000 })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not open account. Customer must be ACTIVE with VERIFIED KYC, and you need CREATE_ACCOUNT.'))
    } finally {
      setSubmitting(false)
    }
  }

  const onLookup = async (values) => {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const data = await refreshOne(values.accountNumber)
      setSelected(data)
      setSuccess(`Loaded live status for ${maskAccountNumber(data.accountNumber)}.`)
      lookupForm.reset()
    } catch (err) {
      setError(getErrorMessage(err, 'Account lookup failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Accounts"
        subtitle="Open a new account or look up a live balance by account number."
        action={
          hasAuthority('CREATE_ACCOUNT') ? (
            <Button variant="contained" onClick={() => setOpenDialog(true)}>
              Open account
            </Button>
          ) : null
        }
      />

      <UnavailableNotice>
        The backend does not expose “list accounts for current user”. NeoBank stores account numbers you create or look up in
        this browser, then refreshes balances through <code>GET /api/accounts/internal</code>.
      </UnavailableNotice>

      <ErrorAlert message={error} onClose={() => setError('')} />
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      ) : null}

      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Look up account
          </Typography>
          <Box component="form" onSubmit={lookupForm.handleSubmit(onLookup)}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label="Account number"
                {...lookupForm.register('accountNumber')}
                error={Boolean(lookupForm.formState.errors.accountNumber)}
                helperText={lookupForm.formState.errors.accountNumber?.message}
              />
              <Button type="submit" variant="outlined" disabled={submitting} sx={{ minWidth: 140 }}>
                Fetch live
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {!accounts.length ? (
        <EmptyState
          title="No accounts saved in this browser"
          description={
            hasAuthority('CREATE_ACCOUNT')
              ? 'Open an account after customer onboarding and KYC verification.'
              : 'Your token needs CREATE_ACCOUNT to open accounts, or look up an existing number above.'
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {accounts.map((account) => (
            <Card key={account.accountNumber}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {account.type || 'Account'}
                    </Typography>
                    <Typography variant="h6">{account.accountNumber}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Masked: {maskAccountNumber(account.accountNumber)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography variant="h5">{formatCurrency(account.lastKnownBalance ?? account.balance)}</Typography>
                    <StatusChip status={account.status} />
                    <Stack direction="row" spacing={1} justifyContent={{ sm: 'flex-end' }} mt={1.5}>
                      <Button
                        size="small"
                        onClick={async () => {
                          try {
                            const live = await refreshOne(account.accountNumber, account.type)
                            setSelected(live)
                          } catch (err) {
                            setError(getErrorMessage(err))
                          }
                        }}
                      >
                        Refresh
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => setAccounts(removeKnownAccount(userId, account.accountNumber))}
                      >
                        Remove from list
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {selected ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Selected {selected.accountNumber}: balance {formatCurrency(selected.balance)}, status {selected.status}.
        </Alert>
      ) : null}

      <Dialog open={openDialog} onClose={() => !submitting && setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Open account</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Requires authority CREATE_ACCOUNT. Customer linked to your user must be ACTIVE with KYC VERIFIED. Minimum deposit
            1000.
          </Typography>
          <Box component="form" id="open-account-form" onSubmit={openForm.handleSubmit(onOpenAccount)}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Account type" {...openForm.register('accountType')}>
                <MenuItem value="SAVING">Savings</MenuItem>
                <MenuItem value="CURRENT">Current</MenuItem>
              </TextField>
              <TextField
                label="Initial deposit"
                type="number"
                {...openForm.register('intialDeposit')}
                error={Boolean(openForm.formState.errors.intialDeposit)}
                helperText={openForm.formState.errors.intialDeposit?.message || 'Field name matches backend: intialDeposit'}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="open-account-form" variant="contained" disabled={submitting}>
            {submitting ? 'Opening…' : 'Confirm open'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

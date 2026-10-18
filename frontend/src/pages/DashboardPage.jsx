import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeftRight, Plus, RefreshCw } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import LoadingState from '../components/common/LoadingState'
import EmptyState from '../components/common/EmptyState'
import ErrorAlert from '../components/common/ErrorAlert'
import UnavailableNotice from '../components/common/UnavailableNotice'
import StatusChip from '../components/common/StatusChip'
import { useAuth } from '../context/AuthContext'
import { getAccountByNumber } from '../api/accountApi'
import { loadKnownAccounts, saveKnownAccount } from '../utils/accountStore'
import { loadActivity } from '../utils/activityStore'
import { formatCurrency, maskAccountNumber } from '../utils/format'
import { getErrorMessage, isBackendUnreachable } from '../utils/errors'

export default function DashboardPage() {
  const { userId, hasAuthority } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const activity = useMemo(() => loadActivity(userId), [userId])

  const refresh = async () => {
    setLoading(true)
    setError('')
    const known = loadKnownAccounts(userId)
    if (!known.length) {
      setAccounts([])
      setLoading(false)
      return
    }
    try {
      const live = await Promise.all(
        known.map(async (item) => {
          try {
            const data = await getAccountByNumber(item.accountNumber)
            const merged = {
              accountNumber: data.accountNumber,
              balance: data.balance,
              status: data.status,
              type: item.type,
            }
            saveKnownAccount(userId, { ...merged, type: item.type })
            return { ...merged, ok: true }
          } catch (err) {
            return {
              ...item,
              balance: item.lastKnownBalance,
              ok: false,
              unreachable: isBackendUnreachable(err),
              error: getErrorMessage(err),
            }
          }
        }),
      )
      setAccounts(live)
      if (live.length && live.every((a) => a.unreachable)) {
        setError('Banking services are offline. Balances below are last known values from this browser.')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // After the offline banner Retry succeeds, reload balances once (no interval polling).
  useEffect(() => {
    const onBack = () => {
      refresh()
    }
    window.addEventListener('neobank-backend-up', onBack)
    return () => window.removeEventListener('neobank-backend-up', onBack)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const totalBalance = accounts
    .filter((a) => a.ok !== false && a.balance != null)
    .reduce((sum, a) => sum + Number(a.balance || 0), 0)

  const chartData = useMemo(() => {
    const credits = activity.filter((a) => a.type === 'CREDIT' && a.status === 'SUCCESS')
    const debits = activity.filter((a) => a.type === 'DEBIT' && a.status === 'SUCCESS')
    return [
      {
        name: 'Session',
        credit: credits.reduce((s, a) => s + Number(a.amount || 0), 0),
        debit: debits.reduce((s, a) => s + Number(a.amount || 0), 0),
      },
    ]
  }, [activity])

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Balances are loaded live from the account service for accounts you have opened or looked up in this browser."
        action={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshCw size={16} />} onClick={refresh} variant="outlined">
              Refresh
            </Button>
            {hasAuthority('CREATE_ACCOUNT') ? (
              <Button component={RouterLink} to="/app/accounts" variant="contained" startIcon={<Plus size={16} />}>
                Open account
              </Button>
            ) : null}
          </Stack>
        }
      />

      <UnavailableNotice title="Backend coverage">
        There is no “list my accounts” or “list transactions” API. NeoBank shows live balances for saved account numbers and
        session activity from payments you make in this browser — not a full bank statement.
      </UnavailableNotice>

      <ErrorAlert message={error} onClose={() => setError('')} />

      {loading ? <LoadingState label="Refreshing balances…" /> : null}

      {!loading ? (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            }}
          >
            <MetricCard label="Live total (saved accounts)" value={formatCurrency(totalBalance)} hint={`${accounts.length} account(s)`} />
            <MetricCard
              label="Session credits"
              value={formatCurrency(chartData[0]?.credit || 0)}
              hint="Successful CREDIT ops this session"
            />
            <MetricCard
              label="Session debits"
              value={formatCurrency(chartData[0]?.debit || 0)}
              hint="Successful DEBIT ops this session"
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
            }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Accounts
                </Typography>
                {!accounts.length ? (
                  <EmptyState
                    title="No saved accounts yet"
                    description="Open an account or look one up by number on the Accounts page. Numbers are stored locally in your browser for convenience."
                    action={
                      <Button component={RouterLink} to="/app/accounts" variant="contained">
                        Go to accounts
                      </Button>
                    }
                  />
                ) : (
                  <Stack spacing={1.5}>
                    {accounts.map((account) => (
                      <Box
                        key={account.accountNumber}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'background.default',
                        }}
                      >
                        <Box>
                          <Typography fontWeight={600}>{maskAccountNumber(account.accountNumber)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {account.type || 'Account'} · full number on Accounts page
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography fontWeight={700}>{formatCurrency(account.balance)}</Typography>
                          <StatusChip status={account.status} />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Session cashflow
                </Typography>
                <Box sx={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="credit" fill="#0F766E" name="Credit" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="debit" fill="#DC2626" name="Debit" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Chart uses only payments executed in this browser session.
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent session activity</Typography>
                {hasAuthority('TRANSFER_MONEY') ? (
                  <Button component={RouterLink} to="/app/payments" startIcon={<ArrowLeftRight size={16} />}>
                    Make a payment
                  </Button>
                ) : null}
              </Stack>
              {!activity.length ? (
                <EmptyState title="No session activity" description="Debit and credit results from this browser appear here." />
              ) : (
                <Stack spacing={1}>
                  {activity.slice(0, 5).map((item) => (
                    <Box
                      key={`${item.txnId}-${item.recordedAt}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>
                          {item.type} · {maskAccountNumber(item.accountNumber)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ref {item.txnId}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={700} color={item.type === 'CREDIT' ? 'success.main' : 'error.main'}>
                          {item.type === 'CREDIT' ? '+' : '−'}
                          {formatCurrency(item.amount)}
                        </Typography>
                        <StatusChip status={item.status} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      ) : null}
    </Box>
  )
}

function MetricCard({ label, value, hint }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  )
}

import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import StatusChip from '../components/common/StatusChip'
import UnavailableNotice from '../components/common/UnavailableNotice'
import { useAuth } from '../context/AuthContext'
import { loadActivity } from '../utils/activityStore'
import { formatCurrency, formatDateTime, maskAccountNumber } from '../utils/format'

export default function ActivityPage() {
  const { userId } = useAuth()
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const activity = useMemo(() => loadActivity(userId), [userId])

  const filtered = activity.filter((item) => {
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    return true
  })

  return (
    <Box>
      <PageHeader
        title="Activity"
        subtitle="Payments recorded in this browser session after calling the transaction API."
      />
      <UnavailableNotice title="No transaction history API">
        NeoBank cannot download a full statement. Only operations completed in this session are listed, and they are labeled
        as session data — not an official bank statement.
      </UnavailableNotice>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="ALL">All types</MenuItem>
          <MenuItem value="CREDIT">Credit</MenuItem>
          <MenuItem value="DEBIT">Debit</MenuItem>
        </TextField>
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All statuses</MenuItem>
          <MenuItem value="SUCCESS">Success</MenuItem>
          <MenuItem value="FAILED">Failed</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
        </TextField>
      </Stack>

      {!filtered.length ? (
        <EmptyState title="No matching activity" description="Make a payment to see results here." />
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((item) => (
            <Card key={`${item.txnId}-${item.recordedAt}`}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                  <Box>
                    <Typography fontWeight={700}>
                      {item.type} · {maskAccountNumber(item.accountNumber)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Txn {item.txnId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Session record · {formatDateTime(item.recordedAt)} · ref {item.referenceId || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { sm: 'right' } }}>
                    <Typography
                      variant="h6"
                      color={item.type === 'CREDIT' ? 'success.main' : 'error.main'}
                      aria-label={`${item.type} ${item.amount}`}
                    >
                      {item.type === 'CREDIT' ? '+' : '−'}
                      {formatCurrency(item.amount)}
                    </Typography>
                    <StatusChip status={item.status} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  )
}

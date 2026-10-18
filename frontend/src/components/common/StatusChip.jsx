import { Chip } from '@mui/material'

const map = {
  ACTIVE: { label: 'Active', color: 'success' },
  PENDING: { label: 'Pending', color: 'warning' },
  BLOCKED: { label: 'Blocked', color: 'error' },
  SUCCESS: { label: 'Success', color: 'success' },
  FAILED: { label: 'Failed', color: 'error' },
  REJECTED: { label: 'Rejected', color: 'error' },
  VERIFIED: { label: 'Verified', color: 'success' },
  CREDIT: { label: 'Credit', color: 'success' },
  DEBIT: { label: 'Debit', color: 'error' },
  SAVING: { label: 'Savings', color: 'info' },
  CURRENT: { label: 'Current', color: 'primary' },
}

export default function StatusChip({ status }) {
  const key = String(status || '').toUpperCase()
  const cfg = map[key] || { label: status || 'Unknown', color: 'default' }
  return <Chip size="small" label={cfg.label} color={cfg.color} variant="outlined" />
}

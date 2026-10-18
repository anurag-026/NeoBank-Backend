import { Alert, AlertTitle } from '@mui/material'

export default function ErrorAlert({ title = 'Unable to complete request', message, onClose }) {
  if (!message) return null
  return (
    <Alert severity="error" onClose={onClose} sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  )
}

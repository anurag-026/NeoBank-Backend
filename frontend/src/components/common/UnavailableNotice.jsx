import { Alert, AlertTitle } from '@mui/material'

export default function UnavailableNotice({
  title = 'Not available from the backend',
  children,
}) {
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      {children}
    </Alert>
  )
}

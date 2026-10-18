import { Box, CircularProgress, Typography } from '@mui/material'

export default function LoadingState({ label = 'Loading…' }) {
  return (
    <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <CircularProgress size={36} thickness={4} />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  )
}

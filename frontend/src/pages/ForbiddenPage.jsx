import { Box, Button, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h3" gutterBottom>
          403
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          You do not have permission to view this area.
        </Typography>
        <Button component={RouterLink} to="/app/dashboard" variant="contained">
          Back to dashboard
        </Button>
      </Box>
    </Box>
  )
}

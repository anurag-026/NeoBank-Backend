import { Box, Button, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h3" gutterBottom>
          401
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          You need to sign in to access this page.
        </Typography>
        <Button component={RouterLink} to="/login" variant="contained">
          Sign in
        </Button>
      </Box>
    </Box>
  )
}

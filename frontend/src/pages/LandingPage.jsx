import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(1200px 500px at 10% -10%, rgba(20, 184, 166, 0.18), transparent 60%),
          linear-gradient(160deg, #0B1F3A 0%, #102A4C 45%, #0F766E 140%)
        `,
        color: '#F8FAFC',
      }}
    >
      <Container maxWidth="md" sx={{ pt: { xs: 10, md: 16 }, pb: 10 }}>
        <Typography variant="overline" sx={{ letterSpacing: 3, opacity: 0.8 }}>
          NeoBank
        </Typography>
        <Typography
          variant="h2"
          sx={{
            mt: 1,
            mb: 2,
            fontFamily: '"Source Serif 4", serif',
            maxWidth: 640,
            lineHeight: 1.15,
          }}
        >
          Banking that stays clear, secure, and in your control.
        </Typography>
        <Typography sx={{ maxWidth: 520, opacity: 0.85, mb: 4, fontSize: '1.1rem' }}>
          Sign in to manage accounts, complete onboarding, and move money through the NeoBank
          services connected to your environment.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {isAuthenticated ? (
            <Button component={RouterLink} to="/app/dashboard" variant="contained" color="secondary" size="large">
              Go to dashboard
            </Button>
          ) : (
            <>
              <Button component={RouterLink} to="/login" variant="contained" color="secondary" size="large">
                Sign in
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
                size="large"
                sx={{ borderColor: 'rgba(248,250,252,0.4)', color: '#F8FAFC' }}
              >
                Create account
              </Button>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

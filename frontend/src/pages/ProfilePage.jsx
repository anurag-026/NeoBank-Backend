import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import PageHeader from '../components/common/PageHeader'
import UnavailableNotice from '../components/common/UnavailableNotice'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { username, userId, authorities, token } = useAuth()

  return (
    <Box>
      <PageHeader title="Profile" subtitle="Identity details from your access token." />
      <UnavailableNotice title="No profile API">
        The backend does not expose customer self-service profile edit, password change, or device management endpoints. This
        page shows claims from the JWT issued by auth-service.
      </UnavailableNotice>

      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Row label="Username" value={username || '—'} />
            <Row label="User ID" value={userId ?? '—'} />
            <Box>
              <Typography color="text.secondary" gutterBottom>
                Authorities
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {authorities.length ? (
                  authorities.map((a) => <Chip key={a} label={a} size="small" />)
                ) : (
                  <Typography variant="body2">No authorities in token. Admin must assign roles/permissions.</Typography>
                )}
              </Stack>
            </Box>
            <Alert severity="info">
              Access token is kept in <strong>sessionStorage</strong> for this SPA. Prefer closing the browser tab when finished
              on a shared device. Token present: {token ? 'yes' : 'no'}.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

function Row({ label, value }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={600}>{String(value)}</Typography>
    </Box>
  )
}

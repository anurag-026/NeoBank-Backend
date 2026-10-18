import { useEffect, useState } from 'react'
import { Alert, AlertTitle, Button, Stack } from '@mui/material'
import { pingBackend, subscribeBackendStatus } from '../../api/client'

/**
 * Single place that reacts when the API clients detect the backend containers are offline.
 * Stops automatic “Retry” polling — the user must click Retry after bringing services back up.
 */
export default function BackendDownBanner() {
  const [offline, setOffline] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => subscribeBackendStatus((ok) => setOffline(!ok)), [])

  if (!offline) return null

  return (
    <Alert
      severity="error"
      variant="filled"
      sx={{ borderRadius: 0, alignItems: 'center' }}
      action={
        <Button
          color="inherit"
          size="small"
          disabled={checking}
          onClick={async () => {
            setChecking(true)
            try {
              const ok = await pingBackend()
              if (!ok) setOffline(true)
            } finally {
              setChecking(false)
            }
          }}
        >
          {checking ? 'Checking…' : 'Retry'}
        </Button>
      }
    >
      <Stack spacing={0.25}>
        <AlertTitle sx={{ mb: 0 }}>Service unavailable</AlertTitle>
        Banking backend is offline (containers stopped or unreachable). Requests are paused until you retry.
      </Stack>
    </Alert>
  )
}

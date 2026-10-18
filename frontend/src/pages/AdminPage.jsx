import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../components/common/PageHeader'
import ErrorAlert from '../components/common/ErrorAlert'
import { useAuth } from '../context/AuthContext'
import {
  assignPermissionToRole,
  assignRoleToUser,
  removePermissionFromRole,
  removeRoleFromUser,
} from '../api/adminApi'
import { getErrorMessage } from '../utils/errors'

const roleSchema = z.object({
  userId: z.coerce.number().positive(),
  roleId: z.coerce.number().positive(),
})

const permSchema = z.object({
  roleId: z.coerce.number().positive(),
  permissionId: z.coerce.number().positive(),
})

export default function AdminPage() {
  const { hasRole } = useAuth()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const roleForm = useForm({ resolver: zodResolver(roleSchema), defaultValues: { userId: '', roleId: '' } })
  const permForm = useForm({ resolver: zodResolver(permSchema), defaultValues: { roleId: '', permissionId: '' } })

  if (!hasRole('ADMIN') && !hasRole('ROLE_ADMIN')) {
    return <Alert severity="error">Administration requires ROLE_ADMIN.</Alert>
  }

  const run = async (fn, successMsg) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const data = await fn()
      setMessage(typeof data === 'string' ? data : successMsg)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Administration"
        subtitle="Assign seeded roles and permissions. IDs come from the auth database (Flyway seeds ROLE_ADMIN=1 typically)."
      />
      <Alert severity="warning" sx={{ mb: 2 }}>
        Seeded roles: ROLE_ADMIN, ROLE_BANKER, ROLE_CUSTOMER. Permissions: CREATE_ACCOUNT, VIEW_ACCOUNT, TRANSFER_MONEY,
        APPROVE_TRNASACTION. Confirm numeric IDs in your database before assigning.
      </Alert>
      <ErrorAlert message={error} onClose={() => setError('')} />
      {message ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      ) : null}

      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User ↔ role
            </Typography>
            <Box component="form">
              <Stack spacing={2}>
                <TextField label="User ID" type="number" {...roleForm.register('userId')} />
                <TextField label="Role ID" type="number" {...roleForm.register('roleId')} />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    disabled={busy}
                    onClick={roleForm.handleSubmit((v) =>
                      run(() => assignRoleToUser(v.userId, v.roleId), 'Role assigned'),
                    )}
                  >
                    Assign role
                  </Button>
                  <Button
                    color="warning"
                    disabled={busy}
                    onClick={roleForm.handleSubmit((v) =>
                      run(() => removeRoleFromUser(v.userId, v.roleId), 'Role removed'),
                    )}
                  >
                    Remove role
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Role ↔ permission
            </Typography>
            <Stack spacing={2}>
              <TextField label="Role ID" type="number" {...permForm.register('roleId')} />
              <TextField label="Permission ID" type="number" {...permForm.register('permissionId')} />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={permForm.handleSubmit((v) =>
                    run(() => assignPermissionToRole(v.roleId, v.permissionId), 'Permission assigned'),
                  )}
                >
                  Assign permission
                </Button>
                <Button
                  color="warning"
                  disabled={busy}
                  onClick={permForm.handleSubmit((v) =>
                    run(() => removePermissionFromRole(v.roleId, v.permissionId), 'Permission removed'),
                  )}
                >
                  Remove permission
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}

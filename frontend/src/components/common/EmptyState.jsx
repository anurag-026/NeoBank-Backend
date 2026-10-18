import { Box, Typography } from '@mui/material'
import { Inbox } from 'lucide-react'

export default function EmptyState({ title, description, icon: Icon = Inbox, action }) {
  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ color: 'text.secondary', mb: 1.5, display: 'flex', justifyContent: 'center' }}>
        <Icon size={36} strokeWidth={1.5} />
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description ? (
        <Typography color="text.secondary" sx={{ mb: action ? 2 : 0, maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      ) : null}
      {action}
    </Box>
  )
}

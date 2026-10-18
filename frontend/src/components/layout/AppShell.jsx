import { useMemo, useState } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  ArrowLeftRight,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Shield,
  UserRound,
  Wallet,
  FileCheck2,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const drawerWidth = 260

function navItemsFor(auth) {
  const items = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/accounts', label: 'Accounts', icon: Wallet },
    { to: '/app/payments', label: 'Payments', icon: ArrowLeftRight, authority: 'TRANSFER_MONEY' },
    { to: '/app/activity', label: 'Activity', icon: Building2 },
    { to: '/app/onboarding', label: 'Onboarding & KYC', icon: FileCheck2 },
    { to: '/app/profile', label: 'Profile', icon: UserRound },
  ]
  if (auth.hasRole('ADMIN') || auth.hasRole('ROLE_ADMIN')) {
    items.push({ to: '/app/admin', label: 'Administration', icon: Shield })
  }
  return items.filter((item) => !item.authority || auth.hasAuthority(item.authority) || auth.hasRole('ADMIN') || auth.hasRole('ROLE_ADMIN'))
}

export default function AppShell() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const items = useMemo(() => navItemsFor(auth), [auth])

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
      <Box sx={{ px: 2.5, py: 3 }}>
        <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 2 }}>
          NeoBank
        </Typography>
        <Typography variant="h5" sx={{ fontFamily: '"Source Serif 4", serif', mt: 0.5 }}>
          Personal Banking
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {items.map((item) => {
          const Icon = item.icon
          const selected = location.pathname.startsWith(item.to)
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: 'inherit',
                '&.Mui-selected': {
                  bgcolor: 'rgba(20, 184, 166, 0.18)',
                  '&:hover': { bgcolor: 'rgba(20, 184, 166, 0.24)' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                <Icon size={20} />
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: selected ? 600 : 500 }} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ px: 2.5, py: 2, opacity: 0.7 }}>
        <Typography variant="caption">Signed in as</Typography>
        <Typography variant="body2" fontWeight={600}>
          {auth.username || 'User'}
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(241, 245, 249, 0.85)',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar>
          {isMobile ? (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {items.find((i) => location.pathname.startsWith(i.to))?.label || 'NeoBank'}
          </Typography>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontSize: 14 }}>
              {(auth.username || 'N').slice(0, 1).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                navigate('/app/profile')
              }}
            >
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null)
                auth.logout()
                navigate('/login')
              }}
            >
              <LogOut size={16} style={{ marginRight: 8 }} /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, border: 0 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, border: 0 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1200, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

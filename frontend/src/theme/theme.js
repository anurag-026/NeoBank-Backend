import { createTheme, alpha } from '@mui/material/styles'

const navy = '#0B1F3A'
const teal = '#0F766E'
const tealBright = '#14B8A6'
const slate = '#64748B'
const paper = '#F1F5F9'
const ink = '#0F172A'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: navy, dark: '#061324', light: '#1E3A5F', contrastText: '#F8FAFC' },
    secondary: { main: teal, dark: '#115E59', light: tealBright, contrastText: '#FFFFFF' },
    success: { main: '#059669' },
    error: { main: '#DC2626' },
    warning: { main: '#D97706' },
    info: { main: '#0284C7' },
    background: { default: paper, paper: '#FFFFFF' },
    text: { primary: ink, secondary: slate },
    divider: alpha(navy, 0.08),
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 700 },
    h2: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 700 },
    h3: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 2px rgba(11, 31, 58, 0.06)',
    '0 2px 8px rgba(11, 31, 58, 0.08)',
    '0 8px 24px rgba(11, 31, 58, 0.1)',
    ...Array(21).fill('0 8px 24px rgba(11, 31, 58, 0.1)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 18, paddingBlock: 10 },
        containedPrimary: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(navy, 0.08)}`,
          boxShadow: '0 1px 2px rgba(11, 31, 58, 0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: '#FFFFFF' },
      },
    },
  },
})

export default theme

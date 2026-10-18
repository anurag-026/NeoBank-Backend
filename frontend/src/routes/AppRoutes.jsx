import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import OtpPage from '../pages/auth/OtpPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import AccountsPage from '../pages/AccountsPage'
import PaymentsPage from '../pages/PaymentsPage'
import ActivityPage from '../pages/ActivityPage'
import OnboardingPage from '../pages/OnboardingPage'
import ProfilePage from '../pages/ProfilePage'
import AdminPage from '../pages/AdminPage'
import UnauthorizedPage from '../pages/UnauthorizedPage'
import ForbiddenPage from '../pages/ForbiddenPage'
import { GuestRoute, ProtectedRoute, RoleRoute } from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/otp" element={<OtpPage />} />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route element={<RoleRoute role="ADMIN" />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingState from '../components/common/LoadingState'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, bootstrapping } = useAuth()
  const location = useLocation()

  if (bootstrapping) return <LoadingState label="Checking session…" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

export function RoleRoute({ role }) {
  const { hasRole, bootstrapping } = useAuth()
  if (bootstrapping) return <LoadingState />
  if (!hasRole(role) && !hasRole(`ROLE_${role}`)) {
    return <Navigate to="/forbidden" replace />
  }
  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, bootstrapping } = useAuth()
  if (bootstrapping) return <LoadingState />
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />
  return <Outlet />
}

import { Navigate } from 'react-router-dom';
import { useAuth, type Permission } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
}

/**
 * Wraps a route to require authentication.
 * Optionally also checks for a specific permission (role-based).
 */
export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  // Still restoring session — show nothing
  if (isLoading) return null;

  // Not logged in → redirect to login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Logged in but missing required permission → redirect to dashboard
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

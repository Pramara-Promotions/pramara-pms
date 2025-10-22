// web/src/components/auth/RoleGate.tsx
import React from 'react';
import { useAuth } from '../../features/common/AuthProvider';

type RoleGateProps = {
  children: React.ReactNode;
  role?: string;
  anyRoles?: string[];
  requireSuperAdmin?: boolean;
  fallback?: React.ReactNode;
};

/**
 * RoleGate - Conditionally renders children based on user roles
 * 
 * Usage:
 * - <RoleGate role="Admin">...</RoleGate>
 * - <RoleGate anyRoles={["Admin", "Manager"]}>...</RoleGate>
 * - <RoleGate requireSuperAdmin>...</RoleGate>
 * - <RoleGate role="Admin" fallback={<p>Admins only</p>}>...</RoleGate>
 */
export default function RoleGate({
  children,
  role,
  anyRoles,
  requireSuperAdmin = false,
  fallback = null,
}: RoleGateProps) {
  const { hasRole, hasAnyRole, isSuperAdmin } = useAuth();

  let hasAccess = false;

  if (requireSuperAdmin) {
    hasAccess = isSuperAdmin();
  } else if (role) {
    hasAccess = hasRole(role);
  } else if (anyRoles && anyRoles.length > 0) {
    hasAccess = hasAnyRole(...anyRoles);
  } else {
    // No roles specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

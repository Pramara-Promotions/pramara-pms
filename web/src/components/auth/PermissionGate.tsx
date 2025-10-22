// web/src/components/auth/PermissionGate.tsx
import React from 'react';
import { useAuth } from '../../features/common/AuthProvider';

type PermissionGateProps = {
  children: React.ReactNode;
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: React.ReactNode;
};

/**
 * PermissionGate - Conditionally renders children based on user permissions
 * 
 * Usage:
 * - <PermissionGate permission="USER_CREATE">...</PermissionGate>
 * - <PermissionGate anyPermissions={["USER_CREATE", "USER_EDIT"]}>...</PermissionGate>
 * - <PermissionGate allPermissions={["USER_VIEW", "USER_EDIT"]}>...</PermissionGate>
 * - <PermissionGate permission="USER_DELETE" fallback={<p>No access</p>}>...</PermissionGate>
 */
export default function PermissionGate({
  children,
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermissions && anyPermissions.length > 0) {
    hasAccess = hasAnyPermission(...anyPermissions);
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(...allPermissions);
  } else {
    // No permissions specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

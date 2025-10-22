// api/middleware/permissionGuard.js// === FILE: api/middleware/permissionGuard.js ===

/**function permissionGuard(...required) {

 * Permission Guard Middleware  return (req, res, next) => {

 * Checks if authenticated user has required permissions    try {

 *       // Expect req.auth from authGuard: { user, perms:Set<string> }

 * Usage:      if (!req.auth || !req.auth.user) return res.status(401).json({ error: "Unauthorized" });

 *   permissionGuard('PROJECT_EDIT')  // Requires PROJECT_EDIT

 *   permissionGuard('DOC_VIEW', 'DOC_EDIT')  // Requires any one of these      const { user, perms } = req.auth;

 *   permissionGuard.all('PROJECT_VIEW', 'DOC_VIEW')  // Requires all

 */      // Super Admin shortcut (if your roles array contains "Super Admin")

      const isSuperAdmin = Array.isArray(user.roles)

/**        ? user.roles.some((r) => r.role?.name === "Super Admin" || r.name === "Super Admin")

 * Check if user has Super Admin role (bypasses all permission checks)        : false;

 */

function isSuperAdmin(roles) {      if (isSuperAdmin) return next();

  if (!Array.isArray(roles)) return false;

  return roles.some(r =>       // Require at least one permission from the list

    (typeof r === 'string' && r === 'Super Admin') ||      if (required.length === 0) return next();

    (typeof r === 'object' && r.name === 'Super Admin')      const hasAny = required.some((p) => perms && perms.has(p));

  );      if (!hasAny) return res.status(403).json({ error: "Forbidden" });

}

      next();

/**    } catch (e) {

 * Main permission guard - requires ANY of the specified permissions      console.error(e);

 * @param {...string} required - Permission codes required (at least one must match)      res.status(500).json({ error: "Permission check failed" });

 */    }

function permissionGuard(...required) {  };

  return (req, res, next) => {}

    try {

      // Check if user is authenticatedmodule.exports = { permissionGuard };

      if (!req.auth || !req.auth.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { user, roles, perms } = req.auth;

      // Super Admin bypass - has all permissions implicitly
      if (isSuperAdmin(roles)) {
        return next();
      }

      // If no specific permissions required, just check authentication
      if (required.length === 0) {
        return next();
      }

      // Check if user has at least ONE of the required permissions
      const hasAnyPermission = required.some(perm => perms && perms.has(perm));

      if (!hasAnyPermission) {
        console.warn(`[permissionGuard] User ${user.email} lacks permissions: ${required.join(', ')}`);
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: required,
          message: `This action requires one of: ${required.join(', ')}` 
        });
      }

      // Permission check passed
      next();
    } catch (error) {
      console.error('[permissionGuard] Error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Requires ALL of the specified permissions (stricter check)
 * @param {...string} required - Permission codes required (all must match)
 */
permissionGuard.all = function(...required) {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.auth || !req.auth.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { user, roles, perms } = req.auth;

      // Super Admin bypass
      if (isSuperAdmin(roles)) {
        return next();
      }

      // If no specific permissions required, just check authentication
      if (required.length === 0) {
        return next();
      }

      // Check if user has ALL required permissions
      const hasAllPermissions = required.every(perm => perms && perms.has(perm));

      if (!hasAllPermissions) {
        const missing = required.filter(perm => !perms || !perms.has(perm));
        console.warn(`[permissionGuard.all] User ${user.email} missing permissions: ${missing.join(', ')}`);
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: required,
          missing: missing,
          message: `This action requires all of: ${required.join(', ')}` 
        });
      }

      // Permission check passed
      next();
    } catch (error) {
      console.error('[permissionGuard.all] Error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Check if user has a specific role
 * @param {...string} roleNames - Role names required (at least one must match)
 */
permissionGuard.role = function(...roleNames) {
  return (req, res, next) => {
    try {
      if (!req.auth || !req.auth.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { user, roles } = req.auth;

      // Check if user has at least ONE of the required roles
      const hasRole = roleNames.some(roleName => 
        roles.some(r => 
          (typeof r === 'string' && r === roleName) ||
          (typeof r === 'object' && r.name === roleName)
        )
      );

      if (!hasRole) {
        console.warn(`[permissionGuard.role] User ${user.email} lacks roles: ${roleNames.join(', ')}`);
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: roleNames,
          message: `This action requires one of these roles: ${roleNames.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      console.error('[permissionGuard.role] Error:', error);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};

module.exports = { permissionGuard };

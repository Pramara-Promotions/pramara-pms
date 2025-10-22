// api/middleware/permissionGuard.js

function checkIsSuperAdmin(roles) {
  if (!Array.isArray(roles)) return false;
  return roles.some(r => 
    (typeof r === 'string' && r === 'Super Admin') ||
    (typeof r === 'object' && (r.name === 'Super Admin' || r.role?.name === 'Super Admin'))
  );
}

function permissionGuard(...required) {
  return (req, res, next) => {
    try {
      if (!req.auth || !req.auth.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { roles, perms } = req.auth;

      if (checkIsSuperAdmin(roles)) {
        return next();
      }

      if (required.length === 0) {
        return next();
      }

      const hasAny = required.some(p => perms && perms.has(p));

      if (!hasAny) {
        return res.status(403).json({ error: 'Forbidden', required });
      }

      next();
    } catch (error) {
      console.error('Permission guard error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

permissionGuard.all = function(...required) {
  return (req, res, next) => {
    try {
      if (!req.auth || !req.auth.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { roles, perms } = req.auth;

      if (checkIsSuperAdmin(roles)) {
        return next();
      }

      const hasAll = required.every(p => perms && perms.has(p));

      if (!hasAll) {
        return res.status(403).json({ error: 'Forbidden', required });
      }

      next();
    } catch (error) {
      console.error('Permission guard error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

permissionGuard.role = function(...roleNames) {
  return (req, res, next) => {
    try {
      if (!req.auth || !req.auth.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { roles } = req.auth;

      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const hasRole = roleNames.some(requiredRole => 
        roles.some(r => 
          (typeof r === 'string' && r === requiredRole) ||
          (typeof r === 'object' && (r.name === requiredRole || r.role?.name === requiredRole))
        )
      );

      if (!hasRole) {
        return res.status(403).json({ error: 'Forbidden', required: roleNames });
      }

      next();
    } catch (error) {
      console.error('Permission guard error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

module.exports = { permissionGuard };

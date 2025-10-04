// === FILE: api/middleware/permissionGuard.js ===
function permissionGuard(...required) {
  return (req, res, next) => {
    try {
      // Expect req.auth from authGuard: { user, perms:Set<string> }
      if (!req.auth || !req.auth.user) return res.status(401).json({ error: "Unauthorized" });

      const { user, perms } = req.auth;

      // Super Admin shortcut (if your roles array contains "Super Admin")
      const isSuperAdmin = Array.isArray(user.roles)
        ? user.roles.some((r) => r.role?.name === "Super Admin" || r.name === "Super Admin")
        : false;

      if (isSuperAdmin) return next();

      // Require at least one permission from the list
      if (required.length === 0) return next();
      const hasAny = required.some((p) => perms && perms.has(p));
      if (!hasAny) return res.status(403).json({ error: "Forbidden" });

      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

module.exports = { permissionGuard };

// api/routes/roles.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { PERMISSIONS_BY_MODULE } = require('../config/permissions');

const prisma = new PrismaClient();
const router = express.Router();

// ═══════════════════════════════════════════════════════════
// ROLE CRUD
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/roles
 * List all roles with their permissions
 */
router.get('/roles', authGuard, permissionGuard('ROLE_VIEW'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: { select: { code: true, label: true } },
          },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(rp => rp.permission.code),
      userCount: role._count.users,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[roles] List failed:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/roles/:id
 * Get a single role with details
 */
router.get('/roles/:id', authGuard, permissionGuard('ROLE_VIEW'), async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: {
          include: {
            permission: { select: { code: true, label: true } },
          },
        },
        users: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const formatted = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(rp => ({
        code: rp.permission.code,
        label: rp.permission.label,
      })),
      users: role.users.map(ur => ur.user),
    };

    res.json(formatted);
  } catch (error) {
    console.error('[roles] Get failed:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

/**
 * POST /api/roles
 * Create a new role
 * Body: { name, description?, permissions: ['PERM_CODE', ...] }
 */
router.post('/roles', authGuard, permissionGuard('ROLE_CREATE'), async (req, res) => {
  try {
    const { name, description, permissions = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if role name already exists
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Role name already exists' });
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name,
        description: description || null,
      },
    });

    // Assign permissions if provided
    if (permissions.length > 0) {
      for (const permCode of permissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: permCode },
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
    }

    // Return created role with permissions
    const created = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: {
          include: {
            permission: { select: { code: true, label: true } },
          },
        },
      },
    });

    res.status(201).json({
      id: created.id,
      name: created.name,
      description: created.description,
      permissions: created.permissions.map(rp => rp.permission.code),
    });
  } catch (error) {
    console.error('[roles] Create failed:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PUT /api/roles/:id
 * Update a role
 * Body: { name?, description?, permissions?: ['PERM_CODE', ...] }
 */
router.put('/roles/:id', authGuard, permissionGuard('ROLE_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent editing Super Admin role name
    if (role.name === 'Super Admin' && name && name !== 'Super Admin') {
      return res.status(403).json({ error: 'Cannot rename Super Admin role' });
    }

    // Update basic fields
    if (name || description !== undefined) {
      await prisma.role.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      });
    }

    // Update permissions if provided
    if (Array.isArray(permissions)) {
      // Remove all existing permissions
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      // Add new permissions
      for (const permCode of permissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: permCode },
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              roleId: id,
              permissionId: permission.id,
            },
          });
        }
      }
    }

    // Return updated role
    const updated = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: { select: { code: true, label: true } },
          },
        },
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions.map(rp => rp.permission.code),
    });
  } catch (error) {
    console.error('[roles] Update failed:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/roles/:id
 * Delete a role (prevents deleting Super Admin)
 */
router.delete('/roles/:id', authGuard, permissionGuard('ROLE_DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deleting Super Admin role
    if (role.name === 'Super Admin') {
      return res.status(403).json({ error: 'Cannot delete Super Admin role' });
    }

    // Check if role has users assigned
    if (role._count.users > 0) {
      return res.status(400).json({
        error: 'Cannot delete role with assigned users',
        userCount: role._count.users,
      });
    }

    // Delete role (cascades to rolePermissions)
    await prisma.role.delete({ where: { id } });

    res.json({ ok: true, message: 'Role deleted' });
  } catch (error) {
    console.error('[roles] Delete failed:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// ═══════════════════════════════════════════════════════════
// PERMISSIONS LIST
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/permissions
 * List all available permissions (for UI selection)
 */
router.get('/permissions', authGuard, permissionGuard('ROLE_VIEW'), async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    // Group by module for better UI display
    const grouped = {};
    for (const perm of permissions) {
      // Try to determine module from permission code
      const module = getModuleFromCode(perm.code);
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push({
        code: perm.code,
        label: perm.label,
      });
    }

    res.json({
      all: permissions,
      byModule: grouped,
    });
  } catch (error) {
    console.error('[permissions] List failed:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Helper to extract module from permission code
function getModuleFromCode(code) {
  if (code.startsWith('USER_')) return 'Users';
  if (code.startsWith('ROLE_')) return 'Roles';
  if (code.startsWith('PROJECT_')) return 'Projects';
  if (code.startsWith('DOC_')) return 'Documents';
  if (code.startsWith('QC_')) return 'QC';
  if (code.startsWith('ALERT_') || code.startsWith('RULE_')) return 'Alerts';
  if (code.startsWith('COMPLIANCE_')) return 'Compliance';
  if (code.startsWith('CHANGE_')) return 'Changes';
  if (code.startsWith('INVENTORY_')) return 'Inventory';
  if (code.startsWith('VARIANCE_')) return 'Variance';
  if (code.startsWith('SKU_')) return 'SKU';
  if (code.startsWith('AUDIT_') || code.startsWith('SYSTEM_')) return 'Admin';
  return 'Other';
}

// ═══════════════════════════════════════════════════════════
// USER-ROLE ASSIGNMENTS
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/users/:userId/roles
 * Assign a role to a user
 * Body: { roleId }
 */
router.post('/users/:userId/roles', authGuard, permissionGuard('USER_MANAGE_ROLES'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if already assigned
    const existing = await prisma.userRole.findFirst({
      where: { userId, roleId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Role already assigned to this user' });
    }

    // Create assignment
    await prisma.userRole.create({
      data: { userId, roleId },
    });

    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'ROLE_ASSIGNED',
      actorId: req.user?.id,
      targetId: userId,
      details: { roleId, roleName: role.name },
      ipAddress: req.ip,
    });

    res.status(201).json({ ok: true, message: 'Role assigned' });
  } catch (error) {
    console.error('[users/roles] Assign failed:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

/**
 * DELETE /api/users/:userId/roles/:roleId
 * Remove a role from a user
 */
router.delete('/users/:userId/roles/:roleId', authGuard, permissionGuard('USER_MANAGE_ROLES'), async (req, res) => {
  try {
    const { userId, roleId } = req.params;

    const userRole = await prisma.userRole.findFirst({
      where: { userId, roleId },
      include: {
        role: { select: { name: true } }
      }
    });

    if (!userRole) {
      return res.status(404).json({ error: 'Role assignment not found' });
    }

    await prisma.userRole.delete({ where: { id: userRole.id } });

    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'ROLE_REMOVED',
      actorId: req.user?.id,
      targetId: userId,
      details: { roleId, roleName: userRole.role?.name },
      ipAddress: req.ip,
    });

    res.json({ ok: true, message: 'Role removed' });
  } catch (error) {
    console.error('[users/roles] Remove failed:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

module.exports = router;

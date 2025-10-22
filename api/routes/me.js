// api/routes/me.js
const express = require('express');
const jwt = require('jsonwebtoken');

let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (_) {}

const router = express.Router();
const DEV_AUTH_EMAIL = process.env.DEV_AUTH_EMAIL || 'admin@pramara.local';
const DEV_AUTH_NAME  = process.env.DEV_AUTH_NAME  || 'Admin User';

router.get('/me', async (req, res, next) => {
  try {
    const rawAuth = req.get('authorization') || '';
    const bearer = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : '';
    const token = (req.cookies?.pms_token || req.cookies?.token) || bearer;

    if (!token) return res.status(401).json({ error: 'No token' });

    // Dev token bypass (non-JWT) for local development
    if (token.startsWith('dev-token-')) {
      return res.json({
        id: 'dev-user',
        email: DEV_AUTH_EMAIL,
        name: DEV_AUTH_NAME,
        status: 'ACTIVE',
        isActive: true,
        departmentId: null,
        department: null,
        roles: [{ id: 'role-dev', name: 'Super Admin', description: 'Dev Super Admin' }],
        permissions: [],
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (prisma && payload.sub) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: String(payload.sub) },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            isActive: true,
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    permissions: {
                      include: {
                        permission: {
                          select: {
                            id: true,
                            code: true,
                            label: true,
                          }
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (!u) return res.status(401).json({ error: 'User not found' });

        // Map roles to array of role objects
        const roles = u.roles
          .map((r) => r?.role ? {
            id: r.role.id,
            name: r.role.name,
            description: r.role.description,
          } : null)
          .filter(Boolean);

        // Collect unique permissions from all roles
        const permMap = new Map();
        for (const r of u.roles) {
          for (const rp of r?.role?.permissions || []) {
            if (rp?.permission) {
              const perm = rp.permission;
              if (!permMap.has(perm.id)) {
                permMap.set(perm.id, {
                  id: perm.id,
                  name: perm.code, // Use code as name for consistency
                  description: perm.label,
                });
              }
            }
          }
        }

        return res.json({
          id: u.id,
          email: u.email,
          name: u.name,
          status: u.status,
          isActive: u.isActive,
          departmentId: u.departmentId,
          department: u.department,
          roles: roles,
          permissions: Array.from(permMap.values()),
        });
      } catch (err) {
        console.error('[me] lookup failed', err);
        // fall through to payload fallback
      }
    }

    return res.json({
      id: String(payload.sub || ''),
      email: payload.email || null,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

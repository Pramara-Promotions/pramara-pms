// api/routes/me.js
const express = require('express');
const jwt = require('jsonwebtoken');

let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (_) {}

const router = express.Router();

router.get('/me', async (req, res, next) => {
  try {
    const rawAuth = req.get('authorization') || '';
    const bearer = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : '';
    const token = req.cookies?.token || bearer;

    if (!token) return res.status(401).json({ error: 'No token' });

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
            isActive: true,
            roles: {
              include: {
                role: {
                  select: {
                    name: true,
                    permissions: {
                      include: {
                        permission: { select: { code: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (!u) return res.status(401).json({ error: 'User not found' });

        const roleNames = u.roles
          .map((r) => r?.role?.name)
          .filter(Boolean);
        const permSet = new Set();
        for (const r of u.roles) {
          for (const rp of r?.role?.permissions || []) {
            if (rp?.permission?.code) permSet.add(rp.permission.code);
          }
        }

        return res.json({
          id: u.id,
          email: u.email,
          isActive: u.isActive,
          roles: roleNames,
          permissions: Array.from(permSet),
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

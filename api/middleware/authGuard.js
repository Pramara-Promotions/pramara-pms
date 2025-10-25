// api/middleware/authGuard.js
const jwt = require('jsonwebtoken');

const DEV_TOKEN_PREFIX = 'dev-token-';

let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (e) {
  console.warn('[authGuard] Prisma not available, using fallback auth');
}

/**
 * Enhanced auth guard with permission loading
 * Sets req.auth with structure: { user: {...}, roles: [...], perms: Set<string> }
 */
async function authGuard(req, res, next) {
  try {
    const auth = req.headers.authorization;
    let token = null;

    if (auth && auth.startsWith('Bearer ')) {
      token = auth.slice(7).trim();
    }

    if (!token && req.cookies) {
      token = req.cookies.pms_token || req.cookies.token || null;
    }

    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    // ═══════════════════════════════════════════════════════════
    // DEV MODE: Simple token bypass with basic permissions
    // ═══════════════════════════════════════════════════════════
    if (token.startsWith(DEV_TOKEN_PREFIX)) {
      req.user = {
        id: 'dev-user',
        email: process.env.DEV_AUTH_EMAIL || 'admin@pramara.local',
        roles: ['admin'],
        tokenSource: 'dev-cookie',
      };
      req.auth = {
        user: req.user,
        roles: [{ name: 'Super Admin' }],
        perms: new Set(), // Empty set, Super Admin bypass will handle all checks
      };
      return next();
    }

    // ═══════════════════════════════════════════════════════════
    // JWT MODE: Full authentication with DB lookup
    // ═══════════════════════════════════════════════════════════
    const secret = process.env.JWT_SECRET || 'dev-secret';
    let payload;

    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // If we have Prisma, load full user data with roles & permissions
    if (prisma && payload.sub) {
      try {
        // SECURITY: Validate that the session still exists (enables Force Logout)
        const session = await prisma.session.findUnique({
          where: { refreshTokenHash: token },
          select: { 
            id: true, 
            userId: true, 
            expiresAt: true 
          }
        });

        if (!session) {
          return res.status(401).json({ error: 'Session not found or has been terminated' });
        }

        if (new Date() > session.expiresAt) {
          // Clean up expired session
          await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
          return res.status(401).json({ error: 'Session expired' });
        }

        if (session.userId !== String(payload.sub)) {
          return res.status(401).json({ error: 'Session user mismatch' });
        }

        const user = await prisma.user.findUnique({
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
                    description: true,
                    permissions: {
                      include: {
                        permission: { select: { code: true, label: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        if (!user.isActive) {
          return res.status(403).json({ error: 'Account is inactive' });
        }

        // Extract roles and permissions
        const roles = user.roles.map(ur => ur.role);
        const permSet = new Set();
        
        for (const userRole of user.roles) {
          for (const rolePerm of userRole.role.permissions || []) {
            if (rolePerm.permission?.code) {
              permSet.add(rolePerm.permission.code);
            }
          }
        }

        // Set req.auth with full structure
        req.auth = {
          user: {
            id: user.id,
            email: user.email,
            isActive: user.isActive,
          },
          roles,
          perms: permSet,
        };

        // Also set req.user for backward compatibility
        req.user = {
          id: user.id,
          email: user.email,
          roles: roles.map(r => r.name),
          permissions: Array.from(permSet),
          sessionId: session.id, // Add session ID for tracking
        };

        return next();
      } catch (dbError) {
        console.error('[authGuard] DB lookup failed:', dbError);
        return res.status(500).json({ error: 'Auth check failed' });
      }
    }

    // Fallback: Use JWT payload directly (no DB lookup)
    req.auth = {
      user: {
        id: String(payload.sub || ''),
        email: payload.email || null,
      },
      roles: (payload.roles || []).map(r => ({ name: r })),
      perms: new Set(payload.permissions || []),
    };

    req.user = {
      id: String(payload.sub || ''),
      email: payload.email || null,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };

    return next();
  } catch (error) {
    console.error('[authGuard] Unexpected error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// Support both default export and named { authGuard } usage
module.exports = authGuard;
module.exports.authGuard = authGuard;

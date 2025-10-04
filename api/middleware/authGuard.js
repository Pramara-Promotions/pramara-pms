// api/middleware/authGuard.js
const { verifyAccessToken } = require("../lib/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function authGuard(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });

    if (!user || !user.isActive) return res.status(401).json({ error: "Invalid user" });

    const perms = new Set();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        perms.add(rp.permission.code);
      }
    }

    req.auth = { user, perms };
    next();
  } catch (e) {
    console.error("AuthGuard error:", e.message);
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}

module.exports = { authGuard };

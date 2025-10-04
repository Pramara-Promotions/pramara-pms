// api/routes/me.js
const express = require('express');
const { authGuard } = require('../middleware/authGuard');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/me', authGuard, async (req, res) => {
  // fetch fresh so we know if MFA toggled
  const user = await prisma.user.findUnique({
    where: { id: req.auth.user.id },
    include: { roles: { include: { role: true } } },
  });

  const perms = req.auth.perms; // built by authGuard

  res.json({
    id: user.id,
    email: user.email,
    roles: user.roles.map(r => r.role.name),
    permissions: Array.from(perms),
    mfaEnabled: !!user.mfaSecret,                 // 👈 add this
  });
});

module.exports = { meRouter: router };

const express = require('express');
const { authGuard } = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');

const router = express.Router();

router.get('/admin/ping', authGuard, permissionGuard('USER_MANAGE'), (req, res) => {
  res.json({ ok: true, msg: 'Only admins can see this.' });
});

module.exports = { adminRouter: router };

// api/routes/devices.js
const express = require('express');
const { authGuard } = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { PrismaClient } = require('@prisma/client');
const { generateDeviceFingerprint, parseUserAgent, getClientIP } = require('../lib/deviceFingerprint');

const prisma = new PrismaClient();
const router = express.Router();

// Get user's own devices
router.get('/devices/me', authGuard(), async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { userId: req.auth.user.id },
      orderBy: { lastUsedAt: 'desc' },
      include: {
        _count: {
          select: { sessions: true }
        }
      }
    });
    
    res.json(devices);
  } catch (error) {
    console.error('Error fetching user devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get all devices (Super Admin only)
router.get('/devices', authGuard(), permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { userId, trusted, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (userId) where.userId = userId;
    if (trusted !== undefined) where.trusted = trusted === 'true';
    
    const devices = await prisma.device.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { lastUsedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        _count: {
          select: { sessions: true }
        }
      }
    });
    
    const total = await prisma.device.count({ where });
    
    res.json({ devices, total });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Update device name (user can name their own devices)
router.put('/devices/:id/name', authGuard(), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Device name is required' });
    }
    
    // Verify device belongs to user (unless Super Admin)
    const device = await prisma.device.findUnique({
      where: { id: req.params.id }
    });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
    if (device.userId !== req.auth.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: 'You can only rename your own devices' });
    }
    
    const updated = await prisma.device.update({
      where: { id: req.params.id },
      data: { name: name.trim() }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating device name:', error);
    res.status(500).json({ error: 'Failed to update device name' });
  }
});

// Revoke device (user can revoke their own, Super Admin can revoke any)
router.delete('/devices/:id', authGuard(), async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: { sessions: true }
    });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
    if (device.userId !== req.auth.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: 'You can only revoke your own devices' });
    }
    
    // Delete all sessions for this device
    await prisma.session.deleteMany({
      where: { deviceId: device.id }
    });
    
    // Delete the device
    await prisma.device.delete({
      where: { id: device.id }
    });
    
    res.json({ message: 'Device revoked and all sessions terminated' });
  } catch (error) {
    console.error('Error revoking device:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

// Trust/untrust device (Super Admin can set for any user)
router.put('/devices/:id/trust', authGuard(), async (req, res) => {
  try {
    const { trusted, trustDays } = req.body;
    
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
    if (device.userId !== req.auth.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Calculate trust until date
    let trustUntil = null;
    if (trusted) {
      const days = trustDays || device.user.trustDeviceDuration || 30;
      trustUntil = new Date();
      trustUntil.setDate(trustUntil.getDate() + days);
    }
    
    const updated = await prisma.device.update({
      where: { id: req.params.id },
      data: {
        trusted: trusted === true,
        trustUntil
      }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating device trust:', error);
    res.status(500).json({ error: 'Failed to update device trust' });
  }
});

// Force logout from device (terminates all sessions)
router.post('/devices/:id/logout', authGuard(), async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id }
    });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
    if (device.userId !== req.auth.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete all sessions for this device
    const result = await prisma.session.deleteMany({
      where: { deviceId: device.id }
    });
    
    res.json({ message: `Logged out from device. ${result.count} session(s) terminated.` });
  } catch (error) {
    console.error('Error logging out device:', error);
    res.status(500).json({ error: 'Failed to logout device' });
  }
});

module.exports = { devicesRouter: router };

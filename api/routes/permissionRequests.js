// api/routes/permissionRequests.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../middleware/auditLogger');
const { getClientIP } = require('../lib/deviceFingerprint');

const prisma = new PrismaClient();
const router = express.Router();

// Create permission request (any authenticated user)
router.post('/permission-requests', authGuard, async (req, res) => {
  try {
    const { permissionCode, reason, duration } = req.body;
    
    if (!permissionCode || !reason) {
      return res.status(400).json({ error: 'permissionCode and reason are required' });
    }
    
    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { code: permissionCode }
    });
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    // Check if user already has this permission
    const user = await prisma.user.findUnique({
      where: { id: req.auth.user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    const hasPermission = user.roles.some(ur => 
      ur.role.permissions.some(rp => rp.permission.code === permissionCode)
    );
    
    if (hasPermission) {
      return res.status(400).json({ error: 'You already have this permission' });
    }
    
    // Check for pending request
    const pendingRequest = await prisma.permissionRequest.findFirst({
      where: {
        userId: req.auth.user.id,
        permissionCode,
        status: 'PENDING'
      }
    });
    
    if (pendingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this permission' });
    }
    
    const request = await prisma.permissionRequest.create({
      data: {
        userId: req.auth.user.id,
        permissionCode,
        reason,
        duration: duration ? parseInt(duration) : null,
        status: 'PENDING'
      }
    });
    
    // Log the action
    await logAudit({
      actorId: req.auth.user.id,
      action: 'PERMISSION_REQUEST_CREATE',
      entity: 'PERMISSION_REQUEST',
      entityId: request.id,
      changes: { created: request },
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      result: 'SUCCESS'
    });
    
    // TODO: Send notification to admins
    
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating permission request:', error);
    res.status(500).json({ error: 'Failed to create permission request' });
  }
});

// List permission requests (admin can see all, user can see their own)
router.get('/permission-requests', authGuard, async (req, res) => {
  try {
    const { status, userId } = req.query;
    
    const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
    const hasUserView = req.auth.perms.has('USER_VIEW');
    
    const where = {};
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    if (userId && (isSuperAdmin || hasUserView)) {
      where.userId = userId;
    } else if (!isSuperAdmin && !hasUserView) {
      // Regular users can only see their own requests
      where.userId = req.auth.user.id;
    }
    
    const requests = await prisma.permissionRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching permission requests:', error);
    res.status(500).json({ error: 'Failed to fetch permission requests' });
  }
});

// Get single permission request
router.get('/permission-requests/:id', authGuard, async (req, res) => {
  try {
    const request = await prisma.permissionRequest.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Check access: user can see their own, admins can see all
    const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
    const hasUserView = req.auth.perms.has('USER_VIEW');
    
    if (request.userId !== req.auth.user.id && !isSuperAdmin && !hasUserView) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error fetching permission request:', error);
    res.status(500).json({ error: 'Failed to fetch permission request' });
  }
});

// Approve/reject permission request
router.post('/permission-requests/:id/review', authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  try {
    const { approved, response, temporary } = req.body;
    
    const request = await prisma.permissionRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already reviewed' });
    }
    
    const newStatus = approved ? 'APPROVED' : 'REJECTED';
    
    // Update request
    const updatedRequest = await prisma.permissionRequest.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        reviewedBy: req.auth.user.id,
        reviewedAt: new Date(),
        response: response || null
      }
    });
    
    // If approved, grant the permission
    if (approved) {
      if (temporary && request.duration) {
        // Grant as temporary permission
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + request.duration);
        
        await prisma.temporaryPermission.create({
          data: {
            userId: request.userId,
            permissionCode: request.permissionCode,
            startDate: new Date(),
            endDate,
            grantedBy: req.auth.user.id,
            reason: `Approved request: ${request.reason}`,
            status: 'ACTIVE'
          }
        });
      } else {
        // Grant as permanent - add to a role or create user permission override
        // For now, we'll use temporary with long duration (365 days)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        
        await prisma.temporaryPermission.create({
          data: {
            userId: request.userId,
            permissionCode: request.permissionCode,
            startDate: new Date(),
            endDate,
            grantedBy: req.auth.user.id,
            reason: `Permanent grant from request: ${request.reason}`,
            status: 'ACTIVE'
          }
        });
      }
    }
    
    // Log the action
    await logAudit({
      actorId: req.auth.user.id,
      action: approved ? 'PERMISSION_REQUEST_APPROVED' : 'PERMISSION_REQUEST_REJECTED',
      entity: 'PERMISSION_REQUEST',
      entityId: req.params.id,
      changes: { reviewed: updatedRequest },
      meta: { userId: request.userId, permissionCode: request.permissionCode },
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      result: 'SUCCESS'
    });
    
    // TODO: Send notification to user
    
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error reviewing permission request:', error);
    res.status(500).json({ error: 'Failed to review permission request' });
  }
});

// Delete permission request (user can delete their own pending requests)
router.delete('/permission-requests/:id', authGuard, async (req, res) => {
  try {
    const request = await prisma.permissionRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Check access
    const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
    if (request.userId !== req.auth.user.id && !isSuperAdmin) {
      return res.status(403).json({ error: 'You can only delete your own requests' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot delete reviewed requests' });
    }
    
    await prisma.permissionRequest.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Permission request deleted' });
  } catch (error) {
    console.error('Error deleting permission request:', error);
    res.status(500).json({ error: 'Failed to delete permission request' });
  }
});

module.exports = { permissionRequestsRouter: router };


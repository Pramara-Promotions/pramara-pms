const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');
const notificationService = require('../lib/notificationService');
const router = express.Router();
const prisma = new PrismaClient();

function daysBetween(a, b) {
  const ms = (new Date(a)).getTime() - (new Date(b)).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ApprovalRequest CRUD
router.get('/', authGuard, async (req, res) => {
  try {
    const { projectId, status, overdue } = req.query;
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = String(status);
    if (overdue === 'true') where.expectedDate = { lt: new Date() };
    const approvals = await prisma.approvalRequest.findMany({ where, orderBy: { cutoffDate: 'asc' } });
    const enriched = approvals.map(a => ({ ...a, bufferDaysCalc: daysBetween(a.cutoffDate, a.expectedDate) }));
    res.json(enriched);
  } catch (e) {
    console.error('approvals:list', e);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

router.post('/', authGuard, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.projectId || !data.approvalType || !data.description || !data.expectedDate || !data.cutoffDate || !data.requiredFrom) {
      return res.status(400).json({ error: 'projectId, approvalType, description, requiredFrom, expectedDate, cutoffDate are required' });
    }
    const bufferDays = daysBetween(data.cutoffDate, data.expectedDate);
    const created = await prisma.approvalRequest.create({
      data: {
        projectId: parseInt(data.projectId),
        workflowStageId: data.workflowStageId || null,
        approvalType: data.approvalType,
        description: data.description,
        requiredFrom: data.requiredFrom,
        requiredFromContact: data.requiredFromContact || null,
        requestedBy: req.auth?.user?.id || 'system',
        expectedDate: new Date(data.expectedDate),
        cutoffDate: new Date(data.cutoffDate),
        bufferDays,
      },
    });

    // Schedule initial reminder (now or later depending on expectedDate)
    await notificationService.sendApprovalReminder(created, 'scheduled');

    res.status(201).json(created);
  } catch (e) {
    console.error('approvals:create', e);
    res.status(500).json({ error: 'Failed to create approval request' });
  }
});

router.put('/:id/approve', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.approvalRequest.update({
      where: { id: String(id) },
      data: { status: 'approved', approvedAt: new Date(), approvedBy: req.auth?.user?.id || null },
    });
    res.json(updated);
  } catch (e) {
    console.error('approvals:approve', e);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

router.put('/:id/reject', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, requestedChanges } = req.body;
    const updated = await prisma.approvalRequest.update({
      where: { id: String(id) },
      data: { status: 'rejected', rejectedAt: new Date(), rejectionReason: rejectionReason || null, requestedChanges: requestedChanges || null },
    });
    res.json(updated);
  } catch (e) {
    console.error('approvals:reject', e);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

router.put('/:id/delay', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { expectedDate, delayReason } = req.body;
    if (!expectedDate) return res.status(400).json({ error: 'expectedDate required' });
    const approval = await prisma.approvalRequest.update({
      where: { id: String(id) },
      data: { status: 'delayed', delayedNewDate: new Date(expectedDate), delayReason: delayReason || null },
    });
    res.json(approval);
  } catch (e) {
    console.error('approvals:delay', e);
    res.status(500).json({ error: 'Failed to delay' });
  }
});

// Override (start without approval)
router.post('/:id/override', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { overrideReason, overrideRisk } = req.body;
    const approval = await prisma.approvalRequest.update({
      where: { id: String(id) },
      data: { status: 'overridden', overrideBy: req.auth?.user?.id || null, overrideReason: overrideReason || null, overrideRisk: overrideRisk || null, overrideAt: new Date() },
    });

    // Notify stakeholders (requestedBy if available)
    if (approval.requestedBy) {
      await notificationService.create({
        userId: approval.requestedBy,
        type: 'approval_override',
        priority: 'high',
        title: 'Approval Overridden',
        message: `Approval '${approval.approvalType}' was overridden`,
        context: { entityType: 'approval', entityId: approval.id, entityName: approval.approvalType },
      });
    }

    res.json(approval);
  } catch (e) {
    console.error('approvals:override', e);
    res.status(500).json({ error: 'Failed to override' });
  }
});

// Send reminder manually
router.post('/:id/remind', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const approval = await prisma.approvalRequest.findUnique({ where: { id: String(id) } });
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    const result = await notificationService.sendApprovalReminder(approval, 'scheduled');
    res.json(result);
  } catch (e) {
    console.error('approvals:remind', e);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// Buffer report (sorted by urgency)
router.get('/buffer-report', authGuard, async (req, res) => {
  try {
    const approvals = await prisma.approvalRequest.findMany({ where: { status: 'pending' } });
    const list = approvals.map(a => ({
      ...a,
      bufferDaysCalc: daysBetween(a.cutoffDate, a.expectedDate),
      rag: daysBetween(a.cutoffDate, a.expectedDate) < 2 ? 'red' : daysBetween(a.cutoffDate, a.expectedDate) < 5 ? 'yellow' : 'green',
    })).sort((a, b) => a.bufferDaysCalc - b.bufferDaysCalc);
    res.json(list);
  } catch (e) {
    console.error('approvals:buffer-report', e);
    res.status(500).json({ error: 'Failed to build buffer report' });
  }
});

// Overdue approvals
router.get('/overdue', authGuard, async (req, res) => {
  try {
    const items = await prisma.approvalRequest.findMany({ where: { status: 'pending', expectedDate: { lt: new Date() } }, orderBy: { expectedDate: 'asc' } });
    res.json(items);
  } catch (e) {
    console.error('approvals:overdue', e);
    res.status(500).json({ error: 'Failed to fetch overdue approvals' });
  }
});

// Reminder history
router.get('/:id/reminders', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const reminders = await prisma.approvalReminder.findMany({ where: { approvalRequestId: String(id) }, orderBy: { reminderDate: 'desc' } });
    res.json(reminders);
  } catch (e) {
    console.error('approvals:reminders', e);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

module.exports = router;

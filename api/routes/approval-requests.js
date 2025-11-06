const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// POST /api/approvals/reminders/auto-send - Auto-send due reminders
// MUST be before /:id route to avoid treating "reminders" as an ID
router.post('/reminders/auto-send', async (req, res) => {
  try {
    const { daysThreshold = 3 } = req.body;
    
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + parseInt(daysThreshold));
    
    // Find approvals due within threshold
    const approvals = await prisma.approvalRequest.findMany({
      where: {
        status: 'pending',
        dueDate: {
          lte: threshold,
          gte: new Date()
        }
      },
      include: {
        reminders: {
          orderBy: { sentAt: 'desc' },
          take: 1
        }
      }
    });
    
    const remindersSent = [];
    
    for (const approval of approvals) {
      // Check if reminder was sent in last 24 hours
      const lastReminder = approval.reminders[0];
      const daysSinceReminder = lastReminder
        ? (new Date() - new Date(lastReminder.sentAt)) / (1000 * 60 * 60 * 24)
        : 999;
      
      if (daysSinceReminder >= 1) {
        const message = `Urgent: ${approval.title} is due on ${approval.dueDate.toLocaleDateString()}. Buffer: ${approval.bufferDays || 0} days.`;
        
        // Send via preferred channels
        if (approval.contactEmail) {
          await prisma.approvalReminder.create({
            data: {
              approvalRequestId: approval.id,
              channel: 'email',
              recipientEmail: approval.contactEmail,
              message,
              sentAt: new Date(),
              sentBy: 'system'
            }
          });
          remindersSent.push({ id: approval.id, channel: 'email' });
        }
        
        if (approval.contactPhone) {
          await prisma.approvalReminder.create({
            data: {
              approvalRequestId: approval.id,
              channel: 'whatsapp',
              recipientPhone: approval.contactPhone,
              message,
              sentAt: new Date(),
              sentBy: 'system'
            }
          });
          remindersSent.push({ id: approval.id, channel: 'whatsapp' });
        }
      }
    }
    
    res.json({
      message: `Sent ${remindersSent.length} reminders`,
      reminders: remindersSent
    });
  } catch (error) {
    console.error('Error auto-sending reminders:', error);
    res.status(500).json({ error: 'Failed to auto-send reminders' });
  }
});

// GET /api/approvals/analytics/buffer-status - Buffer monitoring
router.get('/analytics/buffer-status', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const where = { status: 'pending' };
    if (projectId) where.projectId = projectId;
    
    const approvals = await prisma.approvalRequest.findMany({
      where,
      include: {
        Project: {
          select: { projectCode: true, projectName: true }
        }
      }
    });
    
    const now = new Date();
    
    const bufferAnalysis = approvals.map(approval => {
      const bufferDays = approval.expectedDate 
        ? Math.ceil((new Date(approval.expectedDate) - now) / (1000 * 60 * 60 * 24))
        : null;
      
      const dueDays = approval.dueDate
        ? Math.ceil((new Date(approval.dueDate) - now) / (1000 * 60 * 60 * 24))
        : null;
      
      let status = 'healthy';
      if (dueDays !== null && dueDays < 0) status = 'overdue';
      else if (bufferDays !== null && bufferDays < 0) status = 'critical';
      else if (bufferDays !== null && bufferDays < 3) status = 'at-risk';
      else if (bufferDays !== null && bufferDays < 7) status = 'warning';
      
      return {
        id: approval.id,
        title: approval.title,
        approvalType: approval.approvalType,
        project: approval.Project,
        bufferDays,
        dueDays,
        status
      };
    });
    
    // Group by status
    const summary = {
      total: bufferAnalysis.length,
      overdue: bufferAnalysis.filter(a => a.status === 'overdue').length,
      critical: bufferAnalysis.filter(a => a.status === 'critical').length,
      atRisk: bufferAnalysis.filter(a => a.status === 'at-risk').length,
      warning: bufferAnalysis.filter(a => a.status === 'warning').length,
      healthy: bufferAnalysis.filter(a => a.status === 'healthy').length
    };
    
    res.json({ summary, approvals: bufferAnalysis });
  } catch (error) {
    console.error('Error analyzing buffer status:', error);
    res.status(500).json({ error: 'Failed to analyze buffer status' });
  }
});

// GET /api/approvals/dashboard/summary - Dashboard metrics
router.get('/dashboard/summary', async (req, res) => {
  try {
    const totalApprovals = await prisma.approvalRequest.count();
    
    const byStatus = await prisma.approvalRequest.groupBy({
      by: ['status'],
      _count: true
    });
    
    const byType = await prisma.approvalRequest.groupBy({
      by: ['approvalType'],
      _count: true,
      where: { status: 'pending' }
    });
    
    const overdueCount = await prisma.approvalRequest.count({
      where: {
        status: 'pending',
        dueDate: { lt: new Date() }
      }
    });
    
    const avgResponseTime = await prisma.approvalRequest.aggregate({
      _avg: {
        bufferDays: true
      },
      where: {
        status: { in: ['approved', 'rejected'] }
      }
    });
    
    res.json({
      totalApprovals,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item.approvalType] = item._count;
        return acc;
      }, {}),
      overdueCount,
      avgResponseDays: avgResponseTime._avg.bufferDays?.toFixed(1) || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// GET /api/approvals - List approval requests
router.get('/', async (req, res) => {
  try {
    const { projectId, approvalType, status, priority } = req.query;
    
    const where = {};
    if (projectId) where.projectId = projectId;
    if (approvalType) where.approvalType = approvalType;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    const approvals = await prisma.approvalRequest.findMany({
      where,
      include: {
        Project: {
          select: {
            id: true,
            projectCode: true,
            projectName: true
          }
        },
        reminders: {
          orderBy: { sentAt: 'desc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    });
    
    // Calculate buffer days for each
    const approvalsWithBuffer = approvals.map(approval => {
      const now = new Date();
      const bufferDays = approval.expectedDate 
        ? Math.ceil((new Date(approval.expectedDate) - now) / (1000 * 60 * 60 * 24))
        : null;
      
      const dueDays = approval.dueDate
        ? Math.ceil((new Date(approval.dueDate) - now) / (1000 * 60 * 60 * 24))
        : null;
      
      return {
        ...approval,
        bufferDays,
        dueDays,
        isOverdue: dueDays !== null && dueDays < 0,
        isAtRisk: bufferDays !== null && bufferDays < 3
      };
    });
    
    res.json({ approvals: approvalsWithBuffer });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// GET /api/approvals/:id - Get single approval
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        Project: true,
        reminders: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    
    // Calculate buffer
    const now = new Date();
    const bufferDays = approval.expectedDate 
      ? Math.ceil((new Date(approval.expectedDate) - now) / (1000 * 60 * 60 * 24))
      : null;
    
    res.json({
      approval: {
        ...approval,
        bufferDays,
        isOverdue: approval.dueDate && new Date(approval.dueDate) < now,
        isAtRisk: bufferDays !== null && bufferDays < 3
      }
    });
  } catch (error) {
    console.error('Error fetching approval:', error);
    res.status(500).json({ error: 'Failed to fetch approval' });
  }
});

// POST /api/approvals - Create approval request
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      approvalType,
      title,
      description,
      contactPerson,
      contactEmail,
      contactPhone,
      dueDate,
      expectedDate,
      priority,
      documents
    } = req.body;
    
    if (!projectId || !approvalType || !title) {
      return res.status(400).json({ error: 'Project ID, approval type, and title are required' });
    }
    
    // Calculate buffer days
    let bufferDays = null;
    if (dueDate && expectedDate) {
      const due = new Date(dueDate);
      const expected = new Date(expectedDate);
      bufferDays = Math.ceil((expected - due) / (1000 * 60 * 60 * 24));
    }
    
    const approval = await prisma.approvalRequest.create({
      data: {
        projectId,
        approvalType,
        title,
        description: description || null,
        contactPerson: contactPerson || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        bufferDays,
        priority: priority || 'medium',
        status: 'pending',
        documents: documents || null,
        requestedBy: req.user.userId,
        requestedAt: new Date()
      },
      include: {
        Project: {
          select: {
            projectCode: true,
            projectName: true
          }
        }
      }
    });
    
    res.status(201).json({ approval });
  } catch (error) {
    console.error('Error creating approval:', error);
    res.status(500).json({ error: 'Failed to create approval' });
  }
});

// PUT /api/approvals/:id - Update approval request
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    
    const fields = ['title', 'description', 'contactPerson', 'contactEmail', 
                    'contactPhone', 'dueDate', 'expectedDate', 'priority', 'documents'];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'dueDate' || field === 'expectedDate') {
          updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    // Recalculate buffer if dates changed
    if (updateData.dueDate || updateData.expectedDate) {
      const current = await prisma.approvalRequest.findUnique({ where: { id } });
      const due = updateData.dueDate || current.dueDate;
      const expected = updateData.expectedDate || current.expectedDate;
      
      if (due && expected) {
        updateData.bufferDays = Math.ceil((new Date(expected) - new Date(due)) / (1000 * 60 * 60 * 24));
      }
    }
    
    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: updateData,
      include: {
        Project: {
          select: {
            projectCode: true,
            projectName: true
          }
        }
      }
    });
    
    res.json({ approval });
  } catch (error) {
    console.error('Error updating approval:', error);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

// POST /api/approvals/:id/approve - Approve request
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, approvalDocument } = req.body;
    
    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user.userId,
        approvalNotes: notes || null,
        approvalDocument: approvalDocument || null
      },
      include: {
        Project: {
          select: {
            projectCode: true,
            projectName: true
          }
        }
      }
    });
    
    res.json({ approval });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// POST /api/approvals/:id/reject - Reject request
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.user.userId,
        rejectionNotes: notes || null
      },
      include: {
        Project: {
          select: {
            projectCode: true,
            projectName: true
          }
        }
      }
    });
    
    res.json({ approval });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// POST /api/approvals/:id/override - Emergency override
router.post('/:id/override', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, riskAssessment } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Override reason is required' });
    }
    
    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'overridden',
        overriddenAt: new Date(),
        overriddenBy: req.user.userId,
        overrideReason: reason,
        overrideRisk: riskAssessment || null
      },
      include: {
        Project: {
          select: {
            projectCode: true,
            projectName: true
          }
        }
      }
    });
    
    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'APPROVAL_OVERRIDE',
        entityType: 'ApprovalRequest',
        entityId: id,
        details: {
          reason,
          riskAssessment,
          approvalType: approval.approvalType
        }
      }
    }).catch(err => console.error('Failed to log override:', err));
    
    res.json({ approval });
  } catch (error) {
    console.error('Error overriding approval:', error);
    res.status(500).json({ error: 'Failed to override approval' });
  }
});

// POST /api/approvals/:id/reminders - Send reminder
router.post('/:id/reminders', async (req, res) => {
  try {
    const { id } = req.params;
    const { channel, message } = req.body;
    
    if (!channel) {
      return res.status(400).json({ error: 'Channel is required (email, whatsapp, sms)' });
    }
    
    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        Project: {
          select: { projectCode: true, projectName: true }
        }
      }
    });
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    
    // Create reminder record
    const reminder = await prisma.approvalReminder.create({
      data: {
        approvalRequestId: id,
        channel,
        recipientEmail: channel === 'email' ? approval.contactEmail : null,
        recipientPhone: (channel === 'whatsapp' || channel === 'sms') ? approval.contactPhone : null,
        message: message || `Reminder: ${approval.title} is due on ${approval.dueDate}`,
        sentAt: new Date(),
        sentBy: req.user.userId
      }
    });
    
    // TODO: Integrate with actual email/SMS/WhatsApp service
    // For now, just log it
    console.log(`Reminder sent via ${channel} for approval ${id}`);
    
    res.json({ 
      reminder,
      message: 'Reminder sent successfully'
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

module.exports = router;

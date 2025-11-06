const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authGuard = require('../middleware/authGuard');

const prisma = new PrismaClient();

// ==================== REMINDER ROUTES ====================

// GET /api/reminders - List reminders with filters
router.get('/reminders', authGuard, async (req, res) => {
  try {
    const { status, assignedToId, taskId, scope } = req.query;
    const userId = req.user.id;
    
    const where = {};

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Scope filter: my (assigned to me), created (created by me), all (any related to me)
    if (scope === 'my') {
      where.assignedToId = userId;
    } else if (scope === 'created') {
      where.createdById = userId;
    } else if (scope === 'all' || !scope) {
      where.OR = [
        { assignedToId: userId },
        { createdById: userId }
      ];
    }

    // Filter by assignee (for admin view)
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    // Filter by task
    if (taskId) {
      where.taskId = taskId;
    }

    // Only show non-dismissed reminders by default unless status filter is set
    if (!status) {
      where.status = { not: 'dismissed' };
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        Task: {
          select: {
            id: true,
            name: true,
            section: true,
            projectId: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { dueAt: 'asc' }
      ],
    });

    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// GET /api/reminders/:id - Get single reminder
router.get('/reminders/:id', authGuard, async (req, res) => {
  try {
    const reminder = await prisma.reminder.findUnique({
      where: { id: req.params.id },
      include: {
        Task: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Check if user has access
    const userId = req.user.id;
    if (reminder.assignedToId !== userId && reminder.createdById !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(reminder);
  } catch (error) {
    console.error('Error fetching reminder:', error);
    res.status(500).json({ error: 'Failed to fetch reminder' });
  }
});

// POST /api/reminders - Create new reminder
router.post('/reminders', authGuard, async (req, res) => {
  try {
    const { taskId, title, description, dueAt, assignedToId } = req.body;
    const userId = req.user.id;

    if (!title || !dueAt) {
      return res.status(400).json({ error: 'Title and dueAt are required' });
    }

    const reminder = await prisma.reminder.create({
      data: {
        taskId: taskId || null,
        title,
        description: description || null,
        dueAt: new Date(dueAt),
        assignedToId: assignedToId || userId,
        createdById: userId,
        status: 'pending',
      },
      include: {
        Task: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    // TODO: Send WebSocket notification to assignedTo user
    if (global.io && assignedToId && assignedToId !== userId) {
      global.io.to(`user-${assignedToId}`).emit('reminder:created', {
        id: reminder.id,
        title: reminder.title,
        dueAt: reminder.dueAt,
        createdBy: reminder.createdBy,
      });
    }

    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// PUT /api/reminders/:id - Update reminder
router.put('/reminders/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueAt, assignedToId, status } = req.body;
    const userId = req.user.id;

    // Check if reminder exists and user has access
    const existing = await prisma.reminder.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Only creator can edit the reminder details
    if (existing.createdById !== userId) {
      return res.status(403).json({ error: 'Only the creator can edit this reminder' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueAt !== undefined) updateData.dueAt = new Date(dueAt);
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (status !== undefined) updateData.status = status;

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
      include: {
        Task: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    res.json(reminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// DELETE /api/reminders/:id - Delete reminder
router.delete('/reminders/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if reminder exists and user has access
    const existing = await prisma.reminder.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Only creator can delete the reminder
    if (existing.createdById !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete this reminder' });
    }

    await prisma.reminder.delete({
      where: { id }
    });

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// POST /api/reminders/:id/snooze - Snooze reminder
router.post('/reminders/:id/snooze', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { snoozeUntil } = req.body;
    const userId = req.user.id;

    if (!snoozeUntil) {
      return res.status(400).json({ error: 'snoozeUntil is required' });
    }

    // Check if reminder exists and user has access
    const existing = await prisma.reminder.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Only assigned user can snooze
    if (existing.assignedToId !== userId) {
      return res.status(403).json({ error: 'Only the assigned user can snooze this reminder' });
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        status: 'snoozed',
        snoozeUntil: new Date(snoozeUntil),
      },
      include: {
        Task: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    res.json(reminder);
  } catch (error) {
    console.error('Error snoozing reminder:', error);
    res.status(500).json({ error: 'Failed to snooze reminder' });
  }
});

// POST /api/reminders/:id/complete - Mark reminder as completed
router.post('/reminders/:id/complete', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if reminder exists and user has access
    const existing = await prisma.reminder.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Only assigned user can complete
    if (existing.assignedToId !== userId) {
      return res.status(403).json({ error: 'Only the assigned user can complete this reminder' });
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
      include: {
        Task: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    res.json(reminder);
  } catch (error) {
    console.error('Error completing reminder:', error);
    res.status(500).json({ error: 'Failed to complete reminder' });
  }
});

// POST /api/reminders/:id/dismiss - Dismiss reminder
router.post('/reminders/:id/dismiss', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if reminder exists and user has access
    const existing = await prisma.reminder.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Only assigned user can dismiss
    if (existing.assignedToId !== userId) {
      return res.status(403).json({ error: 'Only the assigned user can dismiss this reminder' });
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        status: 'dismissed',
      },
      include: {
        Task: true,
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    res.json(reminder);
  } catch (error) {
    console.error('Error dismissing reminder:', error);
    res.status(500).json({ error: 'Failed to dismiss reminder' });
  }
});

module.exports = router;

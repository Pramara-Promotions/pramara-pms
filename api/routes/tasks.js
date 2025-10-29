const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/tasks - List all tasks with filters
router.get('/', async (req, res) => {
  try {
    const { projectId, assignedTo, status, priority, search } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (assignedTo) where.assignedTo = assignedTo;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
      estimatedHours,
      tags,
    } = req.body;

    const task = await prisma.task.create({
      data: {
        projectId: parseInt(projectId),
        title,
        description,
        assignedTo,
        createdBy: req.user.id,
        status: status || 'todo',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        tags: tags || [],
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
      estimatedHours,
      actualHours,
      tags,
      progress,
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null;
    if (actualHours !== undefined) updateData.actualHours = actualHours ? parseFloat(actualHours) : null;
    if (tags !== undefined) updateData.tags = tags;
    if (progress !== undefined) updateData.progress = parseInt(progress);

    // Set completion date when status changes to done
    if (status === 'done' || status === 'completed') {
      updateData.completedAt = new Date();
    }

    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', async (req, res) => {
  try {
    const { content } = req.body;
    const taskId = parseInt(req.params.id);

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: req.user.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/tasks/analytics/summary - Task analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { projectId, assignedTo } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (assignedTo) where.assignedTo = assignedTo;

    const [totalTasks, byStatus, byPriority, overdueTasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      prisma.task.count({
        where: {
          ...where,
          status: { notIn: ['done', 'completed', 'cancelled'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    const priorityCounts = byPriority.reduce((acc, item) => {
      acc[item.priority] = item._count;
      return acc;
    }, {});

    res.json({
      totalTasks,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      overdueTasks,
    });
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;

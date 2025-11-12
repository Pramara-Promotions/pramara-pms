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
    if (assignedTo) where.assignee = assignedTo;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        Project: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Parse description from tags and add as separate field
    const tasksWithDescription = tasks.map(task => {
      const descTag = task.tags?.find(tag => tag.startsWith('desc:'));
      const description = descTag ? descTag.substring(5) : '';
      const cleanTags = task.tags?.filter(tag => !tag.startsWith('desc:')) || [];

      return {
        ...task,
        description,
        tags: cleanTags
      };
    });

    res.json(tasksWithDescription);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        Project: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Parse description from tags
    const descTag = task.tags?.find(tag => tag.startsWith('desc:'));
    const description = descTag ? descTag.substring(5) : '';
    const cleanTags = task.tags?.filter(tag => !tag.startsWith('desc:')) || [];

    res.json({
      ...task,
      description,
      tags: cleanTags
    });
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

    // Map frontend status values to database enum values
    const statusMap = {
      'todo': 'green',
      'in-progress': 'amber',
      'review': 'amber',
      'done': 'green',
      'completed': 'green',
      'blocked': 'red',
      'cancelled': 'red',
    };

    // Map frontend priority values to database enum values
    const priorityMap = {
      'low': 'Low',
      'medium': 'Med',
      'med': 'Med',
      'high': 'High',
    };

    const dbStatus = status ? (statusMap[status.toLowerCase()] || 'green') : 'green';
    const dbPriority = priority ? (priorityMap[priority.toLowerCase()] || 'Med') : 'Med';

    // Prepare tags array with description if provided
    const taskTags = tags || [];
    if (description && description.trim()) {
      taskTags.push(`desc:${description.trim()}`);
    }

    const task = await prisma.task.create({
      data: {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        projectId: projectId ? parseInt(projectId) : null,
        name: title,
        assignee: assignedTo,
        status: dbStatus,
        priority: dbPriority,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: taskTags,
        updatedAt: new Date(),
      },
      include: {
        Project: { select: { id: true, name: true } },
      },
    });

    // Parse description from tags for response
    const descTag = task.tags?.find(tag => tag.startsWith('desc:'));
    const taskDescription = descTag ? descTag.substring(5) : '';
    const cleanTags = task.tags?.filter(tag => !tag.startsWith('desc:')) || [];

    res.status(201).json({
      ...task,
      description: taskDescription,
      tags: cleanTags
    });
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
      name,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
      tags,
    } = req.body;

    // Map frontend status values to database enum values
    const statusMap = {
      'todo': 'green',
      'in-progress': 'amber',
      'review': 'amber',
      'done': 'green',
      'completed': 'green',
      'blocked': 'red',
      'cancelled': 'red',
    };

    // Map frontend priority values to database enum values
    const priorityMap = {
      'low': 'Low',
      'medium': 'Med',
      'med': 'Med',
      'high': 'High',
    };

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.name = title; // Support both name and title
    if (assignedTo !== undefined) updateData.assignee = assignedTo;
    if (status !== undefined) updateData.status = statusMap[status.toLowerCase()] || status;
    if (priority !== undefined) updateData.priority = priorityMap[priority.toLowerCase()] || priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // Handle tags and description
    if (tags !== undefined || description !== undefined) {
      // Get current task to preserve existing tags
      const currentTask = await prisma.task.findUnique({
        where: { id: req.params.id },
        select: { tags: true }
      });

      let newTags = tags !== undefined ? [...tags] : [...(currentTask?.tags || [])];

      // Remove old description tag if exists
      newTags = newTags.filter(tag => !tag.startsWith('desc:'));

      // Add new description if provided
      if (description !== undefined && description.trim()) {
        newTags.push(`desc:${description.trim()}`);
      }

      updateData.tags = newTags;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { ...updateData, updatedAt: new Date() },
      include: {
        Project: { select: { id: true, name: true } },
      },
    });

    // Parse description from tags for response
    const descTag = task.tags?.find(tag => tag.startsWith('desc:'));
    const taskDescription = descTag ? descTag.substring(5) : '';
    const cleanTags = task.tags?.filter(tag => !tag.startsWith('desc:')) || [];

    res.json({
      ...task,
      description: taskDescription,
      tags: cleanTags
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
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
          status: { notIn: ['green'] },
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

// api/routes/board.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Auth guard
let authGuard;
try {
    authGuard = require('../middleware/authGuard');
} catch (e) {
    console.warn('[board] authGuard not found, using no-op');
    authGuard = (_req, _res, next) => next();
}

/**
 * GET /api/projects/:id/board-config
 * Get board configuration (columns) for a project
 */
router.get('/projects/:id/board-config', authGuard, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        if (isNaN(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get board columns for this project
        let columns = await prisma.boardColumn.findMany({
            where: { projectId },
            orderBy: { position: 'asc' }
        });

        // If no columns exist, create defaults
        if (columns.length === 0) {
            const now = new Date();
            const defaultColumns = [
                { projectId, name: 'Pre Production', section: 'Pre_Prod', position: 0, wipLimit: 10, color: '#0ea5e9', isDefault: true, updatedAt: now },
                { projectId, name: 'Production', section: 'Production', position: 1, wipLimit: 15, color: '#10b981', isDefault: true, updatedAt: now },
                { projectId, name: 'Quality Check', section: 'QC', position: 2, wipLimit: 10, color: '#f59e0b', isDefault: true, updatedAt: now },
                { projectId, name: 'Dispatch', section: 'Dispatch', position: 3, wipLimit: 10, color: '#8b5cf6', isDefault: true, updatedAt: now }
            ];

            await prisma.boardColumn.createMany({
                data: defaultColumns
            });

            columns = await prisma.boardColumn.findMany({
                where: { projectId },
                orderBy: { position: 'asc' }
            });
        }

        // Add task count for each column
        const columnsWithCount = await Promise.all(
            columns.map(async (col) => {
                const taskCount = await prisma.task.count({
                    where: {
                        projectId,
                        section: col.section
                    }
                });
                return {
                    ...col,
                    taskCount
                };
            })
        );

        res.json(columnsWithCount);
    } catch (error) {
        console.error('[board] Error fetching board config:', error);
        res.status(500).json({ error: 'Failed to fetch board configuration' });
    }
});

/**
 * PUT /api/projects/:id/board-config
 * Update board configuration (add/edit/delete columns)
 */
router.put('/projects/:id/board-config', authGuard, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        if (isNaN(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        const { columns } = req.body;
        if (!Array.isArray(columns)) {
            return res.status(400).json({ error: 'Columns array required' });
        }

        // Update columns in transaction
        await prisma.$transaction(async (tx) => {
            // Delete existing columns
            await tx.boardColumn.deleteMany({
                where: { projectId }
            });

            // Create new columns
            const now = new Date();
            for (const col of columns) {
                await tx.boardColumn.create({
                    data: {
                        projectId,
                        name: col.name,
                        section: col.section,
                        position: col.position,
                        wipLimit: col.wipLimit || null,
                        color: col.color || null,
                        isDefault: col.isDefault || false,
                        updatedAt: now
                    }
                });
            }
        });

        const updatedColumns = await prisma.boardColumn.findMany({
            where: { projectId },
            orderBy: { position: 'asc' }
        });

        res.json(updatedColumns);
    } catch (error) {
        console.error('[board] Error updating board config:', error);
        res.status(500).json({ error: 'Failed to update board configuration' });
    }
});

/**
 * GET /api/projects/:id/tasks
 * Get all tasks for a project
 */
router.get('/projects/:id/tasks', authGuard, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        if (isNaN(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        const tasks = await prisma.task.findMany({
            where: { projectId },
            orderBy: [
                { section: 'asc' },
                { position: 'asc' }
            ]
        });

        res.json(tasks);
    } catch (error) {
        console.error('[board] Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

/**
 * POST /api/projects/:id/tasks
 * Create a new task
 */
router.post('/projects/:id/tasks', authGuard, async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        if (isNaN(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        const {
            name,
            section = 'Pre_Prod',
            status = 'green',
            priority = 'Med',
            assignee,
            dueDate,
            tags = []
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Task name is required' });
        }

        // Get max position in target section
        const maxPosTask = await prisma.task.findFirst({
            where: { projectId, section },
            orderBy: { position: 'desc' }
        });

        const position = (maxPosTask?.position ?? -1) + 1;

        const task = await prisma.task.create({
            data: {
                projectId,
                name,
                section,
                status,
                priority,
                assignee: assignee || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                tags,
                position
            }
        });

        res.status(201).json(task);
    } catch (error) {
        console.error('[board] Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/tasks/:id', authGuard, async (req, res) => {
    try {
        const taskId = req.params.id;

        const {
            name,
            status,
            priority,
            assignee,
            dueDate,
            tags
        } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (assignee !== undefined) updateData.assignee = assignee;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (tags !== undefined) updateData.tags = tags;

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData
        });

        res.json(task);
    } catch (error) {
        console.error('[board] Error updating task:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(500).json({ error: 'Failed to update task' });
    }
});

/**
 * PUT /api/tasks/:id/move
 * Move a task to a different section/position
 */
router.put('/tasks/:id/move', authGuard, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { section, position } = req.body;

        if (!section) {
            return res.status(400).json({ error: 'Section is required' });
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const targetPosition = typeof position === 'number' ? position : 0;

        // If moving to same section, just reorder
        if (task.section === section) {
            // Get all tasks in this section
            const tasksInSection = await prisma.task.findMany({
                where: {
                    projectId: task.projectId,
                    section
                },
                orderBy: { position: 'asc' }
            });

            // Remove the moving task from its current position
            const withoutMoving = tasksInSection.filter(t => t.id !== taskId);

            // Insert at new position
            const newOrder = [
                ...withoutMoving.slice(0, targetPosition),
                task,
                ...withoutMoving.slice(targetPosition)
            ];

            // Update positions in transaction
            await prisma.$transaction(
                newOrder.map((t, idx) =>
                    prisma.task.update({
                        where: { id: t.id },
                        data: { position: idx }
                    })
                )
            );
        } else {
            // Moving to different section
            await prisma.$transaction(async (tx) => {
                // Get tasks in old section (excluding this task)
                const oldSectionTasks = await tx.task.findMany({
                    where: {
                        projectId: task.projectId,
                        section: task.section,
                        id: { not: taskId }
                    },
                    orderBy: { position: 'asc' }
                });

                // Reorder old section
                for (let i = 0; i < oldSectionTasks.length; i++) {
                    await tx.task.update({
                        where: { id: oldSectionTasks[i].id },
                        data: { position: i }
                    });
                }

                // Get tasks in new section
                const newSectionTasks = await tx.task.findMany({
                    where: {
                        projectId: task.projectId,
                        section
                    },
                    orderBy: { position: 'asc' }
                });

                // Insert task at target position in new section
                const insertIdx = Math.min(targetPosition, newSectionTasks.length);

                // Update positions for tasks after insert point
                for (let i = insertIdx; i < newSectionTasks.length; i++) {
                    await tx.task.update({
                        where: { id: newSectionTasks[i].id },
                        data: { position: i + 1 }
                    });
                }

                // Move the task
                await tx.task.update({
                    where: { id: taskId },
                    data: {
                        section,
                        position: insertIdx
                    }
                });
            });
        }

        const updatedTask = await prisma.task.findUnique({
            where: { id: taskId }
        });

        res.json(updatedTask);
    } catch (error) {
        console.error('[board] Error moving task:', error);
        res.status(500).json({ error: 'Failed to move task' });
    }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/tasks/:id', authGuard, async (req, res) => {
    try {
        const taskId = req.params.id;

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await prisma.$transaction(async (tx) => {
            // Delete the task
            await tx.task.delete({
                where: { id: taskId }
            });

            // Reorder remaining tasks in the same section
            const remainingTasks = await tx.task.findMany({
                where: {
                    projectId: task.projectId,
                    section: task.section
                },
                orderBy: { position: 'asc' }
            });

            for (let i = 0; i < remainingTasks.length; i++) {
                await tx.task.update({
                    where: { id: remainingTasks[i].id },
                    data: { position: i }
                });
            }
        });

        res.json({ ok: true });
    } catch (error) {
        console.error('[board] Error deleting task:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

module.exports = router;

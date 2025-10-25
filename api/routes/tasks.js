// api/routes/tasks.js
const express = require('express');
const router = express.Router();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');

// Helpers
function toTaskResponse(t) {
  return {
    id: t.id,
    projectId: t.projectId ?? undefined,
    name: t.name,
    section: t.section === 'Pre_Prod' ? 'Pre-Prod' : t.section,
    status: t.status,
    assignee: t.assignee ?? undefined,
    due: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
    priority: t.priority,
    tags: t.tags ?? [],
    attachments: t.attachments ?? 0,
    updatedAt: t.updatedAt?.toISOString().slice(0, 10),
  };
}

function fromClientSection(section) {
  if (section === 'Pre-Prod') return 'Pre_Prod';
  return section;
}

// GET /api/tasks?projectId=123
router.get('/tasks', authGuard, permissionGuard('PROJECT_VIEW'), async (req, res) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const where = projectId ? { projectId } : {};
    const tasks = await prisma.task.findMany({ where, orderBy: [{ section: 'asc' }, { position: 'asc' }, { updatedAt: 'desc' }] });
    res.json(tasks.map(toTaskResponse));
  } catch (e) {
    console.error('tasks:list', e);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/tasks', authGuard, permissionGuard('PROJECT_EDIT'), async (req, res) => {
  try {
    const { projectId, name, section, status, assignee, due, priority, tags } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Determine next position in the section
    const sec = fromClientSection(section || 'Pre-Prod');
    const maxInSection = await prisma.task.findFirst({ where: { section: sec }, orderBy: { position: 'desc' } });
    const nextPos = (maxInSection?.position ?? 0) + 1;

    const t = await prisma.task.create({
      data: {
        projectId: projectId ? Number(projectId) : null,
        name: String(name),
        section: sec,
        status: status || 'green',
        assignee: assignee ? String(assignee) : null,
        dueDate: due ? new Date(due) : null,
        priority: priority || 'Med',
        tags: Array.isArray(tags) ? tags.map(String) : [],
        position: nextPos,
      },
    });
    res.json(toTaskResponse(t));
  } catch (e) {
    console.error('tasks:create', e);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id
router.patch('/tasks/:id', authGuard, permissionGuard('PROJECT_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, section, status, assignee, due, priority, tags, attachments } = req.body || {};
    const data = {
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(section !== undefined ? { section: fromClientSection(section) } : {}),
      ...(status !== undefined ? { status: String(status) } : {}),
      ...(assignee !== undefined ? { assignee: assignee ? String(assignee) : null } : {}),
      ...(due !== undefined ? { dueDate: due ? new Date(due) : null } : {}),
      ...(priority !== undefined ? { priority: String(priority) } : {}),
      ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags.map(String) : [] } : {}),
      ...(attachments !== undefined ? { attachments: Number(attachments || 0) } : {}),
    };

    const t = await prisma.task.update({ where: { id }, data });
    res.json(toTaskResponse(t));
  } catch (e) {
    console.error('tasks:update', e);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', authGuard, permissionGuard('PROJECT_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('tasks:delete', e);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/reorder { section, idsInOrder }
router.post('/tasks/reorder', authGuard, permissionGuard('PROJECT_EDIT'), async (req, res) => {
  try {
    const { section, idsInOrder } = req.body || {};
    const sec = fromClientSection(section);
    if (!sec || !Array.isArray(idsInOrder)) return res.status(400).json({ error: 'section and idsInOrder required' });

    // Update positions in a transaction
    await prisma.$transaction(
      idsInOrder.map((id, idx) =>
        prisma.task.update({ where: { id: String(id) }, data: { section: sec, position: idx + 1 } })
      )
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('tasks:reorder', e);
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

module.exports = { tasksRouter: router };

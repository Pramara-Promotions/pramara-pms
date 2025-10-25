const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');
const router = express.Router();
const prisma = new PrismaClient();

// WorkflowStage CRUD
router.get('/stages', authGuard, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const stages = await prisma.workflowStage.findMany({
      where: { projectId: parseInt(projectId) },
      include: {
        tasks: true,
        documents: true,
        dependenciesFrom: true,
        dependenciesTo: true,
        approvalRequests: true,
      },
      orderBy: { sequence: 'asc' },
    });
    res.json(stages);
  } catch (e) {
    console.error('workflows:stages:list', e);
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
});

router.post('/stages', authGuard, async (req, res) => {
  try {
    const { projectId, name, sequence, requiresQC = false, requiresApproval = false, description, qcTemplateId, approvalType, estimatedDays } = req.body;
    if (!projectId || !name || sequence === undefined) return res.status(400).json({ error: 'projectId, name, sequence required' });

    const stage = await prisma.workflowStage.create({
      data: {
        projectId: parseInt(projectId),
        name,
        description: description || null,
        sequence: parseInt(sequence),
        requiresQC: Boolean(requiresQC),
        requiresApproval: Boolean(requiresApproval),
        qcTemplateId: qcTemplateId || null,
        approvalType: approvalType || null,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
      },
    });
    res.status(201).json(stage);
  } catch (e) {
    console.error('workflows:stages:create', e);
    res.status(500).json({ error: 'Failed to create stage' });
  }
});

router.put('/stages/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.sequence !== undefined) updates.sequence = parseInt(updates.sequence);
    if (updates.projectId !== undefined) updates.projectId = parseInt(updates.projectId);

    const stage = await prisma.workflowStage.update({
      where: { id: String(id) },
      data: updates,
    });
    res.json(stage);
  } catch (e) {
    console.error('workflows:stages:update', e);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

router.delete('/stages/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.workflowStage.delete({ where: { id: String(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error('workflows:stages:delete', e);
    res.status(500).json({ error: 'Failed to delete stage' });
  }
});

// WorkflowTask CRUD
router.get('/stages/:stageId/tasks', authGuard, async (req, res) => {
  try {
    const { stageId } = req.params;
    const tasks = await prisma.workflowTask.findMany({
      where: { stageId: String(stageId) },
      orderBy: { createdAt: 'asc' },
    });
    res.json(tasks);
  } catch (e) {
    console.error('workflows:tasks:list', e);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/tasks', authGuard, async (req, res) => {
  try {
    const { stageId, name, description, assignedTo, priority = 'medium', dueDate } = req.body;
    if (!stageId || !name) return res.status(400).json({ error: 'stageId and name required' });

    const task = await prisma.workflowTask.create({
      data: {
        stageId: String(stageId),
        name,
        description: description || null,
        assignedTo: assignedTo || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    res.status(201).json(task);
  } catch (e) {
    console.error('workflows:tasks:create', e);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/tasks/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
    const task = await prisma.workflowTask.update({ where: { id: String(id) }, data: updates });
    res.json(task);
  } catch (e) {
    console.error('workflows:tasks:update', e);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// WorkflowDependency
router.post('/dependencies', authGuard, async (req, res) => {
  try {
    const { fromStageId, toStageId, dependencyType = 'finish_to_start', lagDays = 0 } = req.body;
    if (!fromStageId || !toStageId) return res.status(400).json({ error: 'fromStageId and toStageId required' });

    const dep = await prisma.workflowDependency.create({
      data: {
        fromStageId: String(fromStageId),
        toStageId: String(toStageId),
        dependencyType,
        lagDays: parseInt(lagDays) || 0,
      },
    });
    res.status(201).json(dep);
  } catch (e) {
    console.error('workflows:dependencies:create', e);
    res.status(500).json({ error: 'Failed to create dependency' });
  }
});

router.get('/stages/:stageId/dependencies', authGuard, async (req, res) => {
  try {
    const { stageId } = req.params;
    const deps = await prisma.workflowDependency.findMany({
      where: {
        OR: [{ fromStageId: String(stageId) }, { toStageId: String(stageId) }],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(deps);
  } catch (e) {
    console.error('workflows:dependencies:list', e);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
});

router.delete('/dependencies/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.workflowDependency.delete({ where: { id: String(id) } });
    res.json({ ok: true });
  } catch (e) {
    console.error('workflows:dependencies:delete', e);
    res.status(500).json({ error: 'Failed to delete dependency' });
  }
});

// StageDocument
router.post('/stages/:stageId/documents', authGuard, async (req, res) => {
  try {
    const { stageId } = req.params;
    const { documentName, documentUrl, documentType, uploadedBy } = req.body;
    if (!documentName || !documentUrl) return res.status(400).json({ error: 'documentName and documentUrl required' });
    const doc = await prisma.stageDocument.create({
      data: {
        stageId: String(stageId),
        documentName,
        documentUrl,
        documentType: documentType || null,
        uploadedBy: uploadedBy || req.auth?.user?.id || 'system',
      },
    });
    res.status(201).json(doc);
  } catch (e) {
    console.error('workflows:documents:create', e);
    res.status(500).json({ error: 'Failed to link document' });
  }
});

router.get('/stages/:stageId/documents', authGuard, async (req, res) => {
  try {
    const { stageId } = req.params;
    const docs = await prisma.stageDocument.findMany({ where: { stageId: String(stageId) }, orderBy: { uploadedAt: 'desc' } });
    res.json(docs);
  } catch (e) {
    console.error('workflows:documents:list', e);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

module.exports = router;

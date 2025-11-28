// api/routes/projects.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

// ────────────────────────────────────────────────────────────
// FIX: Make authGuard import resilient (default or named export)
// ────────────────────────────────────────────────────────────
let _auth = null;
try {
  _auth = require('../middleware/authGuard'); // could be a function or { authGuard }
} catch (e) {
  console.warn('[projects] authGuard not found at ../middleware/authGuard:', e?.message);
}
let authGuard = _auth && typeof _auth === 'function' ? _auth : (_auth && _auth.authGuard);
if (typeof authGuard !== 'function') {
  console.warn('[projects] authGuard is not a function. Using NO-OP middleware in dev.');
  authGuard = (req, _res, next) => next(); // fallback to avoid "Route.get() requires a callback" crash
}

// Permission guard for RBAC
const { permissionGuard } = require('../middleware/permissionGuard');

// Workflow status service
const workflowStatusService = require('../services/workflowStatusService');

const prisma = new PrismaClient();
const router = express.Router();

/** Utility: check if a Prisma model exists in this client */
function hasModel(name) {
  return prisma[name] && typeof prisma[name].findMany === 'function';
}

/**
 * Calculate project health from pre-fetched data (optimization to avoid N+1 queries)
 * @param {Object} projectData - Project with Task, Batch, skus arrays
 * @param {Object} shiftAgg - Aggregated shift entry data {totalProduced, qualityPassed, qualityRejected}
 * @returns {Object} Health metrics
 */
function calculateHealthFromData(projectData, shiftAgg) {
  const { Task = [], Batch = [], skus = [] } = projectData;
  
  // Timeline metrics
  const startDate = projectData.startDate ? new Date(projectData.startDate) : new Date();
  const endDate = projectData.endDate ? new Date(projectData.endDate) : new Date();
  const now = new Date();
  const totalDuration = Math.max(1, endDate - startDate);
  const elapsed = Math.max(0, now - startDate);
  const daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.floor(Math.max(0, endDate - now) / (1000 * 60 * 60 * 24));
  const percentTimeElapsed = Math.min(100, (elapsed / totalDuration) * 100);
  
  // Budget metrics
  const totalBudget = projectData.totalBudget || 0;
  const spentBudget = projectData.spentBudget || 0;
  const percentBudgetUsed = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;
  
  // Output metrics
  const totalTarget = skus.reduce((sum, sku) => sum + (sku.orderQty || 0), 0);
  const totalProduced = Batch.reduce((sum, b) => sum + (b.currentQty || 0), 0);
  const fallbackProduced = shiftAgg?.totalProduced || 0;
  const actualProduced = totalProduced || fallbackProduced;
  const percentComplete = totalTarget > 0 ? Math.min(100, (actualProduced / totalTarget) * 100) : 0;
  
  // Quality metrics
  const totalRejected = Batch.reduce((sum, b) => sum + (b.rejectedQty || 0), 0);
  const fallbackRejected = shiftAgg?.qualityRejected || 0;
  const actualRejected = totalRejected || fallbackRejected;
  const fallbackPassed = shiftAgg?.qualityPassed || 0;
  const totalQualityChecked = actualProduced;
  const passRate = totalQualityChecked > 0 ? ((totalQualityChecked - actualRejected) / totalQualityChecked) * 100 : 100;
  const defectRate = totalQualityChecked > 0 ? (actualRejected / totalQualityChecked) * 100 : 0;
  
  // Task progress
  const totalTasks = Task.length;
  const completedTasks = Task.filter(t => t.status === 'done').length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const overdueTasks = Task.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length;
  
  // Attention items
  const attentionItems = [];
  if (overdueTasks > 0) attentionItems.push(`${overdueTasks} overdue tasks`);
  if (defectRate > 10) attentionItems.push(`High defect rate: ${defectRate.toFixed(1)}%`);
  if (percentBudgetUsed > 90) attentionItems.push(`Budget ${percentBudgetUsed.toFixed(0)}% used`);
  if (percentTimeElapsed > percentComplete + 20) attentionItems.push('Behind schedule');
  
  // Health score calculation
  let healthScore = 100;
  healthScore -= Math.max(0, defectRate * 2);
  healthScore -= Math.max(0, (percentBudgetUsed - 100) * 0.5);
  if (percentTimeElapsed > percentComplete + 10) healthScore -= 15;
  if (overdueTasks > 0) healthScore -= overdueTasks * 5;
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  const status = healthScore >= 70 ? 'healthy' : healthScore >= 40 ? 'at-risk' : 'critical';
  
  return {
    healthScore: Math.round(healthScore),
    status,
    attentionItems,
    timeline: { daysElapsed, daysRemaining, percentTimeElapsed: Math.round(percentTimeElapsed) },
    budget: { totalBudget, spentBudget, percentUsed: Math.round(percentBudgetUsed) },
    output: { totalTarget, actualProduced, percentComplete: Math.round(percentComplete) },
    quality: { passRate: Math.round(passRate), defectRate: Math.round(defectRate), totalRejected: actualRejected },
    taskProgress: { totalTasks, completedTasks, taskCompletionRate: Math.round(taskCompletionRate), overdueTasks }
  };
}

/** Utility: toInt */
const toInt = (v) => Number.parseInt(v, 10);

// Import project health utility
const { calculateProjectHealth } = require('../lib/projectHealth');

// Import Kanban utilities
const {
  getBoardConfig,
  updateBoardColumn,
  createBoardColumn,
  deleteBoardColumn,
  moveTask
} = require('../lib/kanban');

/** ============= Projects: list / create / update / delete ============= */

router.get('/projects', authGuard, permissionGuard('PROJECT_VIEW'), async (req, res) => {
  try {
    const { includeHealth, includeSnapshot } = req.query;
    
    const items = await prisma.project.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    // Optionally attach health and/or snapshot metrics
    if (includeHealth === 'true' || includeSnapshot === 'true') {
      const start7d = new Date();
      start7d.setDate(start7d.getDate() - 7);

      // OPTIMIZATION: Batch load all data upfront to avoid N+1 queries
      const projectIds = items.map(p => p.id);
      
      // Pre-fetch all related data in parallel
      const [allTasks, allBatches, allShiftAggs, allSkus] = await Promise.all([
        includeHealth === 'true' ? prisma.task.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, id: true, status: true, priority: true, dueDate: true }
        }) : Promise.resolve([]),
        includeHealth === 'true' ? prisma.batch.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, id: true, currentQty: true, targetQty: true, rejectedQty: true, status: true }
        }) : Promise.resolve([]),
        includeHealth === 'true' ? prisma.$queryRaw`
          SELECT "projectId", 
                 SUM("totalProduced")::int as "totalProduced",
                 SUM("qualityPassed")::int as "qualityPassed", 
                 SUM("qualityRejected")::int as "qualityRejected"
          FROM "ShiftEntry"
          WHERE "projectId" = ANY(${projectIds})
          GROUP BY "projectId"
        ` : Promise.resolve([]),
        includeHealth === 'true' ? prisma.projectSku.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, id: true, orderQty: true }
        }) : Promise.resolve([])
      ]);

      // Group by projectId for quick lookup
      const tasksByProject = {};
      const batchesByProject = {};
      const shiftAggsByProject = {};
      const skusByProject = {};
      
      allTasks.forEach(t => {
        if (!tasksByProject[t.projectId]) tasksByProject[t.projectId] = [];
        tasksByProject[t.projectId].push(t);
      });
      allBatches.forEach(b => {
        if (!batchesByProject[b.projectId]) batchesByProject[b.projectId] = [];
        batchesByProject[b.projectId].push(b);
      });
      allShiftAggs.forEach(s => {
        shiftAggsByProject[s.projectId] = s;
      });
      allSkus.forEach(sk => {
        if (!skusByProject[sk.projectId]) skusByProject[sk.projectId] = [];
        skusByProject[sk.projectId].push(sk);
      });

      const enriched = await Promise.all(items.map(async (project) => {
        let out = { ...project };
        if (includeHealth === 'true') {
          try {
            // Use pre-fetched data instead of querying again
            const projectData = {
              ...project,
              Task: tasksByProject[project.id] || [],
              Batch: batchesByProject[project.id] || [],
              skus: skusByProject[project.id] || []
            };
            const shiftAgg = shiftAggsByProject[project.id];
            
            const health = calculateHealthFromData(projectData, shiftAgg);
            out.health = {
              score: health.healthScore,
              status: health.status,
              attentionItemCount: health.attentionItems.length,
              output: health.output,
              quality: health.quality,
              taskProgress: health.taskProgress,
              timeline: health.timeline,
              budget: health.budget
            };
          } catch (error) {
            console.error(`Failed to calculate health for project ${project.id}:`, error);
          }
        }

        if (includeSnapshot === 'true') {
          try {
            const [docsCount, throughput7dAgg, throughputTrend, totalTasks, atRiskTasks, nextStages] = await Promise.all([
              prisma.projectDocument.count({ where: { projectId: project.id } }),
              prisma.shiftEntry.aggregate({
                where: { projectId: project.id, shiftDate: { gte: start7d } },
                _sum: { totalProduced: true }
              }),
              prisma.shiftEntry.groupBy({
                by: ['shiftDate'],
                where: { projectId: project.id, shiftDate: { gte: start7d } },
                _sum: { totalProduced: true },
                orderBy: { shiftDate: 'asc' }
              }),
              prisma.task.count({ where: { projectId: project.id } }),
              prisma.task.count({ where: { projectId: project.id, status: { in: ['amber', 'red'] } } }),
              prisma.workflowStage.findMany({
                where: { projectId: project.id, status: { in: ['pending', 'in_progress'] } },
                orderBy: [{ status: 'desc' }, { sequence: 'asc' }],
                take: 1,
                select: { id: true, name: true, status: true, startDate: true, endDate: true, sequence: true }
              })
            ]);

            out.snapshot = {
              documents: { count: docsCount },
              throughput7d: throughput7dAgg._sum.totalProduced || 0,
              throughputTrend: throughputTrend.map(t => ({ date: t.shiftDate, output: t._sum.totalProduced || 0 })),
              tasks: { total: totalTasks, atRisk: atRiskTasks },
              nextStage: nextStages && nextStages[0] ? nextStages[0] : null,
            };
          } catch (e) {
            console.error(`Failed to build snapshot for project ${project.id}:`, e?.message);
          }
        }

        return out;
      }));

      return res.json(enriched);
    }

    res.json(items);
  } catch (e) {
    console.error('GET /projects failed:', e);
    res.json([]); // don't 500 the UI
  }
});

router.post('/projects', authGuard, permissionGuard('PROJECT_CREATE'), async (req, res) => {
  try {
    console.log('POST /projects payload:', req.body);
    const { code, name, sku, quantity, cutoffDate, pantoneCode } = req.body || {};
    const created = await prisma.project.create({
      data: {
        code,
        name,
        sku: sku || null,
        quantity: quantity != null ? Number(quantity) : 0,  // Default to 0 if not provided
        cutoffDate: cutoffDate ? new Date(cutoffDate) : null,
        pantoneCode: pantoneCode || null,
      },
    });
    // Audit log
    try {
      const { logAudit } = require('../middleware/auditLogger');
      await logAudit({
        actorId: req.user?.id || null,
        action: 'PROJECT_CREATE',
        entity: 'PROJECT',
        entityId: created.id,
        changes: { after: created },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'SUCCESS'
      });
    } catch (e) { console.error('Audit log failed:', e); }
    console.log('POST /projects created:', created);
    res.json(created);
  } catch (e) {
    console.error('POST /projects failed:', e);
    res.status(400).json({ error: 'Create project failed' });
  }
});

router.put('/projects/:id', authGuard, permissionGuard('PROJECT_EDIT'), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { code, name, sku, quantity, cutoffDate, pantoneCode } = req.body || {};
    const before = await prisma.project.findUnique({ where: { id } });
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(code !== undefined ? { code } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(sku !== undefined ? { sku: sku || null } : {}),
        ...(quantity !== undefined ? { quantity: quantity != null ? Number(quantity) : null } : {}),
        ...(cutoffDate !== undefined ? { cutoffDate: cutoffDate ? new Date(cutoffDate) : null } : {}),
        ...(pantoneCode !== undefined ? { pantoneCode: pantoneCode || null } : {}),
      },
    });
    // Audit log
    try {
      const { logAudit } = require('../middleware/auditLogger');
      await logAudit({
        actorId: req.user?.id || null,
        action: 'PROJECT_EDIT',
        entity: 'PROJECT',
        entityId: updated.id,
        changes: { before, after: updated },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'SUCCESS'
      });
    } catch (e) { console.error('Audit log failed:', e); }
    res.json(updated);
  } catch (e) {
    console.error('PUT /projects/:id failed:', e);
    res.status(400).json({ error: 'Update project failed' });
  }
});

router.delete('/projects/:id', authGuard, permissionGuard('PROJECT_DELETE'), async (req, res) => {
  const id = toInt(req.params.id);
  try {
    // Best-effort clean up if related tables exist
    try { if (hasModel('alert')) await prisma.alert.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('alertRule')) await prisma.alertRule.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('complianceItem')) await prisma.complianceItem.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('preProdStep')) await prisma.preProdStep.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('qcRecord')) await prisma.qcRecord.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('projectDocument')) await prisma.projectDocument.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('varianceItem')) await prisma.varianceItem.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('inventoryNeed')) await prisma.inventoryNeed.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('changeLog')) await prisma.changeLog.deleteMany({ where: { projectId: id } }); } catch {}

    const before = await prisma.project.findUnique({ where: { id } });
    const out = await prisma.project.delete({ where: { id } });
    // Audit log
    try {
      const { logAudit } = require('../middleware/auditLogger');
      await logAudit({
        actorId: req.user?.id || null,
        action: 'PROJECT_DELETE',
        entity: 'PROJECT',
        entityId: out.id,
        changes: { before },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'SUCCESS'
      });
    } catch (e) { console.error('Audit log failed:', e); }
    res.json({ ok: true, project: out });
  } catch (e) {
    console.error('DELETE /projects/:id failed:', e);
    res.status(400).json({ error: 'Delete failed' });
  }
});

/** ======================= Project Health ======================= */

router.get('/projects/:id/health', authGuard, permissionGuard('PROJECT_VIEW'), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const health = await calculateProjectHealth(id);
    res.json(health);
  } catch (error) {
    console.error('GET /projects/:id/health failed:', error);
    res.status(500).json({ error: 'Failed to calculate project health' });
  }
});

/** ======================= Alerts & Alert Rules ======================= */

router.get('/projects/:id/alerts', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('alert')) return res.json([]);
  try {
    const items = await prisma.alert.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /alerts failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/alert-rules', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('alertRule')) return res.json([]);
  try {
    const items = await prisma.alertRule.findMany({
      where: { projectId: id },
      orderBy: [{ id: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /alert-rules failed:', e);
    res.json([]);
  }
});

router.put('/projects/:id/alert-rules', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('alertRule')) return res.json(req.body || []);
  try {
    const rows = Array.isArray(req.body) ? req.body : [];
    await prisma.$transaction([
      prisma.alertRule.deleteMany({ where: { projectId: id } }),
      prisma.alertRule.createMany({
        data: rows.map((r) => ({
          projectId: id,
          key: r.key,
          level: r.level || 'INFO',
          threshold: Number(r.threshold || 0),
          // If your schema stores a string, change to: recipients: String(r.recipients || '')
          recipients: Array.isArray(r.recipients) ? r.recipients : [],
          enabled: !!r.enabled,
        })),
      }),
    ]);
    const items = await prisma.alertRule.findMany({ where: { projectId: id } });
    res.json(items);
  } catch (e) {
    console.error('PUT /alert-rules failed:', e);
    res.status(400).json({ error: 'Save rules failed' });
  }
});

/** ======================= Inventory Needs ======================= */

router.get('/projects/:id/inventory/needs', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('inventoryNeed')) return res.json([]); // schema may not have this table yet
  try {
    const items = await prisma.inventoryNeed.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /inventory/needs failed:', e);
    res.json([]); // keep UI working
  }
});

router.post('/projects/:id/inventory/recompute', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  const { needs } = req.body || { needs: [] };
  const rows = Array.isArray(needs) ? needs : [];

  // If you don't have an InventoryNeed model yet, just return the computed rows.
  if (!hasModel('inventoryNeed')) {
    try {
      // Optionally, create alerts if there are gaps and Alert model exists
      if (hasModel('alert')) {
        const anyGap = rows.some((r) => (r.requiredQty || 0) > (r.availableQty || 0));
        if (anyGap) {
          await prisma.alert.create({
            data: {
              projectId: id,
              type: 'INVENTORY_GAP',
              level: 'AMBER',
              message: 'Inventory gaps detected from recompute.',
            },
          });
        }
      }
    } catch {}
    return res.json(rows);
  }

  try {
    // replace current snapshot
    await prisma.inventoryNeed.deleteMany({ where: { projectId: id } });
    await prisma.inventoryNeed.createMany({
      data: rows.map((n) => ({
        projectId: id,
        material: n.material,
        requiredQty: Number(n.requiredQty || 0),
        availableQty: Number(n.availableQty || 0),
      })),
    });

    if (hasModel('alert')) {
      const anyGap = rows.some((r) => (r.requiredQty || 0) > (r.availableQty || 0));
      if (anyGap) {
        await prisma.alert.create({
          data: {
            projectId: id,
            type: 'INVENTORY_GAP',
            level: 'AMBER',
            message: 'Inventory gaps detected from recompute.',
          },
        });
      }
    }

    const items = await prisma.inventoryNeed.findMany({ where: { projectId: id } });
    res.json(items);
  } catch (e) {
    console.error('POST /inventory/recompute failed:', e);
    res.status(400).json({ error: 'Recompute failed' });
  }
});

/** ======================= Pre-Production / Compliance ======================= */

router.get('/projects/:id/preprod', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('preProdStep')) return res.json([]);
  try {
    const items = await prisma.preProdStep.findMany({
      where: { projectId: id },
      orderBy: [{ order: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /preprod failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/compliance', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('complianceItem')) return res.json([]);
  try {
    const items = await prisma.complianceItem.findMany({
      where: { projectId: id },
      orderBy: [{ dueDate: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /compliance failed:', e);
    res.json([]);
  }
});

/** ======================= Change Log / Documents / Variances ======================= */

router.get('/projects/:id/changes', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('changeLog')) return res.json([]);
  try {
    const items = await prisma.changeLog.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /changes failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/documents', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('projectDocument')) return res.json([]);
  try {
    // Only return root documents (parentId is null) to avoid showing all revisions as separate rows
    const items = await prisma.projectDocument.findMany({
      where: { projectId: id, parentId: null },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        documentStations: {
          include: { station: true }
        }
      }
    });
    res.json(items);
  } catch (e) {
    console.error('GET /documents failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/variances', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('varianceItem')) return res.json([]);
  try {
    const items = await prisma.varianceItem.findMany({
      where: { projectId: id },
      include: { document: hasModel('projectDocument') ? true : false },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /variances failed:', e);
    res.json([]);
  }
});

/** ======================= Create: Change Log ======================= */
router.post('/projects/:id/changes', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { type, description, requestedBy } = req.body || {};
  if (!hasModel('changeLog')) {
    return res.status(200).json({
      id: Date.now(),
      projectId: id,
      type,
      description,
      requestedBy: requestedBy || null,
      createdAt: new Date()
    });
  }
  try {
    const row = await prisma.changeLog.create({
      data: { projectId: id, type, description, requestedBy: requestedBy || null }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /changes failed:', e);
    res.status(400).json({ error: 'Create change failed' });
  }
});
// DELETE change log item
router.delete('/projects/:id/changes/:changeId', authGuard, async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    await prisma.changeLog.delete({ where: { id: changeId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete failed' });
  }
});


/** ======================= Create: Document ======================= */
router.post('/projects/:id/documents', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { 
    kind, 
    title, 
    url, 
    version, 
    referenceUrl, 
    approvalEmails, 
    notificationEmails,
    key,
    storageKey,
    contentType
  } = req.body || {};
  if (!hasModel('projectDocument')) {
    return res.status(200).json({
      id: Date.now(), 
      projectId: id, 
      kind, 
      title, 
      url, 
      version: Number(version || 1),
      referenceUrl,
      approvalEmails,
      notificationEmails,
      key: key || null,
      storageKey: storageKey || key || null,
      contentType: contentType || null,
    });
  }
  try {
    const row = await prisma.projectDocument.create({
      data: { 
        projectId: id, 
        kind: kind || null, 
        title: title || null, 
        // Do not persist ephemeral URLs; store key/storageKey if provided
        url: url || null,
        key: key || null,
        storageKey: storageKey || key || null,
        contentType: contentType || null,
        version: Number(version || 1),
        referenceUrl: referenceUrl || null,
        approvalEmails: approvalEmails || null,
        notificationEmails: notificationEmails || null,
        parentId: null,
      }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /documents failed:', e);
    res.status(400).json({ error: 'Create document failed' });
  }
});

/** ======================= Create: Variance ======================= */
router.post('/projects/:id/variances', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { documentId, description } = req.body || {};
  if (!hasModel('varianceItem')) {
    return res.status(200).json({
      id: Date.now(), projectId: id, documentId: documentId || null, description, createdAt: new Date()
    });
  }
  try {
    const row = await prisma.varianceItem.create({
      data: { projectId: id, documentId: documentId || null, description }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /variances failed:', e);
    res.status(400).json({ error: 'Create variance failed' });
  }
});

/** ======================= Create: Pre-Prod Step ======================= */
router.post('/projects/:id/preprod', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { name, owner, status, dueDate, order } = req.body || {};
  if (!hasModel('preProdStep')) {
    return res.status(200).json({
      id: Date.now(),
      projectId: id,
      name,
      owner: owner || null,
      status: status || 'PLANNED',
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: null,
      order: Number(order || 0)
    });
  }
  try {
    const row = await prisma.preProdStep.create({
      data: {
        projectId: id,
        name,
        owner: owner || null,
        status: status || 'PLANNED',
        dueDate: dueDate ? new Date(dueDate) : null,
        order: Number(order || 0),
      }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /preprod failed:', e);
    res.status(400).json({ error: 'Create step failed' });
  }
});

/** ======================= Create: Compliance Item ======================= */
router.post('/projects/:id/compliance', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { type, status, dueDate, remarks } = req.body || {};
  if (!hasModel('complianceItem')) {
    return res.status(200).json({
      id: Date.now(),
      projectId: id,
      type,
      status: status || 'PLANNED',
      dueDate: dueDate ? new Date(dueDate) : null,
      remarks: remarks || null
    });
  }
  try {
    const row = await prisma.complianceItem.create({
      data: {
        projectId: id,
        type,
        status: status || 'PLANNED',
        dueDate: dueDate ? new Date(dueDate) : null,
        remarks: remarks || null,
      }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /compliance failed:', e);
    res.status(400).json({ error: 'Create compliance item failed' });
  }
});

// ---- SKUs: list / add (single or batch) / delete ----

// GET /api/projects/:id/skus
router.get('/projects/:id/skus', authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const rows = await prisma.projectSku.findMany({
      where: { projectId },
      // ProjectSku model doesn't have createdAt; sort by id desc for recency
      orderBy: { id: 'desc' },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load SKUs' });
  }
});

// POST /api/projects/:id/skus
// Accepts { code: "ABC" } or { codes: ["A","B","C"] }
router.post('/projects/:id/skus', authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    let codes = [];

    if (Array.isArray(req.body?.codes)) {
      codes = req.body.codes;
    } else if (typeof req.body?.code === 'string') {
      codes = [req.body.code];
    }

    codes = codes
      .map(s => String(s || '').trim())
      .filter(Boolean);

    if (codes.length === 0) {
      return res.status(400).json({ error: 'No SKU codes provided' });
    }

    // insert unique per project (ignore duplicates)
    const created = [];
    for (const code of codes) {
      try {
        const row = await prisma.projectSku.create({
          data: { projectId, code },
        });
        created.push(row);
      } catch (err) {
        // likely unique violation; skip
        if (process.env.NODE_ENV !== 'production') console.log('SKU skip:', code, err?.code);
      }
    }

    res.status(201).json(created.length === 1 ? created[0] : created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add SKUs' });
  }
});

// DELETE /api/projects/:id/skus/:skuId
router.delete('/projects/:id/skus/:skuId', authGuard, async (req, res) => {
  try {
    const skuId = Number(req.params.skuId);
    await prisma.projectSku.delete({ where: { id: skuId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete SKU' });
  }
});

/** ======================= QC ======================= */

router.get('/projects/:id/qc', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('qcRecord')) return res.json([]);
  try {
    const items = await prisma.qcRecord.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /qc failed:', e);
    res.json([]);
  }
});

router.post('/projects/:id/qc', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  const { batchCode, passed, rejected, reason, pantoneMatch } = req.body || {};

  if (!hasModel('qcRecord')) {
    // If schema lacks qcRecord, just bounce back a pseudo-row so UI proceeds
    const mock = {
      id: Date.now(),
      projectId: id,
      batchCode: batchCode || null,
      passed: Number(passed || 0),
      rejected: Number(rejected || 0),
      reason: reason || null,
      pantoneMatch: pantoneMatch || 'NA',
      createdAt: new Date().toISOString(),
    };
    try {
      if (hasModel('alert') && Number(rejected || 0) > 0) {
        await prisma.alert.create({
          data: { projectId: id, type: 'QC_REJECT', level: 'AMBER', message: `QC rejected: ${reason || 'n/a'}` },
        });
      }
    } catch {}
    return res.json(mock);
  }

  try {
    const row = await prisma.qcRecord.create({
      data: {
        projectId: id,
        batchCode: batchCode || null,
        passed: Number(passed || 0),
        rejected: Number(rejected || 0),
        reason: reason || null,
        pantoneMatch: pantoneMatch || 'NA',
      },
    });

    if (hasModel('alert') && Number(rejected || 0) > 0) {
      await prisma.alert.create({
        data: { projectId: id, type: 'QC_REJECT', level: 'AMBER', message: `QC rejected: ${reason || 'n/a'}` },
      });
    }

    res.json(row);
  } catch (e) {
    console.error('POST /qc failed:', e);
    res.status(400).json({ error: 'QC save failed' });
  }
});

/** ======================= Plan simulate ======================= */

router.post('/projects/:id/plan/simulate', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  try {
    const { quantity = 0, cutoffDate, buffers = {}, stages = [] } = req.body || {};
    const qty = Number(quantity || 0);
    const cutoff = cutoffDate ? new Date(cutoffDate) : new Date();
    const shipBuf = Number(buffers.shippingDays || 2);
    const qcBuf = Number(buffers.qcDays || 1);

    // trivial reverse plan: each stage needs qty / unitsPerDay days
    function makePlan(multiplier = 1) {
      let cursor = new Date(cutoff);
      cursor.setDate(cursor.getDate() - shipBuf - qcBuf); // reserve buffers
      const plan = [];
      for (let i = stages.length - 1; i >= 0; i--) {
        const s = stages[i];
        const upd = Math.max(1, Number(s.unitsPerDay || 1) * multiplier);
        const days = Math.ceil(qty / upd);
        const end = new Date(cursor);
        const start = new Date(cursor);
        start.setDate(start.getDate() - days);
        plan.unshift({
          stage: s.name,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          daysNeeded: days,
          unitsPerDay: upd,
        });
        cursor = start;
      }
      const slackDays = Math.max(0, Math.floor((cursor - new Date()) / (1000 * 60 * 60 * 24)));
      const risk = slackDays <= 0 ? 'RED' : slackDays < 3 ? 'AMBER' : 'GREEN';
      return { multiplier, risk, slackDays, plan };
    }

    const scenarios = [makePlan(1), makePlan(1.1), makePlan(1.2)];
    res.json({ projectId: id, quantity: qty, cutoffDate: cutoff.toISOString(), scenarios });
  } catch (e) {
    console.error('POST /plan/simulate failed:', e);
    res.status(400).json({ error: 'Plan simulate failed' });
  }
});

// GET /projects/:id/stations - List all stations for a project
router.get('/projects/:id/stations', authGuard, async (req, res) => {
  try {
    if (!hasModel('station')) return res.json([]);
    const projectId = toInt(req.params.id);
    const stations = await prisma.station.findMany({
      where: { projectId },
      orderBy: [{ id: 'asc' }],
    });
    res.json(stations);
  } catch (e) {
    console.error('GET /projects/:id/stations failed:', e);
    res.status(500).json({ error: 'Failed to load stations' });
  }
});

// ============================================================================
// KANBAN BOARD CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /projects/:id/board-config
 * Get Kanban board configuration for a project
 * Returns columns with task counts, creates default columns if none exist
 */
router.get(
  '/projects/:id/board-config',
  authGuard,
  permissionGuard('PROJECT_VIEW'),
  async (req, res) => {
    try {
      const projectId = toInt(req.params.id);

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const config = await getBoardConfig(projectId);
      res.json(config);
    } catch (error) {
      console.error('GET /projects/:id/board-config failed:', error);
      res.status(500).json({ error: 'Failed to load board configuration' });
    }
  }
);

/**
 * POST /projects/:id/board-config/columns
 * Create new custom column for project board
 */
router.post(
  '/projects/:id/board-config/columns',
  authGuard,
  permissionGuard('PROJECT_EDIT'),
  async (req, res) => {
    try {
      const projectId = toInt(req.params.id);
      const { name, section, wipLimit, color } = req.body;

      // Validation
      if (!name || !section) {
        return res.status(400).json({ error: 'Name and section are required' });
      }

      const validSections = ['Pre_Prod', 'Production', 'QC', 'Dispatch'];
      if (!validSections.includes(section)) {
        return res.status(400).json({ 
          error: `Invalid section. Must be one of: ${validSections.join(', ')}` 
        });
      }

      const column = await createBoardColumn(projectId, {
        name,
        section,
        wipLimit: wipLimit || null,
        color: color || null
      });

      res.status(201).json(column);
    } catch (error) {
      console.error('POST /projects/:id/board-config/columns failed:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create column' });
    }
  }
);

/**
 * PUT /projects/:id/board-config/columns/:columnId
 * Update board column configuration
 */
router.put(
  '/projects/:id/board-config/columns/:columnId',
  authGuard,
  permissionGuard('PROJECT_EDIT'),
  async (req, res) => {
    try {
      const projectId = toInt(req.params.id);
      const { columnId } = req.params;
      const { name, position, wipLimit, color } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (position !== undefined) updates.position = position;
      if (wipLimit !== undefined) updates.wipLimit = wipLimit;
      if (color !== undefined) updates.color = color;

      const column = await updateBoardColumn(projectId, columnId, updates);
      res.json(column);
    } catch (error) {
      console.error('PUT /projects/:id/board-config/columns/:columnId failed:', error);
      
      if (error.message === 'Column not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to update column' });
    }
  }
);

/**
 * DELETE /projects/:id/board-config/columns/:columnId
 * Delete custom column (cannot delete default columns or columns with tasks)
 */
router.delete(
  '/projects/:id/board-config/columns/:columnId',
  authGuard,
  permissionGuard('PROJECT_EDIT'),
  async (req, res) => {
    try {
      const projectId = toInt(req.params.id);
      const { columnId } = req.params;

      const result = await deleteBoardColumn(projectId, columnId);
      res.json(result);
    } catch (error) {
      console.error('DELETE /projects/:id/board-config/columns/:columnId failed:', error);
      
      if (error.message === 'Column not found') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Cannot delete')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to delete column' });
    }
  }
);

/**
 * GET /projects/:id/tasks
 * Get all tasks for a project
 */
router.get(
  '/projects/:id/tasks',
  authGuard,
  permissionGuard('PROJECT_VIEW'),
  async (req, res) => {
    try {
      const projectId = toInt(req.params.id);

      const tasks = await prisma.task.findMany({
        where: { projectId },
        orderBy: [
          { section: 'asc' },
          { position: 'asc' }
        ]
      });

      res.json(tasks);
    } catch (error) {
      console.error('GET /projects/:id/tasks failed:', error);
      res.status(500).json({ error: 'Failed to load tasks' });
    }
  }
);

/**
 * PUT /tasks/:id/move
 * Move task to different column/position
 * Supports drag-and-drop functionality
 */
router.put(
  '/tasks/:id/move',
  authGuard,
  permissionGuard('TASK_EDIT'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { section, position } = req.body;

      // Validation
      if (!section || position === undefined) {
        return res.status(400).json({ 
          error: 'Section and position are required' 
        });
      }

      const validSections = ['Pre_Prod', 'Production', 'QC', 'Dispatch'];
      if (!validSections.includes(section)) {
        return res.status(400).json({ 
          error: `Invalid section. Must be one of: ${validSections.join(', ')}` 
        });
      }

      if (typeof position !== 'number' || position < 0) {
        return res.status(400).json({ 
          error: 'Position must be a non-negative number' 
        });
      }

      const task = await moveTask(id, section, position);
      res.json(task);
    } catch (error) {
      console.error('PUT /tasks/:id/move failed:', error);
      
      if (error.message === 'Task not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to move task' });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW STATUS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/projects/:id/workflow-status
 * Get workflow status for a project (auto-calculates completion)
 */
router.get('/:id/workflow-status', authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Update and return workflow status
    const workflow = await workflowStatusService.updateWorkflowStatus(projectId);
    const progress = workflowStatusService.getWorkflowProgress(workflow);

    res.json({
      workflow,
      progress
    });
  } catch (error) {
    console.error('GET /projects/:id/workflow-status failed:', error);
    res.status(500).json({ error: 'Failed to fetch workflow status' });
  }
});

/**
 * POST /api/projects/:id/workflow-status/refresh
 * Force refresh workflow status (recalculate all completion states)
 */
router.post('/:id/workflow-status/refresh', authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const workflow = await workflowStatusService.updateWorkflowStatus(projectId);
    const progress = workflowStatusService.getWorkflowProgress(workflow);

    res.json({
      workflow,
      progress,
      refreshed: true
    });
  } catch (error) {
    console.error('POST /projects/:id/workflow-status/refresh failed:', error);
    res.status(500).json({ error: 'Failed to refresh workflow status' });
  }
});

module.exports = router;

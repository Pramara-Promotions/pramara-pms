const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// GET /api/workflow/stages - List all workflow stages with filters
router.get('/stages', async (req, res) => {
  try {
    const { projectId, status, parentStageId } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (parentStageId) where.parentStageId = parentStageId;
    if (parentStageId === 'null') where.parentStageId = null; // Top-level stages only
    
    const stages = await prisma.workflowStage.findMany({
      where,
      include: {
        SubStages: {
          orderBy: { order: 'asc' }
        },
        Tasks: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        Project: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    
    res.json({ stages });
  } catch (error) {
    console.error('Error fetching workflow stages:', error);
    res.status(500).json({ error: 'Failed to fetch workflow stages' });
  }
});

// GET /api/workflow/stages/:id - Get single stage with full details
router.get('/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stage = await prisma.workflowStage.findUnique({
      where: { id },
      include: {
        SubStages: {
          orderBy: { order: 'asc' }
        },
        Tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        Project: true,
        ParentStage: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!stage) {
      return res.status(404).json({ error: 'Workflow stage not found' });
    }
    
    res.json({ stage });
  } catch (error) {
    console.error('Error fetching workflow stage:', error);
    res.status(500).json({ error: 'Failed to fetch workflow stage' });
  }
});

// POST /api/workflow/stages - Create new workflow stage
router.post('/stages', async (req, res) => {
  try {
    const {
      projectId,
      name,
        description,
      order,
      parentStageId,
      responsibleId,
      approverId,
      approverType,
      requiredDocs,
      qcTemplateId,
      materialIds,
      dependencies,
      bufferDays
    } = req.body;
    
    // Validation
    if (!projectId || !name) {
      return res.status(400).json({ error: 'Project ID and name are required' });
    }
    
    const stage = await prisma.workflowStage.create({
      data: {
          id: require('crypto').randomUUID(),
        projectId: parseInt(projectId),
        name,
          description: description || null,
          sequence: order || 0,
          estimatedDays: bufferDays || 2,
          requiresQC: false,
        qcTemplateId: qcTemplateId || null,
          requiresApproval: approverType ? true : false,
          approvalType: approverType || null,
          status: 'pending',
          updatedAt: new Date()
      },
      include: {
          WorkflowTask: true
      }
    });
    
    res.status(201).json(stage);
  } catch (error) {
    console.error('Error creating workflow stage:', error);
    res.status(500).json({ error: 'Failed to create workflow stage' });
  }
});

// PUT /api/workflow/stages/:id - Update workflow stage
router.put('/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      order,
      responsibleId,
      approverId,
      approverType,
      requiredDocs,
      qcTemplateId,
      materialIds,
      dependencies,
      bufferDays,
      status
    } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;
    if (responsibleId !== undefined) updateData.responsibleId = responsibleId;
    if (approverId !== undefined) updateData.approverId = approverId;
    if (approverType !== undefined) updateData.approverType = approverType;
    if (requiredDocs !== undefined) updateData.requiredDocs = requiredDocs;
    if (qcTemplateId !== undefined) updateData.qcTemplateId = qcTemplateId;
    if (materialIds !== undefined) updateData.materialIds = materialIds;
    if (dependencies !== undefined) updateData.dependencies = dependencies;
    if (bufferDays !== undefined) updateData.bufferDays = bufferDays;
    if (status !== undefined) updateData.status = status;
    
    const stage = await prisma.workflowStage.update({
      where: { id },
      data: updateData,
      include: {
        SubStages: true,
        Tasks: true
      }
    });
    
    res.json({ stage });
  } catch (error) {
    console.error('Error updating workflow stage:', error);
    res.status(500).json({ error: 'Failed to update workflow stage' });
  }
});

// DELETE /api/workflow/stages/:id - Delete workflow stage
router.delete('/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.workflowStage.delete({
      where: { id }
    });
    
    res.json({ message: 'Workflow stage deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow stage:', error);
    res.status(500).json({ error: 'Failed to delete workflow stage' });
  }
});

// POST /api/workflow/stages/:id/approve - Approve stage and unblock downstream
router.post('/stages/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalProof, notes } = req.body;
    
    // Update stage to approved
    const stage = await prisma.workflowStage.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvalProof: approvalProof || null
      },
      include: {
        Project: true
      }
    });
    
    // Find all stages that were blocked by this stage
    const blockedStages = await prisma.workflowStage.findMany({
      where: {
        projectId: stage.projectId,
        dependencies: {
          has: id
        },
        status: 'blocked'
      }
    });
    
    // Check if each blocked stage can now proceed
    for (const blockedStage of blockedStages) {
      const allDependenciesMet = await checkDependencies(blockedStage);
      if (allDependenciesMet) {
        await prisma.workflowStage.update({
          where: { id: blockedStage.id },
          data: { status: 'not-started' }
        });
      }
    }
    
    res.json({ 
      stage,
      unblockedStages: blockedStages.length,
      notes: notes || null
    });
  } catch (error) {
    console.error('Error approving workflow stage:', error);
    res.status(500).json({ error: 'Failed to approve workflow stage' });
  }
});

// POST /api/workflow/stages/:id/start - Start stage execution
router.post('/stages/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check dependencies
    const stage = await prisma.workflowStage.findUnique({
      where: { id }
    });
    
    const dependenciesMet = await checkDependencies(stage);
    if (!dependenciesMet) {
      return res.status(400).json({ error: 'Dependencies not met' });
    }
    
    const updatedStage = await prisma.workflowStage.update({
      where: { id },
      data: {
        status: 'in-progress',
        startedAt: new Date()
      }
    });
    
    res.json({ stage: updatedStage });
  } catch (error) {
    console.error('Error starting workflow stage:', error);
    res.status(500).json({ error: 'Failed to start workflow stage' });
  }
});

// POST /api/workflow/stages/:id/complete - Complete stage
router.post('/stages/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stage = await prisma.workflowStage.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
    
    res.json({ stage });
  } catch (error) {
    console.error('Error completing workflow stage:', error);
    res.status(500).json({ error: 'Failed to complete workflow stage' });
  }
});

// POST /api/workflow/stages/:id/override - Override with risk logging
router.post('/stages/:id/override', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, risk } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Override reason is required' });
    }
    
    const stage = await prisma.workflowStage.update({
      where: { id },
      data: {
        status: 'in-progress',
        startedAt: new Date(),
        approvalProof: `OVERRIDDEN: ${reason} | Risk: ${risk || 'Not specified'}`
      }
    });
    
    // TODO: Log to audit system
    
    res.json({ stage, warning: 'Stage started with override' });
  } catch (error) {
    console.error('Error overriding workflow stage:', error);
    res.status(500).json({ error: 'Failed to override workflow stage' });
  }
});

// GET /api/workflow/projects/:projectId/dependencies - Get dependency graph
router.get('/projects/:projectId/dependencies', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const stages = await prisma.workflowStage.findMany({
      where: { projectId: parseInt(projectId) },
      select: {
        id: true,
        name: true,
        order: true,
        status: true,
        dependencies: true,
        SubStages: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    
    // Build dependency graph
    const graph = {
      nodes: stages.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        order: s.order,
        subStages: s.SubStages.length
      })),
      edges: stages.flatMap(s => 
        (s.dependencies || []).map(depId => ({
          from: depId,
          to: s.id
        }))
      )
    };
    
    res.json({ graph });
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    res.status(500).json({ error: 'Failed to fetch dependency graph' });
  }
});

// GET /api/workflow/projects/:projectId/blocked - List blocked stages
router.get('/projects/:projectId/blocked', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const blockedStages = await prisma.workflowStage.findMany({
      where: {
        projectId: parseInt(projectId),
        status: 'blocked'
      },
      include: {
        Project: {
          select: {
            code: true,
            name: true
          }
        }
      }
    });
    
    // For each blocked stage, get the blocking dependencies
    const stagesWithBlockers = await Promise.all(
      blockedStages.map(async (stage) => {
        const blockingStages = await prisma.workflowStage.findMany({
          where: {
            id: {
              in: stage.dependencies || []
            },
            status: {
              notIn: ['approved', 'completed']
            }
          },
          select: {
            id: true,
            name: true,
            status: true
          }
        });
        
        return {
          ...stage,
          blockingStages
        };
      })
    );
    
    res.json({ blockedStages: stagesWithBlockers });
  } catch (error) {
    console.error('Error fetching blocked stages:', error);
    res.status(500).json({ error: 'Failed to fetch blocked stages' });
  }
});

// GET /api/workflow/stages/analytics/summary - Analytics summary
router.get('/stages/analytics/summary', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const where = projectId ? { projectId: parseInt(projectId) } : {};
    
    const totalStages = await prisma.workflowStage.count({ where });
    
    const byStatus = await prisma.workflowStage.groupBy({
      by: ['status'],
      where,
      _count: true
    });
    
    const completionRate = totalStages > 0 
      ? ((byStatus.find(s => s.status === 'completed')?._count || 0) / totalStages * 100).toFixed(2)
      : 0;
    
    res.json({
      totalStages,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      completionRate: parseFloat(completionRate)
    });
  } catch (error) {
    console.error('Error fetching workflow analytics:', error);
    res.status(500).json({ error: 'Failed to fetch workflow analytics' });
  }
});

// Helper function to check if all dependencies are met
async function checkDependencies(stage) {
  if (!stage.dependencies || stage.dependencies.length === 0) {
    return true;
  }
  
  const dependencyStages = await prisma.workflowStage.findMany({
    where: {
      id: {
        in: stage.dependencies
      }
    },
    select: {
      id: true,
      status: true
    }
  });
  
  return dependencyStages.every(dep => 
    dep.status === 'approved' || dep.status === 'completed'
  );
}

module.exports = router;

// api/routes/process-flows.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const prisma = new PrismaClient();

// Get all process flows
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, status, isTemplate } = req.query;
    const where = {};
    
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (isTemplate !== undefined) where.isTemplate = isTemplate === 'true';

    const flows = await prisma.processFlow.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        operations: {
          include: {
            station: { select: { id: true, name: true, code: true } },
            subOperations: { orderBy: { sequence: 'asc' } }
          },
          orderBy: { sequence: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(flows);
  } catch (error) {
    console.error('Error fetching process flows:', error);
    res.status(500).json({ error: 'Failed to fetch process flows' });
  }
});

// Get single process flow
router.get('/:id', authenticate, async (req, res) => {
  try {
    const flow = await prisma.processFlow.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        operations: {
          include: {
            station: { select: { id: true, name: true, code: true } },
            subOperations: { orderBy: { sequence: 'asc' } }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!flow) {
      return res.status(404).json({ error: 'Process flow not found' });
    }

    res.json(flow);
  } catch (error) {
    console.error('Error fetching process flow:', error);
    res.status(500).json({ error: 'Failed to fetch process flow' });
  }
});

// Create new process flow
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      projectId,
      flowName,
      flowDescription,
      version,
      isTemplate,
      notes
    } = req.body;

    const flow = await prisma.processFlow.create({
      data: {
        projectId: parseInt(projectId),
        flowName,
        flowDescription,
        version: version || '1.0',
        status: 'draft',
        isTemplate: isTemplate || false,
        notes,
        createdBy: req.user.id
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(flow);
  } catch (error) {
    console.error('Error creating process flow:', error);
    res.status(500).json({ error: 'Failed to create process flow' });
  }
});

// Update process flow
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      flowName,
      flowDescription,
      version,
      status,
      isTemplate,
      notes
    } = req.body;

    const flow = await prisma.processFlow.update({
      where: { id: req.params.id },
      data: {
        flowName,
        flowDescription,
        version,
        status,
        isTemplate,
        notes
      },
      include: {
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        operations: {
          include: {
            station: { select: { id: true, name: true, code: true } },
            subOperations: { orderBy: { sequence: 'asc' } }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    res.json(flow);
  } catch (error) {
    console.error('Error updating process flow:', error);
    res.status(500).json({ error: 'Failed to update process flow' });
  }
});

// Activate process flow
router.post('/:id/activate', authenticate, async (req, res) => {
  try {
    const flow = await prisma.processFlow.update({
      where: { id: req.params.id },
      data: { status: 'active' },
      include: {
        project: { select: { id: true, name: true } },
        operations: {
          include: {
            station: { select: { id: true, name: true } },
            subOperations: { orderBy: { sequence: 'asc' } }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    res.json(flow);
  } catch (error) {
    console.error('Error activating process flow:', error);
    res.status(500).json({ error: 'Failed to activate process flow' });
  }
});

// Delete process flow
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.processFlow.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Process flow deleted' });
  } catch (error) {
    console.error('Error deleting process flow:', error);
    res.status(500).json({ error: 'Failed to delete process flow' });
  }
});

// ==================== OPERATIONS ====================

// Create operation
router.post('/:flowId/operations', authenticate, async (req, res) => {
  try {
    const { flowId } = req.params;
    const {
      operationName,
      operationCode,
      operationDescription,
      sequence,
      stationId,
      machineRequired,
      skillLevel,
      estimatedTime,
      standardOutput,
      qualityCheckpoints,
      safetyRequirements,
      toolsRequired,
      predecessorIds,
      isParallel,
      isCriticalPath,
      notes
    } = req.body;

    const operation = await prisma.processOperation.create({
      data: {
        processFlowId: flowId,
        operationName,
        operationCode,
        operationDescription,
        sequence: parseInt(sequence),
        stationId: stationId ? parseInt(stationId) : null,
        machineRequired,
        skillLevel,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        standardOutput: standardOutput ? parseInt(standardOutput) : null,
        qualityCheckpoints: qualityCheckpoints || [],
        safetyRequirements: safetyRequirements || [],
        toolsRequired: toolsRequired || [],
        predecessorIds: predecessorIds || [],
        isParallel: isParallel || false,
        isCriticalPath: isCriticalPath || false,
        notes
      },
      include: {
        station: { select: { id: true, name: true, code: true } },
        subOperations: { orderBy: { sequence: 'asc' } }
      }
    });

    // Update flow's total operations count
    const count = await prisma.processOperation.count({
      where: { processFlowId: flowId }
    });
    await prisma.processFlow.update({
      where: { id: flowId },
      data: { totalOperations: count }
    });

    res.status(201).json(operation);
  } catch (error) {
    console.error('Error creating operation:', error);
    res.status(500).json({ error: 'Failed to create operation' });
  }
});

// Update operation
router.put('/operations/:operationId', authenticate, async (req, res) => {
  try {
    const { operationId } = req.params;
    const {
      operationName,
      operationCode,
      operationDescription,
      sequence,
      stationId,
      machineRequired,
      skillLevel,
      estimatedTime,
      standardOutput,
      qualityCheckpoints,
      safetyRequirements,
      toolsRequired,
      predecessorIds,
      isParallel,
      isCriticalPath,
      notes
    } = req.body;

    const operation = await prisma.processOperation.update({
      where: { id: operationId },
      data: {
        operationName,
        operationCode,
        operationDescription,
        sequence: sequence ? parseInt(sequence) : undefined,
        stationId: stationId ? parseInt(stationId) : null,
        machineRequired,
        skillLevel,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        standardOutput: standardOutput ? parseInt(standardOutput) : null,
        qualityCheckpoints,
        safetyRequirements,
        toolsRequired,
        predecessorIds,
        isParallel,
        isCriticalPath,
        notes
      },
      include: {
        station: { select: { id: true, name: true, code: true } },
        subOperations: { orderBy: { sequence: 'asc' } }
      }
    });

    res.json(operation);
  } catch (error) {
    console.error('Error updating operation:', error);
    res.status(500).json({ error: 'Failed to update operation' });
  }
});

// Delete operation
router.delete('/operations/:operationId', authenticate, async (req, res) => {
  try {
    const operation = await prisma.processOperation.findUnique({
      where: { id: req.params.operationId }
    });

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    await prisma.processOperation.delete({
      where: { id: req.params.operationId }
    });

    // Update flow's total operations count
    const count = await prisma.processOperation.count({
      where: { processFlowId: operation.processFlowId }
    });
    await prisma.processFlow.update({
      where: { id: operation.processFlowId },
      data: { totalOperations: count }
    });

    res.json({ message: 'Operation deleted' });
  } catch (error) {
    console.error('Error deleting operation:', error);
    res.status(500).json({ error: 'Failed to delete operation' });
  }
});

// ==================== SUB-OPERATIONS ====================

// Create sub-operation
router.post('/operations/:operationId/sub-operations', authenticate, async (req, res) => {
  try {
    const { operationId } = req.params;
    const {
      subOperationName,
      subOperationCode,
      description,
      sequence,
      estimatedTime,
      isOptional,
      checkpoints,
      instructions,
      imageUrls,
      videoUrl
    } = req.body;

    const subOp = await prisma.subOperation.create({
      data: {
        processOperationId: operationId,
        subOperationName,
        subOperationCode,
        description,
        sequence: parseInt(sequence),
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        isOptional: isOptional || false,
        checkpoints: checkpoints || [],
        instructions,
        imageUrls: imageUrls || [],
        videoUrl
      }
    });

    res.status(201).json(subOp);
  } catch (error) {
    console.error('Error creating sub-operation:', error);
    res.status(500).json({ error: 'Failed to create sub-operation' });
  }
});

// Update sub-operation
router.put('/sub-operations/:subOpId', authenticate, async (req, res) => {
  try {
    const { subOpId } = req.params;
    const {
      subOperationName,
      subOperationCode,
      description,
      sequence,
      estimatedTime,
      isOptional,
      checkpoints,
      instructions,
      imageUrls,
      videoUrl
    } = req.body;

    const subOp = await prisma.subOperation.update({
      where: { id: subOpId },
      data: {
        subOperationName,
        subOperationCode,
        description,
        sequence: sequence ? parseInt(sequence) : undefined,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        isOptional,
        checkpoints,
        instructions,
        imageUrls,
        videoUrl
      }
    });

    res.json(subOp);
  } catch (error) {
    console.error('Error updating sub-operation:', error);
    res.status(500).json({ error: 'Failed to update sub-operation' });
  }
});

// Delete sub-operation
router.delete('/sub-operations/:subOpId', authenticate, async (req, res) => {
  try {
    await prisma.subOperation.delete({
      where: { id: req.params.subOpId }
    });

    res.json({ message: 'Sub-operation deleted' });
  } catch (error) {
    console.error('Error deleting sub-operation:', error);
    res.status(500).json({ error: 'Failed to delete sub-operation' });
  }
});

module.exports = router;

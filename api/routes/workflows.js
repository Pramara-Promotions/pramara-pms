// api/routes/workflows.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// Get all workflow templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by ID
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create workflow template
router.post('/templates', async (req, res) => {
  try {
    const { name, description, stages } = req.body;

    if (!name || !stages || !Array.isArray(stages)) {
      return res.status(400).json({ error: 'Name and stages are required' });
    }

    // Validate stages
    const validation = validateWorkflow(stages);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const template = await prisma.workflowTemplate.create({
      data: {
        name,
        description: description || `Workflow with ${stages.length} stages`,
        stages,
        isActive: true
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update workflow template
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, description, stages, isActive } = req.body;

    if (stages) {
      const validation = validateWorkflow(stages);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    const template = await prisma.workflowTemplate.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(stages && { stages }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(template);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    }
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Duplicate workflow template
router.post('/templates/:id/duplicate', async (req, res) => {
  try {
    const original = await prisma.workflowTemplate.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const duplicate = await prisma.workflowTemplate.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        stages: original.stages,
        isActive: false
      }
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// Delete workflow template
router.delete('/templates/:id', async (req, res) => {
  try {
    // Check if template is in use
    const inUse = await prisma.project.findFirst({
      where: { workflowTemplateId: parseInt(req.params.id) }
    });

    if (inUse) {
      return res.status(400).json({ 
        error: 'Cannot delete template that is in use by projects' 
      });
    }

    await prisma.workflowTemplate.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    }
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Validate workflow (check for cycles, orphaned stages, etc.)
router.post('/templates/validate', async (req, res) => {
  try {
    const { stages } = req.body;

    if (!stages || !Array.isArray(stages)) {
      return res.status(400).json({ error: 'Stages array required' });
    }

    const validation = validateWorkflow(stages);
    
    res.json(validation);
  } catch (error) {
    console.error('Error validating workflow:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Apply template to a project
router.post('/templates/:id/apply', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Apply template to project
    const project = await prisma.project.update({
      where: { id: parseInt(projectId) },
      data: {
        workflowTemplateId: template.id,
        workflow: template.stages
      }
    });

    res.json({
      success: true,
      message: 'Template applied to project',
      project
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Project not found' });
    }
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

/**
 * Validate workflow structure
 * Checks for:
 * - At least one start and one end stage
 * - No circular dependencies
 * - All dependencies reference valid stages
 * - No orphaned stages (except start)
 */
function validateWorkflow(stages) {
  if (!stages || stages.length === 0) {
    return { valid: false, error: 'Workflow must have at least one stage' };
  }

  const stageIds = new Set(stages.map(s => s.id));
  const startStages = stages.filter(s => s.type === 'start');
  const endStages = stages.filter(s => s.type === 'end');

  // Check for start and end stages
  if (startStages.length === 0) {
    return { valid: false, error: 'Workflow must have at least one start stage' };
  }

  if (endStages.length === 0) {
    return { valid: false, error: 'Workflow must have at least one end stage' };
  }

  // Validate dependencies
  for (const stage of stages) {
    if (!stage.dependencies) {
      stage.dependencies = [];
    }

    for (const depId of stage.dependencies) {
      if (!stageIds.has(depId)) {
        return {
          valid: false,
          error: `Stage "${stage.name}" has invalid dependency: ${depId}`
        };
      }
    }
  }

  // Check for circular dependencies
  const cycles = detectCycles(stages);
  if (cycles.length > 0) {
    return {
      valid: false,
      error: `Circular dependency detected: ${cycles.join(' -> ')}`
    };
  }

  // Check for orphaned stages (stages with no path to end)
  const reachableFromStart = getReachableStages(stages, startStages.map(s => s.id));
  const canReachEnd = stages
    .filter(s => s.type === 'end')
    .every(endStage => reachableFromStart.has(endStage.id));

  if (!canReachEnd) {
    return {
      valid: false,
      error: 'Some end stages are not reachable from start stages'
    };
  }

  return { valid: true, error: null };
}

/**
 * Detect circular dependencies using DFS
 */
function detectCycles(stages) {
  const visited = new Set();
  const recursionStack = new Set();
  const stageMap = new Map(stages.map(s => [s.id, s]));

  function dfs(stageId, path = []) {
    if (recursionStack.has(stageId)) {
      return [...path, stageId];
    }

    if (visited.has(stageId)) {
      return null;
    }

    visited.add(stageId);
    recursionStack.add(stageId);

    const stage = stageMap.get(stageId);
    if (stage && stage.dependencies) {
      for (const depId of stage.dependencies) {
        const cycle = dfs(depId, [...path, stageId]);
        if (cycle) return cycle;
      }
    }

    recursionStack.delete(stageId);
    return null;
  }

  for (const stage of stages) {
    const cycle = dfs(stage.id);
    if (cycle) return cycle;
  }

  return [];
}

/**
 * Get all stages reachable from start stages
 */
function getReachableStages(stages, startIds) {
  const reachable = new Set(startIds);
  const stageMap = new Map(stages.map(s => [s.id, s]));
  const queue = [...startIds];

  while (queue.length > 0) {
    const currentId = queue.shift();
    
    // Find all stages that depend on current stage
    for (const stage of stages) {
      if (stage.dependencies && stage.dependencies.includes(currentId)) {
        if (!reachable.has(stage.id)) {
          reachable.add(stage.id);
          queue.push(stage.id);
        }
      }
    }
  }

  return reachable;
}

module.exports = router;

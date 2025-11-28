// api/routes/process-templates.js
const express = require('express');
const router = express.Router();
const processTemplateService = require('../services/processTemplateService');

// Resilient auth guard
let authGuard;
try {
  const auth = require('../middleware/authGuard');
  authGuard = typeof auth === 'function' ? auth : auth?.authGuard;
} catch (e) {
  authGuard = (req, res, next) => next();
}

/**
 * GET /api/process-templates/suggest
 * Get template suggestions for an operation
 * Query: operation (string) - operation name
 */
router.get('/suggest', authGuard, async (req, res) => {
  try {
    const { operation } = req.query;
    
    if (!operation) {
      return res.status(400).json({ error: 'Operation name is required' });
    }
    
    const suggestions = await processTemplateService.suggestTemplate(operation);
    res.json(suggestions);
  } catch (error) {
    console.error('GET /process-templates/suggest failed:', error);
    res.status(500).json({ error: 'Failed to get template suggestions' });
  }
});

/**
 * POST /api/process-templates/learn/:projectId
 * Learn from a completed project
 */
router.post('/learn/:projectId', authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    await processTemplateService.learnFromProject(projectId);
    res.json({ success: true, message: 'Templates updated from project' });
  } catch (error) {
    console.error('POST /process-templates/learn/:projectId failed:', error);
    res.status(500).json({ error: 'Failed to learn from project' });
  }
});

/**
 * POST /api/process-templates/apply
 * Apply a template to a process flow
 * Body: { templateId, processFlowId }
 */
router.post('/apply', authGuard, async (req, res) => {
  try {
    const { templateId, processFlowId } = req.body;
    
    if (!templateId || !processFlowId) {
      return res.status(400).json({ error: 'Template ID and Process Flow ID are required' });
    }
    
    const result = await processTemplateService.applyTemplateToFlow(templateId, processFlowId);
    res.json(result);
  } catch (error) {
    console.error('POST /process-templates/apply failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to apply template' 
    });
  }
});

/**
 * GET /api/process-templates
 * List all templates
 * Query: processType, subType
 */
router.get('/', authGuard, async (req, res) => {
  try {
    const { processType, subType } = req.query;
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const templates = await prisma.processTemplate.findMany({
      where: {
        ...(processType && { processType }),
        ...(subType && { subType })
      },
      orderBy: [
        { successRate: 'desc' },
        { usageCount: 'desc' }
      ]
    });
    
    res.json(templates);
  } catch (error) {
    console.error('GET /process-templates failed:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

module.exports = router;

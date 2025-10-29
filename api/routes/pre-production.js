const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// MOLD MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/pre-production/molds
 * List all molds with optional filtering
 */
router.get('/molds', authGuard, async (req, res) => {
  try {
    const { projectId, status, search } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { moldCode: { contains: search, mode: 'insensitive' } },
        { moldName: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const molds = await prisma.mold.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { trials: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(molds);
  } catch (error) {
    console.error('[pre-production] Error fetching molds:', error);
    res.status(500).json({ error: 'Failed to fetch molds' });
  }
});

/**
 * GET /api/pre-production/molds/:id
 * Get single mold details
 */
router.get('/molds/:id', authGuard, async (req, res) => {
  try {
    const mold = await prisma.mold.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        trials: {
          include: {
            runner: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } },
          },
          orderBy: { trialDate: 'desc' },
        },
      },
    });
    
    if (!mold) {
      return res.status(404).json({ error: 'Mold not found' });
    }
    
    res.json(mold);
  } catch (error) {
    console.error('[pre-production] Error fetching mold:', error);
    res.status(500).json({ error: 'Failed to fetch mold' });
  }
});

/**
 * POST /api/pre-production/molds
 * Create new mold
 */
router.post('/molds', authGuard, async (req, res) => {
  try {
    const {
      projectId,
      moldCode,
      moldName,
      supplierName,
      cavities,
      material,
      dimensions,
      weight,
      cost,
      location,
      notes,
    } = req.body;
    
    const mold = await prisma.mold.create({
      data: {
        projectId: parseInt(projectId),
        moldCode,
        moldName,
        supplierName,
        cavities: cavities || 1,
        material,
        dimensions,
        weight: weight ? parseFloat(weight) : null,
        cost: cost ? parseFloat(cost) : null,
        location,
        notes,
        createdBy: req.user.id,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Mold created: ${moldCode} by ${req.user.email}`);
    res.status(201).json(mold);
  } catch (error) {
    console.error('[pre-production] Error creating mold:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Mold code already exists for this project' });
    }
    res.status(500).json({ error: 'Failed to create mold' });
  }
});

/**
 * PUT /api/pre-production/molds/:id
 * Update mold
 */
router.put('/molds/:id', authGuard, async (req, res) => {
  try {
    const {
      moldName,
      supplierName,
      cavities,
      material,
      dimensions,
      weight,
      cost,
      location,
      status,
      notes,
    } = req.body;
    
    const mold = await prisma.mold.update({
      where: { id: req.params.id },
      data: {
        moldName,
        supplierName,
        cavities,
        material,
        dimensions,
        weight: weight ? parseFloat(weight) : null,
        cost: cost ? parseFloat(cost) : null,
        location,
        status,
        notes,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Mold updated: ${mold.moldCode} by ${req.user.email}`);
    res.json(mold);
  } catch (error) {
    console.error('[pre-production] Error updating mold:', error);
    res.status(500).json({ error: 'Failed to update mold' });
  }
});

/**
 * DELETE /api/pre-production/molds/:id
 * Delete mold
 */
router.delete('/molds/:id', authGuard, async (req, res) => {
  try {
    await prisma.mold.delete({
      where: { id: req.params.id },
    });
    
    console.log(`[pre-production] Mold deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'Mold deleted successfully' });
  } catch (error) {
    console.error('[pre-production] Error deleting mold:', error);
    res.status(500).json({ error: 'Failed to delete mold' });
  }
});

// ============================================================================
// TRIAL MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/pre-production/trials
 * List all trials with optional filtering
 */
router.get('/trials', authGuard, async (req, res) => {
  try {
    const { projectId, moldId, outcome } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (moldId) where.moldId = moldId;
    if (outcome) where.outcome = outcome;
    
    const trials = await prisma.trial.findMany({
      where,
      include: {
        mold: { select: { id: true, moldCode: true, moldName: true } },
        project: { select: { id: true, code: true, name: true } },
        runner: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { trialDate: 'desc' },
    });
    
    res.json(trials);
  } catch (error) {
    console.error('[pre-production] Error fetching trials:', error);
    res.status(500).json({ error: 'Failed to fetch trials' });
  }
});

/**
 * POST /api/pre-production/trials
 * Create new trial
 */
router.post('/trials', authGuard, async (req, res) => {
  try {
    const {
      moldId,
      projectId,
      trialNumber,
      trialDate,
      machineId,
      cycleTime,
      temperature,
      pressure,
      samplesProduced,
      defectsFound,
      defectTypes,
      observations,
      outcome,
      nextSteps,
    } = req.body;
    
    const trial = await prisma.trial.create({
      data: {
        moldId,
        projectId: parseInt(projectId),
        trialNumber: parseInt(trialNumber),
        trialDate: new Date(trialDate),
        runBy: req.user.id,
        machineId,
        cycleTime: cycleTime ? parseFloat(cycleTime) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        pressure: pressure ? parseFloat(pressure) : null,
        samplesProduced: samplesProduced ? parseInt(samplesProduced) : null,
        defectsFound: defectsFound ? parseInt(defectsFound) : null,
        defectTypes: defectTypes || null,
        observations,
        outcome: outcome || 'pending',
        nextSteps,
      },
      include: {
        mold: { select: { id: true, moldCode: true, moldName: true } },
        project: { select: { id: true, code: true, name: true } },
        runner: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Trial created: #${trialNumber} for ${trial.mold.moldCode} by ${req.user.email}`);
    res.status(201).json(trial);
  } catch (error) {
    console.error('[pre-production] Error creating trial:', error);
    res.status(500).json({ error: 'Failed to create trial' });
  }
});

/**
 * PUT /api/pre-production/trials/:id
 * Update trial
 */
router.put('/trials/:id', authGuard, async (req, res) => {
  try {
    const {
      machineId,
      cycleTime,
      temperature,
      pressure,
      samplesProduced,
      defectsFound,
      defectTypes,
      observations,
      outcome,
      nextSteps,
    } = req.body;
    
    const trial = await prisma.trial.update({
      where: { id: req.params.id },
      data: {
        machineId,
        cycleTime: cycleTime ? parseFloat(cycleTime) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        pressure: pressure ? parseFloat(pressure) : null,
        samplesProduced: samplesProduced ? parseInt(samplesProduced) : null,
        defectsFound: defectsFound ? parseInt(defectsFound) : null,
        defectTypes,
        observations,
        outcome,
        nextSteps,
      },
      include: {
        mold: { select: { id: true, moldCode: true, moldName: true } },
        runner: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Trial updated: ${req.params.id} by ${req.user.email}`);
    res.json(trial);
  } catch (error) {
    console.error('[pre-production] Error updating trial:', error);
    res.status(500).json({ error: 'Failed to update trial' });
  }
});

/**
 * POST /api/pre-production/trials/:id/approve
 * Approve trial
 */
router.post('/trials/:id/approve', authGuard, async (req, res) => {
  try {
    const trial = await prisma.trial.update({
      where: { id: req.params.id },
      data: {
        outcome: 'passed',
        approvedBy: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        mold: { select: { id: true, moldCode: true, moldName: true } },
        runner: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Trial approved: ${req.params.id} by ${req.user.email}`);
    res.json(trial);
  } catch (error) {
    console.error('[pre-production] Error approving trial:', error);
    res.status(500).json({ error: 'Failed to approve trial' });
  }
});

/**
 * DELETE /api/pre-production/trials/:id
 * Delete trial
 */
router.delete('/trials/:id', authGuard, async (req, res) => {
  try {
    await prisma.trial.delete({
      where: { id: req.params.id },
    });
    
    console.log(`[pre-production] Trial deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'Trial deleted successfully' });
  } catch (error) {
    console.error('[pre-production] Error deleting trial:', error);
    res.status(500).json({ error: 'Failed to delete trial' });
  }
});

// ============================================================================
// PACKAGING DESIGN ROUTES
// ============================================================================

/**
 * GET /api/pre-production/packaging
 * List all packaging designs
 */
router.get('/packaging', authGuard, async (req, res) => {
  try {
    const { projectId, status, packagingType } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (packagingType) where.packagingType = packagingType;
    
    const designs = await prisma.packagingDesign.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        _count: { select: { revisions: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    
    res.json(designs);
  } catch (error) {
    console.error('[pre-production] Error fetching packaging designs:', error);
    res.status(500).json({ error: 'Failed to fetch packaging designs' });
  }
});

/**
 * POST /api/pre-production/packaging
 * Create new packaging design
 */
router.post('/packaging', authGuard, async (req, res) => {
  try {
    const {
      projectId,
      designCode,
      designName,
      packagingType,
      dimensions,
      material,
      printingMethod,
      colors,
      designFileUrl,
      mockupFileUrl,
      supplierName,
      unitCost,
      moq,
    } = req.body;
    
    const design = await prisma.packagingDesign.create({
      data: {
        projectId: parseInt(projectId),
        designCode,
        designName,
        packagingType,
        dimensions,
        material,
        printingMethod,
        colors: colors ? parseInt(colors) : null,
        designFileUrl,
        mockupFileUrl,
        supplierName,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        moq: moq ? parseInt(moq) : null,
        submittedBy: req.user.id,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Packaging design created: ${designCode} by ${req.user.email}`);
    res.status(201).json(design);
  } catch (error) {
    console.error('[pre-production] Error creating packaging design:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Design code already exists for this project' });
    }
    res.status(500).json({ error: 'Failed to create packaging design' });
  }
});

/**
 * PUT /api/pre-production/packaging/:id
 * Update packaging design
 */
router.put('/packaging/:id', authGuard, async (req, res) => {
  try {
    const {
      designName,
      packagingType,
      dimensions,
      material,
      printingMethod,
      colors,
      designFileUrl,
      mockupFileUrl,
      supplierName,
      unitCost,
      moq,
      status,
      feedback,
    } = req.body;
    
    const design = await prisma.packagingDesign.update({
      where: { id: req.params.id },
      data: {
        designName,
        packagingType,
        dimensions,
        material,
        printingMethod,
        colors: colors ? parseInt(colors) : undefined,
        designFileUrl,
        mockupFileUrl,
        supplierName,
        unitCost: unitCost ? parseFloat(unitCost) : undefined,
        moq: moq ? parseInt(moq) : undefined,
        status,
        feedback,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Packaging design updated: ${req.params.id} by ${req.user.email}`);
    res.json(design);
  } catch (error) {
    console.error('[pre-production] Error updating packaging design:', error);
    res.status(500).json({ error: 'Failed to update packaging design' });
  }
});

/**
 * POST /api/pre-production/packaging/:id/review
 * Submit review for packaging design
 */
router.post('/packaging/:id/review', authGuard, async (req, res) => {
  try {
    const { feedback } = req.body;
    
    const design = await prisma.packagingDesign.update({
      where: { id: req.params.id },
      data: {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        feedback,
        status: 'design',
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Packaging design reviewed: ${req.params.id} by ${req.user.email}`);
    res.json(design);
  } catch (error) {
    console.error('[pre-production] Error reviewing packaging design:', error);
    res.status(500).json({ error: 'Failed to review packaging design' });
  }
});

/**
 * POST /api/pre-production/packaging/:id/approve
 * Approve packaging design
 */
router.post('/packaging/:id/approve', authGuard, async (req, res) => {
  try {
    const design = await prisma.packagingDesign.update({
      where: { id: req.params.id },
      data: {
        approvedBy: req.user.id,
        approvedAt: new Date(),
        status: 'approved',
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] Packaging design approved: ${req.params.id} by ${req.user.email}`);
    res.json(design);
  } catch (error) {
    console.error('[pre-production] Error approving packaging design:', error);
    res.status(500).json({ error: 'Failed to approve packaging design' });
  }
});

/**
 * DELETE /api/pre-production/packaging/:id
 * Delete packaging design
 */
router.delete('/packaging/:id', authGuard, async (req, res) => {
  try {
    await prisma.packagingDesign.delete({
      where: { id: req.params.id },
    });
    
    console.log(`[pre-production] Packaging design deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'Packaging design deleted successfully' });
  } catch (error) {
    console.error('[pre-production] Error deleting packaging design:', error);
    res.status(500).json({ error: 'Failed to delete packaging design' });
  }
});

// ============================================================================
// PPS APPROVAL ROUTES
// ============================================================================

/**
 * GET /api/pre-production/pps
 * List all PPS approvals
 */
router.get('/pps', authGuard, async (req, res) => {
  try {
    const { projectId, status, currentStage } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (currentStage) where.currentStage = currentStage;
    
    const ppsApprovals = await prisma.pPSApproval.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        rejector: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    
    res.json(ppsApprovals);
  } catch (error) {
    console.error('[pre-production] Error fetching PPS approvals:', error);
    res.status(500).json({ error: 'Failed to fetch PPS approvals' });
  }
});

/**
 * POST /api/pre-production/pps
 * Create new PPS approval
 */
router.post('/pps', authGuard, async (req, res) => {
  try {
    const {
      projectId,
      ppsCode,
      documentName,
      documentUrl,
      version,
      reviewers,
      notes,
    } = req.body;
    
    const pps = await prisma.pPSApproval.create({
      data: {
        projectId: parseInt(projectId),
        ppsCode,
        documentName,
        documentUrl,
        version: version || '1.0',
        submittedBy: req.user.id,
        reviewers: reviewers || [],
        notes,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] PPS approval created: ${ppsCode} by ${req.user.email}`);
    res.status(201).json(pps);
  } catch (error) {
    console.error('[pre-production] Error creating PPS approval:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'PPS code already exists for this project' });
    }
    res.status(500).json({ error: 'Failed to create PPS approval' });
  }
});

/**
 * PUT /api/pre-production/pps/:id
 * Update PPS approval
 */
router.put('/pps/:id', authGuard, async (req, res) => {
  try {
    const {
      documentName,
      documentUrl,
      version,
      reviewers,
      currentStage,
      requiresChanges,
      changeRequests,
      notes,
    } = req.body;
    
    const pps = await prisma.pPSApproval.update({
      where: { id: req.params.id },
      data: {
        documentName,
        documentUrl,
        version,
        reviewers,
        currentStage,
        requiresChanges,
        changeRequests,
        notes,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] PPS approval updated: ${req.params.id} by ${req.user.email}`);
    res.json(pps);
  } catch (error) {
    console.error('[pre-production] Error updating PPS approval:', error);
    res.status(500).json({ error: 'Failed to update PPS approval' });
  }
});

/**
 * POST /api/pre-production/pps/:id/approve
 * Approve PPS
 */
router.post('/pps/:id/approve', authGuard, async (req, res) => {
  try {
    const { effectiveDate, expiryDate } = req.body;
    
    const pps = await prisma.pPSApproval.update({
      where: { id: req.params.id },
      data: {
        approvedBy: req.user.id,
        approvedAt: new Date(),
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        currentStage: 'approved',
        status: 'approved',
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] PPS approved: ${req.params.id} by ${req.user.email}`);
    res.json(pps);
  } catch (error) {
    console.error('[pre-production] Error approving PPS:', error);
    res.status(500).json({ error: 'Failed to approve PPS' });
  }
});

/**
 * POST /api/pre-production/pps/:id/reject
 * Reject PPS
 */
router.post('/pps/:id/reject', authGuard, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const pps = await prisma.pPSApproval.update({
      where: { id: req.params.id },
      data: {
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason,
        currentStage: 'rejected',
        status: 'rejected',
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        submitter: { select: { id: true, name: true } },
        rejector: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[pre-production] PPS rejected: ${req.params.id} by ${req.user.email}`);
    res.json(pps);
  } catch (error) {
    console.error('[pre-production] Error rejecting PPS:', error);
    res.status(500).json({ error: 'Failed to reject PPS' });
  }
});

/**
 * DELETE /api/pre-production/pps/:id
 * Delete PPS approval
 */
router.delete('/pps/:id', authGuard, async (req, res) => {
  try {
    await prisma.pPSApproval.delete({
      where: { id: req.params.id },
    });
    
    console.log(`[pre-production] PPS deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'PPS approval deleted successfully' });
  } catch (error) {
    console.error('[pre-production] Error deleting PPS:', error);
    res.status(500).json({ error: 'Failed to delete PPS' });
  }
});

module.exports = router;

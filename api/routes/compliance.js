const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// CERTIFICATIONS ALIAS ROUTES
// Frontend calls /api/compliance/certifications, backend uses /company-certifications
// Add aliases to support both paths
// ============================================================================

// GET /api/compliance/certifications (alias)
router.get('/certifications', authGuard, async (req, res) => {
  try {
    const { status, certificationType } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (certificationType) where.certificationType = certificationType;
    
    const certifications = await prisma.companyCertification.findMany({
      where,
      include: {
        responsible: { select: { id: true, name: true, email: true } },
        _count: { select: { audits: true, reminders: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
    
    res.json(certifications);
  } catch (error) {
    console.error('[compliance] Error fetching certifications:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

// POST /api/compliance/certifications (alias)
router.post('/certifications', authGuard, async (req, res) => {
  try {
    const {
      certificationType,
      certificationName,
      certificationBody,
      certificateNumber,
      certificateFileUrl,
      issueDate,
      expiryDate,
      lastAuditDate,
      nextAuditDate,
      scope,
      responsiblePerson,
      reminderDays,
      notes,
    } = req.body;
    
    const certification = await prisma.companyCertification.create({
      data: {
        certificationType,
        certificationName,
        certificationBody,
        certificateNumber,
        certificateFileUrl,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        lastAuditDate: lastAuditDate ? new Date(lastAuditDate) : null,
        nextAuditDate: nextAuditDate ? new Date(nextAuditDate) : null,
        scope,
        responsiblePerson,
        reminderDays: reminderDays || 90,
        notes,
      },
      include: {
        responsible: { select: { id: true, name: true, email: true } },
      },
    });
    
    console.log(`[compliance] Certification created: ${certificationName} by ${req.user.email}`);
    res.status(201).json(certification);
  } catch (error) {
    console.error('[compliance] Error creating certification:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Certification with this type and number already exists' });
    }
    res.status(500).json({ error: 'Failed to create certification' });
  }
});

// PUT /api/compliance/certifications/:id (alias)
router.put('/certifications/:id', authGuard, async (req, res) => {
  try {
    const certification = await prisma.companyCertification.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
        lastAuditDate: req.body.lastAuditDate ? new Date(req.body.lastAuditDate) : undefined,
        nextAuditDate: req.body.nextAuditDate ? new Date(req.body.nextAuditDate) : undefined,
      },
      include: {
        responsible: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Certification updated: ${req.params.id} by ${req.user.email}`);
    res.json(certification);
  } catch (error) {
    console.error('[compliance] Error updating certification:', error);
    res.status(500).json({ error: 'Failed to update certification' });
  }
});

// DELETE /api/compliance/certifications/:id (alias)
router.delete('/certifications/:id', authGuard, async (req, res) => {
  try {
    await prisma.companyCertification.delete({
      where: { id: req.params.id },
    });
    
    console.log(`[compliance] Certification deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'Certification deleted successfully' });
  } catch (error) {
    console.error('[compliance] Error deleting certification:', error);
    res.status(500).json({ error: 'Failed to delete certification' });
  }
});

// ============================================================================
// COMPANY CERTIFICATIONS (Original routes)
// ============================================================================

/**
 * GET /api/compliance/company-certifications
 * List all company certifications
 */
router.get('/company-certifications', authGuard, async (req, res) => {
  try {
    const { status, certificationType } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (certificationType) where.certificationType = certificationType;
    
    const certifications = await prisma.companyCertification.findMany({
      where,
      include: {
        responsible: { select: { id: true, name: true, email: true } },
        _count: { select: { audits: true, reminders: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
    
    res.json(certifications);
  } catch (error) {
    console.error('[compliance] Error fetching company certifications:', error);
    res.status(500).json({ error: 'Failed to fetch company certifications' });
  }
});

/**
 * POST /api/compliance/company-certifications
 * Create new company certification
 */
router.post('/company-certifications', authGuard, async (req, res) => {
  try {
    const {
      certificationType,
      certificationName,
      certificationBody,
      certificateNumber,
      certificateFileUrl,
      issueDate,
      expiryDate,
      lastAuditDate,
      nextAuditDate,
      scope,
      responsiblePerson,
      reminderDays,
      notes,
    } = req.body;
    
    const certification = await prisma.companyCertification.create({
      data: {
        certificationType,
        certificationName,
        certificationBody,
        certificateNumber,
        certificateFileUrl,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        lastAuditDate: lastAuditDate ? new Date(lastAuditDate) : null,
        nextAuditDate: nextAuditDate ? new Date(nextAuditDate) : null,
        scope,
        responsiblePerson,
        reminderDays: reminderDays || 90,
        notes,
      },
      include: {
        responsible: { select: { id: true, name: true, email: true } },
      },
    });
    
    console.log(`[compliance] Company certification created: ${certificationName} by ${req.user.email}`);
    res.status(201).json(certification);
  } catch (error) {
    console.error('[compliance] Error creating company certification:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Certification with this type and number already exists' });
    }
    res.status(500).json({ error: 'Failed to create company certification' });
  }
});

/**
 * PUT /api/compliance/company-certifications/:id
 * Update company certification
 */
router.put('/company-certifications/:id', authGuard, async (req, res) => {
  try {
    const certification = await prisma.companyCertification.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
        lastAuditDate: req.body.lastAuditDate ? new Date(req.body.lastAuditDate) : undefined,
        nextAuditDate: req.body.nextAuditDate ? new Date(req.body.nextAuditDate) : undefined,
      },
      include: {
        responsible: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Company certification updated: ${req.params.id} by ${req.user.email}`);
    res.json(certification);
  } catch (error) {
    console.error('[compliance] Error updating company certification:', error);
    res.status(500).json({ error: 'Failed to update company certification' });
  }
});

/**
 * DELETE /api/compliance/company-certifications/:id
 * Delete company certification
 */
router.delete('/company-certifications/:id', authGuard, async (req, res) => {
  try {
    await prisma.companyCertification.delete({
      where: { id: req.params.id },
    });
    
    console.log(`[compliance] Company certification deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'Company certification deleted successfully' });
  } catch (error) {
    console.error('[compliance] Error deleting company certification:', error);
    res.status(500).json({ error: 'Failed to delete company certification' });
  }
});

// ============================================================================
// COMPLIANCE AUDITS
// ============================================================================

/**
 * GET /api/compliance/audits
 * List audits for a certification
 */
router.get('/audits', authGuard, async (req, res) => {
  try {
    const { certificationId } = req.query;
    
    const where = certificationId ? { certificationId } : {};
    
    const audits = await prisma.complianceAudit.findMany({
      where,
      include: {
        certification: { select: { certificationName: true, certificationType: true } },
      },
      orderBy: { auditDate: 'desc' },
    });
    
    res.json(audits);
  } catch (error) {
    console.error('[compliance] Error fetching audits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

/**
 * POST /api/compliance/audits
 * Create new audit record
 */
router.post('/audits', authGuard, async (req, res) => {
  try {
    const {
      certificationId,
      auditType,
      auditDate,
      auditDuration,
      auditorName,
      auditorCompany,
      findings,
      correctiveActions,
      auditReportUrl,
      outcome,
      nextAuditDate,
      notes,
    } = req.body;
    
    const audit = await prisma.complianceAudit.create({
      data: {
        certificationId,
        auditType,
        auditDate: new Date(auditDate),
        auditDuration,
        auditorName,
        auditorCompany,
        findings,
        correctiveActions,
        auditReportUrl,
        outcome,
        nextAuditDate: nextAuditDate ? new Date(nextAuditDate) : null,
        notes,
      },
      include: {
        certification: { select: { certificationName: true } },
      },
    });
    
    // Update certification's last and next audit dates
    await prisma.companyCertification.update({
      where: { id: certificationId },
      data: {
        lastAuditDate: new Date(auditDate),
        nextAuditDate: nextAuditDate ? new Date(nextAuditDate) : null,
      },
    });
    
    console.log(`[compliance] Audit created for certification: ${certificationId} by ${req.user.email}`);
    res.status(201).json(audit);
  } catch (error) {
    console.error('[compliance] Error creating audit:', error);
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// ============================================================================
// PROJECT COMPLIANCE
// ============================================================================

/**
 * GET /api/compliance?projectId=X
 * Alias for project compliance (frontend compatibility)
 */
router.get('/', authGuard, async (req, res) => {
  try {
    const { projectId, status, complianceType } = req.query;
    
    // If no filters, return empty array (don't list all compliance)
    if (!projectId && !status && !complianceType) {
      return res.json([]);
    }
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (complianceType) where.complianceType = complianceType;
    
    const compliance = await prisma.projectCompliance.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } },
        _count: { select: { requirements: true, documents: true, labTests: true } },
      },
      orderBy: { requiredBy: 'asc' },
    });
    
    res.json(compliance);
  } catch (error) {
    console.error('[compliance] Error fetching compliance:', error);
    res.status(500).json({ error: 'Failed to fetch compliance' });
  }
});

/**
 * GET /api/compliance/project-compliance
 * List compliance requirements for projects
 */
router.get('/project-compliance', authGuard, async (req, res) => {
  try {
    const { projectId, status, complianceType } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (complianceType) where.complianceType = complianceType;
    
    const compliance = await prisma.projectCompliance.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } },
        _count: { select: { requirements: true, documents: true, labTests: true } },
      },
      orderBy: { requiredBy: 'asc' },
    });
    
    res.json(compliance);
  } catch (error) {
    console.error('[compliance] Error fetching project compliance:', error);
    res.status(500).json({ error: 'Failed to fetch project compliance' });
  }
});

/**
 * POST /api/compliance
 * Create project compliance requirement (alias for frontend compatibility)
 */
router.post('/', authGuard, async (req, res) => {
  try {
    const {
      projectId,
      complianceType,
      complianceName,
      required,
      priority,
      requiredBy,
      certificationBody,
      responsiblePerson,
      blocksProduction,
      blocksShipment,
      notes,
    } = req.body;
    
    const compliance = await prisma.projectCompliance.create({
      data: {
        projectId: parseInt(projectId),
        complianceType,
        complianceName,
        required: required !== false,
        priority: priority || 'medium',
        requiredBy: requiredBy ? new Date(requiredBy) : null,
        certificationBody,
        responsiblePerson,
        blocksProduction: blocksProduction || false,
        blocksShipment: blocksShipment || false,
        notes,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Project compliance created: ${complianceName} for project ${projectId} by ${req.user.email}`);
    res.status(201).json(compliance);
  } catch (error) {
    console.error('[compliance] Error creating project compliance:', error);
    res.status(500).json({ error: 'Failed to create project compliance' });
  }
});

/**
 * POST /api/compliance/project-compliance
 * Create project compliance requirement
 */
router.post('/project-compliance', authGuard, async (req, res) => {
  try {
    const {
      projectId,
      complianceType,
      complianceName,
      required,
      priority,
      requiredBy,
      certificationBody,
      responsiblePerson,
      blocksProduction,
      blocksShipment,
      notes,
    } = req.body;
    
    const compliance = await prisma.projectCompliance.create({
      data: {
        projectId: parseInt(projectId),
        complianceType,
        complianceName,
        required: required !== false,
        priority: priority || 'medium',
        requiredBy: requiredBy ? new Date(requiredBy) : null,
        certificationBody,
        responsiblePerson,
        blocksProduction: blocksProduction || false,
        blocksShipment: blocksShipment || false,
        notes,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Project compliance created: ${complianceName} for project ${projectId} by ${req.user.email}`);
    res.status(201).json(compliance);
  } catch (error) {
    console.error('[compliance] Error creating project compliance:', error);
    res.status(500).json({ error: 'Failed to create project compliance' });
  }
});

/**
 * PUT /api/compliance/:id
 * Update project compliance (alias for frontend compatibility)
 */
router.put('/:id', authGuard, async (req, res) => {
  try {
    const compliance = await prisma.projectCompliance.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        requiredBy: req.body.requiredBy ? new Date(req.body.requiredBy) : undefined,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Project compliance updated: ${req.params.id} by ${req.user.email}`);
    res.json(compliance);
  } catch (error) {
    console.error('[compliance] Error updating project compliance:', error);
    res.status(500).json({ error: 'Failed to update project compliance' });
  }
});

/**
 * DELETE /api/compliance/:id
 * Delete project compliance (alias for frontend compatibility)
 */
router.delete('/:id', authGuard, async (req, res) => {
  try {
    await prisma.projectCompliance.delete({
      where: { id: req.params.id },
    });
    
    console.log(`[compliance] Project compliance deleted: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'Project compliance deleted successfully' });
  } catch (error) {
    console.error('[compliance] Error deleting project compliance:', error);
    res.status(500).json({ error: 'Failed to delete project compliance' });
  }
});

/**
 * PUT /api/compliance/project-compliance/:id
 * Update project compliance
 */
router.put('/project-compliance/:id', authGuard, async (req, res) => {
  try {
    const compliance = await prisma.projectCompliance.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        requiredBy: req.body.requiredBy ? new Date(req.body.requiredBy) : undefined,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Project compliance updated: ${req.params.id} by ${req.user.email}`);
    res.json(compliance);
  } catch (error) {
    console.error('[compliance] Error updating project compliance:', error);
    res.status(500).json({ error: 'Failed to update project compliance' });
  }
});

// ============================================================================
// COMPLIANCE REQUIREMENTS (Sub-tasks)
// ============================================================================

/**
 * GET /api/compliance/requirements
 * List requirements for a compliance
 */
router.get('/requirements', authGuard, async (req, res) => {
  try {
    const { complianceId } = req.query;
    
    const requirements = await prisma.complianceRequirement.findMany({
      where: { complianceId },
      include: {
        assignee: { select: { id: true, name: true } },
        completer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
    
    res.json(requirements);
  } catch (error) {
    console.error('[compliance] Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

/**
 * POST /api/compliance/requirements
 * Create compliance requirement
 */
router.post('/requirements', authGuard, async (req, res) => {
  try {
    const {
      complianceId,
      requirementType,
      description,
      isMandatory,
      verificationMethod,
      assignedTo,
      dueDate,
    } = req.body;
    
    const requirement = await prisma.complianceRequirement.create({
      data: {
        complianceId,
        requirementType,
        description,
        isMandatory: isMandatory !== false,
        verificationMethod,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Requirement created for compliance: ${complianceId} by ${req.user.email}`);
    res.status(201).json(requirement);
  } catch (error) {
    console.error('[compliance] Error creating requirement:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

/**
 * PUT /api/compliance/requirements/:id
 * Update requirement status
 */
router.put('/requirements/:id', authGuard, async (req, res) => {
  try {
    const requirement = await prisma.complianceRequirement.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        completedAt: req.body.status === 'completed' ? new Date() : undefined,
        completedBy: req.body.status === 'completed' ? req.user.id : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        completer: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Requirement updated: ${req.params.id} by ${req.user.email}`);
    res.json(requirement);
  } catch (error) {
    console.error('[compliance] Error updating requirement:', error);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

// ============================================================================
// COMPLIANCE DOCUMENTS
// ============================================================================

/**
 * GET /api/compliance/documents
 * List documents for a compliance
 */
router.get('/documents', authGuard, async (req, res) => {
  try {
    const { complianceId, documentType, status } = req.query;
    
    const where = {};
    if (complianceId) where.complianceId = complianceId;
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;
    
    const documents = await prisma.complianceDocument.findMany({
      where,
      include: {
        uploader: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });
    
    res.json(documents);
  } catch (error) {
    console.error('[compliance] Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/compliance/documents
 * Upload compliance document
 */
router.post('/documents', authGuard, async (req, res) => {
  try {
    const {
      complianceId,
      documentType,
      documentName,
      documentNumber,
      fileUrl,
      issueDate,
      expiryDate,
      issuedBy,
      relatedTo,
      quantity,
      quantityUnit,
      notes,
    } = req.body;
    
    const document = await prisma.complianceDocument.create({
      data: {
        complianceId,
        documentType,
        documentName,
        documentNumber,
        fileUrl,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        issuedBy,
        relatedTo,
        quantity: quantity ? parseFloat(quantity) : null,
        quantityUnit,
        uploadedBy: req.user.id,
        notes,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Document uploaded: ${documentName} by ${req.user.email}`);
    res.status(201).json(document);
  } catch (error) {
    console.error('[compliance] Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /api/compliance/documents/by-project?projectId=123
 * List compliance documents linked to a specific project via ProjectCompliance
 */
router.get('/documents/by-project', authGuard, permissionGuard('DOC_VIEW'), async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const documents = await prisma.complianceDocument.findMany({
      where: { compliance: { projectId } },
      include: {
        compliance: { select: { id: true, complianceName: true, complianceType: true } },
        uploader: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('[compliance] Error fetching documents by project:', error);
    res.status(500).json({ error: 'Failed to fetch documents by project' });
  }
});

/**
 * POST /api/compliance/documents/:id/verify
 * Verify a compliance document
 */
router.post('/documents/:id/verify', authGuard, async (req, res) => {
  try {
    const document = await prisma.complianceDocument.update({
      where: { id: req.params.id },
      data: {
        status: 'active',
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
      },
      include: {
        uploader: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Document verified: ${req.params.id} by ${req.user.email}`);
    res.json(document);
  } catch (error) {
    console.error('[compliance] Error verifying document:', error);
    res.status(500).json({ error: 'Failed to verify document' });
  }
});

// ============================================================================
// LAB TESTS
// ============================================================================

/**
 * GET /api/compliance/lab-tests
 * List lab tests
 */
router.get('/lab-tests', authGuard, async (req, res) => {
  try {
    const { projectId, complianceId, testType, result } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (complianceId) where.complianceId = complianceId;
    if (testType) where.testType = testType;
    if (result) where.result = result;
    
    const labTests = await prisma.labTest.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        compliance: { select: { id: true, complianceName: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { testDate: 'desc' },
    });
    
    res.json(labTests);
  } catch (error) {
    console.error('[compliance] Error fetching lab tests:', error);
    res.status(500).json({ error: 'Failed to fetch lab tests' });
  }
});

/**
 * POST /api/compliance/lab-tests
 * Create lab test record
 */
router.post('/lab-tests', authGuard, async (req, res) => {
  try {
    const {
      projectId,
      complianceId,
      testType,
      testName,
      labName,
      labAccreditation,
      sampleCode,
      sampleDescription,
      testStandard,
      testDate,
      reportDate,
      reportNumber,
      reportFileUrl,
      result,
      resultDetails,
      cost,
      notes,
    } = req.body;
    
    const labTest = await prisma.labTest.create({
      data: {
        projectId: parseInt(projectId),
        complianceId,
        testType,
        testName,
        labName,
        labAccreditation,
        sampleCode,
        sampleDescription,
        testStandard,
        testDate: new Date(testDate),
        reportDate: reportDate ? new Date(reportDate) : null,
        reportNumber,
        reportFileUrl,
        result: result || 'pending',
        resultDetails,
        cost: cost ? parseFloat(cost) : null,
        notes,
        createdBy: req.user.id,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Lab test created: ${testName} by ${req.user.email}`);
    res.status(201).json(labTest);
  } catch (error) {
    console.error('[compliance] Error creating lab test:', error);
    res.status(500).json({ error: 'Failed to create lab test' });
  }
});

/**
 * PUT /api/compliance/lab-tests/:id
 * Update lab test
 */
router.put('/lab-tests/:id', authGuard, async (req, res) => {
  try {
    const labTest = await prisma.labTest.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        testDate: req.body.testDate ? new Date(req.body.testDate) : undefined,
        reportDate: req.body.reportDate ? new Date(req.body.reportDate) : undefined,
        retestDueDate: req.body.retestDueDate ? new Date(req.body.retestDueDate) : undefined,
        cost: req.body.cost ? parseFloat(req.body.cost) : undefined,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Lab test updated: ${req.params.id} by ${req.user.email}`);
    res.json(labTest);
  } catch (error) {
    console.error('[compliance] Error updating lab test:', error);
    res.status(500).json({ error: 'Failed to update lab test' });
  }
});

// ============================================================================
// MATERIAL COMPLIANCE
// ============================================================================

/**
 * GET /api/compliance/material-compliance
 * List material compliance records
 */
router.get('/material-compliance', authGuard, async (req, res) => {
  try {
    const { projectId, complianceType, supplierName, status } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (complianceType) where.complianceType = complianceType;
    if (supplierName) where.supplierName = { contains: supplierName, mode: 'insensitive' };
    if (status) where.status = status;
    
    const materials = await prisma.materialCompliance.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(materials);
  } catch (error) {
    console.error('[compliance] Error fetching material compliance:', error);
    res.status(500).json({ error: 'Failed to fetch material compliance' });
  }
});

/**
 * POST /api/compliance/material-compliance
 * Create material compliance record
 */
router.post('/material-compliance', authGuard, async (req, res) => {
  try {
    const {
      projectId,
      materialName,
      materialType,
      supplierName,
      complianceType,
      certificateNumber,
      certificateFileUrl,
      issueDate,
      expiryDate,
      purchaseInvoiceNumber,
      purchaseInvoiceUrl,
      purchaseQuantity,
      purchaseUnit,
      purchaseDate,
      notes,
    } = req.body;
    
    const material = await prisma.materialCompliance.create({
      data: {
        projectId: parseInt(projectId),
        materialName,
        materialType,
        supplierName,
        complianceType,
        certificateNumber,
        certificateFileUrl,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        purchaseInvoiceNumber,
        purchaseInvoiceUrl,
        purchaseQuantity: purchaseQuantity ? parseFloat(purchaseQuantity) : null,
        purchaseUnit,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        remainingQuantity: purchaseQuantity ? parseFloat(purchaseQuantity) : null,
        notes,
        createdBy: req.user.id,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Material compliance created: ${materialName} by ${req.user.email}`);
    res.status(201).json(material);
  } catch (error) {
    console.error('[compliance] Error creating material compliance:', error);
    res.status(500).json({ error: 'Failed to create material compliance' });
  }
});

/**
 * POST /api/compliance/material-compliance/:id/verify
 * Verify material compliance
 */
router.post('/material-compliance/:id/verify', authGuard, async (req, res) => {
  try {
    const material = await prisma.materialCompliance.update({
      where: { id: req.params.id },
      data: {
        status: 'verified',
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        traceable: true,
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        creator: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[compliance] Material compliance verified: ${req.params.id} by ${req.user.email}`);
    res.json(material);
  } catch (error) {
    console.error('[compliance] Error verifying material compliance:', error);
    res.status(500).json({ error: 'Failed to verify material compliance' });
  }
});

// ============================================================================
// COMPLIANCE REMINDERS
// ============================================================================

/**
 * GET /api/compliance/reminders
 * List compliance reminders
 */
router.get('/reminders', authGuard, async (req, res) => {
  try {
    const { assignedTo, completed } = req.query;
    
    const where = {};
    if (assignedTo) where.assignedTo = assignedTo;
    if (completed !== undefined) where.completed = completed === 'true';
    
    const reminders = await prisma.complianceReminder.findMany({
      where,
      include: {
        certification: { select: { certificationName: true } },
        project: { select: { code: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
    
    res.json(reminders);
  } catch (error) {
    console.error('[compliance] Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

/**
 * POST /api/compliance/reminders/:id/acknowledge
 * Acknowledge a reminder
 */
router.post('/reminders/:id/acknowledge', authGuard, async (req, res) => {
  try {
    const reminder = await prisma.complianceReminder.update({
      where: { id: req.params.id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user.id,
      },
    });
    
    console.log(`[compliance] Reminder acknowledged: ${req.params.id} by ${req.user.email}`);
    res.json(reminder);
  } catch (error) {
    console.error('[compliance] Error acknowledging reminder:', error);
    res.status(500).json({ error: 'Failed to acknowledge reminder' });
  }
});

/**
 * GET /api/compliance/dashboard
 * Get compliance dashboard summary
 */
router.get('/dashboard', authGuard, async (req, res) => {
  try {
    const { projectId } = req.query;
    
    // Company certifications expiring soon
    const expiringCerts = await prisma.companyCertification.count({
      where: {
        expiryDate: {
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          gte: new Date(),
        },
        status: 'active',
      },
    });
    
    // Project compliance stats
    const projectWhere = projectId ? { projectId: parseInt(projectId) } : {};
    const projectComplianceStats = await prisma.projectCompliance.groupBy({
      by: ['status'],
      where: projectWhere,
      _count: true,
    });
    
    // Pending lab tests
    const pendingTests = await prisma.labTest.count({
      where: {
        ...projectWhere,
        result: 'pending',
      },
    });
    
    // Unverified materials
    const unverifiedMaterials = await prisma.materialCompliance.count({
      where: {
        ...projectWhere,
        status: 'pending',
      },
    });
    
    // Active reminders
    const activeReminders = await prisma.complianceReminder.count({
      where: {
        completed: false,
        dueDate: { gte: new Date() },
      },
    });
    
    res.json({
      expiringCertifications: expiringCerts,
      projectCompliance: projectComplianceStats,
      pendingLabTests: pendingTests,
      unverifiedMaterials,
      activeReminders,
    });
  } catch (error) {
    console.error('[compliance] Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;

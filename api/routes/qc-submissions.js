const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/qc-submissions - List all QC submissions with filters
router.get('/', async (req, res) => {
  try {
    const { projectId, stationId, status, result, search } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    if (status) where.status = status;
    if (result) where.result = result;
    if (search) {
      where.OR = [
        { batchCode: { contains: search, mode: 'insensitive' } },
        { inspectorNotes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const submissions = await prisma.qCSubmission.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        inspector: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        _count: {
          select: {
            defects: true,
          },
        },
      },
      orderBy: [{ submissionDate: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching QC submissions:', error);
    res.status(500).json({ error: 'Failed to fetch QC submissions' });
  }
});

// GET /api/qc-submissions/:id - Get single QC submission
router.get('/:id', async (req, res) => {
  try {
    const submission = await prisma.qCSubmission.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        inspector: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        defects: {
          orderBy: { severity: 'desc' },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'QC submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching QC submission:', error);
    res.status(500).json({ error: 'Failed to fetch QC submission' });
  }
});

// POST /api/qc-submissions - Create new QC submission
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      stationId,
      batchCode,
      submissionDate,
      inspectorId,
      sampleSize,
      passedQty,
      failedQty,
      defectQty,
      result,
      inspectorNotes,
      measurements,
      checklistData,
      imageUrls,
    } = req.body;

    const submission = await prisma.qCSubmission.create({
      data: {
        projectId: parseInt(projectId),
        stationId: stationId ? parseInt(stationId) : null,
        batchCode,
        submissionDate: new Date(submissionDate),
        inspectorId,
        sampleSize: parseInt(sampleSize),
        passedQty: passedQty ? parseInt(passedQty) : null,
        failedQty: failedQty ? parseInt(failedQty) : null,
        defectQty: defectQty ? parseInt(defectQty) : null,
        result: result || 'pending',
        status: 'submitted',
        inspectorNotes,
        measurements: measurements || {},
        checklistData: checklistData || {},
        imageUrls: imageUrls || [],
        createdBy: req.user.id,
        updatedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error creating QC submission:', error);
    res.status(500).json({ error: 'Failed to create QC submission' });
  }
});

// PUT /api/qc-submissions/:id - Update QC submission
router.put('/:id', async (req, res) => {
  try {
    const {
      sampleSize,
      passedQty,
      failedQty,
      defectQty,
      result,
      inspectorNotes,
      measurements,
      checklistData,
      imageUrls,
    } = req.body;

    const updateData = { updatedAt: new Date() };
    if (sampleSize !== undefined) updateData.sampleSize = parseInt(sampleSize);
    if (passedQty !== undefined) updateData.passedQty = passedQty ? parseInt(passedQty) : null;
    if (failedQty !== undefined) updateData.failedQty = failedQty ? parseInt(failedQty) : null;
    if (defectQty !== undefined) updateData.defectQty = defectQty ? parseInt(defectQty) : null;
    if (result !== undefined) updateData.result = result;
    if (inspectorNotes !== undefined) updateData.inspectorNotes = inspectorNotes;
    if (measurements !== undefined) updateData.measurements = measurements;
    if (checklistData !== undefined) updateData.checklistData = checklistData;
    if (imageUrls !== undefined) updateData.imageUrls = imageUrls;

    const submission = await prisma.qCSubmission.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    res.json(submission);
  } catch (error) {
    console.error('Error updating QC submission:', error);
    res.status(500).json({ error: 'Failed to update QC submission' });
  }
});

// POST /api/qc-submissions/:id/approve - Approve QC submission
router.post('/:id/approve', async (req, res) => {
  try {
    const { approverNotes } = req.body;

    const submission = await prisma.qCSubmission.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        approverNotes,
        updatedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    res.json(submission);
  } catch (error) {
    console.error('Error approving QC submission:', error);
    res.status(500).json({ error: 'Failed to approve QC submission' });
  }
});

// POST /api/qc-submissions/:id/reject - Reject QC submission
router.post('/:id/reject', async (req, res) => {
  try {
    const { approverNotes } = req.body;

    const submission = await prisma.qCSubmission.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        approverNotes: approverNotes || 'Rejected',
        updatedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    res.json(submission);
  } catch (error) {
    console.error('Error rejecting QC submission:', error);
    res.status(500).json({ error: 'Failed to reject QC submission' });
  }
});

// DELETE /api/qc-submissions/:id - Delete QC submission
router.delete('/:id', async (req, res) => {
  try {
    await prisma.qCSubmission.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'QC submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting QC submission:', error);
    res.status(500).json({ error: 'Failed to delete QC submission' });
  }
});

// GET /api/qc-submissions/analytics/summary - QC analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { projectId, stationId, startDate, endDate } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) where.submissionDate = dateFilter;

    const [totalSubmissions, byResult, byStatus, qualityStats] = await Promise.all([
      prisma.qCSubmission.count({ where }),
      prisma.qCSubmission.groupBy({
        by: ['result'],
        where,
        _count: true,
      }),
      prisma.qCSubmission.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.qCSubmission.aggregate({
        where,
        _sum: {
          sampleSize: true,
          passedQty: true,
          failedQty: true,
          defectQty: true,
        },
        _avg: {
          sampleSize: true,
        },
      }),
    ]);

    const resultCounts = byResult.reduce((acc, item) => {
      acc[item.result] = item._count;
      return acc;
    }, {});

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    const totalChecked = qualityStats._sum.sampleSize || 0;
    const totalPassed = qualityStats._sum.passedQty || 0;
    const totalFailed = qualityStats._sum.failedQty || 0;
    const passRate = totalChecked > 0 ? (totalPassed / totalChecked) * 100 : 0;

    res.json({
      totalSubmissions,
      byResult: resultCounts,
      byStatus: statusCounts,
      quality: {
        totalChecked,
        totalPassed,
        totalFailed,
        totalDefects: qualityStats._sum.defectQty || 0,
        passRate,
        avgSampleSize: qualityStats._avg.sampleSize || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching QC analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// POST /api/qc-submissions/:id/defects - Add defect to submission
router.post('/:id/defects', async (req, res) => {
  try {
    const { defectType, severity, quantity, description, imageUrl } = req.body;
    const submissionId = parseInt(req.params.id);

    const defect = await prisma.qCDefect.create({
      data: {
        submissionId,
        defectType,
        severity: severity || 'medium',
        quantity: parseInt(quantity),
        description,
        imageUrl,
      },
    });

    res.status(201).json(defect);
  } catch (error) {
    console.error('Error adding defect:', error);
    res.status(500).json({ error: 'Failed to add defect' });
  }
});

module.exports = router;

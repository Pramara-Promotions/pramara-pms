// api/routes/project-policies.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const prisma = new PrismaClient();

// Get all policies for a project
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, status, policyType } = req.query;
    const where = {};
    
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (policyType) where.policyType = policyType;

    const policies = await prisma.projectPolicy.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Get single policy
router.get('/:id', authenticate, async (req, res) => {
  try {
    const policy = await prisma.projectPolicy.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// Create new policy
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      projectId,
      policyType,
      policyTitle,
      policyDescription,
      version,
      effectiveDate,
      expiryDate,
      documentUrl,
      responsiblePerson,
      reviewFrequency,
      applicableStations,
      trainingRequired,
      trainingDocUrl,
      notes
    } = req.body;

    // Calculate next review date if frequency provided
    let nextReviewDate = null;
    if (reviewFrequency && effectiveDate) {
      nextReviewDate = new Date(effectiveDate);
      nextReviewDate.setDate(nextReviewDate.getDate() + parseInt(reviewFrequency));
    }

    const policy = await prisma.projectPolicy.create({
      data: {
        projectId: parseInt(projectId),
        policyType,
        policyTitle,
        policyDescription,
        version: version || '1.0',
        effectiveDate: new Date(effectiveDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'draft',
        documentUrl,
        responsiblePerson,
        reviewFrequency: reviewFrequency ? parseInt(reviewFrequency) : null,
        nextReviewDate,
        applicableStations: applicableStations || [],
        trainingRequired: trainingRequired || false,
        trainingDocUrl,
        trainingCompletedBy: [],
        approvalHistory: [],
        notes,
        createdBy: req.user.id
      },
      include: {
        project: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// Update policy
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      policyType,
      policyTitle,
      policyDescription,
      version,
      effectiveDate,
      expiryDate,
      status,
      documentUrl,
      responsiblePerson,
      reviewFrequency,
      lastReviewDate,
      applicableStations,
      trainingRequired,
      trainingDocUrl,
      notes
    } = req.body;

    // Calculate next review date if frequency or last review date changed
    let nextReviewDate = undefined;
    if (reviewFrequency && lastReviewDate) {
      nextReviewDate = new Date(lastReviewDate);
      nextReviewDate.setDate(nextReviewDate.getDate() + parseInt(reviewFrequency));
    }

    const policy = await prisma.projectPolicy.update({
      where: { id: req.params.id },
      data: {
        policyType,
        policyTitle,
        policyDescription,
        version,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status,
        documentUrl,
        responsiblePerson,
        reviewFrequency: reviewFrequency ? parseInt(reviewFrequency) : null,
        lastReviewDate: lastReviewDate ? new Date(lastReviewDate) : undefined,
        nextReviewDate,
        applicableStations,
        trainingRequired,
        trainingDocUrl,
        notes
      },
      include: {
        project: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.json(policy);
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// Activate policy
router.post('/:id/activate', authenticate, async (req, res) => {
  try {
    const policy = await prisma.projectPolicy.update({
      where: { id: req.params.id },
      data: {
        status: 'active',
        approvalHistory: {
          push: {
            action: 'activated',
            by: req.user.id,
            byName: req.user.name || req.user.email,
            at: new Date().toISOString(),
            note: req.body.note || 'Policy activated'
          }
        }
      },
      include: {
        project: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(policy);
  } catch (error) {
    console.error('Error activating policy:', error);
    res.status(500).json({ error: 'Failed to activate policy' });
  }
});

// Mark training complete for user
router.post('/:id/complete-training', authenticate, async (req, res) => {
  try {
    const policy = await prisma.projectPolicy.findUnique({
      where: { id: req.params.id }
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const completedBy = policy.trainingCompletedBy || [];
    if (!completedBy.includes(req.user.id)) {
      completedBy.push(req.user.id);
    }

    const updatedPolicy = await prisma.projectPolicy.update({
      where: { id: req.params.id },
      data: { trainingCompletedBy: completedBy },
      include: {
        project: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(updatedPolicy);
  } catch (error) {
    console.error('Error completing training:', error);
    res.status(500).json({ error: 'Failed to mark training complete' });
  }
});

// Delete policy
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.projectPolicy.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Policy deleted' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

module.exports = router;

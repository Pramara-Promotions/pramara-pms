// api/routes/inbox.js
// Phase 5: Inbound Email Routes
// Inbox management, email classification, entity linking

const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const emailInboundService = require('../lib/emailInboundService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Dev/Test: Inject a test email into the inbox (Super Admin only)
router.post('/inbox/test-ingest', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const sample = req.body || {};
    const email = await prisma.inboundEmail.create({
      data: {
        messageId: sample.messageId || `test-${Date.now()}`,
        from: sample.from || 'sender@example.com',
        to: sample.to || ['admin@pramara.local'],
        cc: sample.cc || [],
        subject: sample.subject || 'Test Inbound Email',
        textBody: sample.textBody || 'Hello from test inbox.',
        htmlBody: sample.htmlBody || '<p>Hello from test inbox.</p>',
        hasAttachments: false,
        attachmentCount: 0,
        attachments: null,
        classified: false,
        classification: sample.classification || 'general',
        confidence: sample.confidence || 0.5,
        receivedAt: new Date(),
      }
    });
    res.json({ ok: true, email });
  } catch (error) {
    console.error('Error injecting test email:', error);
    res.status(500).json({ error: 'Failed to create test email' });
  }
});

// Get inbox emails
router.get('/inbox', authGuard, permissionGuard('email:read'), async (req, res) => {
  try {
    const { status, classification, unreadOnly, limit, offset } = req.query;

    const result = await emailInboundService.getInbox({
      status,
      classification,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// Get single email
router.get('/inbox/:id', authGuard, permissionGuard('email:read'), async (req, res) => {
  try {
    const email = await prisma.inboundEmail.findUnique({
      where: { id: req.params.id }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read
    if (email.status === 'unread') {
      await prisma.inboundEmail.update({
        where: { id: req.params.id },
        data: { status: 'read' }
      });
    }

    res.json(email);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Download attachment
router.get('/inbox/:id/attachments/:index', authGuard, permissionGuard('email:read'), async (req, res) => {
  try {
    const email = await prisma.inboundEmail.findUnique({
      where: { id: req.params.id }
    });

    if (!email || !email.attachments) {
      return res.status(404).json({ error: 'Email or attachment not found' });
    }

    const index = parseInt(req.params.index);
    const attachment = email.attachments[index];

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Generate presigned URL for download
    const { s3Service } = require('../lib/storage');
    const url = await s3Service.getPresignedUrl(attachment.key, 3600);

    res.json({
      filename: attachment.filename,
      url,
      size: attachment.size,
      mimeType: attachment.mimeType
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// Mark email as processed
router.patch('/inbox/:id/processed', authGuard, permissionGuard('email:write'), async (req, res) => {
  try {
    const updated = await emailInboundService.markProcessed(
      req.params.id,
      req.auth.user.id
    );
    res.json(updated);
  } catch (error) {
    console.error('Error marking email as processed:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// Link email to entity
router.post('/inbox/:id/link', authGuard, permissionGuard('email:write'), async (req, res) => {
  try {
    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    // Validate entity exists
    const validTypes = ['project', 'document', 'batch', 'task'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const updated = await emailInboundService.linkToEntity(
      req.params.id,
      entityType,
      entityId,
      req.auth.user.id
    );

    res.json(updated);
  } catch (error) {
    console.error('Error linking email:', error);
    res.status(500).json({ error: 'Failed to link email' });
  }
});

// Create project from email
router.post('/inbox/:id/create-project', authGuard, permissionGuard('project:write'), async (req, res) => {
  try {
    const email = await prisma.inboundEmail.findUnique({
      where: { id: req.params.id }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Extract project details from email
    const { name, poNumber, description } = req.body;

    // Create project
    const project = await prisma.project.create({
      data: {
        name: name || email.subject,
        poNumber: poNumber || `PO-${Date.now()}`,
        description: description || email.textBody?.substring(0, 500),
        status: 'PENDING',
        // Add other required fields with defaults
      }
    });

    // Link email to project
    await emailInboundService.linkToEntity(
      req.params.id,
      'project',
      project.id,
      req.auth.user.id
    );

    // Mark as processed
    await emailInboundService.markProcessed(req.params.id, req.auth.user.id);

    res.json({ project, email: await prisma.inboundEmail.findUnique({ where: { id: req.params.id } }) });
  } catch (error) {
    console.error('Error creating project from email:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Archive email
router.delete('/inbox/:id', authGuard, permissionGuard('email:write'), async (req, res) => {
  try {
    await prisma.inboundEmail.update({
      where: { id: req.params.id },
      data: { status: 'archived' }
    });

    res.json({ message: 'Email archived' });
  } catch (error) {
    console.error('Error archiving email:', error);
    res.status(500).json({ error: 'Failed to archive email' });
  }
});

// Get inbox stats
router.get('/inbox/stats', authGuard, permissionGuard('email:read'), async (req, res) => {
  try {
    const [total, unread, byClassification] = await Promise.all([
      prisma.inboundEmail.count(),
      prisma.inboundEmail.count({ where: { status: 'unread' } }),
      prisma.inboundEmail.groupBy({
        by: ['classification'],
        _count: true
      })
    ]);

    res.json({
      total,
      unread,
      byClassification: byClassification.reduce((acc, item) => {
        acc[item.classification || 'general'] = item._count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching inbox stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = { inboxRouter: router };


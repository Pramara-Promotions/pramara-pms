// api/routes/emailLogs.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { emailService } = require('../lib/emailService');

const prisma = new PrismaClient();
const router = express.Router();

// All routes below require auth and Super Admin (for now)
router.use(authGuard, permissionGuard.role('Super Admin'));

// GET /api/admin/email-logs
router.get('/admin/email-logs', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      q,
      recipient,
      dateFrom,
      dateTo,
    } = req.query;

    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const where = {};

    if (status) where.status = String(status);
    if (recipient) where.to = { contains: String(recipient), mode: 'insensitive' };

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Simple search across subject/body
    if (q) {
      const query = String(q);
      where.OR = [
        { subject: { contains: query, mode: 'insensitive' } },
        { htmlBody: { contains: query, mode: 'insensitive' } },
        { textBody: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          to: true,
          cc: true,
          bcc: true,
          from: true,
          replyTo: true,
          subject: true,
          status: true,
          provider: true,
          providerMsgId: true,
          sentAt: true,
          error: true,
          templateId: true,
          userId: true,
          notificationId: true,
          createdAt: true,
        },
      }),
      prisma.emailLog.count({ where }),
    ]);

    res.json({ items, total, page: Number(page), pageSize: take });
  } catch (error) {
    console.error('[email-logs:list] error', error);
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

// GET /api/admin/email-logs/:id
router.get('/admin/email-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.emailLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ error: 'Email log not found' });

    let template = null;
    if (log.templateId) {
      template = await prisma.emailTemplate.findUnique({
        where: { id: log.templateId },
        select: { id: true, name: true, subject: true, category: true },
      });
    }

    res.json({ log, template });
  } catch (error) {
    console.error('[email-logs:get] error', error);
    res.status(500).json({ error: 'Failed to fetch email log' });
  }
});

// POST /api/admin/email-logs/:id/resend
router.post('/admin/email-logs/:id/resend', async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.emailLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ error: 'Email log not found' });

    const toList = (log.to || '').split(',').map(s => s.trim()).filter(Boolean);
    const cc = Array.isArray(log.cc) ? log.cc : [];
    const bcc = Array.isArray(log.bcc) ? log.bcc : [];

    let result;
    if (log.templateId && log.templateData) {
      // Resend using the original template
      const tpl = await prisma.emailTemplate.findUnique({ where: { id: log.templateId } });
      if (!tpl) return res.status(400).json({ error: 'Original template no longer exists' });

      result = await emailService.sendTemplate({
        to: toList,
        templateName: tpl.name,
        data: log.templateData,
        userId: req.auth?.user?.id || null,
        notificationId: log.notificationId || null,
      });
    } else {
      // Resend using captured subject/html/text
      result = await emailService.send({
        to: toList,
        subject: log.subject,
        html: log.htmlBody || '',
        text: log.textBody || null,
        cc,
        bcc,
        userId: req.auth?.user?.id || null,
        notificationId: log.notificationId || null,
        templateId: null,
        templateData: null,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[email-logs:resend] error', error);
    res.status(500).json({ error: 'Failed to resend email' });
  }
});

// GET /api/admin/email-stats
router.get('/admin/email-stats', async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, sent, failed, dummy, last24h] = await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: 'sent' } }),
      prisma.emailLog.count({ where: { status: 'failed' } }),
      prisma.emailLog.count({ where: { status: 'dummy_training_mode' } }),
      prisma.emailLog.count({ where: { createdAt: { gte: since24h } } }),
    ]);

    res.json({ total, sent, failed, dummy, last24h });
  } catch (error) {
    console.error('[email-logs:stats] error', error);
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
});

module.exports = { emailLogsRouter: router };

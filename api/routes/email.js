// api/routes/email.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { verifyTransport, sendEmail } = require('../lib/emailService');

const router = express.Router();

// Get email service status (admins only)
router.get('/email/status', authGuard, permissionGuard.role('Super Admin'), async (_req, res) => {
  try {
    const ver = await verifyTransport();
    const inboundEnabled = String(process.env.ENABLE_INBOUND_EMAIL || 'false').toLowerCase() === 'true';
    res.json({
      outbound: {
        configured: !!(process.env.RESEND_API_KEY),
        verified: !!ver.ok,
        reason: ver.reason || null,
        provider: 'Resend',
        from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      },
      inbound: {
        enabled: inboundEnabled,
        webhook: inboundEnabled ? '/api/email/inbound/webhook' : null,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'unknown' });
  }
});

// Send test email (admins only)
router.post('/email/test', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const to = req.body?.to || process.env.TEST_EMAIL_TO || process.env.FROM_EMAIL;
    if (!to) return res.status(400).json({ error: 'Missing recipient (body.to or FROM_EMAIL)' });
    const out = await sendEmail({
      to,
      subject: 'Pramara PMS test email',
      text: 'This is a test email from Pramara PMS.',
      html: '<p>This is a <b>test email</b> from Pramara PMS.</p>'
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'send failed' });
  }
});

// ====================================================================
// INBOUND EMAIL WEBHOOKS (disabled by default via ENABLE_INBOUND_EMAIL)
// ====================================================================

// Webhook for services like SendGrid, Mailgun, Postmark, etc.
router.post('/email/inbound/webhook', async (req, res) => {
  if (String(process.env.ENABLE_INBOUND_EMAIL || 'false').toLowerCase() !== 'true') {
    return res.status(503).json({ error: 'Inbound email processing is disabled' });
  }
  
  try {
    // TODO: Parse webhook payload based on provider (SendGrid, Mailgun, etc.)
    // Extract: from, to, subject, text, html, attachments
    // Route to appropriate handler (e.g., create project from email, reply to notification)
    
    console.log('[email-inbound] Webhook received:', req.body);
    
    // Stub response
    res.json({ ok: true, message: 'Inbound email processed (stub)' });
  } catch (e) {
    console.error('[email-inbound] Webhook error:', e);
    res.status(500).json({ error: e?.message || 'webhook processing failed' });
  }
});

// IMAP polling endpoint (for manual trigger or cron)
router.post('/email/inbound/poll', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  if (String(process.env.ENABLE_INBOUND_EMAIL || 'false').toLowerCase() !== 'true') {
    return res.status(503).json({ error: 'Inbound email processing is disabled' });
  }
  
  try {
    // TODO: Connect to IMAP server, fetch unread emails, process them, mark as read
    console.log('[email-inbound] Manual poll triggered');
    
    res.json({ ok: true, processed: 0, message: 'IMAP polling not yet implemented' });
  } catch (e) {
    console.error('[email-inbound] Poll error:', e);
    res.status(500).json({ error: e?.message || 'poll failed' });
  }
});

module.exports = { emailRouter: router };

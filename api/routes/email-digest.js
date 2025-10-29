const express = require('express');
const router = express.Router();
const emailDigestService = require('../lib/emailDigestService');
const authGuard = require('../middleware/authGuard');

/**
 * Email Digest Routes
 * Manage email digest preferences and manual triggers
 */

/**
 * GET /api/email-digest/preferences
 * Get current user's email digest preferences
 */
router.get('/preferences', authGuard, async (req, res) => {
  try {
    const { prisma } = req;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailDigestEnabled: true,
        emailDigestFrequency: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      enabled: user.emailDigestEnabled,
      frequency: user.emailDigestFrequency,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error('[email-digest] Error fetching email digest preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/email-digest/preferences
 * Update current user's email digest preferences
 */
router.put('/preferences', authGuard, async (req, res) => {
  try {
    const { prisma } = req;
    const userId = req.user.id;
    const { enabled, frequency } = req.body;

    // Validate frequency
    const allowedFrequencies = ['daily', 'weekly', 'never'];
    if (frequency && !allowedFrequencies.includes(frequency)) {
      return res.status(400).json({
        error: `Invalid frequency. Must be one of: ${allowedFrequencies.join(', ')}`,
      });
    }

    // Update preferences
    const updateData = {};
    if (typeof enabled === 'boolean') {
      updateData.emailDigestEnabled = enabled;
    }
    if (frequency) {
      updateData.emailDigestFrequency = frequency;
      // If setting to 'never', also disable
      if (frequency === 'never') {
        updateData.emailDigestEnabled = false;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        emailDigestEnabled: true,
        emailDigestFrequency: true,
        emailVerified: true,
      },
    });

    console.log(`[email-digest] User ${userId} updated email digest preferences:`, updateData);

    res.json({
      enabled: user.emailDigestEnabled,
      frequency: user.emailDigestFrequency,
      emailVerified: user.emailVerified,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('[email-digest] Error updating email digest preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/email-digest/send-test
 * Send a test digest email to the current user
 */
router.post('/send-test', authGuard, async (req, res) => {
  try {
    const userId = req.user.id;
    const { frequency } = req.body;

    const testFrequency = frequency || 'daily';

    if (!['daily', 'weekly'].includes(testFrequency)) {
      return res.status(400).json({ error: 'Frequency must be daily or weekly' });
    }

    const result = await emailDigestService.sendTestDigest(userId, testFrequency);

    if (result.success) {
      console.log(`[email-digest] Test ${testFrequency} digest sent to user ${userId}`);
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[email-digest] Error sending test digest:', error);
    res.status(500).json({ error: 'Failed to send test digest' });
  }
});

/**
 * POST /api/email-digest/unsubscribe
 * Unsubscribe from email digests using token
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Unsubscribe token required' });
    }

    const result = await emailDigestService.unsubscribe(token);

    if (result.success) {
      console.log('[email-digest] User unsubscribed from email digests via token');
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[email-digest] Error processing unsubscribe:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * POST /api/email-digest/trigger (Admin only)
 * Manually trigger digest emails for all users
 */
router.post('/trigger', authGuard, async (req, res) => {
  try {
    const { frequency } = req.body;

    // Check if user has admin permissions
    // TODO: Add proper permission check (ADMIN_EMAIL_DIGEST permission)
    // For now, just require authentication

    if (!['daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({ error: 'Frequency must be daily or weekly' });
    }

    // Trigger digest asynchronously
    emailDigestService.sendDigests(frequency).then(() => {
      console.log(`[email-digest] Manual ${frequency} digest trigger completed`);
    }).catch(error => {
      console.error(`[email-digest] Manual ${frequency} digest trigger failed:`, error);
    });

    res.json({
      success: true,
      message: `${frequency} digest emails are being sent in the background`,
    });
  } catch (error) {
    console.error('[email-digest] Error triggering digest:', error);
    res.status(500).json({ error: 'Failed to trigger digest' });
  }
});

module.exports = router;

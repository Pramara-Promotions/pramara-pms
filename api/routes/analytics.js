const express = require('express');
const router = express.Router();
const emailAnalyticsService = require('../lib/emailAnalyticsService');
const authGuard = require('../middleware/authGuard');

/**
 * Email Analytics Routes
 * Track and report on email opens and clicks
 */

/**
 * GET /api/analytics/email-open/:emailId
 * Tracking pixel endpoint - records email open and serves 1x1 transparent GIF
 */
router.get('/email-open/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;

    const context = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    };

    // Track the open event (async, don't wait)
    emailAnalyticsService.trackEmailOpen(emailId, context).catch((error) => {
      console.error('[email-analytics] Failed to track email open:', error);
    });

    // Serve tracking pixel immediately
    const pixel = emailAnalyticsService.generateTrackingPixel();
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.send(pixel);
  } catch (error) {
    console.error('[email-analytics] Error serving tracking pixel:', error);
    // Still serve pixel even on error
    const pixel = emailAnalyticsService.generateTrackingPixel();
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

/**
 * GET /api/analytics/email-click/:emailId/:linkId
 * Link tracking endpoint - records click and redirects to original URL
 */
router.get('/email-click/:emailId/:linkId', async (req, res) => {
  try {
    const { emailId, linkId } = req.params;

    const context = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    };

    // Track the click and get redirect URL
    const result = await emailAnalyticsService.trackEmailClick(
      emailId,
      linkId,
      context
    );

    // Redirect to original URL
    if (result.redirectUrl) {
      res.redirect(302, result.redirectUrl);
    } else {
      res.redirect(302, '/');
    }
  } catch (error) {
    console.error('[email-analytics] Error tracking email click:', error);
    // Redirect to home on error
    res.redirect(302, '/');
  }
});

/**
 * GET /api/analytics/emails/:emailId
 * Get analytics for a specific email (requires authentication)
 */
router.get('/emails/:emailId', authGuard, async (req, res) => {
  try {
    const { emailId } = req.params;

    const analytics = await emailAnalyticsService.getEmailAnalytics(emailId);

    if (!analytics) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('[email-analytics] Error fetching email analytics:', error);
    res.status(500).json({ error: 'Failed to fetch email analytics' });
  }
});

/**
 * GET /api/analytics/emails
 * Get aggregate email analytics (requires authentication)
 * Query params: startDate, endDate, userId
 */
router.get('/emails', authGuard, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const options = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(userId && { userId }),
    };

    // Default to last 30 days if no dates provided
    if (!options.startDate && !options.endDate) {
      options.endDate = new Date();
      options.startDate = new Date();
      options.startDate.setDate(options.startDate.getDate() - 30);
    }

    const analytics = await emailAnalyticsService.getAggregateAnalytics(options);

    res.json(analytics);
  } catch (error) {
    console.error('[email-analytics] Error fetching aggregate analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/emails/top
 * Get top performing emails by open rate (requires authentication)
 * Query params: startDate, endDate, limit
 */
router.get('/emails/top', authGuard, async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;

    const options = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(limit && { limit: parseInt(limit, 10) }),
    };

    // Default to last 30 days if no dates provided
    if (!options.startDate && !options.endDate) {
      options.endDate = new Date();
      options.startDate = new Date();
      options.startDate.setDate(options.startDate.getDate() - 30);
    }

    const topEmails = await emailAnalyticsService.getTopPerformingEmails(options);

    res.json(topEmails);
  } catch (error) {
    console.error('[email-analytics] Error fetching top emails:', error);
    res.status(500).json({ error: 'Failed to fetch top emails' });
  }
});

/**
 * GET /api/analytics/emails/delivery-status
 * Get email delivery status breakdown (requires authentication)
 * Query params: startDate, endDate, userId
 */
router.get('/emails/delivery-status', authGuard, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const options = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(userId && { userId }),
    };

    // Default to last 30 days if no dates provided
    if (!options.startDate && !options.endDate) {
      options.endDate = new Date();
      options.startDate = new Date();
      options.startDate.setDate(options.startDate.getDate() - 30);
    }

    const status = await emailAnalyticsService.getDeliveryStatus(options);

    res.json(status);
  } catch (error) {
    console.error('[email-analytics] Error fetching delivery status:', error);
    res.status(500).json({ error: 'Failed to fetch delivery status' });
  }
});

module.exports = router;

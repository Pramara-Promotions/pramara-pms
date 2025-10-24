// api/routes/emailAnalytics.js
// Phase 7: Email Analytics Routes
// Dashboard, tracking pixels, click tracking

const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const emailAnalyticsService = require('../lib/emailAnalyticsService');

const router = express.Router();

// Tracking pixel endpoint (public - no auth)
router.get('/email/track/open/:emailLogId', async (req, res) => {
  try {
    await emailAnalyticsService.trackOpen(req.params.emailLogId);
    
    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(pixel);
  } catch (error) {
    console.error('Error tracking email open:', error);
    res.status(200).send(''); // Return success anyway
  }
});

// Click tracking endpoint (public - no auth)
router.get('/email/track/click/:emailLogId', async (req, res) => {
  try {
    await emailAnalyticsService.trackClick(req.params.emailLogId);
    
    // Redirect to original URL
    const targetUrl = req.query.url;
    if (targetUrl) {
      res.redirect(targetUrl);
    } else {
      res.status(400).send('Missing target URL');
    }
  } catch (error) {
    console.error('Error tracking email click:', error);
    res.status(500).send('Tracking error');
  }
});

// Get analytics dashboard
router.get('/email-analytics/dashboard', authGuard, permissionGuard('email:admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const dashboard = await emailAnalyticsService.getDashboard(startDate, endDate);
    
    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Get template performance
router.get('/email-analytics/templates/:templateId', authGuard, permissionGuard('email:admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const performance = await emailAnalyticsService.getTemplatePerformance(
      req.params.templateId,
      startDate,
      endDate
    );
    
    res.json(performance);
  } catch (error) {
    console.error('Error fetching template performance:', error);
    res.status(500).json({ error: 'Failed to fetch template performance' });
  }
});

// Get user activity
router.get('/email-analytics/users/:userId', authGuard, permissionGuard('email:admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const activity = await emailAnalyticsService.getUserActivity(
      req.params.userId,
      startDate,
      endDate
    );
    
    res.json(activity);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Get engagement trends
router.get('/email-analytics/trends', authGuard, permissionGuard('email:admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const trends = await emailAnalyticsService.getEngagementTrends(parseInt(days));
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching engagement trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

module.exports = { emailAnalyticsRouter: router };

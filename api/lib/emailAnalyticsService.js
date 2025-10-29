const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Email Analytics Service
 * Provides tracking for email opens and clicks
 * - Tracking pixel (1x1 transparent GIF) for open tracking
 * - Link wrapper for click tracking with redirect
 */

class EmailAnalyticsService {
  /**
   * Generate a 1x1 transparent GIF tracking pixel
   * @returns {Buffer} Transparent GIF image buffer
   */
  generateTrackingPixel() {
    // Base64 encoded 1x1 transparent GIF
    const pixelBase64 =
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    return Buffer.from(pixelBase64, 'base64');
  }

  /**
   * Track email open event
   * @param {string} emailId - Email log ID
   * @param {Object} context - Request context (IP, userAgent, etc.)
   * @returns {Promise<boolean>} Success status
   */
  async trackEmailOpen(emailId, context = {}) {
    try {
      const email = await prisma.emailLog.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        console.warn(`[email-analytics] Email not found for open tracking: ${emailId}`);
        return false;
      }

      // Only track first open
      if (!email.opened) {
        await prisma.emailLog.update({
          where: { id: emailId },
          data: {
            opened: true,
            openedAt: new Date(),
            openCount: 1,
          },
        });

        console.log(`[email-analytics] Email opened: ${emailId} (${email.to})`);
      } else {
        // Increment open count for subsequent opens
        await prisma.emailLog.update({
          where: { id: emailId },
          data: {
            openCount: { increment: 1 },
          },
        });

        console.log(`[email-analytics] Email reopened: ${emailId} (count: ${email.openCount + 1})`);
      }

      return true;
    } catch (error) {
      console.error('[email-analytics] Error tracking email open:', error);
      return false;
    }
  }

  /**
   * Generate tracked link URL
   * @param {string} emailId - Email log ID
   * @param {string} url - Original destination URL
   * @returns {string} Tracked URL
   */
  generateTrackedLink(emailId, url) {
    const baseUrl = process.env.API_URL || 'http://localhost:4000';
    const linkId = Buffer.from(url).toString('base64url');
    return `${baseUrl}/api/analytics/email-click/${emailId}/${linkId}`;
  }

  /**
   * Track email click event and redirect
   * @param {string} emailId - Email log ID
   * @param {string} linkId - Base64url encoded original URL
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Result with redirect URL
   */
  async trackEmailClick(emailId, linkId, context = {}) {
    try {
      // Decode original URL
      const originalUrl = Buffer.from(linkId, 'base64url').toString('utf-8');

      const email = await prisma.emailLog.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        console.warn(`[email-analytics] Email not found for click tracking: ${emailId}`);
        return { success: false, redirectUrl: originalUrl };
      }

      // Track first click
      if (!email.clicked) {
        await prisma.emailLog.update({
          where: { id: emailId },
          data: {
            clicked: true,
            clickedAt: new Date(),
            clickCount: 1,
          },
        });

        console.log(`[email-analytics] Email clicked: ${emailId} (${email.to}) -> ${originalUrl}`);
      } else {
        // Increment click count
        await prisma.emailLog.update({
          where: { id: emailId },
          data: {
            clickCount: { increment: 1 },
          },
        });

        console.log(`[email-analytics] Email re-clicked: ${emailId} (count: ${email.clickCount + 1})`);
      }

      return { success: true, redirectUrl: originalUrl };
    } catch (error) {
      console.error('[email-analytics] Error tracking email click:', error);
      // Still return the decoded URL to allow redirect
      try {
        const originalUrl = Buffer.from(linkId, 'base64url').toString('utf-8');
        return { success: false, redirectUrl: originalUrl };
      } catch {
        return { success: false, redirectUrl: '/' };
      }
    }
  }

  /**
   * Wrap all links in HTML content with tracking
   * @param {string} html - Original HTML content
   * @param {string} emailId - Email log ID
   * @returns {string} HTML with tracked links
   */
  wrapLinksWithTracking(html, emailId) {
    if (!html) return html;

    // Replace all href attributes with tracked versions
    // This is a simple implementation - for production, consider using an HTML parser
    return html.replace(
      /href="(https?:\/\/[^"]+)"/gi,
      (match, url) => {
        // Skip if already a tracking URL
        if (url.includes('/api/analytics/email-click/')) {
          return match;
        }
        const trackedUrl = this.generateTrackedLink(emailId, url);
        return `href="${trackedUrl}"`;
      }
    );
  }

  /**
   * Insert tracking pixel into HTML email
   * @param {string} html - Original HTML content
   * @param {string} emailId - Email log ID
   * @returns {string} HTML with tracking pixel
   */
  insertTrackingPixel(html, emailId) {
    if (!html) return html;

    const baseUrl = process.env.API_URL || 'http://localhost:4000';
    const pixelUrl = `${baseUrl}/api/analytics/email-open/${emailId}`;
    const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

    // Insert pixel before closing body tag, or at end if no body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${pixelTag}</body>`);
    } else {
      return html + pixelTag;
    }
  }

  /**
   * Get analytics for a specific email
   * @param {string} emailId - Email log ID
   * @returns {Promise<Object>} Email analytics data
   */
  async getEmailAnalytics(emailId) {
    try {
      const email = await prisma.emailLog.findUnique({
        where: { id: emailId },
        select: {
          id: true,
          to: true,
          subject: true,
          status: true,
          sentAt: true,
          opened: true,
          openedAt: true,
          openCount: true,
          clicked: true,
          clickedAt: true,
          clickCount: true,
          bounced: true,
          bouncedAt: true,
          bounceReason: true,
          createdAt: true,
        },
      });

      if (!email) {
        return null;
      }

      return {
        ...email,
        openRate: email.status === 'sent' ? (email.opened ? 100 : 0) : null,
        clickRate: email.opened ? (email.clicked ? 100 : 0) : null,
      };
    } catch (error) {
      console.error('[email-analytics] Error fetching email analytics:', error);
      throw error;
    }
  }

  /**
   * Get aggregate analytics for a date range
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @param {string} options.userId - Optional user ID filter
   * @returns {Promise<Object>} Aggregate analytics
   */
  async getAggregateAnalytics(options = {}) {
    try {
      const { startDate, endDate, userId } = options;

      const where = {
        status: 'sent',
        ...(startDate && { sentAt: { gte: startDate } }),
        ...(endDate && { sentAt: { lte: endDate } }),
        ...(userId && { userId }),
      };

      const emails = await prisma.emailLog.findMany({
        where,
        select: {
          id: true,
          sentAt: true,
          opened: true,
          openedAt: true,
          clicked: true,
          clickedAt: true,
          bounced: true,
        },
        orderBy: { sentAt: 'desc' },
      });

      const totalSent = emails.length;
      const totalOpened = emails.filter((e) => e.opened).length;
      const totalClicked = emails.filter((e) => e.clicked).length;
      const totalBounced = emails.filter((e) => e.bounced).length;

      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

      // Group by date for timeline
      const dailyStats = {};
      emails.forEach((email) => {
        const date = email.sentAt.toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            sent: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
          };
        }
        dailyStats[date].sent++;
        if (email.opened) dailyStats[date].opened++;
        if (email.clicked) dailyStats[date].clicked++;
        if (email.bounced) dailyStats[date].bounced++;
      });

      // Convert to array for charting
      const timeline = Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          ...stats,
          openRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
          clickRate: stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        summary: {
          totalSent,
          totalOpened,
          totalClicked,
          totalBounced,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          bounceRate: Math.round(bounceRate * 100) / 100,
        },
        timeline,
      };
    } catch (error) {
      console.error('[email-analytics] Error fetching aggregate analytics:', error);
      throw error;
    }
  }

  /**
   * Get top performing emails by open rate
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @param {number} options.limit - Number of results (default: 10)
   * @returns {Promise<Array>} Top emails
   */
  async getTopPerformingEmails(options = {}) {
    try {
      const { startDate, endDate, limit = 10 } = options;

      const where = {
        status: 'sent',
        ...(startDate && { sentAt: { gte: startDate } }),
        ...(endDate && { sentAt: { lte: endDate } }),
      };

      const emails = await prisma.emailLog.findMany({
        where,
        select: {
          id: true,
          subject: true,
          to: true,
          sentAt: true,
          opened: true,
          openedAt: true,
          openCount: true,
          clicked: true,
          clickCount: true,
        },
        orderBy: [{ opened: 'desc' }, { openCount: 'desc' }],
        take: limit,
      });

      return emails.map((email) => ({
        ...email,
        performance: email.opened ? (email.clicked ? 'high' : 'medium') : 'low',
      }));
    } catch (error) {
      console.error('[email-analytics] Error fetching top performing emails:', error);
      throw error;
    }
  }

  /**
   * Get delivery status breakdown
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Status breakdown
   */
  async getDeliveryStatus(options = {}) {
    try {
      const { startDate, endDate, userId } = options;

      const where = {
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
        ...(userId && { userId }),
      };

      const statuses = await prisma.emailLog.groupBy({
        by: ['status'],
        where,
        _count: true,
      });

      const breakdown = statuses.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {});

      return {
        sent: breakdown.sent || 0,
        pending: breakdown.pending || 0,
        failed: breakdown.failed || 0,
        bounced: breakdown.bounced || 0,
      };
    } catch (error) {
      console.error('[email-analytics] Error fetching delivery status:', error);
      throw error;
    }
  }
}

// Singleton instance
const emailAnalyticsService = new EmailAnalyticsService();

module.exports = emailAnalyticsService;

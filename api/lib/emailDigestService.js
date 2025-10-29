const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');

const prisma = new PrismaClient();

/**
 * Email Digest Service
 * Sends scheduled digest emails to users with unread notifications
 * - Daily Digest: 8am every day
 * - Weekly Digest: 8am every Monday
 */

class EmailDigestService {
  constructor() {
    this.dailyJob = null;
    this.weeklyJob = null;
    this.isInitialized = false;
  }

  /**
   * Initialize cron jobs
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('[email-digest] Email digest service already initialized');
      return;
    }

    // Daily digest at 8am
    this.dailyJob = cron.schedule('0 8 * * *', async () => {
      console.log('[email-digest] Running daily email digest job');
      await this.sendDigests('daily');
    });

    // Weekly digest at 8am every Monday
    this.weeklyJob = cron.schedule('0 8 * * 1', async () => {
      console.log('[email-digest] Running weekly email digest job');
      await this.sendDigests('weekly');
    });

    this.isInitialized = true;
    console.log('[email-digest] Email digest service initialized successfully');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    if (this.dailyJob) {
      this.dailyJob.stop();
      console.log('[email-digest] Daily digest job stopped');
    }
    if (this.weeklyJob) {
      this.weeklyJob.stop();
      console.log('[email-digest] Weekly digest job stopped');
    }
    this.isInitialized = false;
  }

  /**
   * Get users who should receive digest emails
   * @param {string} frequency - 'daily' or 'weekly'
   * @returns {Promise<Array>} Users with digest preference
   */
  async getUsersForDigest(frequency) {
    const users = await prisma.user.findMany({
      where: {
        active: true,
        emailVerified: true,
        emailDigestEnabled: true,
        emailDigestFrequency: frequency,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        timeZone: true,
      },
    });

    return users;
  }

  /**
   * Aggregate unread notifications for a user
   * @param {string} userId - User ID
   * @param {string} frequency - 'daily' or 'weekly'
   * @returns {Promise<Object>} Aggregated notification data
   */
  async aggregateUserNotifications(userId, frequency) {
    const now = new Date();
    let since = new Date();

    // Calculate time range based on frequency
    if (frequency === 'daily') {
      since.setHours(since.getHours() - 24);
    } else if (frequency === 'weekly') {
      since.setDate(since.getDate() - 7);
    }

    // Fetch unread notifications
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        read: false,
        createdAt: {
          gte: since,
        },
      },
      orderBy: [
        { priority: 'asc' }, // critical first
        { createdAt: 'desc' },
      ],
      take: 50, // Limit to 50 most important
    });

    // Group by priority
    const grouped = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    notifications.forEach(notif => {
      const priority = notif.priority || 'medium';
      if (grouped[priority]) {
        grouped[priority].push(notif);
      } else {
        grouped.medium.push(notif);
      }
    });

    // Calculate summary stats
    const summary = {
      total: notifications.length,
      critical: grouped.critical.length,
      high: grouped.high.length,
      medium: grouped.medium.length,
      low: grouped.low.length,
    };

    return {
      notifications,
      grouped,
      summary,
      since,
    };
  }

  /**
   * Generate unsubscribe token for user
   * @param {string} userId - User ID
   * @returns {string} Unsubscribe token
   */
  generateUnsubscribeToken(userId) {
    // Simple token: base64(userId + timestamp + secret)
    const payload = `${userId}:${Date.now()}`;
    const token = Buffer.from(payload).toString('base64url');
    return token;
  }

  /**
   * Render HTML email content for digest
   * @param {Object} data - Notification data
   * @param {string} frequency - 'daily' or 'weekly'
   * @param {Object} user - User data
   * @returns {string} HTML content
   */
  renderDigestEmail(data, frequency, user) {
    const { notifications, grouped, summary, since } = data;

    if (summary.total === 0) {
      return null; // No notifications, skip email
    }

    const unsubscribeToken = this.generateUnsubscribeToken(user.id);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`;

    const greeting = frequency === 'daily' ? 'Daily' : 'Weekly';
    const userName = `${user.firstName} ${user.lastName}`;

    // Helper function to format priority badge
    const getPriorityBadge = (priority) => {
      const colors = {
        critical: 'background-color: #dc2626; color: white;',
        high: 'background-color: #ea580c; color: white;',
        medium: 'background-color: #2563eb; color: white;',
        low: 'background-color: #64748b; color: white;',
      };
      const style = colors[priority] || colors.medium;
      return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; ${style}">${priority.toUpperCase()}</span>`;
    };

    // Helper function to format date
    const formatDate = (date) => {
      return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    // Render notification card
    const renderNotification = (notif) => {
      const hasAction = notif.primaryAction && notif.primaryActionUrl;
      const actionButton = hasAction
        ? `<a href="${baseUrl}${notif.primaryActionUrl}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">${notif.primaryAction}</a>`
        : '';

      return `
        <div style="margin-bottom: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="font-weight: 600; font-size: 16px; color: #111827;">
              ${notif.title}
            </div>
            ${getPriorityBadge(notif.priority || 'medium')}
          </div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
            ${notif.message}
          </div>
          ${notif.entityType && notif.entityName ? `
            <div style="padding: 8px; background-color: #f3f4f6; border-radius: 4px; font-size: 13px; color: #374151; margin-bottom: 8px;">
              <strong>${notif.entityType}:</strong> ${notif.entityName} ${notif.entityCode ? `(${notif.entityCode})` : ''}
            </div>
          ` : ''}
          <div style="font-size: 12px; color: #9ca3af;">
            ${formatDate(notif.createdAt)}
          </div>
          ${actionButton}
        </div>
      `;
    };

    // Build HTML
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${greeting} Notification Digest</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background-color: #4f46e5; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">
              ${greeting} Notification Digest
            </h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
              ${summary.total} unread notification${summary.total !== 1 ? 's' : ''}
            </p>
          </div>

          <!-- Body -->
          <div style="background-color: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">
              Hi ${userName},
            </p>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280;">
              Here's your ${frequency} summary of unread notifications:
            </p>

            <!-- Summary Stats -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
              ${summary.critical > 0 ? `
                <div style="padding: 12px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${summary.critical}</div>
                  <div style="font-size: 12px; color: #991b1b;">Critical</div>
                </div>
              ` : ''}
              ${summary.high > 0 ? `
                <div style="padding: 12px; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #ea580c;">${summary.high}</div>
                  <div style="font-size: 12px; color: #9a3412;">High</div>
                </div>
              ` : ''}
              ${summary.medium > 0 ? `
                <div style="padding: 12px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${summary.medium}</div>
                  <div style="font-size: 12px; color: #1e40af;">Medium</div>
                </div>
              ` : ''}
              ${summary.low > 0 ? `
                <div style="padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #64748b;">${summary.low}</div>
                  <div style="font-size: 12px; color: #475569;">Low</div>
                </div>
              ` : ''}
            </div>

            <!-- Critical Notifications -->
            ${grouped.critical.length > 0 ? `
              <h2 style="font-size: 18px; font-weight: 600; color: #dc2626; margin: 24px 0 16px 0;">
                🚨 Critical Notifications
              </h2>
              ${grouped.critical.map(renderNotification).join('')}
            ` : ''}

            <!-- High Priority Notifications -->
            ${grouped.high.length > 0 ? `
              <h2 style="font-size: 18px; font-weight: 600; color: #ea580c; margin: 24px 0 16px 0;">
                ⚠️ High Priority Notifications
              </h2>
              ${grouped.high.slice(0, 5).map(renderNotification).join('')}
              ${grouped.high.length > 5 ? `
                <div style="text-align: center; margin-top: 12px;">
                  <a href="${baseUrl}/notifications" style="color: #4f46e5; text-decoration: none; font-size: 14px;">
                    View ${grouped.high.length - 5} more high priority notifications →
                  </a>
                </div>
              ` : ''}
            ` : ''}

            <!-- Medium Priority Notifications -->
            ${grouped.medium.length > 0 ? `
              <h2 style="font-size: 18px; font-weight: 600; color: #2563eb; margin: 24px 0 16px 0;">
                📋 Medium Priority Notifications
              </h2>
              ${grouped.medium.slice(0, 3).map(renderNotification).join('')}
              ${grouped.medium.length > 3 ? `
                <div style="text-align: center; margin-top: 12px;">
                  <a href="${baseUrl}/notifications" style="color: #4f46e5; text-decoration: none; font-size: 14px;">
                    View ${grouped.medium.length - 3} more medium priority notifications →
                  </a>
                </div>
              ` : ''}
            ` : ''}

            <!-- View All Button -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="${baseUrl}/notifications" style="display: inline-block; padding: 12px 32px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                View All Notifications
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 20px; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 8px 0;">
              You're receiving this ${frequency} digest because you've enabled notification digests in your account settings.
            </p>
            <p style="margin: 0;">
              <a href="${baseUrl}/account" style="color: #4f46e5; text-decoration: none;">Manage Preferences</a> 
              | 
              <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Send digest emails to all eligible users
   * @param {string} frequency - 'daily' or 'weekly'
   */
  async sendDigests(frequency) {
    try {
      const users = await this.getUsersForDigest(frequency);
      console.log(`[email-digest] Found ${users.length} users for ${frequency} digest`);

      let sentCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Aggregate notifications
          const data = await this.aggregateUserNotifications(user.id, frequency);

          // Skip if no notifications
          if (data.summary.total === 0) {
            // logger.debug(`No notifications for user ${user.id}, skipping`);
            continue;
          }

          // Render email
          const html = this.renderDigestEmail(data, frequency, user);

          if (!html) {
            continue;
          }

          // Send email
          const subject = `${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Digest - ${data.summary.total} Unread`;

          await emailService.sendEmail({
            to: user.email,
            subject,
            html,
          });

          sentCount++;
          console.log(`[email-digest] Sent ${frequency} digest to ${user.email}`);
        } catch (error) {
          errorCount++;
          console.error(`[email-digest] Error sending ${frequency} digest to ${user.email}:`, error);
        }
      }

      console.log(
        `[email-digest] ${frequency} digest job completed: ${sentCount} sent, ${errorCount} errors`
      );

      // Record in audit log
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_DIGEST_SENT',
          category: 'SYSTEM',
          metadata: {
            frequency,
            sentCount,
            errorCount,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error(`[email-digest] Error in ${frequency} digest job:`, error);
    }
  }

  /**
   * Send immediate digest for testing (manual trigger)
   * @param {string} userId - User ID
   * @param {string} frequency - 'daily' or 'weekly'
   */
  async sendTestDigest(userId, frequency = 'daily') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const data = await this.aggregateUserNotifications(userId, frequency);

      if (data.summary.total === 0) {
        return { success: false, message: 'No notifications to send' };
      }

      const html = this.renderDigestEmail(data, frequency, user);

      if (!html) {
        return { success: false, message: 'No email content generated' };
      }

      const subject = `[TEST] ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Digest - ${data.summary.total} Unread`;

      await emailService.sendEmail({
        to: user.email,
        subject,
        html,
      });

      return {
        success: true,
        message: `Test ${frequency} digest sent to ${user.email}`,
        notificationCount: data.summary.total,
      };
    } catch (error) {
      console.error('[email-digest] Error sending test digest:', error);
      throw error;
    }
  }

  /**
   * Process unsubscribe request
   * @param {string} token - Unsubscribe token
   */
  async unsubscribe(token) {
    try {
      // Decode token
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const [userId] = decoded.split(':');

      if (!userId) {
        throw new Error('Invalid unsubscribe token');
      }

      // Disable email digest for user
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailDigestEnabled: false,
        },
      });

      console.log(`[email-digest] User ${userId} unsubscribed from email digests`);

      return { success: true, message: 'Successfully unsubscribed from email digests' };
    } catch (error) {
      console.error('[email-digest] Error processing unsubscribe:', error);
      throw error;
    }
  }
}

// Singleton instance
const emailDigestService = new EmailDigestService();

module.exports = emailDigestService;

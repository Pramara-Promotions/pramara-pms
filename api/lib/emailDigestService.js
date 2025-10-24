// api/lib/emailDigestService.js
// Phase 6: Email Digest System
// Scheduled digests with customizable frequency

const { PrismaClient } = require('@prisma/client');
const { emailService } = require('./emailService');
const cron = require('node-cron');

const prisma = new PrismaClient();

class EmailDigestService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  /**
   * Start digest scheduler
   */
  start() {
    console.log('✅ [Email Digest] Starting digest scheduler');

    // Daily digest - runs at 8 AM
    const dailyJob = cron.schedule('0 8 * * *', async () => {
      await this.sendDailyDigests();
    });
    this.scheduledJobs.set('daily', dailyJob);

    // Weekly digest - runs Monday at 8 AM
    const weeklyJob = cron.schedule('0 8 * * 1', async () => {
      await this.sendWeeklyDigests();
    });
    this.scheduledJobs.set('weekly', weeklyJob);

    console.log('✅ [Email Digest] Scheduler started (daily at 8 AM, weekly on Monday at 8 AM)');
  }

  /**
   * Stop digest scheduler
   */
  stop() {
    for (const [name, job] of this.scheduledJobs) {
      job.stop();
      console.log(`🛑 [Email Digest] Stopped ${name} digest scheduler`);
    }
    this.scheduledJobs.clear();
  }

  /**
   * Send daily digests to all users who opted in
   */
  async sendDailyDigests() {
    try {
      console.log('📧 [Email Digest] Sending daily digests...');

      const users = await this._getUsersWithDigestFrequency('daily');

      for (const user of users) {
        await this.sendDigest(user.id, 'daily');
      }

      console.log(`✅ [Email Digest] Sent ${users.length} daily digests`);
    } catch (error) {
      console.error('❌ [Email Digest] Error sending daily digests:', error);
    }
  }

  /**
   * Send weekly digests to all users who opted in
   */
  async sendWeeklyDigests() {
    try {
      console.log('📧 [Email Digest] Sending weekly digests...');

      const users = await this._getUsersWithDigestFrequency('weekly');

      for (const user of users) {
        await this.sendDigest(user.id, 'weekly');
      }

      console.log(`✅ [Email Digest] Sent ${users.length} weekly digests`);
    } catch (error) {
      console.error('❌ [Email Digest] Error sending weekly digests:', error);
    }
  }

  /**
   * Send a digest to a specific user
   * @param {string} userId - User ID
   * @param {string} frequency - 'daily' or 'weekly'
   */
  async sendDigest(userId, frequency = 'daily') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true }
      });

      if (!user || !user.email) {
        return;
      }

      // Get date range for digest
      const { startDate, endDate } = this._getDateRange(frequency);

      // Gather digest data
      const data = await this._gatherDigestData(userId, startDate, endDate);

      // Skip if no activity
      if (!this._hasActivity(data)) {
        console.log(`⏭️  [Email Digest] No activity for user ${userId}, skipping`);
        return;
      }

      // Send digest email
      await emailService.sendTemplate({
        to: user.email,
        templateName: `digest-${frequency}`,
        data: {
          userName: user.name || user.email,
          frequency,
          periodStart: startDate.toLocaleDateString(),
          periodEnd: endDate.toLocaleDateString(),
          ...data
        },
        userId: user.id
      });

      console.log(`✅ [Email Digest] Sent ${frequency} digest to ${user.email}`);
    } catch (error) {
      console.error(`❌ [Email Digest] Error sending digest to user ${userId}:`, error);
    }
  }

  /**
   * Get users who opted in for specific digest frequency
   */
  async _getUsersWithDigestFrequency(frequency) {
    try {
      // For now, check SystemSettings for digest preferences
      // In future, add user-level preferences
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `emailDigest${frequency.charAt(0).toUpperCase() + frequency.slice(1)}Enabled` }
      });

      if (!setting || setting.value !== true) {
        return [];
      }

      // Get all active users with email enabled
      return await prisma.user.findMany({
        where: {
          isActive: true,
          emailOutboundEnabled: true,
          status: 'ACTIVE'
        },
        select: { id: true, email: true, name: true }
      });
    } catch (error) {
      console.error('❌ [Email Digest] Error getting users:', error);
      return [];
    }
  }

  /**
   * Get date range for digest frequency
   */
  _getDateRange(frequency) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    let startDate;
    if (frequency === 'daily') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (frequency === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  /**
   * Gather all digest data for a user
   */
  async _gatherDigestData(userId, startDate, endDate) {
    const [
      unreadNotifications,
      criticalNotifications,
      newInboundEmails,
      projectUpdates,
      qcFailures,
      cutoffWarnings
    ] = await Promise.all([
      // Unread notifications
      prisma.notification.count({
        where: {
          userId,
          read: false,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),

      // Critical notifications
      prisma.notification.findMany({
        where: {
          userId,
          priority: 'critical',
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          title: true,
          message: true,
          createdAt: true,
          primaryActionUrl: true
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),

      // New inbound emails
      prisma.inboundEmail.count({
        where: {
          status: 'unread',
          receivedAt: { gte: startDate, lte: endDate }
        }
      }),

      // Project updates (documents, revisions)
      prisma.document.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),

      // QC failures
      prisma.notification.count({
        where: {
          userId,
          type: 'qc_failure',
          createdAt: { gte: startDate, lte: endDate }
        }
      }),

      // Cutoff warnings
      prisma.notification.count({
        where: {
          userId,
          type: 'cutoff_warning',
          createdAt: { gte: startDate, lte: endDate }
        }
      })
    ]);

    return {
      unreadNotifications,
      criticalNotifications,
      newInboundEmails,
      projectUpdates,
      qcFailures,
      cutoffWarnings
    };
  }

  /**
   * Check if digest has any activity
   */
  _hasActivity(data) {
    return (
      data.unreadNotifications > 0 ||
      data.newInboundEmails > 0 ||
      data.projectUpdates > 0 ||
      data.qcFailures > 0 ||
      data.cutoffWarnings > 0
    );
  }

  /**
   * Test digest (for development)
   */
  async sendTestDigest(userId) {
    console.log(`🧪 [Email Digest] Sending test digest to user ${userId}`);
    await this.sendDigest(userId, 'daily');
  }
}

// Export singleton
module.exports = new EmailDigestService();

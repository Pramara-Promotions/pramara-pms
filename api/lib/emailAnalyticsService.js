// api/lib/emailAnalyticsService.js
// Phase 7: Email Analytics
// Track opens, clicks, bounces, and provide insights

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EmailAnalyticsService {
  /**
   * Track email open
   * @param {string} emailLogId - EmailLog ID
   */
  async trackOpen(emailLogId) {
    try {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          opened: true,
          openedAt: new Date(),
          openCount: { increment: 1 }
        }
      });

      console.log(`✅ [Email Analytics] Tracked open for email ${emailLogId}`);
    } catch (error) {
      console.error('❌ [Email Analytics] Error tracking open:', error);
    }
  }

  /**
   * Track email click
   * @param {string} emailLogId - EmailLog ID
   */
  async trackClick(emailLogId) {
    try {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          clicked: true,
          clickedAt: new Date(),
          clickCount: { increment: 1 }
        }
      });

      console.log(`✅ [Email Analytics] Tracked click for email ${emailLogId}`);
    } catch (error) {
      console.error('❌ [Email Analytics] Error tracking click:', error);
    }
  }

  /**
   * Track email bounce
   * @param {string} emailLogId - EmailLog ID
   * @param {string} reason - Bounce reason
   */
  async trackBounce(emailLogId, reason) {
    try {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          bounced: true,
          bouncedAt: new Date(),
          bounceReason: reason
        }
      });

      console.log(`✅ [Email Analytics] Tracked bounce for email ${emailLogId}`);
    } catch (error) {
      console.error('❌ [Email Analytics] Error tracking bounce:', error);
    }
  }

  /**
   * Get email analytics dashboard data
   * @param {Date} startDate - Start date for analytics
   * @param {Date} endDate - End date for analytics
   */
  async getDashboard(startDate, endDate) {
    try {
      const where = {
        createdAt: { gte: startDate, lte: endDate },
        status: 'sent' // Only count actually sent emails
      };

      const [
        totalSent,
        totalOpened,
        totalClicked,
        totalBounced,
        byTemplate,
        byDay
      ] = await Promise.all([
        // Total sent
        prisma.emailLog.count({ where }),

        // Total opened
        prisma.emailLog.count({ where: { ...where, opened: true } }),

        // Total clicked
        prisma.emailLog.count({ where: { ...where, clicked: true } }),

        // Total bounced
        prisma.emailLog.count({ where: { ...where, bounced: true } }),

        // By template
        prisma.emailLog.groupBy({
          where,
          by: ['templateId'],
          _count: true,
          _sum: {
            openCount: true,
            clickCount: true
          }
        }),

        // By day
        prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(*)::int as sent,
            SUM(CASE WHEN opened THEN 1 ELSE 0 END)::int as opened,
            SUM(CASE WHEN clicked THEN 1 ELSE 0 END)::int as clicked,
            SUM(CASE WHEN bounced THEN 1 ELSE 0 END)::int as bounced
          FROM "EmailLog"
          WHERE "createdAt" >= ${startDate}
            AND "createdAt" <= ${endDate}
            AND status = 'sent'
          GROUP BY DATE("createdAt")
          ORDER BY DATE("createdAt") DESC
          LIMIT 30
        `
      ]);

      return {
        summary: {
          totalSent,
          totalOpened,
          totalClicked,
          totalBounced,
          openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : 0,
          clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : 0,
          bounceRate: totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : 0
        },
        byTemplate: byTemplate.map(t => ({
          templateId: t.templateId,
          count: t._count,
          totalOpens: t._sum.openCount || 0,
          totalClicks: t._sum.clickCount || 0
        })),
        byDay: byDay.map(d => ({
          date: d.date,
          sent: d.sent,
          opened: d.opened,
          clicked: d.clicked,
          bounced: d.bounced,
          openRate: d.sent > 0 ? ((d.opened / d.sent) * 100).toFixed(2) : 0,
          clickRate: d.sent > 0 ? ((d.clicked / d.sent) * 100).toFixed(2) : 0
        }))
      };
    } catch (error) {
      console.error('❌ [Email Analytics] Error getting dashboard:', error);
      throw error;
    }
  }

  /**
   * Get template performance
   * @param {string} templateId - Template ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getTemplatePerformance(templateId, startDate, endDate) {
    try {
      const where = {
        templateId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'sent'
      };

      const [total, opened, clicked, bounced, recentEmails] = await Promise.all([
        prisma.emailLog.count({ where }),
        prisma.emailLog.count({ where: { ...where, opened: true } }),
        prisma.emailLog.count({ where: { ...where, clicked: true } }),
        prisma.emailLog.count({ where: { ...where, bounced: true } }),
        prisma.emailLog.findMany({
          where,
          select: {
            id: true,
            to: true,
            subject: true,
            createdAt: true,
            opened: true,
            openedAt: true,
            clicked: true,
            clickedAt: true,
            bounced: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      return {
        templateId,
        total,
        opened,
        clicked,
        bounced,
        openRate: total > 0 ? ((opened / total) * 100).toFixed(2) : 0,
        clickRate: total > 0 ? ((clicked / total) * 100).toFixed(2) : 0,
        bounceRate: total > 0 ? ((bounced / total) * 100).toFixed(2) : 0,
        recentEmails
      };
    } catch (error) {
      console.error('❌ [Email Analytics] Error getting template performance:', error);
      throw error;
    }
  }

  /**
   * Get user email activity
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getUserActivity(userId, startDate, endDate) {
    try {
      const where = {
        userId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'sent'
      };

      const [total, opened, clicked] = await Promise.all([
        prisma.emailLog.count({ where }),
        prisma.emailLog.count({ where: { ...where, opened: true } }),
        prisma.emailLog.count({ where: { ...where, clicked: true } })
      ]);

      return {
        userId,
        totalSent: total,
        totalOpened: opened,
        totalClicked: clicked,
        openRate: total > 0 ? ((opened / total) * 100).toFixed(2) : 0,
        clickRate: total > 0 ? ((clicked / total) * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('❌ [Email Analytics] Error getting user activity:', error);
      throw error;
    }
  }

  /**
   * Get engagement trends
   * @param {number} days - Number of days to analyze
   */
  async getEngagementTrends(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::int as sent,
          AVG(CASE WHEN opened THEN 1.0 ELSE 0.0 END)::float as open_rate,
          AVG(CASE WHEN clicked THEN 1.0 ELSE 0.0 END)::float as click_rate,
          AVG("openCount")::float as avg_opens_per_email,
          AVG("clickCount")::float as avg_clicks_per_email
        FROM "EmailLog"
        WHERE "createdAt" >= ${startDate}
          AND status = 'sent'
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") ASC
      `;

      return trends.map(t => ({
        date: t.date,
        sent: t.sent,
        openRate: (t.open_rate * 100).toFixed(2),
        clickRate: (t.click_rate * 100).toFixed(2),
        avgOpensPerEmail: parseFloat(t.avg_opens_per_email).toFixed(2),
        avgClicksPerEmail: parseFloat(t.avg_clicks_per_email).toFixed(2)
      }));
    } catch (error) {
      console.error('❌ [Email Analytics] Error getting engagement trends:', error);
      throw error;
    }
  }
}

// Export singleton
module.exports = new EmailAnalyticsService();

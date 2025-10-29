// api/lib/notificationService.js
// Phase 4: Advanced Notification Service with context-rich notifications

const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');

const prisma = new PrismaClient();

class NotificationService {
  /**
   * Generic notification creation with full context
   */
  async createNotification({
    userId,
    type,
    title,
    message,
    // Context (WHO/WHAT/WHERE)
    entityType,
    entityId,
    entityName,
    entityCode,
    assignedTo,
    location,
    // Actions
    primaryAction,
    primaryActionUrl,
    primaryActionType = 'navigate',
    secondaryActions = null,
    // Impact
    priority = 'medium',
    impactLevel,
    impactDetails,
    // State
    expiresAt
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          entityType,
          entityId,
          entityName,
          entityCode,
          assignedTo,
          location,
          primaryAction,
          primaryActionUrl,
          primaryActionType,
          secondaryActions: secondaryActions ? JSON.stringify(secondaryActions) : null,
          priority,
          impactLevel,
          impactDetails: impactDetails ? JSON.stringify(impactDetails) : null,
          expiresAt
        }
      });

      // Real-time emit via WebSocket (if available)
      await this._emitRealtime(notification);

      // Send email for critical notifications
      await this._sendEmailIfCritical(notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Cutoff Warning: Project approaching deadline with delays
   */
  async notifyCutoffWarning({ userId, project, hoursRemaining, hoursNeeded, delayedStages }) {
    const impactDetails = {
      hoursShortfall: hoursNeeded - hoursRemaining,
      delayedStagesCount: delayedStages.length,
      affectedStages: delayedStages.map(s => ({ id: s.id, name: s.name, hoursNeeded: s.hoursNeeded }))
    };

    return this.createNotification({
      userId,
      type: 'CUTOFF_WARNING',
      title: `⚠️ Project ${project.code} Approaching Cutoff`,
      message: `Only ${hoursRemaining}h remaining but ${hoursNeeded}h needed. ${delayedStages.length} stages at risk.`,
      entityType: 'project',
      entityId: String(project.id),
      entityName: project.name,
      entityCode: project.code,
      location: project.factory || 'Main Factory',
      primaryAction: 'View Project',
      primaryActionUrl: `/projects/${project.id}`,
      primaryActionType: 'navigate',
      secondaryActions: [
        { label: 'Adjust Plan', url: `/projects/${project.id}/plan`, type: 'navigate' },
        { label: 'Notify Supervisor', url: `/projects/${project.id}/notify`, type: 'action' }
      ],
      priority: hoursRemaining < 24 ? 'critical' : 'high',
      impactLevel: 'Delay',
      impactDetails,
      expiresAt: project.cutoffDate
    });
  }

  /**
   * QC Failure: Quality control rejection
   */
  async notifyQCFailure({ userId, batch, station, room, qcInspector, supervisor, failureDetails }) {
    const impactDetails = {
      batchCode: batch.batchCode,
      failedItems: failureDetails.failedItems || [],
      defectRate: failureDetails.defectRate,
      reworkTime: failureDetails.estimatedReworkTime,
      costImpact: failureDetails.estimatedCost
    };

    return this.createNotification({
      userId,
      type: 'QC_FAILURE',
      title: `🔴 QC Failed: Batch ${batch.batchCode}`,
      message: `${failureDetails.failedItems.length} items failed QC at ${station.name}. Immediate action required.`,
      entityType: 'batch',
      entityId: batch.id,
      entityName: `Batch ${batch.batchCode}`,
      entityCode: batch.batchCode,
      assignedTo: supervisor?.id,
      location: `${room.name} - ${station.name}`,
      primaryAction: 'Review QC Report',
      primaryActionUrl: `/qc/submissions/${batch.batchCode}`,
      primaryActionType: 'navigate',
      secondaryActions: [
        { label: 'Assign Rework', url: `/batches/${batch.id}/rework`, type: 'action' },
        { label: 'Contact Inspector', url: `/users/${qcInspector.id}`, type: 'navigate' }
      ],
      priority: 'critical',
      impactLevel: 'Quality',
      impactDetails,
      expiresAt: null // No expiry - must be addressed
    });
  }

  /**
   * Daily Plan Ready: Production plan generated and awaiting approval
   */
  async notifyDailyPlanReady({ userId, plan, leadSupervisor }) {
    const impactDetails = {
      date: plan.date,
      stationsCount: plan.stationsCount,
      projectsCount: plan.projectsCount,
      scenarioUsed: plan.selectedScenario
    };

    return this.createNotification({
      userId,
      type: 'DAILY_PLAN_READY',
      title: `📋 Daily Plan Ready for ${new Date(plan.date).toLocaleDateString()}`,
      message: `${plan.stationsCount} stations, ${plan.projectsCount} projects planned. Review and approve.`,
      entityType: 'dailyPlan',
      entityId: plan.id,
      entityName: `Plan ${new Date(plan.date).toLocaleDateString()}`,
      entityCode: `PLAN-${plan.id}`,
      assignedTo: leadSupervisor?.id,
      location: plan.factoryName || 'Main Factory',
      primaryAction: 'Review Plan',
      primaryActionUrl: `/production/daily-plan/${plan.id}`,
      primaryActionType: 'navigate',
      secondaryActions: [
        { label: 'Approve', url: `/production/daily-plan/${plan.id}/approve`, type: 'approve' },
        { label: 'Adjust', url: `/production/daily-plan/${plan.id}/edit`, type: 'navigate' }
      ],
      priority: 'high',
      impactLevel: null,
      impactDetails,
      expiresAt: new Date(new Date(plan.date).getTime() + 24 * 60 * 60 * 1000) // 24h expiry
    });
  }

  /**
   * Document Approval: Document uploaded and requires approval
   */
  async notifyDocumentApproval({ userId, document, uploadedBy, requiresAction = true }) {
    const impactDetails = {
      documentType: document.type,
      fileName: document.fileName,
      fileSize: document.fileSize,
      uploadedBy: uploadedBy.name,
      uploadedAt: document.uploadedAt
    };

    return this.createNotification({
      userId,
      type: 'DOCUMENT_APPROVAL',
      title: `📄 Document Approval Required`,
      message: `${uploadedBy.name} uploaded ${document.type}: ${document.fileName}`,
      entityType: 'document',
      entityId: document.id,
      entityName: document.fileName,
      entityCode: document.code || `DOC-${document.id}`,
      assignedTo: requiresAction ? userId : null,
      location: document.projectCode ? `Project ${document.projectCode}` : null,
      primaryAction: requiresAction ? 'Review Document' : 'View Document',
      primaryActionUrl: `/documents/${document.id}`,
      primaryActionType: 'navigate',
      secondaryActions: requiresAction ? [
        { label: 'Approve', url: `/documents/${document.id}/approve`, type: 'approve' },
        { label: 'Reject', url: `/documents/${document.id}/reject`, type: 'action' }
      ] : null,
      priority: requiresAction ? 'high' : 'medium',
      impactLevel: requiresAction ? 'Compliance' : null,
      impactDetails,
      expiresAt: null
    });
  }

  /**
   * Password Reset: Admin reset user password
   */
  async notifyPasswordReset({ userId, resetBy, method = 'manual' }) {
    return this.createNotification({
      userId,
      type: 'PASSWORD_RESET',
      title: '🔑 Password Reset by Administrator',
      message: `Your password was reset by ${resetBy.name}. ${method === 'email' ? 'Check your email for temporary password.' : 'Contact admin for new password.'}`,
      entityType: 'user',
      entityId: userId,
      entityName: 'Password Reset',
      priority: 'high',
      impactLevel: 'Security',
      impactDetails: {
        resetBy: resetBy.name,
        method,
        timestamp: new Date().toISOString()
      },
      primaryAction: 'Change Password',
      primaryActionUrl: '/change-password',
      primaryActionType: 'navigate'
    });
  }

  /**
   * MFA Status Changed: MFA enabled or disabled
   */
  async notifyMFAStatusChanged({ userId, enabled, changedBy }) {
    return this.createNotification({
      userId,
      type: 'MFA_STATUS_CHANGED',
      title: enabled ? '✅ MFA Enabled' : '⚠️ MFA Disabled',
      message: enabled 
        ? `Two-factor authentication enabled by ${changedBy.name}. Your account is now more secure.`
        : `Two-factor authentication disabled by ${changedBy.name}. Consider re-enabling for better security.`,
      entityType: 'user',
      entityId: userId,
      entityName: 'MFA Settings',
      priority: enabled ? 'medium' : 'high',
      impactLevel: 'Security',
      impactDetails: {
        enabled,
        changedBy: changedBy.name,
        selfService: userId === changedBy.id,
        timestamp: new Date().toISOString()
      },
      primaryAction: enabled ? 'View Backup Codes' : 'Enable MFA',
      primaryActionUrl: '/account?tab=security',
      primaryActionType: 'navigate'
    });
  }

  /**
   * Role Changed: User role assigned or removed
   */
  async notifyRoleChanged({ userId, action, roleName, changedBy }) {
    return this.createNotification({
      userId,
      type: 'ROLE_CHANGED',
      title: action === 'assigned' ? `🎖️ Role Assigned: ${roleName}` : `Role Removed: ${roleName}`,
      message: `${changedBy.name} ${action === 'assigned' ? 'assigned you to' : 'removed you from'} the ${roleName} role.`,
      entityType: 'role',
      entityId: userId,
      entityName: roleName,
      priority: 'medium',
      impactDetails: {
        action,
        roleName,
        changedBy: changedBy.name,
        timestamp: new Date().toISOString()
      },
      primaryAction: 'View Permissions',
      primaryActionUrl: '/account?tab=profile',
      primaryActionType: 'navigate'
    });
  }

  /**
   * Real-time emit via WebSocket (if available)
   * @private
   */
  async _emitRealtime(notification) {
    try {
      if (global.io) {
        // Emit to specific user room
        global.io.to(`user:${notification.userId}`).emit('notification', notification);
        console.log(`📡 Real-time notification sent to user:${notification.userId}`);
      }
    } catch (error) {
      console.error('Error emitting real-time notification:', error);
      // Don't throw - WebSocket is optional
    }
  }

  /**
   * Send email for critical notifications
   * @private
   */
  async _sendEmailIfCritical(notification) {
    try {
      if (notification.priority === 'critical') {
        // Get user email
        const user = await prisma.user.findUnique({
          where: { id: notification.userId },
          select: { email: true, name: true }
        });

        if (user && user.email) {
          await emailService.sendEmail({
            to: user.email,
            subject: `🔴 Critical: ${notification.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0;">Critical Notification</h2>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                  <h3 style="color: #111827; margin-top: 0;">${notification.title}</h3>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">${notification.message}</p>
                  
                  ${notification.impactLevel ? `
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0;">
                      <strong style="color: #991b1b;">Impact: ${notification.impactLevel}</strong>
                      ${notification.impactDetails ? `<p style="color: #7f1d1d; margin: 8px 0 0 0; font-size: 14px;">${JSON.stringify(notification.impactDetails)}</p>` : ''}
                    </div>
                  ` : ''}
                  
                  ${notification.primaryActionUrl ? `
                    <a href="${process.env.APP_URL || 'http://localhost:5173'}${notification.primaryActionUrl}" 
                       style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; font-weight: 600;">
                      ${notification.primaryAction || 'View Details'}
                    </a>
                  ` : ''}
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    This is an automated notification from Pramara PMS. 
                    <a href="${process.env.APP_URL || 'http://localhost:5173'}/notifications" style="color: #2563eb;">View all notifications</a>
                  </p>
                </div>
              </div>
            `
          });
          console.log(`📧 Critical notification email sent to ${user.email}`);
        }
      }
    } catch (error) {
      console.error('Error sending critical notification email:', error);
      // Don't throw - email is optional
    }
  }

  /**
   * Batch notification creation for multiple users
   */
  async notifyMultipleUsers({ userIds, ...notificationData }) {
    const promises = userIds.map(userId => 
      this.createNotification({ ...notificationData, userId })
    );
    return Promise.all(promises);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    return prisma.notification.update({
      where: { 
        id: notificationId,
        userId // Ensure user owns this notification
      },
      data: { 
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId, userId) {
    return prisma.notification.update({
      where: { 
        id: notificationId,
        userId
      },
      data: { 
        dismissed: true,
        dismissedAt: new Date()
      }
    });
  }

  /**
   * Auto-cleanup expired notifications (run via cron)
   */
  async cleanupExpiredNotifications() {
    const result = await prisma.notification.updateMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        dismissed: false
      },
      data: {
        dismissed: true,
        dismissedAt: new Date()
      }
    });
    
    console.log(`🧹 Auto-dismissed ${result.count} expired notifications`);
    return result;
  }
}

// Export singleton instance
module.exports = new NotificationService();

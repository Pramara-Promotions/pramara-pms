// api/lib/notificationService.js
// Phase 4: Advanced Notification System
// Context-rich, actionable notifications with email integration

const { PrismaClient } = require('@prisma/client');
const { emailService } = require('./emailService');

const prisma = new PrismaClient();

class NotificationService {
  /**
   * Create a context-rich, actionable notification
   * @param {Object} params - Notification parameters
   * @param {string} params.userId - Target user ID
   * @param {string} params.type - Notification type (e.g., 'cutoff_warning')
   * @param {string} params.priority - Priority: 'low', 'medium', 'high', 'critical'
   * @param {string} params.title - Short, clear title
   * @param {string} params.message - Detailed message
   * @param {Object} [params.context] - Entity context
   * @param {string} [params.context.entityType] - 'project', 'task', 'batch', 'station', etc.
   * @param {string} [params.context.entityId] - Entity ID
   * @param {string} [params.context.entityName] - Display name
   * @param {string} [params.context.entityCode] - Business code
   * @param {string} [params.context.assignedTo] - Person responsible
   * @param {string} [params.context.location] - Physical location
   * @param {Object} [params.primaryAction] - Primary action button
   * @param {string} [params.primaryAction.label] - Button label
   * @param {string} [params.primaryAction.url] - Target URL
   * @param {string} [params.primaryAction.type] - 'navigate', 'modal', 'external', 'action'
   * @param {Array} [params.secondaryActions] - Additional actions
   * @param {Object} [params.impact] - Impact information
   * @param {string} [params.impact.level] - Human-readable impact
   * @param {Object} [params.impact.details] - Structured impact data
   * @param {Date} [params.expiresAt] - Auto-expire date
   * @param {boolean} [params.sendEmail=false] - Also send email notification
   * @param {string} [params.emailTemplate] - Email template name
   * @returns {Promise<Object>} Created notification
   */
  async create({
    userId,
    type,
    priority = 'medium',
    title,
    message,
    context = {},
    primaryAction = null,
    secondaryActions = [],
    impact = {},
    expiresAt = null,
    sendEmail = false,
    emailTemplate = null
  }) {
    try {
      // Validate priority
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(priority)) {
        priority = 'medium';
      }

      // Create notification
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          priority,
          title,
          message,
          
          // Context
          entityType: context.entityType || null,
          entityId: context.entityId || null,
          entityName: context.entityName || null,
          entityCode: context.entityCode || null,
          assignedTo: context.assignedTo || null,
          location: context.location || null,
          
          // Actions
          primaryAction: primaryAction?.label || null,
          primaryActionUrl: primaryAction?.url || null,
          primaryActionType: primaryAction?.type || 'navigate',
          secondaryActions: secondaryActions.length > 0 ? secondaryActions : null,
          
          // Impact
          impactLevel: impact.level || null,
          impactDetails: impact.details || null,
          
          // Expiration
          expiresAt
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      // Send email if requested
      if (sendEmail && notification.user.email) {
        await this._sendEmailNotification(notification, emailTemplate);
      }

      // Emit real-time notification (WebSocket)
      this._emitRealtime(notification);

      return notification;
    } catch (error) {
      console.error('❌ [NotificationService] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data (same as create method)
   * @returns {Promise<Array>} Created notifications
   */
  async createMany(userIds, notificationData) {
    try {
      const notifications = await Promise.all(
        userIds.map(userId => 
          this.create({ ...notificationData, userId })
        )
      );
      return notifications;
    } catch (error) {
      console.error('❌ [NotificationService] Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Create a cutoff warning notification
   */
  async notifyCutoffWarning({
    userId,
    project,
    hoursRemaining,
    hoursNeeded,
    delayedStages = []
  }) {
    const deficit = hoursNeeded - hoursRemaining;
    const priority = hoursRemaining < 12 ? 'critical' : hoursRemaining < 24 ? 'high' : 'medium';

    return await this.create({
      userId,
      type: 'cutoff_warning',
      priority,
      title: priority === 'critical' ? '🔴 CRITICAL: Cutoff Risk' : '⚠️ Cutoff Warning',
      message: `Project behind schedule, cutoff in ${hoursRemaining} hours`,
      context: {
        entityType: 'project',
        entityId: project.id,
        entityName: project.name,
        entityCode: project.poNumber,
        assignedTo: project.projectManager?.name,
        location: `Multiple stations (${delayedStages.length} delayed)`
      },
      primaryAction: {
        label: 'View Timeline',
        url: `/projects/${project.id}/timeline`,
        type: 'navigate'
      },
      secondaryActions: [
        { label: 'See Recovery Options', url: `/optimize/project/${project.id}`, type: 'navigate' },
        { label: 'Add Shift', url: `/projects/${project.id}/add-shift`, type: 'modal' },
        { label: 'Reallocate Resources', url: `/projects/${project.id}/reallocate`, type: 'modal' }
      ],
      impact: {
        level: deficit > 0 ? `Will miss cutoff by ${deficit} hours` : `On track`,
        details: {
          cutoffAt: project.cutoffDate,
          hoursRemaining,
          hoursNeeded,
          deficit,
          ragStatus: deficit > 2 ? 'red' : deficit > 0 ? 'amber' : 'green',
          delayedStages
        }
      },
      sendEmail: priority === 'critical',
      emailTemplate: 'cutoff-warning'
    });
  }

  /**
   * Create a QC failure notification
   */
  async notifyQCFailure({
    userId,
    batch,
    station,
    room,
    qcInspector,
    supervisor,
    failureDetails
  }) {
    return await this.create({
      userId,
      type: 'qc_failure',
      priority: 'high',
      title: '❌ QC Failure: ' + (failureDetails.issue || 'Quality Check Failed'),
      message: 'Batch failed quality verification',
      context: {
        entityType: 'batch',
        entityId: batch.id,
        entityName: `Batch #${batch.code}`,
        entityCode: batch.code,
        assignedTo: qcInspector.name,
        location: `Station ${station.code}, ${room.name}`
      },
      primaryAction: {
        label: 'View QC Report',
        url: `/qc/batch/${batch.id}`,
        type: 'navigate'
      },
      secondaryActions: [
        { label: 'View Photos', url: `/qc/batch/${batch.id}/photos`, type: 'modal' },
        { label: 'Contact Supervisor', url: `/messages/${supervisor.id}`, type: 'modal' },
        { label: 'See Similar Issues', url: `/qc/history?issue=${failureDetails.issueType}`, type: 'navigate' }
      ],
      impact: {
        level: `Blocks ${failureDetails.unitsAffected || batch.quantity} units from next stage`,
        details: failureDetails
      },
      sendEmail: true,
      emailTemplate: 'qc-failure'
    });
  }

  /**
   * Create a daily plan ready notification
   */
  async notifyDailyPlanReady({
    userId,
    plan,
    leadSupervisor
  }) {
    return await this.create({
      userId,
      type: 'daily_plan_ready',
      priority: 'medium',
      title: '📋 Daily Plan Ready for Review',
      message: `Tomorrow's station allocations need approval`,
      context: {
        entityType: 'daily_plan',
        entityId: plan.id,
        entityName: `Plan for ${plan.date}`,
        assignedTo: leadSupervisor.name,
        location: `${plan.rooms?.length || 0} rooms, ${plan.stations?.length || 0} stations`
      },
      primaryAction: {
        label: 'Review Plan',
        url: `/plans/${plan.id}/review`,
        type: 'navigate'
      },
      secondaryActions: [
        { label: 'See Changes from Yesterday', url: `/plans/${plan.id}/diff`, type: 'modal' },
        { label: 'Quick Approve', url: `/plans/${plan.id}/approve`, type: 'action' }
      ],
      impact: {
        level: 'Plan must be approved by 6 PM today',
        details: {
          dueBy: '18:00',
          totalTasks: plan.tasks?.length || 0,
          newTasks: plan.newTasks?.length || 0,
          changes: plan.changes?.length || 0
        }
      },
      expiresAt: new Date(new Date(plan.date).setHours(18, 0, 0, 0)), // Expires at 6 PM
      sendEmail: false
    });
  }

  /**
   * Create a document approval notification
   */
  async notifyDocumentApproval({
    userId,
    document,
    uploadedBy,
    requiresAction = true
  }) {
    return await this.create({
      userId,
      type: 'document_approval',
      priority: requiresAction ? 'medium' : 'low',
      title: '📄 Document Requires Approval',
      message: `${uploadedBy.name} uploaded: ${document.filename}`,
      context: {
        entityType: 'document',
        entityId: document.id,
        entityName: document.filename,
        entityCode: document.entityCode,
        assignedTo: uploadedBy.name
      },
      primaryAction: {
        label: 'Review Document',
        url: `/documents/${document.id}`,
        type: 'navigate'
      },
      secondaryActions: [
        { label: 'Quick Approve', url: `/documents/${document.id}/approve`, type: 'action' },
        { label: 'Request Changes', url: `/documents/${document.id}/request-changes`, type: 'modal' }
      ],
      sendEmail: false
    });
  }

  /**
   * Dismiss notification
   */
  async dismiss(notificationId, userId) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification || notification.userId !== userId) {
        throw new Error('Notification not found or access denied');
      }

      return await prisma.notification.update({
        where: { id: notificationId },
        data: {
          dismissed: true,
          dismissedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ [NotificationService] Error dismissing notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markRead(notificationId, userId) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification || notification.userId !== userId) {
        throw new Error('Notification not found or access denied');
      }

      return await prisma.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ [NotificationService] Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with filtering
   */
  async getUserNotifications({
    userId,
    unreadOnly = false,
    priority = null,
    type = null,
    limit = 50,
    offset = 0
  }) {
    try {
      const where = {
        userId,
        dismissed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      };

      if (unreadOnly) where.read = false;
      if (priority) where.priority = priority;
      if (type) where.type = type;

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: [
            { priority: 'desc' }, // Critical first
            { createdAt: 'desc' }
          ]
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: {
            userId,
            read: false,
            dismissed: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        })
      ]);

      return {
        notifications,
        total,
        unreadCount,
        hasMore: total > offset + notifications.length
      };
    } catch (error) {
      console.error('❌ [NotificationService] Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpired() {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          dismissed: false
        },
        data: {
          dismissed: true,
          dismissedAt: new Date()
        }
      });

      console.log(`✅ [NotificationService] Cleaned up ${result.count} expired notifications`);
      return result.count;
    } catch (error) {
      console.error('❌ [NotificationService] Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Send email notification (private method)
   */
  async _sendEmailNotification(notification, templateName = null) {
    try {
      if (!templateName) {
        // Use generic notification email
        templateName = 'notification-alert';
      }

      await emailService.sendTemplate({
        to: notification.user.email,
        templateName,
        data: {
          userName: notification.user.name || notification.user.email,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          entityName: notification.entityName,
          entityCode: notification.entityCode,
          primaryAction: notification.primaryAction,
          primaryActionUrl: notification.primaryActionUrl 
            ? `${process.env.APP_URL || 'http://localhost:5173'}${notification.primaryActionUrl}`
            : null,
          impactLevel: notification.impactLevel
        },
        userId: notification.userId
      });

      console.log(`✅ [NotificationService] Email sent for notification ${notification.id}`);
    } catch (error) {
      console.error('❌ [NotificationService] Error sending email:', error);
      // Don't throw - email is optional
    }
  }

  /**
   * Emit real-time notification via WebSocket (private method)
   */
  _emitRealtime(notification) {
    try {
      // Get global io instance if available
      if (global.io) {
        global.io.to(`user:${notification.userId}`).emit('notification', {
          ...notification,
          // Format for display
          timestamp: this._formatTimestamp(notification.createdAt),
          priorityIcon: this._getPriorityIcon(notification.priority),
          priorityColor: this._getPriorityColor(notification.priority)
        });
        
        console.log(`✅ [NotificationService] Real-time notification sent to user ${notification.userId}`);
      }
    } catch (error) {
      console.error('❌ [NotificationService] Error emitting real-time notification:', error);
      // Don't throw - real-time is optional
    }
  }

  /**
   * Format helpers
   */
  _formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  _getPriorityIcon(priority) {
    const icons = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔶',
      critical: '🔴'
    };
    return icons[priority] || 'ℹ️';
  }

  _getPriorityColor(priority) {
    const colors = {
      low: 'gray',
      medium: 'blue',
      high: 'orange',
      critical: 'red'
    };
    return colors[priority] || 'gray';
  }
  
  /**
   * Phase 2: Send approval reminder
   * @param {Object} approvalRequest - Approval request object
   * @param {string} reminderType - 'scheduled' or 'escalation'
   * @returns {Promise<Object>} Send result
   */
  async sendApprovalReminder(approvalRequest, reminderType = 'scheduled') {
    const { id, approvalType, description, requiredFrom, requiredFromContact, expectedDate, cutoffDate, bufferDays, projectId } = approvalRequest;
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, code: true },
    });
    
    // Create reminder record
    const reminder = await prisma.approvalReminder.create({
      data: {
        approvalRequestId: id,
        reminderType,
        reminderDate: new Date(),
        sentTo: [requiredFromContact].filter(Boolean),
        channel: 'email',
        status: 'pending',
      },
    });
    
    const priority = bufferDays < 2 ? 'critical' : bufferDays < 5 ? 'high' : 'medium';
    
    try {
      // Send email if contact provided
      if (requiredFromContact) {
        const subject = reminderType === 'escalation'
          ? `URGENT: Approval Required for ${project.name} - ${bufferDays} days to cutoff`
          : `Reminder: Approval Required for ${project.name}`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${reminderType === 'escalation' ? '#dc2626' : '#2563eb'};">
              ${reminderType === 'escalation' ? '⚠️ URGENT: ' : '📋 '}Approval Required
            </h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Project:</strong> ${project.name} (${project.code})</p>
              <p><strong>Approval Type:</strong> ${approvalType}</p>
              <p><strong>Description:</strong> ${description}</p>
              <p><strong>Required From:</strong> ${requiredFrom}</p>
            </div>
            
            <div style="background: ${reminderType === 'escalation' ? '#fef2f2' : '#eff6ff'}; padding: 15px; border-left: 4px solid ${reminderType === 'escalation' ? '#dc2626' : '#2563eb'}; margin: 20px 0;">
              <p style="margin: 0;"><strong>Expected Date:</strong> ${new Date(expectedDate).toLocaleDateString()}</p>
              <p style="margin: 10px 0 0 0;"><strong>Cutoff Date:</strong> ${new Date(cutoffDate).toLocaleDateString()}</p>
              <p style="margin: 10px 0 0 0; color: ${bufferDays < 2 ? '#dc2626' : '#000'};"><strong>Days Remaining:</strong> ${bufferDays}</p>
            </div>
            
            ${reminderType === 'escalation' ? `
              <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #991b1b; margin: 0;">
                  <strong>⚠️ This is an escalation notice.</strong><br>
                  The expected approval date has passed and we are approaching the cutoff date. 
                  Immediate action is required to prevent project delays.
                </p>
              </div>
            ` : ''}
            
            <p>Please provide your approval or feedback as soon as possible.</p>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              This is an automated reminder from Pramara PMS.<br>
              If you have already responded, please disregard this message.
            </p>
          </div>
        `;
        
        await emailService.send({
          to: requiredFromContact,
          subject,
          html,
        });
      }
      
      // Update reminder status
      await prisma.approvalReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });
      
      return { success: true, reminderId: reminder.id, channel: 'email' };
    } catch (error) {
      console.error('Failed to send approval reminder:', error);
      
      await prisma.approvalReminder.update({
        where: { id: reminder.id },
        data: { status: 'failed' },
      });
      
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Process pending approval reminders (to be called by cron job)
   * @returns {Promise<Object>} Processing result
   */
  async processPendingApprovalReminders() {
    const now = new Date();
    
    // Find all pending approval requests that need reminders
    const pendingApprovals = await prisma.approvalRequest.findMany({
      where: {
        status: 'pending',
        expectedDate: { lte: now },
      },
    });
    
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
    };
    
    for (const approval of pendingApprovals) {
      results.processed++;
      
      // Check if reminder was sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sentToday = await prisma.approvalReminder.findFirst({
        where: {
          approvalRequestId: approval.id,
          sentAt: { gte: today },
        },
      });
      
      if (!sentToday) {
        // Determine reminder type
        const isPastExpected = new Date(approval.expectedDate) < now;
        const reminderType = isPastExpected ? 'escalation' : 'scheduled';
        
        // Send reminder
        const result = await this.sendApprovalReminder(approval, reminderType);
        
        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
        }
      }
    }
    
    return results;
  }
  
  /**
   * Send material shortage alert
   * @param {Object} materialShortage - Shortage details
   * @returns {Promise<Object>} Send result
   */
  async sendMaterialShortageAlert(materialShortage) {
    const { materialId, materialName, requiredQty, availableQty, stationName, projectName, date } = materialShortage;
    
    const procurementEmail = process.env.PROCUREMENT_EMAIL || 'procurement@pramara.com';
    
    const subject = `⚠️ Material Shortage Alert: ${materialName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Material Shortage Alert</h2>
        
        <div style="background: #fef2f2; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0;">
          <p><strong>Material:</strong> ${materialName}</p>
          <p><strong>Required:</strong> ${requiredQty}</p>
          <p><strong>Available:</strong> ${availableQty}</p>
          <p><strong>Shortage:</strong> <span style="color: #dc2626; font-weight: bold;">${requiredQty - availableQty}</span></p>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Station:</strong> ${stationName}</p>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Scheduled Date:</strong> ${new Date(date).toLocaleDateString()}</p>
        </div>
        
        <p>Immediate action required to prevent production delays.</p>
      </div>
    `;
    
    try {
      await emailService.send({
        to: procurementEmail,
        subject,
        html,
      });
      
      return { success: true, channel: 'email' };
    } catch (error) {
      console.error('Failed to send material shortage alert:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new NotificationService();

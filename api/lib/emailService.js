// api/lib/emailService.js
const crypto = require('crypto');
const { Resend } = require('resend');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Email Service with Training Mode Support
 * 
 * Features:
 * - System-wide email enable/disable
 * - Per-user email permissions
 * - Training mode (dummy emails)
 * - Full email logging
 */
class EmailService {
  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@pramara.com';
    this.defaultReplyTo = process.env.EMAIL_REPLY_TO || 'support@pramara.com';
  }

  /**
   * Check if email sending is allowed
   */
  async checkPermissions(userId = null) {
    // Get system-wide settings
    const emailEnabled = await this.getSystemSetting('emailOutboundEnabled', false);
    const trainingMode = await this.getSystemSetting('emailTrainingMode', true);

    // If no userId provided, this is a system email (invitation, password reset, etc.)
    // System emails should only respect training mode, not outbound enabled setting
    if (!userId) {
      return {
        allowed: true,
        reason: 'system_email',
        trainingMode
      };
    }

    // Check user permissions if userId provided
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          emailOutboundEnabled: true,
          emailOverrideSystem: true,
          emailTrainingMode: true
        }
      });

      if (!user) {
        return {
          allowed: false,
          reason: 'user_not_found',
          trainingMode
        };
      }

      // User-level training mode overrides everything
      if (user.emailTrainingMode) {
        return {
          allowed: true,
          reason: 'user_training_mode',
          trainingMode: true // Always dummy for this user
        };
      }

      // User can override system disable
      if (user.emailOverrideSystem && user.emailOutboundEnabled) {
        return {
          allowed: true,
          reason: 'user_override',
          trainingMode: false // Real email even if system training mode
        };
      }

      // If system is enabled, allow all users (ignore individual user settings)
      if (emailEnabled) {
        return {
          allowed: true,
          reason: 'system_enabled',
          trainingMode
        };
      }

      // System disabled - check if user has permission to override
      if (!user.emailOutboundEnabled) {
        return {
          allowed: false,
          reason: 'user_disabled',
          trainingMode
        };
      }

      // Fallback: not allowed
      return {
        allowed: false,
        reason: 'system_disabled',
        trainingMode
      };
    }

    // No user specified, just check system
    return {
      allowed: emailEnabled || trainingMode,
      reason: emailEnabled ? 'system_enabled' : 'training_mode',
      trainingMode: !emailEnabled && trainingMode
    };
  }

  /**
   * Send an email
   */
  async send({
    to,
    subject,
    html,
    text = null,
    from = null,
    replyTo = null,
    cc = [],
    bcc = [],
    userId = null,
    notificationId = null,
    templateId = null,
    templateData = null
  }) {
    const emailFrom = from || this.defaultFrom;
    const emailReplyTo = replyTo || this.defaultReplyTo;

    // Ensure to is array
    const toArray = Array.isArray(to) ? to : [to];

    // Check permissions
    const permissions = await this.checkPermissions(userId);

    // Log email attempt
    const logData = {
      to: toArray.join(', '),  // Convert array to comma-separated string for database
      cc,
      bcc,
      from: emailFrom,
      replyTo: emailReplyTo,
      subject,
      htmlBody: html,
      textBody: text,
      templateId,
      templateData,
      userId,
      notificationId,
      provider: 'resend'
    };

    // If not allowed and not training mode, block completely
    if (!permissions.allowed && !permissions.trainingMode) {
      const emailLog = await prisma.emailLog.create({
        data: {
          ...logData,
          status: `blocked_${permissions.reason}`,
          error: `Email blocked: ${permissions.reason}`
        }
      });

      return {
        success: false,
        id: emailLog.id,
        error: `Email blocked: ${permissions.reason}`,
        trainingMode: false
      };
    }

    // Training mode: dummy send
    if (permissions.trainingMode) {
      const emailLog = await prisma.emailLog.create({
        data: {
          ...logData,
          status: 'dummy_training_mode',
          sentAt: new Date(),
          providerMsgId: `dummy_${Date.now()}`
        }
      });

      console.log(`[EMAIL] Training mode - Dummy email sent: ${subject} to ${toArray.join(', ')}`);

      return {
        success: true,
        id: emailLog.id,
        trainingMode: true,
        message: 'Dummy email sent (training mode)'
      };
    }

    // Real send via Resend
    try {
      if (!resend) {
        throw new Error('Resend not configured. Set RESEND_API_KEY in environment.');
      }
      
      const result = await resend.emails.send({
        from: emailFrom,
        to: toArray,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        html,
        text: text || undefined,
        reply_to: emailReplyTo
      });

      const emailLog = await prisma.emailLog.create({
        data: {
          ...logData,
          status: 'sent',
          sentAt: new Date(),
          providerMsgId: result.id
        }
      });

      console.log(`[EMAIL] Real email sent: ${subject} to ${toArray.join(', ')} (${result.id})`);

      return {
        success: true,
        id: emailLog.id,
        providerMsgId: result.id,
        trainingMode: false
      };
    } catch (error) {
      console.error('[EMAIL] Failed to send:', error);

      const emailLog = await prisma.emailLog.create({
        data: {
          ...logData,
          status: 'failed',
          error: error.message
        }
      });

      return {
        success: false,
        id: emailLog.id,
        error: error.message,
        trainingMode: false
      };
    }
  }

  /**
   * Send email using template
   */
  async sendTemplate({
    to,
    templateName,
    data,
    userId = null,
    notificationId = null
  }) {
    // Load template
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName }
    });

    if (!template || !template.isActive) {
      throw new Error(`Email template '${templateName}' not found or inactive`);
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let html = template.htmlBody;
    let text = template.textBody || null;

    // Add common variables
    const allData = {
      ...data,
      currentYear: new Date().getFullYear(),
      supportEmail: process.env.EMAIL_REPLY_TO || 'support@pramara.com',
      appUrl: process.env.APP_URL || 'http://localhost:5173'
    };

    // Simple variable replacement: {{variableName}}
    for (const [key, value] of Object.entries(allData)) {
      // Skip null/undefined values
      if (value === null || value === undefined) continue;
      
      // Convert value to string
      const stringValue = String(value);
      
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, stringValue);
      html = html.replace(placeholder, stringValue);
      if (text) {
        text = text.replace(placeholder, stringValue);
      }
    }
    
    // Handle array variables (for loops) - basic support
    // {{#each items}}...{{/each}} - simplified handlebars-like syntax
    const arrayPattern = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    html = html.replace(arrayPattern, (match, arrayName, template) => {
      const array = allData[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemHtml = template;
        if (typeof item === 'object') {
          // Replace {{this.property}}
          for (const [key, value] of Object.entries(item)) {
            itemHtml = itemHtml.replace(new RegExp(`{{this\\.${key}}}`, 'g'), String(value));
          }
        } else {
          // Replace {{this}} with item value
          itemHtml = itemHtml.replace(/{{this}}/g, String(item));
        }
        return itemHtml;
      }).join('');
    });
    
    // Handle conditionals - basic {{#if variable}}...{{/if}}
    const ifPattern = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    html = html.replace(ifPattern, (match, varName, content) => {
      return allData[varName] ? content : '';
    });

    return this.send({
      to,
      subject,
      html,
      text,
      userId,
      notificationId,
      templateId: template.id,
      templateData: data
    });
  }

  /**
   * Get system setting
   */
  async getSystemSetting(key, defaultValue = null) {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key }
      });
      return setting ? setting.value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Set system setting (Super Admin only)
   */
  async setSystemSetting(key, value, updatedBy = null) {
    return prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedBy },
      update: { value, updatedBy }
    });
  }
}

// Singleton instance
const emailService = new EmailService();

// Legacy functions for backward compatibility (now use emailService internally)
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendInvitationEmail({ email, inviteUrl, inviterName }) {
  const htmlContent = `
    <h2>Welcome to Pramara PMS!</h2>
    <p>You've been invited by ${inviterName || 'your administrator'}.</p>
    <p>Click the link below to set up your account:</p>
    <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    <p><small>This link will expire in 30 minutes.</small></p>
  `;
  
  return emailService.send({
    to: email,
    subject: 'You have been invited to Pramara PMS',
    html: htmlContent
  });
}

async function sendNewDeviceAlert({ email, deviceInfo, location, time }) {
  const htmlContent = `
    <h2>New Device Login Alert</h2>
    <p>A new device was used to access your account:</p>
    <ul>
      <li><strong>Device:</strong> ${deviceInfo}</li>
      <li><strong>Location:</strong> ${location || 'Unknown'}</li>
      <li><strong>Time:</strong> ${time}</li>
    </ul>
    <p>If this was not you, please contact your administrator immediately.</p>
  `;
  
  return emailService.send({
    to: email,
    subject: 'New Device Login Detected',
    html: htmlContent
  });
}

async function sendPermissionRequestNotification({ adminEmails, requesterName, requesterEmail, permissionCode, reason }) {
  const htmlContent = `
    <h2>New Permission Request</h2>
    <p>${requesterName} (${requesterEmail}) has requested:</p>
    <ul>
      <li><strong>Permission:</strong> ${permissionCode}</li>
      <li><strong>Reason:</strong> ${reason}</li>
    </ul>
    <p>Review this request in the admin dashboard.</p>
  `;
  
  return emailService.send({
    to: adminEmails,
    subject: 'Permission Request Pending',
    html: htmlContent
  });
}

async function sendPasswordResetEmail(email, userName, temporaryPassword) {
  const htmlContent = `
    <h2>Password Reset</h2>
    <p>Hello ${userName},</p>
    <p>Your password has been reset by an administrator.</p>
    <p><strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
      <strong>⚠️ IMPORTANT SECURITY NOTICE:</strong>
      <ul>
        <li>You MUST change this password when you first log in</li>
        <li>This reset was performed without MFA verification</li>
        <li>If you did not request this reset, contact your administrator immediately</li>
        <li>A security alert will be displayed for 7 days</li>
      </ul>
    </div>
    <p>For security reasons, please:</p>
    <ol>
      <li>Log in with the temporary password above</li>
      <li>Change your password immediately</li>
      <li>Enable MFA if not already enabled</li>
    </ol>
  `;
  
  return emailService.send({
    to: email,
    subject: 'Password Reset - Pramara PMS',
    html: htmlContent
  });
}

async function sendDailyAdminSummary({ adminEmail, summary }) {
  const dateStr = new Date().toLocaleDateString();
  const htmlContent = `
    <h2>Daily Admin Summary</h2>
    <p><strong>Date:</strong> ${dateStr}</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px; border: 1px solid #ddd;">Users Created:</td><td style="padding: 8px; border: 1px solid #ddd;">${summary.usersCreated || 0}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">Users Deleted:</td><td style="padding: 8px; border: 1px solid #ddd;">${summary.usersDeleted || 0}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">Roles Changed:</td><td style="padding: 8px; border: 1px solid #ddd;">${summary.rolesChanged || 0}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">Flagged Actions:</td><td style="padding: 8px; border: 1px solid #ddd;">${summary.flaggedActions || 0}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">Pending Approvals:</td><td style="padding: 8px; border: 1px solid #ddd;">${summary.pendingApprovals || 0}</td></tr>
    </table>
    <p>View full details in the admin dashboard.</p>
  `;
  
  return emailService.send({
    to: adminEmail,
    subject: `Daily Admin Summary - ${dateStr}`,
    html: htmlContent
  });
}

module.exports = {
  emailService,
  EmailService,
  generateInviteToken,
  sendInvitationEmail,
  sendNewDeviceAlert,
  sendPermissionRequestNotification,
  sendPasswordResetEmail,
  sendDailyAdminSummary
};

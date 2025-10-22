// api/lib/emailService.js
const crypto = require('crypto');

/**
 * Generate a secure random token for invitations
 * @returns {string} - Random token
 */
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send invitation email (stub - implement with actual email service)
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.inviteUrl - Full invitation URL
 * @param {string} params.inviterName - Name of person sending invite
 */
async function sendInvitationEmail({ email, inviteUrl, inviterName }) {
  // TODO: Implement actual email sending using nodemailer, SendGrid, etc.
  console.log(`
    ========================================
    INVITATION EMAIL (Mock)
    ========================================
    To: ${email}
    From: ${inviterName || 'Pramara PMS'}
    
    You've been invited to join Pramara PMS!
    
    Click the link below to set up your account:
    ${inviteUrl}
    
    This link will expire in 7 days.
    ========================================
  `);
  
  return { success: true, mockEmail: true };
}

/**
 * Send new device login alert
 */
async function sendNewDeviceAlert({ email, deviceInfo, location, time }) {
  console.log(`
    ========================================
    NEW DEVICE ALERT (Mock)
    ========================================
    To: ${email}
    
    A new device was used to access your account:
    
    Device: ${deviceInfo}
    Location: ${location || 'Unknown'}
    Time: ${time}
    
    If this wasn't you, please contact your administrator immediately.
    ========================================
  `);
  
  return { success: true, mockEmail: true };
}

/**
 * Send permission request notification to admins
 */
async function sendPermissionRequestNotification({ adminEmails, requesterName, requesterEmail, permissionCode, reason }) {
  console.log(`
    ========================================
    PERMISSION REQUEST (Mock)
    ========================================
    To: ${adminEmails.join(', ')}
    
    ${requesterName} (${requesterEmail}) has requested:
    Permission: ${permissionCode}
    Reason: ${reason}
    
    Review this request in the admin dashboard.
    ========================================
  `);
  
  return { success: true, mockEmail: true };
}

/**
 * Send daily admin summary
 */
async function sendDailyAdminSummary({ adminEmail, summary }) {
  console.log(`
    ========================================
    DAILY ADMIN SUMMARY (Mock)
    ========================================
    To: ${adminEmail}
    
    Date: ${new Date().toLocaleDateString()}
    
    Users Created: ${summary.usersCreated || 0}
    Users Deleted: ${summary.usersDeleted || 0}
    Roles Changed: ${summary.rolesChanged || 0}
    Flagged Actions: ${summary.flaggedActions || 0}
    Pending Approvals: ${summary.pendingApprovals || 0}
    
    View full details in the admin dashboard.
    ========================================
  `);
  
  return { success: true, mockEmail: true };
}

module.exports = {
  generateInviteToken,
  sendInvitationEmail,
  sendNewDeviceAlert,
  sendPermissionRequestNotification,
  sendDailyAdminSummary
};

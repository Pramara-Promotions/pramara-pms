// api/lib/emailService.js
const crypto = require('crypto');
const { Resend } = require('resend');

// Cached Resend client
let resendClient = null;

function isResendConfigured() {
  return !!(process.env.RESEND_API_KEY);
}

function getFrom() {
  const name = process.env.FROM_NAME || 'Pramara PMS';
  const email = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  return { name, email };
}

function getResendClient() {
  if (!isResendConfigured()) return null;
  if (resendClient) return resendClient;
  
  resendClient = new Resend(process.env.RESEND_API_KEY);
  console.log('[email] Resend client initialized');
  return resendClient;
}

async function verifyTransport() {
  if (!isResendConfigured()) {
    return { ok: false, reason: 'RESEND_API_KEY not configured' };
  }
  // Resend doesn't have a verify method, just check if client can be created
  try {
    const client = getResendClient();
    return client ? { ok: true } : { ok: false, reason: 'Failed to create Resend client' };
  } catch (e) {
    return { ok: false, reason: e?.message || 'Resend initialization failed' };
  }
}

async function sendEmail({ to, subject, html, text }) {
  const client = getResendClient();
  
  if (!client) {
    console.log('[email][mock] To:', to, 'Subject:', subject);
    return { success: true, mockEmail: true };
  }
  
  try {
    const from = getFrom();
    const { data, error } = await client.emails.send({
      from: `${from.name} <${from.email}>`,
      to,
      subject,
      html: html || text,
    });
    
    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[email] Sent via Resend:', data.id);
    return { success: true, id: data.id };
  } catch (e) {
    console.error('[email] Send failed:', e.message);
    return { success: false, error: e.message };
  }
}

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
  const subject = 'You are invited to Pramara PMS';
  const text = `You've been invited by ${inviterName || 'Admin'}. Open: ${inviteUrl} (valid 7 days).`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Pramara PMS!</h2>
      <p>You've been invited by <strong>${inviterName || 'Admin'}</strong> to join Pramara PMS.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <p style="margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This invitation link expires in 7 days.<br>
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send password reset email
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.temporaryPassword - Temporary password
 * @param {string} params.resetByName - Name of admin who reset password
 */
async function sendPasswordResetEmail({ email, temporaryPassword, resetByName }) {
  const subject = 'Your Password Has Been Reset - Pramara PMS';
  const text = `Your password has been reset by ${resetByName || 'an administrator'}. Temporary password: ${temporaryPassword}. You will be required to change this password on your next login.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset</h2>
      <p>Your password has been reset by <strong>${resetByName || 'an administrator'}</strong>.</p>
      <div style="background-color: #f3f4f6; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold;">Temporary Password:</p>
        <p style="margin: 10px 0; font-size: 18px; font-family: monospace; color: #ef4444;">
          ${temporaryPassword}
        </p>
      </div>
      <p><strong>Important:</strong> You will be required to change this password immediately upon your next login.</p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you did not request this password reset, please contact your administrator immediately.
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send MFA setup confirmation email
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.userName - User's name
 */
async function sendMfaEnabledEmail({ email, userName }) {
  const subject = 'Multi-Factor Authentication Enabled - Pramara PMS';
  const text = `Hi ${userName || 'there'}, MFA has been successfully enabled on your account. Your account is now more secure.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">✓ MFA Enabled Successfully</h2>
      <p>Hi <strong>${userName || 'there'}</strong>,</p>
      <p>Multi-Factor Authentication (MFA) has been successfully enabled on your Pramara PMS account.</p>
      <p>Your account is now protected with an additional layer of security. You'll need to enter a verification code from your authenticator app each time you log in.</p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Keep your backup codes in a safe place. If you lose access to your authenticator app, you can use these codes to log in.
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send MFA disabled alert email
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.userName - User's name
 * @param {boolean} params.selfService - Whether user disabled it themselves
 */
async function sendMfaDisabledEmail({ email, userName, selfService = true }) {
  const subject = 'Security Alert: MFA Disabled - Pramara PMS';
  const disabledBy = selfService ? 'You have' : 'An administrator has';
  const text = `Security Alert: ${disabledBy} disabled Multi-Factor Authentication on your Pramara PMS account. If this wasn't you, contact your administrator immediately.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
        <h2 style="color: #991b1b; margin: 0;">⚠️ Security Alert</h2>
      </div>
      <p><strong>${disabledBy}</strong> disabled Multi-Factor Authentication on your Pramara PMS account.</p>
      <p>Your account security has been reduced. We strongly recommend re-enabling MFA to keep your account secure.</p>
      <p style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px;">
        <strong>⚠️ Important:</strong> If you did not authorize this change, please contact your administrator immediately and change your password.
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send new device login alert
 */
async function sendNewDeviceAlert({ email, deviceInfo, location, time }) {
  const subject = 'New device sign-in detected';
  const text = `A new device accessed your account. Device: ${deviceInfo}. Location: ${location || 'Unknown'}. Time: ${time}.`;
  const html = `<p>A new device accessed your account.</p><ul><li><b>Device:</b> ${deviceInfo}</li><li><b>Location:</b> ${location || 'Unknown'}</li><li><b>Time:</b> ${time}</li></ul>`;
  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send permission request notification to admins
 */
async function sendPermissionRequestNotification({ adminEmails, requesterName, requesterEmail, permissionCode, reason }) {
  const to = Array.isArray(adminEmails) ? adminEmails.join(',') : String(adminEmails);
  const subject = `Permission request: ${permissionCode}`;
  const text = `${requesterName} (${requesterEmail}) requested ${permissionCode}. Reason: ${reason}`;
  const html = `<p><b>${requesterName}</b> (${requesterEmail}) requested permission <b>${permissionCode}</b>.</p><p>Reason: ${reason}</p>`;
  return sendEmail({ to, subject, text, html });
}

/**
 * Send daily admin summary
 */
async function sendDailyAdminSummary({ adminEmail, summary }) {
  const subject = 'Daily admin summary';
  const lines = [
    `Date: ${new Date().toLocaleDateString()}`,
    `Users Created: ${summary.usersCreated || 0}`,
    `Users Deleted: ${summary.usersDeleted || 0}`,
    `Roles Changed: ${summary.rolesChanged || 0}`,
    `Flagged Actions: ${summary.flaggedActions || 0}`,
    `Pending Approvals: ${summary.pendingApprovals || 0}`,
  ];
  const text = lines.join('\n');
  const html = `<pre>${lines.join('\n')}</pre>`;
  return sendEmail({ to: adminEmail, subject, text, html });
}

/**
 * Send MFA backup code email
 */
async function sendMfaBackupCodeEmail({ email, userName, code }) {
  const subject = 'Your MFA Backup Code - Pramara PMS';
  const text = `Hello ${userName},\n\nYour one-time backup code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please contact support immediately.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your MFA Backup Code</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>You requested a backup code for two-factor authentication.</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
        <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">Your backup code:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333; margin: 0;">${code}</p>
      </div>
      <p style="color: #d32f2f; font-weight: bold;">⚠️ This code expires in 10 minutes</p>
      <p style="color: #666; font-size: 14px;">
        If you didn't request this code, please contact support immediately at support@pramara.com
      </p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
}

module.exports = {
  generateInviteToken,
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendMfaEnabledEmail,
  sendMfaDisabledEmail,
  sendNewDeviceAlert,
  sendPermissionRequestNotification,
  sendDailyAdminSummary,
  sendMfaBackupCodeEmail,
  verifyTransport,
  sendEmail
};

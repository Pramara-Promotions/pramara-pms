// api/scripts/seed-email-templates.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const templates = [
  {
    name: 'user-invitation',
    subject: 'You\'ve been invited to Pramara PMS',
    category: 'auth',
    variables: ['inviterName', 'inviteUrl', 'expiryHours', 'supportEmail'],
    description: 'Email sent when a user is invited to join the system'
  },
  {
    name: 'password-reset',
    subject: 'Password Reset - Pramara PMS',
    category: 'auth',
    variables: ['userName', 'temporaryPassword', 'loginUrl', 'adminEmail', 'supportEmail'],
    description: 'Email sent when an admin resets a user\'s password'
  },
  {
    name: 'welcome',
    subject: 'Welcome to Pramara PMS! 🎉',
    category: 'auth',
    variables: ['userName', 'userEmail', 'userRole', 'department', 'accountCreatedDate', 'dashboardUrl', 'documentationUrl', 'supportEmail'],
    description: 'Welcome email sent after successful account setup'
  },
  {
    name: 'account-locked',
    subject: 'Account Locked - Security Alert',
    category: 'security',
    variables: ['userName', 'lockDate', 'lockTime', 'lockReason', 'lockDetails', 'adminName', 'adminEmail', 'supportEmail', 'incidentId'],
    description: 'Email sent when a user account is locked'
  },
  {
    name: 'new-device',
    subject: 'New Device Login Detected',
    category: 'security',
    variables: ['userName', 'deviceInfo', 'browser', 'operatingSystem', 'location', 'ipAddress', 'loginDateTime', 'deviceId', 'securityUrl', 'adminEmail'],
    description: 'Alert sent when a login occurs from a new device'
  },
  {
    name: 'security-alert',
    subject: 'Security Alert - Suspicious Activity Detected',
    category: 'security',
    variables: ['userName', 'alertType', 'severity', 'alertDateTime', 'alertDescription', 'detailedDescription', 'activities', 'securityUrl', 'auditLogUrl', 'securityEmail', 'adminEmail', 'incidentId'],
    description: 'Alert sent when suspicious activity is detected'
  },
  {
    name: 'password-changed',
    subject: 'Password Changed Successfully',
    category: 'security',
    variables: ['userName', 'changeDate', 'changeTime', 'changedBy', 'deviceInfo', 'location', 'ipAddress', 'resetPasswordUrl', 'securityUrl', 'adminEmail', 'changeId'],
    description: 'Confirmation email sent when password is changed'
  },
  {
    name: 'permission-granted',
    subject: 'Permission Request Approved',
    category: 'notification',
    variables: ['userName', 'permissionName', 'permissionCode', 'approverName', 'approverRole', 'approverEmail', 'grantedDate', 'expiryDate', 'isTemporary', 'permissionDescription', 'capabilities', 'approverNote', 'dashboardUrl', 'requestId'],
    description: 'Email sent when a permission request is approved'
  },
  {
    name: 'permission-request',
    subject: 'New Permission Request - Action Required',
    category: 'notification',
    variables: ['adminName', 'requesterName', 'requesterEmail', 'requesterRole', 'requesterDepartment', 'requestDate', 'permissionName', 'permissionCode', 'duration', 'requestType', 'requestReason', 'urgency', 'permissionDescription', 'capabilities', 'approveUrl', 'rejectUrl', 'reviewUrl', 'reviewDays', 'requestId'],
    description: 'Notification sent to admins when a user requests permissions'
  },
  {
    name: 'audit-flagged',
    subject: 'Audit Log Flagged - Review Required',
    category: 'compliance',
    variables: ['adminName', 'userName', 'userEmail', 'action', 'entityType', 'entityName', 'actionDateTime', 'severity', 'flagReason', 'actionDescription', 'changes', 'deviceInfo', 'ipAddress', 'location', 'sessionId', 'riskFactors', 'auditLogUrl', 'reviewUrl', 'escalateUrl', 'recentActionCount', 'recentDays', 'flaggedCount', 'auditLogId', 'flagId'],
    description: 'Alert sent to admins when an audit log is flagged for review'
  },
  {
    name: 'mfa-setup',
    subject: 'Set Up Multi-Factor Authentication (MFA)',
    category: 'security',
    variables: ['userName', 'qrCodeUrl', 'manualKey', 'backupCodes', 'setupUrl', 'adminEmail'],
    description: 'Email sent with MFA setup instructions and QR code'
  },
  {
    name: 'mfa-enabled',
    subject: 'MFA Enabled Successfully!',
    category: 'security',
    variables: ['userName', 'enabledDate', 'deviceInfo', 'location', 'backupCodeCount', 'securityUrl', 'backupCodesUrl', 'adminEmail'],
    description: 'Confirmation email sent when MFA is enabled'
  },
  {
    name: 'mfa-disabled',
    subject: 'MFA Disabled - Security Alert',
    category: 'security',
    variables: ['userName', 'disabledDate', 'disabledBy', 'deviceInfo', 'location', 'reason', 'wasAdminAction', 'adminName', 'adminEmail', 'resetPasswordUrl', 'reenableMfaUrl', 'securityUrl', 'changeId'],
    description: 'Alert sent when MFA is disabled on an account'
  }
];

async function seedTemplates() {
  console.log('🌱 Seeding email templates...\n');

  const templatesDir = path.join(__dirname, '../templates/emails');
  const layoutPath = path.join(templatesDir, '_layout.html');
  
  // Read the layout template
  const layout = fs.readFileSync(layoutPath, 'utf-8');

  for (const template of templates) {
    try {
      // Read the template file
      const templatePath = path.join(templatesDir, `${template.name}.html`);
      
      if (!fs.existsSync(templatePath)) {
        console.log(`⚠️  Template file not found: ${template.name}.html - Skipping`);
        continue;
      }

      const content = fs.readFileSync(templatePath, 'utf-8');
      
      // Wrap content in layout
      const htmlBody = layout.replace('{{content}}', content);
      
      // Create or update template in database
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name }
      });

      if (existing) {
        await prisma.emailTemplate.update({
          where: { name: template.name },
          data: {
            subject: template.subject,
            htmlBody,
            textBody: null, // Generate from HTML if needed
            variables: template.variables,
            category: template.category,
            isActive: true
          }
        });
        console.log(`✅ Updated: ${template.name}`);
      } else {
        await prisma.emailTemplate.create({
          data: {
            name: template.name,
            subject: template.subject,
            htmlBody,
            textBody: null,
            variables: template.variables,
            category: template.category,
            isActive: true
          }
        });
        console.log(`✅ Created: ${template.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${template.name}:`, error.message);
    }
  }

  console.log('\n🎉 Email templates seeded successfully!');
  console.log(`📧 Total templates: ${templates.length}`);
}

async function main() {
  try {
    await seedTemplates();
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedTemplates };

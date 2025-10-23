// api/scripts/initEmailSystem.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initEmailSystem() {
  console.log('Initializing email system settings and templates...');

  try {
    // 1. Initialize system settings (training mode by default)
    await prisma.systemSetting.upsert({
      where: { key: 'emailOutboundEnabled' },
      create: { 
        key: 'emailOutboundEnabled', 
        value: false
      },
      update: {}
    });

    await prisma.systemSetting.upsert({
      where: { key: 'emailTrainingMode' },
      create: { 
        key: 'emailTrainingMode', 
        value: true
      },
      update: {}
    });

    await prisma.systemSetting.upsert({
      where: { key: 'emailInboundEnabled' },
      create: { 
        key: 'emailInboundEnabled', 
        value: false
      },
      update: {}
    });

    console.log('✅ System settings initialized');

    // 2. Create email templates
    const templates = [
      {
        name: 'user-invitation',
        subject: 'You\'ve been invited to Pramara PMS',
        category: 'onboarding',
        variables: ['userName', 'inviterName', 'inviteUrl', 'expiresAt'],
        htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .welcome { background: #dbeafe; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #2563eb; }
    .info { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .expiry { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Pramara PMS!</h1>
    </div>
    <div class="content">
      <div class="welcome">
        <p><strong>Hello {{userName}},</strong></p>
        <p>You've been invited by <strong>{{inviterName}}</strong> to join Pramara Project Management System.</p>
      </div>

      <div class="info">
        <h3>🚀 Get Started</h3>
        <p>Click the button below to set up your account and create your password:</p>
        <div style="text-align: center;">
          <a href="{{inviteUrl}}" class="button">Accept Invitation & Set Up Account</a>
        </div>
        <p style="text-align: center; color: #6b7280; font-size: 14px;">
          Or copy this link:<br>
          <code style="background: #e5e7eb; padding: 5px 10px; border-radius: 4px; word-break: break-all;">{{inviteUrl}}</code>
        </p>
      </div>

      <div class="info">
        <h3>📋 What happens next?</h3>
        <ol>
          <li>Click the invitation link</li>
          <li>Create a secure password</li>
          <li>Set up Multi-Factor Authentication (MFA) for extra security</li>
          <li>Start using Pramara PMS!</li>
        </ol>
      </div>

      <p class="expiry">⏰ This invitation expires on {{expiresAt}}</p>
      <p style="font-size: 14px; color: #6b7280;">After this date, you'll need to request a new invitation from your administrator.</p>
    </div>
    <div class="footer">
      <p>This is an automated invitation from Pramara PMS<br>
      If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
        textBody: `Welcome to Pramara PMS!

Hello {{userName}},

You've been invited by {{inviterName}} to join Pramara Project Management System.

🚀 Get Started

Click the link below to set up your account and create your password:
{{inviteUrl}}

📋 What happens next?

1. Click the invitation link
2. Create a secure password
3. Set up Multi-Factor Authentication (MFA) for extra security
4. Start using Pramara PMS!

⏰ This invitation expires on {{expiresAt}}

After this date, you'll need to request a new invitation from your administrator.

---
This is an automated invitation from Pramara PMS
If you didn't expect this invitation, you can safely ignore this email.`
      },
      {
        name: 'mfa-setup',
        subject: 'Multi-Factor Authentication Setup - Pramara PMS',
        category: 'security',
        variables: ['userName', 'qrCode', 'secretKey', 'appUrl'],
        htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .qr-code { text-align: center; margin: 20px 0; }
    .secret-key { background: #fff; padding: 15px; border: 2px dashed #3b82f6; margin: 15px 0; text-align: center; font-family: monospace; font-size: 18px; }
    .steps { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
    .warning { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 MFA Setup Required</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <p>Your account has been configured to use Multi-Factor Authentication (MFA) for enhanced security.</p>
      
      <div class="steps">
        <h3>Setup Instructions:</h3>
        <ol>
          <li>Install an authenticator app (Google Authenticator, Authy, or Microsoft Authenticator)</li>
          <li>Scan the QR code below</li>
          <li>Enter the 6-digit code from your app to verify</li>
        </ol>
      </div>

      <div class="qr-code">
        <img src="{{qrCode}}" alt="MFA QR Code" style="max-width: 250px;" />
      </div>

      <p style="text-align: center;"><strong>Can't scan the QR code?</strong></p>
      <div class="secret-key">
        {{secretKey}}
      </div>
      <p style="text-align: center; font-size: 14px; color: #6b7280;">Manually enter this key in your authenticator app</p>

      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>Keep this secret key secure and private</li>
          <li>You'll need your authenticator app to log in from now on</li>
          <li>Backup codes will be provided after verification</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="{{appUrl}}" class="button">Complete Setup Now</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from Pramara PMS<br>
      If you didn't request this, please contact your administrator immediately.</p>
    </div>
  </div>
</body>
</html>`,
        textBody: `Multi-Factor Authentication Setup

Hello {{userName}},

Your account has been configured to use Multi-Factor Authentication (MFA) for enhanced security.

Setup Instructions:
1. Install an authenticator app (Google Authenticator, Authy, or Microsoft Authenticator)
2. Scan the QR code or manually enter the secret key
3. Enter the 6-digit code from your app to verify

Secret Key: {{secretKey}}

Complete setup at: {{appUrl}}

⚠️ Important:
- Keep this secret key secure and private
- You'll need your authenticator app to log in from now on
- Backup codes will be provided after verification

If you didn't request this, please contact your administrator immediately.`
      },
      {
        name: 'mfa-enabled',
        subject: 'MFA Successfully Enabled - Pramara PMS',
        category: 'security',
        variables: ['userName', 'enabledAt', 'backupCodes'],
        htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .success { background: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
    .backup-codes { background: #fff; padding: 15px; border: 2px solid #10b981; margin: 15px 0; font-family: monospace; }
    .warning { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ MFA Enabled</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <div class="success">
        <strong>Success!</strong> Multi-Factor Authentication has been enabled on your account.
        <br>Enabled at: {{enabledAt}}
      </div>

      <h3>🔑 Backup Codes</h3>
      <p>Save these backup codes in a secure location. Each code can be used once if you lose access to your authenticator app:</p>
      <div class="backup-codes">
        {{backupCodes}}
      </div>

      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>Store these codes securely (print or save to password manager)</li>
          <li>Each code can only be used once</li>
          <li>You won't see these codes again</li>
        </ul>
      </div>

      <h3>What's Next?</h3>
      <p>From now on, you'll need:</p>
      <ol>
        <li>Your password</li>
        <li>A 6-digit code from your authenticator app</li>
      </ol>
    </div>
    <div class="footer">
      <p>This is an automated security notification from Pramara PMS</p>
    </div>
  </div>
</body>
</html>`,
        textBody: `MFA Successfully Enabled

Hello {{userName}},

Success! Multi-Factor Authentication has been enabled on your account.
Enabled at: {{enabledAt}}

🔑 Backup Codes

Save these backup codes in a secure location. Each code can be used once if you lose access to your authenticator app:

{{backupCodes}}

⚠️ Important:
- Store these codes securely (print or save to password manager)
- Each code can only be used once
- You won't see these codes again

What's Next?

From now on, you'll need:
1. Your password
2. A 6-digit code from your authenticator app

This is an automated security notification from Pramara PMS`
      },
      {
        name: 'mfa-disabled',
        subject: 'Security Alert: MFA Disabled - Pramara PMS',
        category: 'security',
        variables: ['userName', 'disabledAt', 'disabledBy'],
        htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .alert { background: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Security Alert</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <div class="alert">
        <strong>Multi-Factor Authentication has been disabled on your account.</strong>
        <br><br>
        Disabled at: {{disabledAt}}<br>
        Disabled by: {{disabledBy}}
      </div>

      <p>Your account is now less secure. We strongly recommend:</p>
      <ol>
        <li>Re-enabling MFA as soon as possible</li>
        <li>Using a strong, unique password</li>
        <li>Monitoring your account for suspicious activity</li>
      </ol>

      <p><strong>If you didn't request this change:</strong></p>
      <ul>
        <li>Contact your administrator immediately</li>
        <li>Change your password</li>
        <li>Review recent account activity</li>
      </ul>
    </div>
    <div class="footer">
      <p>This is an automated security notification from Pramara PMS</p>
    </div>
  </div>
</body>
</html>`,
        textBody: `Security Alert: MFA Disabled

Hello {{userName}},

Multi-Factor Authentication has been disabled on your account.

Disabled at: {{disabledAt}}
Disabled by: {{disabledBy}}

Your account is now less secure. We strongly recommend:
1. Re-enabling MFA as soon as possible
2. Using a strong, unique password
3. Monitoring your account for suspicious activity

If you didn't request this change:
- Contact your administrator immediately
- Change your password
- Review recent account activity

This is an automated security notification from Pramara PMS`
      }
    ];

    for (const template of templates) {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        create: template,
        update: template
      });
      console.log(`✅ Template '${template.name}' created/updated`);
    }

    console.log('\n✅ Email system initialization complete!');
    console.log('\n📧 Current settings:');
    console.log('  - emailOutboundEnabled: false (training mode)');
    console.log('  - emailTrainingMode: true (dummy emails will be logged)');
    console.log('  - emailInboundEnabled: false');
    console.log('\n💡 To enable real email sending:');
    console.log('  1. Set RESEND_API_KEY in .env');
    console.log('  2. Update emailOutboundEnabled to true via Super Admin');
    console.log('  3. Enable emailOutboundEnabled for specific users');

  } catch (error) {
    console.error('❌ Error initializing email system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initEmailSystem();

// Create password reset email templates
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTemplates() {
  try {
    await prisma.emailTemplate.createMany({
      data: [
        {
          code: 'password-reset-mfa',
          name: 'Password Reset (MFA Enabled)',
          subject: 'Reset Your Password - Pramara PMS',
          body: `Hi {{name}},

You requested to reset your password. Click the link below to continue:

{{resetUrl}}

This link expires in {{expiryMinutes}} minutes.

You will need your MFA code to complete the reset.

If you didn't request this, please ignore this email.

Best regards,
Pramara PMS Team`,
          isActive: true
        },
        {
          code: 'password-reset-no-mfa',
          name: 'Password Reset (No MFA)',
          subject: 'Password Reset Request - Pramara PMS',
          body: `Hi {{name}},

You requested to reset your password, but your account does not have MFA enabled.

For security reasons, self-service password reset is only available for accounts with MFA enabled.

Please contact your system administrator at {{supportEmail}} to reset your password.

Best regards,
Pramara PMS Team`,
          isActive: true
        }
      ],
      skipDuplicates: true
    });

    console.log('✅ Password reset email templates created successfully');
  } catch (error) {
    console.error('❌ Error creating templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTemplates();

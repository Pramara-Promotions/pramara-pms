// api/scripts/test-email-template.js
const { emailService } = require('../lib/emailService');

async function testTemplate() {
  const templateName = process.argv[2] || 'welcome';
  const testEmail = process.argv[3] || 'test@example.com';

  console.log(`\n📧 Testing email template: ${templateName}`);
  console.log(`📬 Sending to: ${testEmail}\n`);

  // Ensure training mode is ON for this test
  const originalTraining = await emailService.getSystemSetting('emailTrainingMode', true);
  await emailService.setSystemSetting('emailTrainingMode', true, 'test-email-template');

  try {
    // Sample data for each template type
    const sampleData = {
      // Common
      userName: 'John Doe',
      userEmail: testEmail,
      
      // User invitation
      inviterName: 'Jane Admin',
      inviteUrl: 'http://localhost:5173/accept-invite/abc123',
      expiryHours: '48',
      
      // Welcome
      userRole: 'Project Manager',
      department: 'Operations',
      accountCreatedDate: new Date().toLocaleDateString(),
      dashboardUrl: 'http://localhost:5173/dashboard',
      documentationUrl: 'http://localhost:5173/docs',
      
      // Password reset
      temporaryPassword: 'Temp123!@#',
      loginUrl: 'http://localhost:5173/login',
      adminEmail: 'admin@pramara.com',
      
      // Account locked
      lockDate: new Date().toLocaleDateString(),
      lockTime: new Date().toLocaleTimeString(),
      lockReason: 'Multiple failed login attempts',
      lockDetails: 'Your account was automatically locked after 5 consecutive failed login attempts within 10 minutes.',
      adminName: 'System Administrator',
      incidentId: 'INC-2025-001234',
      
      // New device
      deviceInfo: 'Desktop Computer',
      browser: 'Chrome 119.0',
      operatingSystem: 'Windows 11',
      location: 'Mumbai, India',
      ipAddress: '192.168.1.100',
      loginDateTime: new Date().toLocaleString(),
      deviceId: 'device_xyz789',
      securityUrl: 'http://localhost:5173/account/security',
      
      // Security alert
      alertType: 'Unusual Access Pattern',
      severity: 'HIGH',
      alertDateTime: new Date().toLocaleString(),
      alertDescription: 'Multiple login attempts from different locations',
      detailedDescription: 'We detected login attempts from 3 different countries within a 1-hour period, which is unusual for your account.',
      activities: [
        'Login from Mumbai, India at 10:00 AM',
        'Login from New York, USA at 10:15 AM',
        'Login from London, UK at 10:30 AM'
      ],
      auditLogUrl: 'http://localhost:5173/admin/audit-logs',
      securityEmail: 'security@pramara.com',
      
      // Password changed
      changeDate: new Date().toLocaleDateString(),
      changeTime: new Date().toLocaleTimeString(),
      changedBy: 'Self (John Doe)',
      resetPasswordUrl: 'http://localhost:5173/reset-password',
      changeId: 'CHG-2025-567890',
      
      // Permission granted
      permissionName: 'Document Management',
      permissionCode: 'DOC_EDIT',
      approverName: 'Jane Admin',
      approverRole: 'Super Admin',
      approverEmail: 'jane@pramara.com',
      grantedDate: new Date().toLocaleDateString(),
      expiryDate: 'No expiration',
      isTemporary: false,
      permissionDescription: 'This permission allows you to create, edit, and delete project documents.',
      capabilities: [
        'Upload new documents',
        'Edit existing documents',
        'Delete documents',
        'Manage document versions'
      ],
      approverNote: 'Approved for document management training program.',
      requestId: 'REQ-2025-123',
      
      // Permission request
      adminName: 'System Administrator',
      requesterName: 'John Doe',
      requesterEmail: testEmail,
      requesterRole: 'Operator',
      requesterDepartment: 'Production',
      requestDate: new Date().toLocaleDateString(),
      duration: 'Permanent',
      requestType: 'Role Upgrade',
      requestReason: 'I need this permission to manage documents for the new project I\'m leading.',
      urgency: false,
      approveUrl: 'http://localhost:5173/admin/permissions/approve/123',
      rejectUrl: 'http://localhost:5173/admin/permissions/reject/123',
      reviewUrl: 'http://localhost:5173/admin/permissions/review/123',
      reviewDays: '3',
      
      // Audit flagged
      action: 'BULK_DELETE',
      entityType: 'Project',
      entityName: 'ABC Toy Manufacturing',
      actionDescription: 'User attempted to delete 15 projects in a single action.',
      changes: [
        { field: 'status', oldValue: 'active', newValue: 'deleted' },
        { field: 'deletedAt', oldValue: null, newValue: new Date().toISOString() }
      ],
      sessionId: 'session_abc123',
      riskFactors: [
        'Unusual bulk operation',
        'No prior similar activity',
        'Outside normal working hours'
      ],
      reviewUrl: 'http://localhost:5173/admin/audit/review/456',
      escalateUrl: 'http://localhost:5173/admin/audit/escalate/456',
      recentActionCount: 45,
      recentDays: 7,
      flaggedCount: 3,
      auditLogId: 'AUDIT-2025-789',
      flagId: 'FLAG-2025-456',
      
      // MFA
      qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      manualKey: 'JBSWY3DPEHPK3PXP',
      backupCodes: [
        '1234-5678-90AB',
        '2345-6789-01BC',
        '3456-7890-12CD',
        '4567-8901-23DE',
        '5678-9012-34EF'
      ],
      setupUrl: 'http://localhost:5173/account/mfa/setup',
      enabledDate: new Date().toLocaleDateString(),
      backupCodeCount: 10,
      backupCodesUrl: 'http://localhost:5173/account/mfa/backup-codes',
      disabledDate: new Date().toLocaleDateString(),
      disabledBy: 'System Administrator',
      reason: 'User lost access to authenticator app',
      wasAdminAction: true,
      reenableMfaUrl: 'http://localhost:5173/account/mfa/enable'
    };

    const result = await emailService.sendTemplate({
      to: testEmail,
      templateName,
      data: sampleData
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📧 Email ID: ${result.id}`);
      if (result.trainingMode) {
        console.log('🎓 Training Mode: Email was NOT actually sent (dummy mode)');
      } else {
        console.log(`📬 Provider Message ID: ${result.providerMsgId}`);
      }
    } else {
      console.log('❌ Email failed to send');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Error testing template:', error.message);
    console.error(error.stack);
  } finally {
    // Restore original training mode if it was disabled before
    if (originalTraining === false) {
      await emailService.setSystemSetting('emailTrainingMode', false, 'test-email-template');
    }
  }
}

// Run
testTemplate().then(() => process.exit(0));

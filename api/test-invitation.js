// Quick test script to check if invitation email works
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function testInvitation() {
  console.log('\n=== TESTING INVITATION EMAIL ===\n');
  
  // Check environment
  console.log('1. Environment Check:');
  console.log('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ NOT SET');
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
  console.log('   APP_URL:', process.env.APP_URL || 'http://localhost:5173');
  
  // Load email service
  console.log('\n2. Loading Email Service...');
  const { emailService } = require('./lib/emailService');
  
  // Test data
  const testEmail = 'shubham.mishra@pramara.com'; // Use your actual email
  const inviteToken = 'test-token-' + Date.now();
  const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
  
  console.log('\n3. Sending Test Invitation Email to:', testEmail);
  console.log('   Invite URL:', inviteUrl);
  
  try {
    const result = await emailService.sendTemplate({
      to: testEmail,
      templateName: 'user-invitation',
      data: {
        userName: 'Test User',
        inviterName: 'System Test',
        inviteUrl: inviteUrl,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      userId: null
    });
    
    console.log('\n4. ✅ Email sent successfully!');
    console.log('   Result:', JSON.stringify(result, null, 2));
    
    // Check database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('\n5. Checking EmailLog database...');
    const log = await prisma.emailLog.findFirst({
      where: { to: testEmail },
      orderBy: { createdAt: 'desc' }
    });
    
    if (log) {
      console.log('   ✅ Email logged in database');
      console.log('   Status:', log.status);
      console.log('   Provider Message ID:', log.providerMsgId || 'N/A');
      console.log('   Sent At:', log.sentAt || 'Not sent yet');
    } else {
      console.log('   ❌ No email log found');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n4. ❌ ERROR sending email:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

testInvitation();

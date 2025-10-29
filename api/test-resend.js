// Test Resend configuration
require('dotenv').config({ path: '../.env' });
const { Resend } = require('resend');

async function testResend() {
  console.log('=== Resend Configuration Test ===\n');
  
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.FROM_NAME || 'Pramara PMS';
  
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
  console.log('From Email:', fromEmail);
  console.log('From Name:', fromName);
  console.log();
  
  if (!apiKey) {
    console.log('❌ RESEND_API_KEY is not set in .env');
    return;
  }
  
  console.log('✅ Resend is configured');
  console.log('📧 Emails will be sent from:', `${fromName} <${fromEmail}>`);
  
  if (fromEmail === 'onboarding@resend.dev') {
    console.log('\nℹ️  Using Resend\'s default domain - perfect for testing!');
    console.log('   No domain verification needed.');
  } else {
    console.log('\nℹ️  Using custom domain:', fromEmail);
    console.log('   Make sure this domain is verified in your Resend dashboard:');
    console.log('   https://resend.com/domains');
  }
  
  // Test the client
  try {
    const resend = new Resend(apiKey);
    console.log('\n✅ Resend client initialized successfully');
    
    console.log('\n📝 To send a test email, use the Admin panel:');
    console.log('   Admin → Email → Send Test Email');
    
  } catch (error) {
    console.error('\n❌ Error initializing Resend:', error.message);
  }
}

testResend();

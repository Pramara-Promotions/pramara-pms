// Direct Resend API test to see actual error
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { Resend } = require('resend');

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY;
  
  console.log('\n=== RESEND DIRECT TEST ===\n');
  console.log('1. API Key:', apiKey ? `${apiKey.substring(0, 15)}...` : 'NOT SET');
  console.log('2. Sender:', process.env.EMAIL_FROM);
  console.log('3. Recipient: shubham.mishra@pramara.com');
  
  if (!apiKey) {
    console.error('\n❌ RESEND_API_KEY not set!');
    return;
  }
  
  const resend = new Resend(apiKey);
  
  console.log('\n4. Sending test email...\n');
  
  try {
    const result = await resend.emails.send({
      from: 'Pramara PMS <onboarding@resend.dev>',  // Using Resend's default domain
      to: 'shubham.mishra@pramara.com',
      subject: 'Test Email from Pramara PMS',
      html: '<h1>Test Email</h1><p>This is a test email to verify Resend is working.</p>'
    });
    
    console.log('✅ SUCCESS! Email sent via Resend default domain');
    console.log('   Message ID:', result.id);
    console.log('   Full Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ FAILED with Resend default domain:');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n5. Now trying with custom domain (noreply@pramara.com)...\n');
  
  try {
    const result = await resend.emails.send({
      from: 'Pramara PMS <noreply@pramara.com>',  // Custom domain
      to: 'shubham.mishra@pramara.com',
      subject: 'Test Email from Pramara PMS',
      html: '<h1>Test Email</h1><p>This is a test email with custom domain.</p>'
    });
    
    console.log('✅ SUCCESS! Email sent via custom domain');
    console.log('   Message ID:', result.id);
    console.log('   Full Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ FAILED with custom domain (noreply@pramara.com):');
    console.error('   Error:', error.message);
    console.error('   Error Name:', error.name);
    
    if (error.statusCode) {
      console.error('   Status Code:', error.statusCode);
    }
    
    if (error.message.includes('domain')) {
      console.log('\n📋 SOLUTION:');
      console.log('   Your domain "pramara.com" is not verified in Resend.');
      console.log('   Options:');
      console.log('   1. Use Resend default: onboarding@resend.dev (for testing)');
      console.log('   2. Verify your domain in Resend dashboard:');
      console.log('      https://resend.com/domains');
    }
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

testResend();

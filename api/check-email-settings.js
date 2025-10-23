// Quick script to check email settings
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSettings() {
  try {
    console.log('\n=== EMAIL ENVIRONMENT VARIABLES ===');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? `Set (${process.env.RESEND_API_KEY.substring(0, 15)}...)` : 'NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
    console.log('EMAIL_REPLY_TO:', process.env.EMAIL_REPLY_TO);
    
    console.log('\n=== EMAIL SYSTEM SETTINGS (Database) ===');
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'email'
        }
      }
    });
    
    if (settings.length === 0) {
      console.log('⚠️  No email settings found in database!');
      console.log('   This means system defaults will be used (likely training mode ON)');
    } else {
      settings.forEach(s => {
        console.log(`${s.key}: ${s.value}`);
      });
    }
    
    console.log('\n=== EMAIL TEMPLATES ===');
    const templates = await prisma.emailTemplate.count();
    console.log(`Found ${templates} email templates`);
    
    if (templates === 0) {
      console.log('⚠️  No templates! Run: node scripts/initEmailSystem.js');
    }
    
    console.log('\n=== RECENT EMAIL LOGS ===');
    const logs = await prisma.emailLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        createdAt: true
      }
    });
    
    if (logs.length === 0) {
      console.log('No email logs yet');
    } else {
      logs.forEach(log => {
        console.log(`[${log.createdAt.toISOString()}] ${log.to} - "${log.subject}" - Status: ${log.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSettings();

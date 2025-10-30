// Create multiple test notifications
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMultipleNotifications() {
  try {
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ No users found');
      return;
    }

    const notifications = [
      {
        type: 'info',
        title: 'ℹ️ System Update',
        message: 'A new system update is available. Please review the changes.',
        priority: 'medium',
      },
      {
        type: 'warning',
        title: '⚠️ Low Stock Alert',
        message: 'Material XYZ-123 is running low. Current stock: 50 units.',
        priority: 'high',
      },
      {
        type: 'error',
        title: '❌ QC Failed',
        message: 'Batch B-12345 failed quality control. Immediate attention required.',
        priority: 'high',
      },
      {
        type: 'success',
        title: '✅ Production Complete',
        message: 'Batch B-67890 has been completed successfully. 1000 units produced.',
        priority: 'medium',
      },
    ];

    for (const notif of notifications) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          ...notif,
          read: false,
          dismissed: false,
        }
      });
    }

    console.log(`✅ Created ${notifications.length} test notifications!`);
    console.log('📬 Refresh your UI to see them');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createMultipleNotifications();

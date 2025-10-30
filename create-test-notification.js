// Create test notification directly in database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotification() {
  try {
    // Get first user
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }

    console.log('Creating notification for user:', user.email);

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'success',
        title: '🎉 Test Notification',
        message: 'This is a test notification! If you can see this, notifications are working perfectly.',
        read: false,
        dismissed: false,
        priority: 'high',
      }
    });

    console.log('\n✅ Test notification created successfully!');
    console.log('📬 Notification ID:', notification.id);
    console.log('💡 Refresh your UI to see the notification in the bell icon');
    console.log('\nNotification details:');
    console.log('  Type:', notification.type);
    console.log('  Title:', notification.title);
    console.log('  Message:', notification.message);
    console.log('  Priority:', notification.priority);

  } catch (error) {
    console.error('❌ Error creating test notification:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotification();

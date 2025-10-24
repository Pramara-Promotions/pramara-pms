const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sendTestNotifications() {
  try {
    // Get the first user
    const user = await prisma.user.findFirst({
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`\n📧 Sending test notifications to: ${user.name || user.email}`);
    console.log(`User ID: ${user.id}\n`);

    // Create 3 different types of test notifications
    const notifications = [
      {
        userId: user.id,
        type: 'PROJECT_UPDATE',
        title: '🎯 Project Milestone Reached',
        message: 'Congratulations! Your project "Summer Campaign 2025" has reached 75% completion.',
        priority: 'high',
        read: false,
        entityType: 'project',
        entityId: '21',
        entityName: 'Summer Campaign 2025',
        primaryAction: 'View Project',
        primaryActionUrl: '/projects/21',
        primaryActionType: 'navigate'
      },
      {
        userId: user.id,
        type: 'DOCUMENT_UPLOADED',
        title: '📄 New Document Available',
        message: 'A new contract document "Client Agreement v2.pdf" has been uploaded and requires your review.',
        priority: 'medium',
        read: false,
        entityType: 'document',
        entityName: 'Client Agreement v2.pdf',
        primaryAction: 'View Document',
        primaryActionUrl: '/documents',
        primaryActionType: 'navigate'
      },
      {
        userId: user.id,
        type: 'SYSTEM_NOTIFICATION',
        title: '🔔 System Update',
        message: 'The system will undergo maintenance tonight at 2:00 AM. Expected downtime: 30 minutes.',
        priority: 'low',
        read: false,
        entityType: 'system',
        impactLevel: 'Expected downtime: 30 minutes',
        primaryAction: 'Learn More',
        primaryActionUrl: '/settings',
        primaryActionType: 'navigate'
      }
    ];

    // Create notifications one by one
    for (let i = 0; i < notifications.length; i++) {
      const notif = await prisma.notification.create({
        data: notifications[i]
      });
      console.log(`✅ Created notification ${i + 1}:`, notif.title);
    }

    console.log(`\n🎉 Successfully created ${notifications.length} test notifications!`);
    console.log(`\n💡 Refresh your browser to see them in the notification bell.\n`);

    // Emit via Socket.IO if server is running
    if (global.io) {
      global.io.to(`user:${user.id}`).emit('notification', {
        message: 'You have new notifications'
      });
      console.log('📡 WebSocket notification sent\n');
    } else {
      console.log('ℹ️  WebSocket not available (server needs to be running for real-time updates)\n');
    }

  } catch (error) {
    console.error('❌ Error creating notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
sendTestNotifications();

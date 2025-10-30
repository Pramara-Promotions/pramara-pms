// Create rich test notifications with three-part structure
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRichNotifications() {
  try {
    // Get the first user
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.error('No users found. Please create a user first.');
      return;
    }

    console.log(`Creating rich notifications for user: ${user.email}`);

    // Delete old test notifications to avoid clutter
    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        type: { in: ['QC_FAILED', 'LOW_STOCK', 'CUTOFF_WARNING', 'APPROVAL_PENDING'] }
      }
    });

    // 1. QC Failed notification with full metadata
    const qcFailed = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'QC_FAILED',
        title: '❌ QC Failed',
        message: 'Batch B-12345 failed quality control. Immediate attention required.',
        priority: 'critical',
        read: false,
        dismissed: false,
        entityType: 'batch',
        entityId: 'B-12345',
        entityName: 'Batch B-12345',
        location: 'Station 3 - QC Area',
        primaryAction: 'View Batch',
        primaryActionUrl: '/execution/batches?batchId=B-12345',
        primaryActionType: 'navigate',
        impactDetails: JSON.stringify({
          blockedTasks: 3,
          affectedUsers: 5,
          hoursShortfall: 4
        }),
        secondaryActions: JSON.stringify([
          { label: '🔍 View Blocked Tasks', url: '/tasks?status=blocked&batchId=B-12345', type: 'navigate', isProblem: true },
          { label: '👥 See Affected Team', url: '/execution/stations?batchId=B-12345&showWorkers=true', type: 'navigate', isProblem: true },
          { label: '🔧 Rework Batch', url: '/execution/batches?batchId=B-12345&action=rework', type: 'navigate' },
          { label: '📋 Report Issue', url: '/qc/report?batchId=B-12345', type: 'navigate' }
        ])
      }
    });
    console.log('✅ Created QC Failed notification with 3 blocked tasks, 5 affected users');

    // 2. Low Stock Alert with metadata
    const lowStock = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'LOW_STOCK',
        title: '⚠️ Low Stock Alert',
        message: 'Material XYZ-123 is running low. Current stock: 50 units.',
        priority: 'high',
        read: false,
        dismissed: false,
        entityType: 'material',
        entityId: 'XYZ-123',
        entityName: 'Material XYZ-123',
        location: 'Warehouse A',
        primaryAction: 'View Material',
        primaryActionUrl: '/planning/materials?materialId=XYZ-123',
        primaryActionType: 'navigate',
        impactDetails: JSON.stringify({
          delayedStagesCount: 2,
          affectedUsers: 8,
          hoursShortfall: 6
        }),
        secondaryActions: JSON.stringify([
          { label: '🔍 View Delayed Stages', url: '/execution/workflow?status=delayed&materialId=XYZ-123', type: 'navigate', isProblem: true },
          { label: '👥 See Waiting Workers', url: '/planning/workforce?status=waiting&materialId=XYZ-123', type: 'navigate', isProblem: true },
          { label: '📦 Create Purchase Order', url: '/planning/materials?materialId=XYZ-123&action=order', type: 'navigate' },
          { label: '🔄 Check Alternatives', url: '/planning/materials?materialId=XYZ-123&alternatives=true', type: 'navigate' }
        ])
      }
    });
    console.log('✅ Created Low Stock notification with 2 delayed stages, 8 affected users');

    // 3. Cutoff Warning with metadata
    const cutoffWarning = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'CUTOFF_WARNING',
        title: '🚨 Project Approaching Cutoff',
        message: 'Project P-5678 needs 72h but only 48h remaining. 4 stages at risk.',
        priority: 'critical',
        read: false,
        dismissed: false,
        entityType: 'project',
        entityId: 'P-5678',
        entityName: 'Premium Widget Order',
        entityCode: 'P-5678',
        location: 'Factory Floor',
        primaryAction: 'View Project',
        primaryActionUrl: '/projects/5678',
        primaryActionType: 'navigate',
        impactDetails: JSON.stringify({
          hoursShortfall: 24,
          delayedStagesCount: 4,
          affectedUsers: 12
        }),
        secondaryActions: JSON.stringify([
          { label: '🔍 View At-Risk Stages', url: '/projects/5678/execution?filter=at-risk', type: 'navigate', isProblem: true },
          { label: '👥 See Blocked Team Members', url: '/planning/workforce?projectId=5678&status=blocked', type: 'navigate', isProblem: true },
          { label: '⏱️ View Timeline Gap', url: '/projects/5678?view=timeline&highlight=gap', type: 'navigate', isProblem: true },
          { label: '📅 Adjust Timeline', url: '/projects/5678/planning', type: 'navigate' },
          { label: '➕ Add Resources', url: '/planning/workforce?projectId=5678&action=add', type: 'navigate' }
        ])
      }
    });
    console.log('✅ Created Cutoff Warning with 24h shortfall, 4 delayed stages, 12 affected users');

    // 4. Normal notification without metadata (for comparison)
    const systemUpdate = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM_UPDATE',
        title: 'ℹ️ System Update',
        message: 'A new system update is available. Please review the changes.',
        priority: 'low',
        read: false,
        dismissed: false,
      }
    });
    console.log('✅ Created System Update notification (without metadata)');

    console.log('\n🎉 Successfully created 4 test notifications!');
    console.log('👉 Open the notification panel to see the three-part structure for critical notifications\n');

  } catch (error) {
    console.error('Error creating notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRichNotifications();

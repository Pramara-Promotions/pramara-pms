// Quick test of the board-config endpoint
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBoardEndpoint() {
    console.log('🧪 Testing Board Config Endpoint Logic...\n');

    // Test with project 1 (Pramara PMS Demo)
    const projectId = 1;

    console.log(`[1] Checking if project ${projectId} exists...`);
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        console.log('❌ Project not found');
        await prisma.$disconnect();
        return;
    }
    console.log('✅ Project found:', project.name);

    console.log(`\n[2] Fetching BoardColumns for project ${projectId}...`);
    let columns = await prisma.boardColumn.findMany({
        where: { projectId },
        orderBy: { position: 'asc' }
    });

    console.log(`Found ${columns.length} columns`);

    if (columns.length === 0) {
        console.log('\n[3] Creating default columns...');
        const now = new Date();
        const defaultColumns = [
            { projectId, name: 'Pre Production', section: 'Pre_Prod', position: 0, wipLimit: 10, color: '#0ea5e9', isDefault: true, updatedAt: now },
            { projectId, name: 'Production', section: 'Production', position: 1, wipLimit: 15, color: '#10b981', isDefault: true, updatedAt: now },
            { projectId, name: 'Quality Check', section: 'QC', position: 2, wipLimit: 10, color: '#f59e0b', isDefault: true, updatedAt: now },
            { projectId, name: 'Dispatch', section: 'Dispatch', position: 3, wipLimit: 10, color: '#8b5cf6', isDefault: true, updatedAt: now }
        ]; try {
            await prisma.boardColumn.createMany({
                data: defaultColumns
            });
            console.log('✅ Default columns created');

            columns = await prisma.boardColumn.findMany({
                where: { projectId },
                orderBy: { position: 'asc' }
            });
        } catch (err) {
            console.error('❌ Error creating columns:', err.message);
            console.error('Full error:', err);
            await prisma.$disconnect();
            return;
        }
    }

    console.log(`\n[4] Adding task counts to columns...`);
    const columnsWithCount = await Promise.all(
        columns.map(async (col) => {
            const taskCount = await prisma.task.count({
                where: {
                    projectId,
                    section: col.section
                }
            });
            return {
                ...col,
                taskCount
            };
        })
    );

    console.log('✅ Final result:');
    console.log(JSON.stringify(columnsWithCount, null, 2));

    await prisma.$disconnect();
    console.log('\n✅ Test completed successfully');
}

testBoardEndpoint().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});

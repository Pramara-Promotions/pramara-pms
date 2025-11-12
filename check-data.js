const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const prodCount = await prisma.productionEntry.count();
        const qcCount = await prisma.qCSubmission.count();
        const shiftCount = await prisma.shiftEntry.count();
        const projectCount = await prisma.project.count();

        console.log('Database Counts:');
        console.log('- Production Entries:', prodCount);
        console.log('- QC Submissions:', qcCount);
        console.log('- Shift Entries:', shiftCount);
        console.log('- Projects:', projectCount);

        if (prodCount === 0 && qcCount === 0 && shiftCount === 0) {
            console.log('\n⚠️  NO DATA - Dashboard will be empty!');
            console.log('The analytics section requires production/QC/shift data to display charts.');
        } else {
            console.log('\n✅ Data exists - Dashboard should show charts');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.user.count();
        console.log('User count:', count);
        if (count > 0) {
            const users = await prisma.user.findMany({ take: 5 });
            console.log('Sample users:', users);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

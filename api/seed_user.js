const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    const email = 'admin@pramara.local';
    const roleName = 'ADMIN';
    const targetId = 'cmhbrbzgq006oawxyjyh0ge9h';

    // 1. Ensure Role exists
    let role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
        console.log('Creating ADMIN role...');
        role = await prisma.role.create({
            data: {
                name: roleName,
                description: 'Administrator with full access',
                status: 'ACTIVE'
            }
        });
    }

    // 2. Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        if (existing.id === targetId) {
            console.log('User already exists with correct ID.');
            // Ensure user has the role
            const userRole = await prisma.userRole.findFirst({
                where: { userId: targetId, roleId: role.id }
            });
            if (!userRole) {
                console.log('Assigning ADMIN role...');
                await prisma.userRole.create({
                    data: { userId: targetId, roleId: role.id }
                });
            }
            return;
        } else {
            console.log('User exists but with wrong ID. Deleting...');
            // Delete user roles first if cascade isn't set
            await prisma.userRole.deleteMany({ where: { userId: existing.id } });
            await prisma.user.delete({ where: { id: existing.id } });
        }
    }

    console.log('Creating new admin user with target ID...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const user = await prisma.user.create({
        data: {
            id: targetId,
            email,
            passwordHash: hashedPassword,
            name: 'Admin User',
            firstName: 'Admin',
            lastName: 'User',
            status: 'ACTIVE',
            isActive: true,
            roles: {
                create: {
                    roleId: role.id
                }
            }
        }
    });
    console.log('Created user:', user.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

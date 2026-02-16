#!/usr/bin/env node

/**
 * Initialize development system:
 * 1. Create dev user if needed
 * 2. Create sample data (optional)
 * 3. Output login instructions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initDevSystem() {
    try {
        console.log('🚀 Initializing dev system...\n');

        // 1. Check or create dev user
        console.log('1️⃣  Setting up dev user...');
        let user = await prisma.user.findUnique({
            where: { email: 'admin@pramara.local' }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: 'admin@pramara.local',
                    name: 'Admin User',
                    passwordHash: 'dev-hash-not-used',
                    status: 'ACTIVE',
                    isActive: true,
                }
            });
            console.log('   ✅ Created dev user:', user.email);
        } else {
            console.log('   ✅ Dev user exists:', user.email);
        }

        // 2. Create admin role if not exists
        console.log('\n2️⃣  Setting up admin role...');
        let adminRole = await prisma.role.findFirst({
            where: { name: 'Admin' }
        });

        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {
                    name: 'Admin',
                    description: 'System Administrator',
                    status: 'ACTIVE'
                }
            });
            console.log('   ✅ Created admin role:', adminRole.name);
        } else {
            console.log('   ✅ Admin role exists:', adminRole.name);
        }

        // 3. Assign admin role to dev user if not assigned
        console.log('\n3️⃣  Assigning admin role to dev user...');
        const assignment = await prisma.userRole.findFirst({
            where: {
                userId: user.id,
                roleId: adminRole.id
            }
        });

        if (!assignment) {
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: adminRole.id
                }
            });
            console.log('   ✅ Admin role assigned to dev user');
        } else {
            console.log('   ✅ Admin role already assigned');
        }

        // 4. Output instructions
        console.log('\n' + '='.repeat(60));
        console.log('✅ System initialized successfully!');
        console.log('='.repeat(60));
        console.log('\n📋 Login Instructions:');
        console.log('   Email:    admin@pramara.local');
        console.log('   Password: ChangeMe@123');
        console.log('\n🌐 Access the application at:');
        console.log('   http://localhost:5173');
        console.log('\n📊 API is available at:');
        console.log('   http://localhost:4000');
        console.log('\n💡 Dev token will be set automatically on login.\n');

    } catch (error) {
        console.error('❌ Error initializing system:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

initDevSystem();

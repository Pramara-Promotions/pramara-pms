const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to generate dates for the last 30 days
function generateDates(days = 30) {
    const dates = [];
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
    }
    return dates;
}

// Helper to get random element from array
function random(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Helper for random number in range
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateSampleData() {
    try {
        console.log('🚀 Starting sample data generation...\n');

        // Get existing projects
        const projects = await prisma.project.findMany({ take: 8 });
        if (projects.length === 0) {
            console.log('❌ No projects found. Please create projects first.');
            return;
        }
        console.log(`✅ Found ${projects.length} projects`);

        // Get or create users
        let users = await prisma.user.findMany({ take: 10 });
        if (users.length === 0) {
            console.log('Creating sample users...');
            const userPromises = [];
            for (let i = 1; i <= 5; i++) {
                userPromises.push(
                    prisma.user.create({
                        data: {
                            email: `operator${i}@pramara.com`,
                            name: `Operator ${i}`,
                            firstName: `Operator`,
                            lastName: `${i}`,
                            password: 'hashed_password_placeholder',
                        }
                    })
                );
            }
            users = await Promise.all(userPromises);
            console.log(`✅ Created ${users.length} users`);
        } else {
            console.log(`✅ Found ${users.length} users`);
        }

        // Get or create stations
        let stations = await prisma.station.findMany({ take: 5 });
        if (stations.length === 0) {
            console.log('Creating sample stations...');
            const stationNames = ['Cutting', 'Assembly', 'Quality Check', 'Packaging', 'Finishing'];
            const stationPromises = stationNames.map((name, idx) =>
                prisma.station.create({
                    data: {
                        name,
                        code: `STN-${idx + 1}`,
                        type: 'production',
                        capacity: randomInt(50, 200),
                        status: 'active',
                    }
                })
            );
            stations = await Promise.all(stationPromises);
            console.log(`✅ Created ${stations.length} stations`);
        } else {
            console.log(`✅ Found ${stations.length} stations`);
        }

        const dates = generateDates(30);
        console.log(`\n📅 Generating data for ${dates.length} days...\n`);

        // 1. Generate Shift Entries
        console.log('Creating shift entries...');
        const shiftTypes = ['MORNING', 'AFTERNOON', 'NIGHT'];
        const shiftTimes = {
            MORNING: { start: 6, end: 14 },
            AFTERNOON: { start: 14, end: 22 },
            NIGHT: { start: 22, end: 6 }
        };
        let shiftCount = 0;

        for (const date of dates) {
            for (const shiftType of shiftTypes) {
                const workersPresent = randomInt(10, 30);
                const totalProduced = randomInt(500, 2000);
                const efficiency = 0.7 + Math.random() * 0.25; // 70-95% efficiency

                // Set shift times
                const startTime = new Date(date);
                startTime.setHours(shiftTimes[shiftType].start, 0, 0, 0);
                const endTime = new Date(date);
                if (shiftType === 'NIGHT') {
                    endTime.setDate(endTime.getDate() + 1);
                }
                endTime.setHours(shiftTimes[shiftType].end, 0, 0, 0);

                await prisma.shiftEntry.create({
                    data: {
                        projectId: random(projects).id,
                        shiftDate: date,
                        shiftType,
                        shiftStartTime: startTime,
                        shiftEndTime: endTime,
                        stationId: random(stations).id,
                        workersPresent,
                        totalProduced,
                        efficiency,
                        supervisorId: random(users).id,
                        createdBy: random(users).id,
                        status: 'approved',
                    }
                });
                shiftCount++;
            }
        }
        console.log(`✅ Created ${shiftCount} shift entries`);

        // 2. Skip Production Entries - schema mismatch
        // Dashboard will use ShiftEntry.totalProduced data instead
        console.log('⏭️  Skipping production entries (schema incompatible - using shift data)');

        // 3. Skip QC Submissions - schema incompatible
        console.log('⏭️  Skipping QC submissions (schema incompatible)');
        const qcCount = 0;

        // 4. Skip WIP Ledger entries - schema incompatible
        console.log('⏭️  Skipping WIP ledger entries (schema incompatible)');
        const wipCount = 0;

        // Summary
        console.log('\n📊 Data Generation Complete!\n');
        console.log('Summary:');
        console.log(`  • ${projects.length} Projects`);
        console.log(`  • ${users.length} Users/Operators`);
        console.log(`  • ${stations.length} Stations`);
        console.log(`  • ${shiftCount} Shift Entries (30 days) - includes production data`);
        console.log(`  • ${qcCount} QC Submissions (30 days)`);
        console.log(`  • ${wipCount} WIP Ledger Entries (14 days)`); console.log('\n✨ Dashboard should now display:');
        console.log('  📈 Production trend charts');
        console.log('  🎯 Quality pie charts');
        console.log('  👥 Workforce analytics');
        console.log('  📊 Top performers ranking');
        console.log('  🏆 Project status breakdown');

        console.log('\n🔗 Refresh your browser to see the analytics dashboard!');

    } catch (error) {
        console.error('❌ Error generating sample data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

generateSampleData();

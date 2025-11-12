const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper functions
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateDates(days = 30) {
    const dates = [];
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
    }
    return dates;
}

async function setupProductionTest() {
    try {
        console.log('🏭 PRODUCTION TEST SETUP - Full Factory Simulation\n');
        console.log('================================================\n');

        // ========================================
        // 0. CLEAN EXISTING DATA
        // ========================================
        console.log('🧹 Cleaning Existing Test Data...\n');

        await prisma.station.deleteMany({});
        console.log('✅ Deleted existing stations\n');

        // ========================================
        // 1. CREATE FACTORY LAYOUT
        // ========================================
        console.log('🏗️  Creating Factory Layout...\n'); const now = new Date();
        const stationsConfig = [
            // Ground Floor - Moulding (15 machines)
            ...Array.from({ length: 15 }, (_, i) => ({
                name: `Moulding Machine ${i + 1}`,
                code: `MOULD-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now
            })),

            // Ground Floor - Spray Booth (25 machines)
            ...Array.from({ length: 25 }, (_, i) => ({
                name: `Spray Booth ${i + 1}`,
                code: `SPRAY-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now
            })),

            // First Floor - Pad Printing (15 machines)
            ...Array.from({ length: 15 }, (_, i) => ({
                name: `Pad Printing ${i + 1}`,
                code: `PAD-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now
            })),

            // First Floor - Ultrasonic (5 machines)
            ...Array.from({ length: 5 }, (_, i) => ({
                name: `Ultrasonic Machine ${i + 1}`,
                code: `ULTRA-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now
            })),

            // First Floor - General Workstations (20 stations)
            ...Array.from({ length: 20 }, (_, i) => ({
                name: `Workstation ${i + 1}`,
                code: `WORK-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'manual',
                capacity: 100,
                status: 'operational',
                updatedAt: now
            })),

            // First Floor - Packing (20 stations)
            ...Array.from({ length: 20 }, (_, i) => ({
                name: `Packing Station ${i + 1}`,
                code: `PACK-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'manual',
                capacity: 100,
                status: 'operational',
                updatedAt: now
            }))
        ]; console.log(`Creating ${stationsConfig.length} stations...`);
        const stations = await Promise.all(
            stationsConfig.map(config => prisma.station.create({ data: config }))
        );
        console.log(`✅ Created ${stations.length} stations across 2 floors\n`);

        // Group stations by code prefix for easy access
        const stationsByType = {
            moulding: stations.filter(s => s.code.startsWith('MOULD-')),
            painting: stations.filter(s => s.code.startsWith('SPRAY-')),
            pad_printing: stations.filter(s => s.code.startsWith('PAD-')),
            ultrasonic: stations.filter(s => s.code.startsWith('ULTRA-')),
            assembly: stations.filter(s => s.code.startsWith('WORK-')),
            packing: stations.filter(s => s.code.startsWith('PACK-'))
        };

        console.log('Factory Layout:');
        console.log(`  Ground Floor:`);
        console.log(`    - Moulding Room: ${stationsByType.moulding.length} machines`);
        console.log(`    - Spray Room: ${stationsByType.painting.length} machines`);
        console.log(`  First Floor:`);
        console.log(`    - Pad Printing Room: ${stationsByType.pad_printing.length} machines`);
        console.log(`    - Ultrasonic Room: ${stationsByType.ultrasonic.length} machines`);
        console.log(`    - Assembly Area: ${stationsByType.assembly.length} workstations`);
        console.log(`    - Packing Area: ${stationsByType.packing.length} stations\n`);        // ========================================
        // 2. FETCH EXISTING USERS
        // ========================================
        console.log('👥 Fetching Existing Users...\n');

        const users = await prisma.user.findMany({ take: 50 });
        if (users.length === 0) {
            throw new Error('No users found in database. Please create at least one user first.');
        }
        console.log(`✅ Found ${users.length} users for shift assignments\n`);

        // ========================================
        // 3. CREATE PROJECTS
        // ========================================
        console.log('📋 Creating Projects...\n');

        const projectsConfig = [
            // 3 Initial Stage Projects (no production data)
            {
                name: 'Promotional USB Drives - TechCorp',
                code: 'PROJ-USB-001',
                sku: 'USB-2024-TC',
                quantity: 50000,
                cutoffDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                stage: 'initial'
            },
            {
                name: 'Eco-Friendly Water Bottles - GreenCo',
                code: 'PROJ-BTL-002',
                sku: 'BTL-2024-GC',
                quantity: 30000,
                cutoffDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), // 75 days from now
                stage: 'initial'
            },
            {
                name: 'Corporate Pens Set - BizWorld',
                code: 'PROJ-PEN-003',
                sku: 'PEN-2024-BW',
                quantity: 100000,
                cutoffDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
                stage: 'initial'
            },

            // 1 Running Project (will have production data)
            {
                name: 'Branded Keychains - AutoMotive Inc',
                code: 'PROJ-KEY-004',
                sku: 'KEY-2024-AM',
                quantity: 75000,
                cutoffDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                stage: 'running'
            }
        ]; const stageMap = new Map(); // Track which projects are running
        const projects = await Promise.all(
            projectsConfig.map(config => {
                const { stage, ...projectData } = config;
                return prisma.project.create({ data: projectData }).then(p => {
                    stageMap.set(p.id, stage);
                    return p;
                });
            })
        );

        console.log(`✅ Created ${projects.length} projects:`);
        projects.forEach(p => {
            console.log(`   ${stageMap.get(p.id) === 'initial' ? '🆕' : '🏃'} ${p.name} [${p.code}]`);
        });
        console.log();

        const initialProjects = projects.filter(p => stageMap.get(p.id) === 'initial');
        const runningProjects = projects.filter(p => stageMap.get(p.id) === 'running');

        // ========================================
        // 4. GENERATE PRODUCTION DATA
        // ========================================
        console.log('🏭 Generating Production Data (30 days)...\n');

        const dates = generateDates(30);
        const shiftTypes = ['MORNING', 'AFTERNOON', 'NIGHT'];
        const shiftTimes = {
            MORNING: { start: 6, end: 14 },
            AFTERNOON: { start: 14, end: 22 },
            NIGHT: { start: 22, end: 6 }
        };

        let shiftCount = 0;
        let totalProduction = 0;

        // Only generate data for RUNNING projects
        for (const project of runningProjects) {
            console.log(`  Generating data for: ${project.name}`);

            for (const date of dates) {
                for (const shiftType of shiftTypes) {
                    // Randomly select stations across different types
                    const selectedStations = [
                        random(stationsByType.moulding),
                        random(stationsByType.painting),
                        random(stationsByType.pad_printing),
                        random(stationsByType.assembly),
                        random(stationsByType.packing)
                    ];

                    for (const station of selectedStations) {
                        const workersPresent = randomInt(5, 15);
                        const totalProduced = randomInt(300, 800);
                        const qualityPassed = Math.floor(totalProduced * (0.90 + Math.random() * 0.08)); // 90-98%
                        const qualityRejected = totalProduced - qualityPassed;
                        const efficiency = 0.75 + Math.random() * 0.20; // 75-95%

                        const startTime = new Date(date);
                        startTime.setHours(shiftTimes[shiftType].start, 0, 0, 0);
                        const endTime = new Date(date);
                        if (shiftType === 'NIGHT') {
                            endTime.setDate(endTime.getDate() + 1);
                        }
                        endTime.setHours(shiftTimes[shiftType].end, 0, 0, 0);

                        await prisma.shiftEntry.create({
                            data: {
                                projectId: project.id,
                                shiftDate: date,
                                shiftType,
                                shiftStartTime: startTime,
                                shiftEndTime: endTime,
                                stationId: station.id,
                                workersPresent,
                                totalProduced,
                                qualityPassed,
                                qualityRejected,
                                efficiency,
                                supervisorId: random(users).id,
                                createdBy: random(users).id,
                                status: 'approved',
                            }
                        });

                        shiftCount++;
                        totalProduction += totalProduced;
                    }
                }
            }
        }

        console.log(`\n✅ Generated ${shiftCount} shift entries`);
        console.log(`   Total Production: ${totalProduction.toLocaleString()} units\n`);

        // ========================================
        // 5. QC DATA (SKIPPED - requires QCChecklistTemplate setup)
        // ========================================
        console.log('⚠️  QC data skipped (requires template setup first)\n');
        const qcCount = 0;        // ========================================
        // 6. FINAL SUMMARY
        // ========================================
        console.log('═══════════════════════════════════════════════');
        console.log('📊 PRODUCTION TEST ENVIRONMENT CREATED');
        console.log('═══════════════════════════════════════════════\n');

        console.log('Factory Infrastructure:');
        console.log(`  ✅ ${stations.length} Stations (100 capacity each)`);
        console.log(`  ✅ ${users.length} Operators`);
        console.log(`  ✅ 2 Floors (Ground + First)`);
        console.log(`  ✅ 6 Operation Types\n`);

        console.log('Project Portfolio:');
        console.log(`  ✅ ${projects.length} Total Projects`);
        console.log(`     🆕 ${initialProjects.length} in Initial Stage`);
        console.log(`     🏃 ${runningProjects.length} in Production\n`);

        console.log('Production Data (30 Days):');
        console.log(`  ✅ ${shiftCount} Shift Entries`);
        console.log(`  ✅ ${totalProduction.toLocaleString()} Units Produced`);
        console.log(`  ✅ ${qcCount} QC Inspections\n`);

        console.log('Station Distribution:');
        Object.entries(stationsByType).forEach(([type, stns]) => {
            console.log(`  • ${type.padEnd(15)}: ${stns.length} stations`);
        });

        console.log('\n🎉 Test Environment Ready!');
        console.log('📈 Dashboard will show production across multiple stations');
        console.log('⚖️  Load balancing visible across 100 stations');
        console.log('🔄 Refresh your browser to see comprehensive analytics!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n📍 Error Location:', error.stack);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

setupProductionTest();

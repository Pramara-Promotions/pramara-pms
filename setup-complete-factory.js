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

async function setupCompleteFactory() {
    try {
        console.log('🏭 COMPLETE FACTORY SETUP - Real Production Scenario\n');
        console.log('=====================================================\n');

        // ========================================
        // 1. CLEAN EXISTING DATA
        // ========================================
        console.log('🧹 Cleaning Existing Data...\n');
        await prisma.shiftEntry.deleteMany({});
        await prisma.processFlow.deleteMany({});
        await prisma.projectSku.deleteMany({});
        await prisma.station.deleteMany({});
        await prisma.project.deleteMany({});
        console.log('✅ Cleaned existing data\n');

        // ========================================
        // 2. USE EXISTING USERS OR CREATE DUMMY REFERENCES
        // ========================================
        console.log('👥 Fetching Factory Personnel...\n');

        // Get all existing users
        const allUsers = await prisma.user.findMany();

        // If we have at least one user, use them for all shifts (simplified)
        const supervisors = allUsers.length > 0 ? [allUsers[0]] : [];
        const operators = allUsers.length > 0 ? allUsers : [];

        if (allUsers.length === 0) {
            console.log('⚠️  No users found! Creating one admin user...\n');
            const bcrypt = require('bcryptjs');
            const admin = await prisma.user.create({
                data: {
                    email: 'admin@pramara.com',
                    name: 'Admin User',
                    firstName: 'Admin',
                    lastName: 'User',
                    passwordHash: await bcrypt.hash('password123', 10),
                }
            });
            supervisors.push(admin);
            operators.push(admin);
        }

        console.log(`✅ Found ${supervisors.length} supervisors`);
        console.log(`✅ Found ${operators.length} operators for assignments\n`);        // ========================================
        // 3. CREATE FACTORY LAYOUT (100 STATIONS)
        // ========================================
        console.log('🏗️  Creating Factory Layout...\n');

        const now = new Date();
        const stationsConfig = [
            // Ground Floor - Moulding (15 machines)
            ...Array.from({ length: 15 }, (_, i) => ({
                name: `Moulding Machine ${i + 1} [Ground/Moulding Room]`,
                code: `MOULD-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now,
                description: 'Ground Floor - Moulding Room'
            })),

            // Ground Floor - Spray Booth (25 machines)
            ...Array.from({ length: 25 }, (_, i) => ({
                name: `Spray Booth ${i + 1} [Ground/Spray Room]`,
                code: `SPRAY-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now,
                description: 'Ground Floor - Spray Room'
            })),

            // First Floor - Pad Printing (15 machines)
            ...Array.from({ length: 15 }, (_, i) => ({
                name: `Pad Printing ${i + 1} [First/Pad Print Room]`,
                code: `PAD-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now,
                description: 'First Floor - Pad Printing Room'
            })),

            // First Floor - Ultrasonic (5 machines)
            ...Array.from({ length: 5 }, (_, i) => ({
                name: `Ultrasonic Machine ${i + 1} [First/Ultrasonic Room]`,
                code: `ULTRA-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'machine',
                capacity: 100,
                status: 'operational',
                updatedAt: now,
                description: 'First Floor - Ultrasonic Room'
            })),

            // First Floor - Assembly (20 workstations)
            ...Array.from({ length: 20 }, (_, i) => ({
                name: `Assembly Workstation ${i + 1} [First/Assembly Area]`,
                code: `WORK-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'manual',
                capacity: 100,
                status: 'operational',
                updatedAt: now,
                description: 'First Floor - Assembly Area'
            })),

            // First Floor - Packing (20 stations)
            ...Array.from({ length: 20 }, (_, i) => ({
                name: `Packing Station ${i + 1} [First/Packing Area]`,
                code: `PACK-${String(i + 1).padStart(2, '0')}`,
                workstationType: 'manual',
                capacity: 100,
                status: 'operational',
                updatedAt: now,
                description: 'First Floor - Packing Area'
            }))
        ];

        const stations = await Promise.all(
            stationsConfig.map(config => prisma.station.create({ data: config }))
        );

        // Group stations by type
        const stationsByType = {
            moulding: stations.filter(s => s.code.startsWith('MOULD-')),
            spray: stations.filter(s => s.code.startsWith('SPRAY-')),
            padPrinting: stations.filter(s => s.code.startsWith('PAD-')),
            ultrasonic: stations.filter(s => s.code.startsWith('ULTRA-')),
            assembly: stations.filter(s => s.code.startsWith('WORK-')),
            packing: stations.filter(s => s.code.startsWith('PACK-'))
        };

        console.log(`✅ Created ${stations.length} stations\n`);

        // ========================================
        // 4. CREATE RUNNING PROJECT WITH MULTIPLE SKUs
        // ========================================
        console.log('📋 Creating Project with Multiple SKUs...\n');

        const project = await prisma.project.create({
            data: {
                name: 'Premium Corporate Gift Set - Q4 2025',
                code: 'PROJ-CORP-Q4-2025',
                quantity: 100000,
                cutoffDate: new Date('2025-12-31'),
            }
        });

        console.log(`✅ Created project: ${project.name}\n`);

        // Create Multiple SKUs for the project
        console.log('🎨 Creating Multiple SKUs...\n');

        const skus = await Promise.all([
            // SKU 1: Premium Keychain
            prisma.projectSku.create({
                data: {
                    projectId: project.id,
                    code: 'KEY-PREMIUM-001',
                    name: 'Premium Metal Keychain - Silver',
                    orderQty: 30000,
                    color: 'PANTONE 877C (Silver)',
                    type: 'Keychain',
                    attributes: {
                        material: 'Zinc Alloy',
                        dimensions: '50mm x 30mm x 3mm',
                        weight: '25g',
                        unitPrice: 45.00
                    }
                }
            }),

            // SKU 2: USB Drive
            prisma.projectSku.create({
                data: {
                    projectId: project.id,
                    code: 'USB-CORP-002',
                    name: 'Corporate USB Drive 16GB - Black',
                    orderQty: 25000,
                    color: 'PANTONE Black C',
                    type: 'USB Drive',
                    attributes: {
                        material: 'ABS Plastic',
                        dimensions: '60mm x 20mm x 10mm',
                        weight: '15g',
                        unitPrice: 120.00,
                        capacity: '16GB'
                    }
                }
            }),

            // SKU 3: Pen
            prisma.projectSku.create({
                data: {
                    projectId: project.id,
                    code: 'PEN-EXEC-003',
                    name: 'Executive Metal Pen - Blue',
                    orderQty: 30000,
                    color: 'PANTONE 2945C (Blue)',
                    type: 'Pen',
                    attributes: {
                        material: 'Brass',
                        dimensions: '140mm x 10mm diameter',
                        weight: '30g',
                        unitPrice: 85.00
                    }
                }
            }),

            // SKU 4: Notebook
            prisma.projectSku.create({
                data: {
                    projectId: project.id,
                    code: 'NOTE-CORP-004',
                    name: 'Corporate Notebook A5 - Brown',
                    orderQty: 15000,
                    color: 'PANTONE 476C (Brown)',
                    type: 'Notebook',
                    attributes: {
                        material: 'PU Leather',
                        dimensions: '210mm x 148mm x 15mm',
                        weight: '250g',
                        unitPrice: 150.00,
                        pages: 200
                    }
                }
            }),
        ]); console.log(`✅ Created ${skus.length} SKUs:`);
        skus.forEach(sku => {
            console.log(`   - ${sku.code}: ${sku.name} (${sku.orderQty} units)`);
        });
        console.log();

        // ========================================
        // 5. CREATE PROCESS FLOWS FOR EACH SKU
        // ========================================
        console.log('⚙️  Creating Process Flows...\n');

        // Get admin user for createdBy field
        const adminUser = supervisors[0];

        // Process Flow for Keychain
        const keychainFlow = await prisma.processFlow.create({
            data: {
                projectId: project.id,
                flowName: 'Keychain Production Process',
                flowDescription: 'Complete manufacturing process for premium metal keychains',
                status: 'active',
                createdBy: adminUser.id,
            }
        });

        await Promise.all([
            prisma.processOperation.create({
                data: {
                    processFlowId: keychainFlow.id,
                    operationName: 'Die Casting',
                    operationCode: 'OP-MOULD-001',
                    sequence: 1,
                    stationId: stationsByType.moulding[0].id,
                    estimatedTime: 120, // 2 hours
                    standardOutput: 500,
                    operationDescription: 'Cast zinc alloy into keychain shape',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: keychainFlow.id,
                    operationName: 'Spray Coating',
                    operationCode: 'OP-SPRAY-001',
                    sequence: 2,
                    stationId: stationsByType.spray[0].id,
                    estimatedTime: 180, // 3 hours
                    standardOutput: 600,
                    operationDescription: 'Apply silver coating',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: keychainFlow.id,
                    operationName: 'Pad Printing - Logo',
                    operationCode: 'OP-PAD-001',
                    sequence: 3,
                    stationId: stationsByType.padPrinting[0].id,
                    estimatedTime: 150,
                    standardOutput: 800,
                    operationDescription: 'Print company logo',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: keychainFlow.id,
                    operationName: 'Quality Inspection',
                    operationCode: 'OP-QC-001',
                    sequence: 4,
                    stationId: stationsByType.assembly[0].id,
                    estimatedTime: 60,
                    standardOutput: 1000,
                    operationDescription: 'Visual inspection and measurements',
                    isCriticalPath: false,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: keychainFlow.id,
                    operationName: 'Packaging',
                    operationCode: 'OP-PACK-001',
                    sequence: 5,
                    stationId: stationsByType.packing[0].id,
                    estimatedTime: 90,
                    standardOutput: 1200,
                    operationDescription: 'Pack in individual boxes',
                    isCriticalPath: false,
                }
            }),
        ]);

        // Process Flow for USB Drive
        const usbFlow = await prisma.processFlow.create({
            data: {
                projectId: project.id,
                flowName: 'USB Drive Production Process',
                flowDescription: 'Assembly and branding process for USB drives',
                status: 'active',
                createdBy: adminUser.id,
            }
        });

        await Promise.all([
            prisma.processOperation.create({
                data: {
                    processFlowId: usbFlow.id,
                    operationName: 'Moulding - Casing',
                    operationCode: 'OP-MOULD-USB-001',
                    sequence: 1,
                    stationId: stationsByType.moulding[1].id,
                    estimatedTime: 150,
                    standardOutput: 800,
                    operationDescription: 'Injection mould USB casing',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: usbFlow.id,
                    operationName: 'Assembly - PCB',
                    operationCode: 'OP-ASSM-USB-001',
                    sequence: 2,
                    stationId: stationsByType.assembly[1].id,
                    estimatedTime: 120,
                    standardOutput: 600,
                    operationDescription: 'Insert PCB and assemble casing',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: usbFlow.id,
                    operationName: 'Pad Printing - Logo',
                    operationCode: 'OP-PAD-USB-001',
                    sequence: 3,
                    stationId: stationsByType.padPrinting[1].id,
                    estimatedTime: 100,
                    standardOutput: 900,
                    operationDescription: 'Print company logo on USB',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: usbFlow.id,
                    operationName: 'Data Loading',
                    operationCode: 'OP-DATA-USB-001',
                    sequence: 4,
                    stationId: stationsByType.assembly[2].id,
                    estimatedTime: 180,
                    standardOutput: 500,
                    operationDescription: 'Load corporate data files',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: usbFlow.id,
                    operationName: 'Packaging',
                    operationCode: 'OP-PACK-USB-001',
                    sequence: 5,
                    stationId: stationsByType.packing[1].id,
                    estimatedTime: 60,
                    standardOutput: 1500,
                    operationDescription: 'Pack in gift boxes',
                    isCriticalPath: false,
                }
            }),
        ]);

        // Process Flow for Pen
        const penFlow = await prisma.processFlow.create({
            data: {
                projectId: project.id,
                flowName: 'Executive Pen Production Process',
                flowDescription: 'Manufacturing process for metal pens',
                status: 'active',
                createdBy: adminUser.id,
            }
        });

        await Promise.all([
            prisma.processOperation.create({
                data: {
                    processFlowId: penFlow.id,
                    operationName: 'Body Machining',
                    operationCode: 'OP-MOULD-PEN-001',
                    sequence: 1,
                    stationId: stationsByType.moulding[2].id,
                    estimatedTime: 90,
                    standardOutput: 700,
                    operationDescription: 'Machine brass pen body',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: penFlow.id,
                    operationName: 'Spray Coating - Blue',
                    operationCode: 'OP-SPRAY-PEN-001',
                    sequence: 2,
                    stationId: stationsByType.spray[1].id,
                    estimatedTime: 120,
                    standardOutput: 800,
                    operationDescription: 'Apply blue powder coating',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: penFlow.id,
                    operationName: 'Assembly - Mechanism',
                    operationCode: 'OP-ASSM-PEN-001',
                    sequence: 3,
                    stationId: stationsByType.assembly[3].id,
                    estimatedTime: 80,
                    standardOutput: 900,
                    operationDescription: 'Assemble pen mechanism and refill',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: penFlow.id,
                    operationName: 'Laser Engraving',
                    operationCode: 'OP-LASER-PEN-001',
                    sequence: 4,
                    stationId: stationsByType.assembly[4].id,
                    estimatedTime: 100,
                    standardOutput: 600,
                    operationDescription: 'Engrave company name',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: penFlow.id,
                    operationName: 'Packaging',
                    operationCode: 'OP-PACK-PEN-001',
                    sequence: 5,
                    stationId: stationsByType.packing[2].id,
                    estimatedTime: 50,
                    standardOutput: 1800,
                    operationDescription: 'Pack in velvet boxes',
                    isCriticalPath: false,
                }
            }),
        ]);

        // Process Flow for Notebook
        const notebookFlow = await prisma.processFlow.create({
            data: {
                projectId: project.id,
                flowName: 'Corporate Notebook Production Process',
                flowDescription: 'Assembly and customization process for notebooks',
                status: 'active',
                createdBy: adminUser.id,
            }
        });

        await Promise.all([
            prisma.processOperation.create({
                data: {
                    processFlowId: notebookFlow.id,
                    operationName: 'Cover Cutting',
                    operationCode: 'OP-CUT-NOTE-001',
                    sequence: 1,
                    stationId: stationsByType.assembly[5].id,
                    estimatedTime: 60,
                    standardOutput: 500,
                    operationDescription: 'Cut PU leather covers',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: notebookFlow.id,
                    operationName: 'Ultrasonic Welding',
                    operationCode: 'OP-ULTRA-NOTE-001',
                    sequence: 2,
                    stationId: stationsByType.ultrasonic[0].id,
                    estimatedTime: 90,
                    standardOutput: 400,
                    operationDescription: 'Weld cover edges',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: notebookFlow.id,
                    operationName: 'Hot Stamping - Logo',
                    operationCode: 'OP-STAMP-NOTE-001',
                    sequence: 3,
                    stationId: stationsByType.assembly[6].id,
                    estimatedTime: 120,
                    standardOutput: 350,
                    operationDescription: 'Hot stamp company logo on cover',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: notebookFlow.id,
                    operationName: 'Assembly - Binding',
                    operationCode: 'OP-ASSM-NOTE-001',
                    sequence: 4,
                    stationId: stationsByType.assembly[7].id,
                    estimatedTime: 150,
                    standardOutput: 300,
                    operationDescription: 'Bind pages and attach cover',
                    isCriticalPath: true,
                }
            }),
            prisma.processOperation.create({
                data: {
                    processFlowId: notebookFlow.id,
                    operationName: 'Packaging',
                    operationCode: 'OP-PACK-NOTE-001',
                    sequence: 5,
                    stationId: stationsByType.packing[3].id,
                    estimatedTime: 40,
                    standardOutput: 800,
                    operationDescription: 'Shrink wrap and box',
                    isCriticalPath: false,
                }
            }),
        ]);

        console.log(`✅ Created 4 process flows with operations for each SKU\n`);

        // ========================================
        // 6. GENERATE PRODUCTION DATA WITH PEOPLE
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
        let operatorIndex = 0;

        // Generate production data for all SKUs
        for (const sku of skus) {
            console.log(`  Generating data for: ${sku.name}`);

            for (const date of dates) {
                for (const shiftType of shiftTypes) {
                    // Assign different stations based on SKU
                    let selectedStations = [];

                    if (sku.code.startsWith('KEY-')) {
                        selectedStations = [
                            random(stationsByType.moulding),
                            random(stationsByType.spray),
                            random(stationsByType.padPrinting),
                        ];
                    } else if (sku.code.startsWith('USB-')) {
                        selectedStations = [
                            random(stationsByType.moulding),
                            random(stationsByType.assembly),
                            random(stationsByType.padPrinting),
                        ];
                    } else if (sku.code.startsWith('PEN-')) {
                        selectedStations = [
                            random(stationsByType.moulding),
                            random(stationsByType.spray),
                            random(stationsByType.assembly),
                        ];
                    } else if (sku.code.startsWith('NOTE-')) {
                        selectedStations = [
                            random(stationsByType.ultrasonic),
                            random(stationsByType.assembly),
                        ];
                    }

                    selectedStations.push(random(stationsByType.packing));

                    for (const station of selectedStations) {
                        const workersPresent = randomInt(8, 15);
                        const totalProduced = randomInt(400, 900);
                        const qualityPassed = Math.floor(totalProduced * (0.92 + Math.random() * 0.06)); // 92-98%
                        const qualityRejected = totalProduced - qualityPassed;
                        const efficiency = 0.80 + Math.random() * 0.15; // 80-95%

                        const startTime = new Date(date);
                        startTime.setHours(shiftTimes[shiftType].start, 0, 0, 0);
                        const endTime = new Date(date);
                        if (shiftType === 'NIGHT') {
                            endTime.setDate(endTime.getDate() + 1);
                        }
                        endTime.setHours(shiftTimes[shiftType].end, 0, 0, 0);

                        // Rotate through operators and supervisors
                        const supervisor = supervisors[shiftCount % supervisors.length];
                        const assignedOperators = [];
                        for (let i = 0; i < workersPresent; i++) {
                            assignedOperators.push(operators[operatorIndex % operators.length].id);
                            operatorIndex++;
                        }

                        await prisma.shiftEntry.create({
                            data: {
                                projectId: project.id,
                                shiftDate: date,
                                shiftType,
                                shiftStartTime: startTime,
                                shiftEndTime: endTime,
                                stationId: station.id,
                                workersPresent,
                                workersAbsent: 0,
                                totalProduced,
                                qualityPassed,
                                qualityRejected,
                                efficiency,
                                supervisorId: supervisor.id,
                                createdBy: supervisor.id,
                                status: 'approved',
                                achievements: `Produced ${totalProduced} units of ${sku.name} - ${workersPresent} workers`,
                                handoverNotes: `SKU: ${sku.code} | Station: ${station.name}`,
                            }
                        });

                        shiftCount++;
                        totalProduction += totalProduced;
                    }
                }
            }
        }

        console.log(`\n✅ Generated ${shiftCount} shift entries`);
        console.log(`   Total Production: ${totalProduction.toLocaleString()} units`);
        console.log(`   Operators Utilized: ${operators.length} across all shifts`);
        console.log(`   Supervisors: ${supervisors.length}\n`);

        // ========================================
        // 7. FINAL SUMMARY
        // ========================================
        console.log('═══════════════════════════════════════════════');
        console.log('📊 COMPLETE FACTORY ENVIRONMENT CREATED');
        console.log('═══════════════════════════════════════════════\n');

        console.log('👥 Personnel:');
        console.log(`  ✅ ${supervisors.length} Supervisors`);
        console.log(`  ✅ ${operators.length} Operators`);
        console.log(`  📧 Login: supervisor1@pramara.com / password123`);
        console.log(`  📧 Login: operator1@pramara.com / password123\n`);

        console.log('🏭 Factory Infrastructure:');
        console.log(`  ✅ ${stations.length} Stations (100 capacity each)`);
        console.log(`  ✅ 2 Floors (Ground + First)`);
        console.log(`  ✅ 6 Operation Types\n`);

        console.log('📋 Project:');
        console.log(`  ✅ ${project.name}`);
        console.log(`  ✅ ${skus.length} SKUs (Multi-product production)`);
        console.log(`  ✅ 4 Complete Process Flows with Operations\n`);

        console.log('SKU Breakdown:');
        skus.forEach(sku => {
            console.log(`  • ${sku.code.padEnd(15)}: ${sku.orderQty.toLocaleString()} units`);
        });

        console.log('\n⚙️  Process Documentation:');
        console.log(`  ✅ Keychain: 5 operations (Moulding → Spray → Pad Print → QC → Pack)`);
        console.log(`  ✅ USB Drive: 5 operations (Moulding → Assembly → Pad Print → Data Load → Pack)`);
        console.log(`  ✅ Pen: 5 operations (Machining → Spray → Assembly → Laser → Pack)`);
        console.log(`  ✅ Notebook: 5 operations (Cutting → Ultrasonic → Stamping → Binding → Pack)\n`);

        console.log('📊 Production Data (30 Days):');
        console.log(`  ✅ ${shiftCount} Shift Entries`);
        console.log(`  ✅ ${totalProduction.toLocaleString()} Units Produced`);
        console.log(`  ✅ Multiple SKUs in parallel production`);
        console.log(`  ✅ Real operator assignments per shift\n`);

        console.log('🎉 REAL PRODUCTION SCENARIO READY!');
        console.log('🔄 Refresh your browser to see comprehensive analytics!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n📍 Error Details:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

setupCompleteFactory();

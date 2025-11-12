const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function generateId() {
    return crypto.randomUUID();
}

const skills = [
    ['Welding', 'Metal Fabrication'],
    ['Electrical', 'Wiring'],
    ['Plumbing', 'Pipefitting'],
    ['Carpentry', 'Woodwork'],
    ['Painting', 'Finishing'],
    ['Masonry', 'Bricklaying'],
    ['HVAC', 'Refrigeration'],
    ['Concrete', 'Formwork'],
    ['Roofing', 'Waterproofing'],
    ['Glass Installation', 'Glazing'],
    ['Tile Setting', 'Flooring'],
    ['Drywall', 'Plastering'],
    ['Landscaping', 'Irrigation'],
    ['Equipment Operation', 'Machinery'],
    ['Safety Management', 'Quality Control'],
];

const firstNames = [
    'Rajesh', 'Amit', 'Suresh', 'Vijay', 'Ramesh', 'Anil', 'Manoj', 'Santosh',
    'Prakash', 'Deepak', 'Ashok', 'Vinod', 'Ravi', 'Sanjay', 'Mahesh',
    'Kiran', 'Nitin', 'Sachin', 'Rahul', 'Ajay', 'Vishal', 'Pradeep', 'Dinesh',
    'Ganesh', 'Surendra', 'Narendra', 'Mukesh', 'Yogesh', 'Rajendra', 'Lokesh'
];

const lastNames = [
    'Kumar', 'Singh', 'Sharma', 'Patel', 'Yadav', 'Reddy', 'Verma', 'Joshi',
    'Mehta', 'Shah', 'Desai', 'Gupta', 'Jain', 'Agarwal', 'Pandey', 'Mishra',
    'Rao', 'Nair', 'Pillai', 'Iyer', 'Menon', 'Kulkarni', 'Shetty', 'Hegde'
];

const contractorCompanies = [
    {
        name: 'BuildTech Solutions Pvt Ltd',
        contactPerson: 'Ramesh Patel',
        email: 'ramesh@buildtech.in',
        phone: '+91-98765-43210',
        gstNumber: '29ABCDE1234F1Z5',
        location: 'Mumbai, Maharashtra',
        specialization: 'Construction & Civil Works'
    },
    {
        name: 'ElectroPro Services',
        contactPerson: 'Sunil Kumar',
        email: 'sunil@electropro.co.in',
        phone: '+91-87654-32109',
        gstNumber: '27FGHIJ5678K2Y6',
        location: 'Pune, Maharashtra',
        specialization: 'Electrical & Automation'
    },
    {
        name: 'MetalWorks Industries',
        contactPerson: 'Vijay Singh',
        email: 'vijay@metalworks.in',
        phone: '+91-76543-21098',
        gstNumber: '24LMNOP9012M3X7',
        location: 'Ahmedabad, Gujarat',
        specialization: 'Metal Fabrication & Welding'
    },
    {
        name: 'Universal Contractors & Builders',
        contactPerson: 'Prakash Sharma',
        email: 'prakash@ucbuilders.com',
        phone: '+91-65432-10987',
        gstNumber: '33QRSTU3456N4W8',
        location: 'Chennai, Tamil Nadu',
        specialization: 'General Construction'
    }
];

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomSkills() {
    const skillSet = getRandomElement(skills);
    return skillSet;
}

function generatePhone() {
    return `+91-${Math.floor(Math.random() * 90000 + 10000)}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

function generateEmail(name) {
    return `${name.toLowerCase().replace(' ', '.')}@${Math.random() > 0.5 ? 'gmail.com' : 'yahoo.com'}`;
}

async function createTestWorkforce() {
    console.log('🏗️  Creating test workforce data...\n');

    try {
        // Step 1: Create 4 Contractor Companies (Providers)
        console.log('📋 Creating 4 contractor companies...');
        const providers = [];

        for (const company of contractorCompanies) {
            const provider = await prisma.thirdPartyProvider.create({
                data: {
                    id: generateId(),
                    name: company.name,
                    contactPerson: company.contactPerson,
                    email: company.email,
                    phone: company.phone,
                    location: company.location,
                    contractStart: new Date('2024-01-01'),
                    contractEnd: new Date('2025-12-31'),
                    stabilityScore: Math.floor(Math.random() * 30) + 70, // 70-100
                    performanceScore: Math.floor(Math.random() * 30) + 70, // 70-100
                    attendanceRate: Math.floor(Math.random() * 15) + 85, // 85-100
                    updatedAt: new Date(),
                }
            });
            providers.push(provider);
            console.log(`   ✅ Created: ${provider.name}`);
        } console.log(`\n👷 Creating 150 workers...\n`);

        // Step 2: Create 150 Workers
        // Mix: 60% contractor (90 workers), 40% company (60 workers)
        const companyWorkersCount = 60;
        const contractorWorkersCount = 90;
        let created = 0;

        // Create company workers
        console.log(`📦 Creating ${companyWorkersCount} company workers...`);
        for (let i = 0; i < companyWorkersCount; i++) {
            const firstName = getRandomElement(firstNames);
            const lastName = getRandomElement(lastNames);
            const fullName = `${firstName} ${lastName}`;
            const workerSkills = getRandomSkills();

            const worker = await prisma.worker.create({
                data: {
                    id: generateId(),
                    name: fullName,
                    employeeCode: `EMP${String(i + 1).padStart(4, '0')}`,
                    email: generateEmail(fullName),
                    phone: generatePhone(),
                    workerType: 'company',
                    skills: workerSkills,
                    hourlyRate: Math.floor(Math.random() * 200) + 150, // 150-350
                    overtimeRate: Math.floor(Math.random() * 100) + 200, // 200-300
                    status: 'active',
                    hireDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                    updatedAt: new Date(),
                }
            });
            created++;
            if (created % 20 === 0) {
                console.log(`   ✅ Created ${created} workers...`);
            }
        }

        // Create contractor workers (distributed among 4 providers)
        console.log(`\n🏢 Creating ${contractorWorkersCount} contractor workers...`);
        const workersPerProvider = Math.floor(contractorWorkersCount / providers.length);

        for (let p = 0; p < providers.length; p++) {
            const provider = providers[p];
            const workerCount = p === providers.length - 1
                ? contractorWorkersCount - (workersPerProvider * (providers.length - 1)) // Last provider gets remaining
                : workersPerProvider;

            for (let i = 0; i < workerCount; i++) {
                const firstName = getRandomElement(firstNames);
                const lastName = getRandomElement(lastNames);
                const fullName = `${firstName} ${lastName}`;
                const workerSkills = getRandomSkills();

                const worker = await prisma.worker.create({
                    data: {
                        id: generateId(),
                        name: fullName,
                        employeeCode: `CTR${p + 1}-${String(i + 1).padStart(3, '0')}`,
                        email: generateEmail(fullName),
                        phone: generatePhone(),
                        workerType: 'contractor',
                        skills: workerSkills,
                        hourlyRate: Math.floor(Math.random() * 150) + 120, // 120-270
                        overtimeRate: Math.floor(Math.random() * 80) + 180, // 180-260
                        status: Math.random() > 0.1 ? 'active' : 'inactive', // 90% active
                        providerId: provider.id,
                        hireDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                        updatedAt: new Date(),
                    }
                });
                created++;
                if (created % 20 === 0) {
                    console.log(`   ✅ Created ${created} workers...`);
                }
            }
            console.log(`   📌 Assigned ${workerCount} workers to ${provider.name}`);
        }

        console.log(`\n✅ Successfully created workforce data!`);
        console.log(`\n📊 Summary:`);
        console.log(`   • Contractor Companies: 4`);
        console.log(`   • Total Workers: 150`);
        console.log(`     - Company Workers: ${companyWorkersCount} (${Math.round(companyWorkersCount / 150 * 100)}%)`);
        console.log(`     - Contractor Workers: ${contractorWorkersCount} (${Math.round(contractorWorkersCount / 150 * 100)}%)`);
        console.log(`\n🎉 Test workforce generation complete!\n`);

    } catch (error) {
        console.error('❌ Error creating test workforce:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createTestWorkforce();

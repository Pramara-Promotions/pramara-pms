/**
 * Template Learning Cron
 * Runs template learning over completed projects. Intended for daily scheduling.
 * Usage: npm run cron:templates
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function learnFromCompletedProjects() {
    try {
        const service = require('../api/services/processTemplateService');
        const completedProjects = await prisma.project.findMany({
            where: { status: { in: ['completed', 'closed'] } },
            select: { id: true, code: true }
        });

        let learned = 0;
        for (const p of completedProjects) {
            try {
                await service.learnFromProject(p.id);
                learned++;
            } catch (e) {
                console.warn(`[template-learning] Project ${p.code} failed:`, e?.message || e);
            }
        }

        console.log(`✅ Template learning complete. Projects processed: ${completedProjects.length}, learned: ${learned}`);
    } catch (e) {
        console.error('❌ Template learning cron error:', e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

learnFromCompletedProjects();

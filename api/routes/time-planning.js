const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// POST /api/time-planning/projects/:projectId/backward-schedule
// Computes a backward schedule from project cutoff and writes planned dates on WorkflowStage.
router.post('/projects/:projectId/backward-schedule', async (req, res) => {
    try {
        const projectId = Number(req.params.projectId);
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (!project.cutoffDate) return res.status(400).json({ error: 'Project cutoffDate is required' });

        const {
            buffers = { shippingDays: 2, qcDays: 1 },
            stageDurations = [], // [{stageId?, name?, estimatedDays}]
            overwrite = false,
        } = req.body || {};

        // Load stages ordered by sequence
        const stages = await prisma.workflowStage.findMany({
            where: { projectId },
            orderBy: [{ sequence: 'asc' }],
        });

        if (!stages.length && !stageDurations.length) {
            return res.status(400).json({ error: 'No workflow stages found. Provide stageDurations[] to plan.' });
        }

        // Build a plan array of { id, name, estimatedDays }
        const planStages = (stages.length ? stages.map(s => ({ id: s.id, name: s.name, estimatedDays: s.estimatedDays ?? 1 })) : [])
            .map(ps => {
                const override = stageDurations.find(sd => (sd.stageId && sd.stageId === ps.id) || (sd.name && sd.name === ps.name));
                return override ? { ...ps, estimatedDays: Number(override.estimatedDays || ps.estimatedDays || 1) } : ps;
            });

        // If no stages defined in DB, fall back to provided stageDurations
        const planningStages = planStages.length ? planStages : stageDurations.map((sd, idx) => ({
            id: sd.stageId || `TEMP-${idx}`,
            name: sd.name || `Stage ${idx + 1}`,
            estimatedDays: Number(sd.estimatedDays || 1),
        }));

        const cutoff = new Date(project.cutoffDate);
        const afterShipping = new Date(cutoff);
        afterShipping.setDate(afterShipping.getDate() - Number(buffers.shippingDays || 0));
        const productionEnd = new Date(afterShipping);
        productionEnd.setDate(productionEnd.getDate() - Number(buffers.qcDays || 0));

        // Calculate backward dates
        let cursor = new Date(productionEnd);
        const planned = [];
        for (let i = planningStages.length - 1; i >= 0; i--) {
            const s = planningStages[i];
            const days = Math.max(1, Math.ceil(Number(s.estimatedDays || 1)));
            const endDate = new Date(cursor);
            const startDate = new Date(cursor);
            startDate.setDate(startDate.getDate() - days);
            planned.unshift({ stageId: s.id, name: s.name, days, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
            cursor = startDate;
        }

        // Persist only if DB stages exist
        if (stages.length) {
            // Optionally avoid overwriting existing committed dates
            for (const p of planned) {
                const exists = stages.find(s => s.id === p.stageId);
                if (!exists) continue;
                const patch = { startDate: new Date(p.startDate), endDate: new Date(p.endDate) };
                if (!overwrite && (exists.startDate || exists.endDate)) continue;
                await prisma.workflowStage.update({ where: { id: p.stageId }, data: patch });
            }
        }

        // Compute overall start, slack and risk
        const planStart = new Date(planned[0].startDate);
        const today = new Date();
        const slackDays = Math.floor((planStart - today) / (24 * 3600 * 1000));
        const risk = slackDays < 0 ? 'RED' : slackDays < 3 ? 'AMBER' : 'GREEN';

        res.json({ projectId, cutoffDate: cutoff.toISOString(), buffers, planned, risk, slackDays });
    } catch (e) {
        console.error('time-planning:backward-schedule', e);
        res.status(500).json({ error: 'Failed to compute backward schedule' });
    }
});

// GET /api/time-planning/projects/:projectId/status
// Returns schedule health, slips and imminent risks for a project
router.get('/projects/:projectId/status', async (req, res) => {
    try {
        const projectId = Number(req.params.projectId);
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const stages = await prisma.workflowStage.findMany({
            where: { projectId },
            orderBy: [{ sequence: 'asc' }],
            select: { id: true, name: true, status: true, startDate: true, endDate: true }
        });

        const today = new Date();
        const analysis = stages.map(s => {
            const overdueDays = s.endDate ? Math.ceil((today - new Date(s.endDate)) / (24 * 3600 * 1000)) : null;
            const atRisk = s.endDate ? (new Date(s.endDate) - today) / (24 * 3600 * 1000) < 3 : false;
            return {
                id: s.id,
                name: s.name,
                status: s.status,
                startDate: s.startDate,
                endDate: s.endDate,
                overdueDays: overdueDays > 0 ? overdueDays : 0,
                atRisk
            };
        });

        const overdue = analysis.filter(a => a.overdueDays > 0);
        const atRisk = analysis.filter(a => a.atRisk && a.overdueDays === 0);

        res.json({
            projectId,
            cutoffDate: project.cutoffDate,
            summary: {
                totalStages: stages.length,
                overdueCount: overdue.length,
                atRiskCount: atRisk.length
            },
            stages: analysis
        });
    } catch (e) {
        console.error('time-planning:status', e);
        res.status(500).json({ error: 'Failed to compute status' });
    }
});

// POST /api/time-planning/alerts/check
// Scans projects for slips and creates Alerts when thresholds exceeded
router.post('/alerts/check', async (req, res) => {
    try {
        const { projectIds, riskThresholdDays = 0 } = req.body || {};

        const projects = await prisma.project.findMany({
            where: projectIds?.length ? { id: { in: projectIds.map(Number) } } : {},
            select: { id: true, code: true, name: true, cutoffDate: true }
        });

        let created = 0;

        for (const p of projects) {
            const stages = await prisma.workflowStage.findMany({
                where: { projectId: p.id },
                orderBy: [{ sequence: 'asc' }],
                select: { id: true, name: true, endDate: true, status: true }
            });

            const today = new Date();
            for (const s of stages) {
                if (!s.endDate) continue;
                const overdueDays = Math.ceil((today - new Date(s.endDate)) / (24 * 3600 * 1000));
                if (overdueDays > riskThresholdDays) {
                    await prisma.alert.create({
                        data: {
                            projectId: p.id,
                            level: overdueDays > 3 ? 'RED' : 'AMBER',
                            message: `Schedule slip: ${s.name} is overdue by ${overdueDays} day(s) in project ${p.code}`,
                        }
                    });
                    created++;
                }
            }
        }

        res.json({ message: `Created ${created} alert(s)` });
    } catch (e) {
        console.error('time-planning:alerts-check', e);
        res.status(500).json({ error: 'Failed to check schedule alerts' });
    }
});

// POST /api/time-planning/rolling-horizon/simulate
// Returns a simple prioritized plan across multiple projects (heuristic)
router.post('/rolling-horizon/simulate', async (req, res) => {
    try {
        const { projectIds, windowDays = 14 } = req.body || {};
        const where = projectIds?.length ? { id: { in: projectIds.map(Number) } } : {};

        const projects = await prisma.project.findMany({ where, select: { id: true, code: true, name: true, quantity: true, cutoffDate: true } });

        const now = new Date();
        const horizon = new Date(now);
        horizon.setDate(horizon.getDate() + Number(windowDays));

        const items = [];
        for (const p of projects) {
            const cutoff = p.cutoffDate ? new Date(p.cutoffDate) : null;
            const urgency = cutoff ? Math.max(0, Math.ceil((cutoff - now) / (24 * 3600 * 1000))) : 9999;
            const score = (10000 - urgency) + (Math.min(p.quantity || 0, 10000) / 100); // simple heuristic
            items.push({ projectId: p.id, projectCode: p.code, cutoffDate: cutoff, quantity: p.quantity, urgencyDays: urgency, priorityScore: score });
        }

        items.sort((a, b) => b.priorityScore - a.priorityScore);

        res.json({ windowDays, horizon: horizon.toISOString(), prioritized: items });
    } catch (e) {
        console.error('time-planning:rolling-sim', e);
        res.status(500).json({ error: 'Failed to simulate rolling-horizon plan' });
    }
});

module.exports = router;

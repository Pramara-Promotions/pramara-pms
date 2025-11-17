const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// Helper: load policy weights from SystemSetting
async function loadPolicy() {
    try {
        const s = await prisma.systemSetting.findUnique({ where: { key: 'timePlanningPolicy' } });
        return s?.value || { urgencyWeight: 0.6, valueWeight: 0.3, effortWeight: 0.1, atRiskThresholdDays: 3 };
    } catch { return { urgencyWeight: 0.6, valueWeight: 0.3, effortWeight: 0.1, atRiskThresholdDays: 3 }; }
}

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

        // Calculate backward dates (policy-aware ordering heuristic)
        const policy = await loadPolicy();

        // Optional: reorder stages by weighted score (urgency/value/effort)
        // When explicit stageDurations provided, we respect order; else sort by heuristic
        const stagesForOrdering = [...planningStages];
        if (!stageDurations?.length && stagesForOrdering.length) {
            // Compute simple score: urgency ~ nearer to end; value ~ stage days; effort ~ stage days
            stagesForOrdering.forEach((s, idx) => {
                const urgencyScore = (idx + 1) / stagesForOrdering.length;
                const valueScore = (s.estimatedDays || 1);
                const effortScore = (s.estimatedDays || 1);
                s._score = policy.urgencyWeight * urgencyScore + policy.valueWeight * valueScore + policy.effortWeight * effortScore;
            });
            stagesForOrdering.sort((a, b) => (b._score || 0) - (a._score || 0));
        }

        let cursor = new Date(productionEnd);
        const planned = [];
        for (let i = stagesForOrdering.length - 1; i >= 0; i--) {
            const s = stagesForOrdering[i];
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
        const risk = slackDays < 0 ? 'RED' : slackDays < (policy.atRiskThresholdDays || 3) ? 'AMBER' : 'GREEN';

        // Resource awareness (lightweight): if any day overlaps with a station marked down or fully allocated, flag a warning
        const resourceWarnings = [];
        try {
            const allocations = await prisma.resourceAllocation.findMany({ where: { projectId } });
            if (allocations?.length) {
                // naive: if there are allocations but no slack, warn
                if (slackDays < (policy.atRiskThresholdDays || 3)) {
                    resourceWarnings.push('Limited slack with existing allocations; consider rebalancing.');
                }
            }
        } catch {}

        res.json({ projectId, cutoffDate: cutoff.toISOString(), buffers, policy, planned, risk, slackDays, resourceWarnings });
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

// POST /api/time-planning/auto-reallocate { projectIds?: number[], thresholdDays?: number }
// For at-risk projects, return resource reallocation suggestions
router.post('/auto-reallocate', async (req, res) => {
    try {
        const { projectIds, thresholdDays } = req.body || {};
        const policy = await loadPolicy();
        const atRiskThreshold = Number(thresholdDays ?? policy.atRiskThresholdDays ?? 3);

        const ids = projectIds?.length
            ? projectIds.map(Number)
            : (await prisma.project.findMany({ select: { id: true } })).map(p => p.id);

        const suggestions = [];
        for (const projectId of ids) {
            const status = await prisma.workflowStage.findMany({ where: { projectId } });
            const today = new Date();
            const atRisk = status.some(s => s.endDate && ((new Date(s.endDate) - today) / (24 * 3600 * 1000)) < atRiskThreshold);
            if (!atRisk) continue;

            // Lightweight suggestion using existing allocations data
            const allocations = await prisma.resourceAllocation.findMany({ where: { projectId } });
            const totalAlloc = allocations.length;
            suggestions.push({ projectId, atRisk: true, summary: { totalAllocations: totalAlloc }, proposal: 'Increase machine allocations or shift priority for earlier stages.' });
        }

        res.json({ thresholdDays: atRiskThreshold, suggestions });
    } catch (e) {
        console.error('time-planning:auto-reallocate', e);
        res.status(500).json({ error: 'Failed to generate auto reallocation suggestions' });
    }
});

    // =============================
    // Capacity and Conflict Endpoints
    // =============================

    // Helper: count available machines for a station or fallback to station.capacity or 1
    async function stationCapacity(stationId) {
        try {
            const machines = await prisma.stationMachine.count({ where: { stationId: Number(stationId), status: 'available' } });
            if (machines && machines > 0) return machines;
        } catch {}
        try {
            const st = await prisma.station.findUnique({ where: { id: Number(stationId) }, select: { capacity: true } });
            if (st?.capacity && st.capacity > 0) return st.capacity;
        } catch {}
        return 1;
    }

    function dayKey(d) { const dt = new Date(d); return dt.toISOString().slice(0, 10); }
    function clampDateToDay(d) { const x = new Date(d); x.setUTCHours(0,0,0,0); return x; }

    // GET /api/time-planning/capacity?start=YYYY-MM-DD&end=YYYY-MM-DD&stationId?=123
    // Returns per-day capacity vs allocations for stations within window
    router.get('/capacity', async (req, res) => {
        try {
            const { start, end, stationId } = req.query || {};
            const startDate = start ? new Date(String(start)) : new Date();
            const endDate = end ? new Date(String(end)) : new Date(new Date().getTime() + 7 * 24 * 3600 * 1000);
            if (endDate < startDate) return res.status(400).json({ error: 'end must be >= start' });

            const whereAlloc = {
                ...(stationId ? { stationId: Number(stationId) } : {}),
                // overlap condition: alloc.start <= end AND alloc.end >= start
                AND: [
                    { startDate: { lte: endDate } },
                    { endDate: { gte: startDate } },
                ],
            };

            const allocations = await prisma.resourceAllocation.findMany({ where: whereAlloc });
            const byStation = new Map();
            for (const a of allocations) {
                if (!byStation.has(a.stationId)) byStation.set(a.stationId, []);
                byStation.get(a.stationId).push(a);
            }

            const result = [];
            for (const [sid, allocs] of byStation.entries()) {
                const cap = await stationCapacity(sid);
                const days = {};
                for (const a of allocs) {
                    const s = clampDateToDay(a.startDate);
                    const e = clampDateToDay(a.endDate);
                    for (let t = new Date(s); t <= e; t.setUTCDate(t.getUTCDate() + 1)) {
                        const key = dayKey(t);
                        if (!days[key]) days[key] = { date: key, allocated: 0 };
                        days[key].allocated += Math.max(1, a.machinesAllocated || 1);
                    }
                }
                const series = Object.values(days)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(d => ({ date: d.date, capacity: cap, allocated: d.allocated, utilization: Math.min(1, d.allocated / cap) }));
                result.push({ stationId: sid, capacity: cap, series });
            }

            res.json({ start: startDate.toISOString(), end: endDate.toISOString(), stations: result });
        } catch (e) {
            console.error('time-planning:capacity', e);
            res.status(500).json({ error: 'Failed to compute capacity' });
        }
    });

    // GET /api/time-planning/conflicts?start=YYYY-MM-DD&end=YYYY-MM-DD&stationId?=123
    // Returns days where allocated machines exceed available capacity
    router.get('/conflicts', async (req, res) => {
        try {
            const { start, end, stationId } = req.query || {};
            const startDate = start ? new Date(String(start)) : new Date();
            const endDate = end ? new Date(String(end)) : new Date(new Date().getTime() + 7 * 24 * 3600 * 1000);
            if (endDate < startDate) return res.status(400).json({ error: 'end must be >= start' });

            const whereAlloc = {
                ...(stationId ? { stationId: Number(stationId) } : {}),
                AND: [
                    { startDate: { lte: endDate } },
                    { endDate: { gte: startDate } },
                ],
            };
            const allocations = await prisma.resourceAllocation.findMany({ where: whereAlloc });
            const byStation = new Map();
            for (const a of allocations) {
                if (!byStation.has(a.stationId)) byStation.set(a.stationId, []);
                byStation.get(a.stationId).push(a);
            }

            const conflicts = [];
            for (const [sid, allocs] of byStation.entries()) {
                const cap = await stationCapacity(sid);
                const days = {};
                for (const a of allocs) {
                    const s = clampDateToDay(a.startDate);
                    const e = clampDateToDay(a.endDate);
                    for (let t = new Date(s); t <= e; t.setUTCDate(t.getUTCDate() + 1)) {
                        const key = dayKey(t);
                        if (!days[key]) days[key] = 0;
                        days[key] += Math.max(1, a.machinesAllocated || 1);
                    }
                }
                for (const [date, allocated] of Object.entries(days)) {
                    if (allocated > cap) {
                        conflicts.push({ stationId: sid, date, allocated, capacity: cap, overBy: allocated - cap });
                    }
                }
            }

            conflicts.sort((a, b) => a.date.localeCompare(b.date) || a.stationId - b.stationId);
            res.json({ start: startDate.toISOString(), end: endDate.toISOString(), conflicts });
        } catch (e) {
            console.error('time-planning:conflicts', e);
            res.status(500).json({ error: 'Failed to compute conflicts' });
        }
    });

module.exports = router;

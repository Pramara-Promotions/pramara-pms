/**
 * @file MetricsService.js
 * @description Service for project metrics aggregation and health calculation.
 * Centralizes the fallback logic (Production > Batch > Shift) and optimizes separate queries.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateProjectHealth } = require('../lib/projectHealth'); // Legacy single-project calc
const CacheService = require('./CacheService');

class MetricsService {
    /**
     * Get health summary for ALL projects in one go.
     * Optimized to avoid N+1 queries.
     * @returns {Promise<Object>} { onTrackCount, needAttentionCount, projectsByHealth }
     */
    async getBulkProjectHealth() {
        const cacheKey = 'dashboard:bulk_health';
        const cached = await CacheService.get(cacheKey);
        if (cached) return cached;

        console.log('[MetricsService] Calculating bulk health...');

        // 1. Fetch all projects with minimal necessary fields
        // We need dates and IDs to calculate timeline status
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                code: true,
                name: true,
                quantity: true,
                cutoffDate: true,
                createdAt: true,
                // We'll calculate simple status here for the dashboard summary
                // For full detailed health, we still use the detailed calculator on demand
            }
        });

        // 2. Fetch Aggregates for ALL projects in one query grouping
        // This replaces the loop of aggregates
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [prodAggs, shiftAggs] = await Promise.all([
            prisma.productionEntry.groupBy({
                by: ['projectId'],
                where: { startTime: { gte: sevenDaysAgo } },
                _sum: { actualQty: true, rejectedQty: true, targetQty: true }
            }),
            prisma.shiftEntry.groupBy({
                by: ['projectId'],
                _sum: { totalProduced: true, qualityPassed: true, qualityRejected: true }
            })
        ]);

        // Create lookup maps
        const prodMap = new Map(prodAggs.map(p => [p.projectId, p]));
        const shiftMap = new Map(shiftAggs.map(s => [s.projectId, s]));

        // 3. Compute status for each project in memory
        let healthy = 0;
        let atRisk = 0;
        let critical = 0;

        const healthStatusList = projects.map(p => {
            const status = this._computeQuickStatus(p, prodMap.get(p.id), shiftMap.get(p.id));
            if (status === 'healthy') healthy++;
            if (status === 'at-risk') atRisk++;
            if (status === 'critical') critical++;
            return { projectId: p.id, status };
        });

        const result = {
            onTrackCount: healthy,
            needAttentionCount: atRisk + critical,
            projectsByHealth: [
                { status: 'healthy', count: healthy },
                { status: 'at-risk', count: atRisk },
                { status: 'critical', count: critical }
            ]
        };

        // Cache for 5 minutes
        await CacheService.set(cacheKey, result, 5 * 60 * 1000);
        return result;
    }

    /**
     * Lightweight health computation for dashboard summary
     * @private
     */
    _computeQuickStatus(project, prodData, shiftData) {
        const now = new Date();
        const endDate = project.cutoffDate ? new Date(project.cutoffDate) : null;

        // 1. Timeline Check
        let isOverdue = false;
        let daysRemaining = null;
        if (endDate) {
            isOverdue = now > endDate;
            daysRemaining = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
        }

        if (isOverdue) return 'critical';

        // 2. Quality/Output Check
        // Reuse the same preference logic: Production (7d) > Shift
        const produced = (prodData?._sum?.actualQty || 0) > 0
            ? prodData._sum.actualQty
            : (shiftData?._sum?.totalProduced || 0);

        const rejected = (prodData?._sum?.actualQty || 0) > 0
            ? (prodData?._sum?.rejectedQty || 0)
            : (shiftData?._sum?.qualityRejected || 0);

        const defectRate = produced > 0 ? (rejected / produced) * 100 : 0;

        if (defectRate > 10) return 'critical';
        if (defectRate > 5) return 'at-risk';
        if (daysRemaining !== null && daysRemaining < 7) return 'at-risk';

        return 'healthy';
    }

    /**
     * Calculate single project health (Full Detail)
     * Wraps the legacy calculator but adds caching
     */
    async getProjectHealth(projectId) {
        const cacheKey = `project:health:${projectId}`;
        const cached = await CacheService.get(cacheKey);
        if (cached) return cached;

        try {
            const health = await calculateProjectHealth(projectId);
            await CacheService.set(cacheKey, health, 5 * 60 * 1000);
            return health;
        } catch (e) {
            console.warn(`[MetricsService] Health calc failed for ${projectId}:`, e.message);
            return null;
        }
    }

    /**
     * Get Production Analytics for a date range
     * Centralizes the "Production vs Shift" logic
     */
    async getProductionOverview(startDate) {
        try {
            console.log('[MetricsService] Fetching production overview for startDate:', startDate);
            // Parallel queries
            const [productionStats, productionTrend, shiftStats] = await Promise.all([
                // 1. ProductionEntry Aggregates
                prisma.productionEntry.aggregate({
                    where: { startTime: { gte: startDate } },
                    _sum: { actualQty: true, rejectedQty: true },
                    _count: true,
                }),
                // 2. ProductionEntry Trend
                prisma.productionEntry.groupBy({
                    by: ['startTime'],
                    where: { startTime: { gte: startDate } },
                    _sum: { actualQty: true, rejectedQty: true },
                    orderBy: { startTime: 'asc' },
                }),
                // 3. ShiftEntry Fallback
                prisma.shiftEntry.aggregate({
                    where: { shiftDate: { gte: startDate } },
                    _sum: { totalProduced: true, qualityPassed: true, qualityRejected: true },
                    _count: true,
                })
            ]);
            console.log('[MetricsService] Stats fetched:', { productionStats, shiftStats });


            // Consolidate Logic
            const hasProductionData = (productionStats._sum?.actualQty || 0) > 0;

            if (hasProductionData) {
                return {
                    totalProduced: productionStats._sum.actualQty || 0,
                    approved: Math.max(0, (productionStats._sum.actualQty || 0) - (productionStats._sum.rejectedQty || 0)),
                    rejected: productionStats._sum.rejectedQty || 0,
                    entries: productionStats._count,
                    trend: productionTrend.map(t => ({
                        date: t.startTime,
                        output: t._sum.actualQty || 0,
                        approved: Math.max(0, (t._sum.actualQty || 0) - (t._sum.rejectedQty || 0))
                    })),
                    source: 'ProductionEntry'
                };
            } else {
                return {
                    totalProduced: shiftStats._sum.totalProduced || 0,
                    approved: shiftStats._sum.qualityPassed || 0,
                    rejected: shiftStats._sum.qualityRejected || 0,
                    entries: shiftStats._count,
                    trend: [], // ShiftEntry trend not implemented in this view
                    source: 'ShiftEntry'
                };
            }
        } catch (error) {
            console.error('[MetricsService] Error in getProductionOverview:', error);
            return {
                totalProduced: 0,
                approved: 0,
                rejected: 0,
                entries: 0,
                trend: [],
                source: 'ErrorFallback'
            };
        }
    }
}

module.exports = new MetricsService();

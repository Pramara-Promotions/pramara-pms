const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create and persist a resource availability event
 * @param {Object} event - Event data
 * @param {string} event.resourceType - 'machine', 'station', 'worker', 'material', 'mold'
 * @param {string} event.resourceId - ID of affected resource
 * @param {string} event.resourceName - Human-readable name
 * @param {string} event.eventType - 'increased_capacity', 'decreased_capacity', 'new_resource', 'breakdown', 'maintenance'
 * @param {Object} event.newValue - New state
 * @param {Object} [event.previousValue] - Previous state
 * @param {string} [event.reason] - Why the change occurred
 * @param {string} [event.detectedBy] - 'system', 'user', 'sensor'
 * @param {number} [event.projectId] - Associated project
 * @param {number} [event.stationId] - Associated station
 * @param {string} [event.moldId] - Associated mold
 * @param {number} [event.capacityDelta] - Change in capacity units
 * @returns {Promise<Object>}
 */
async function createAvailabilityEvent(event) {
    try {
        const created = await prisma.resourceAvailabilityEvent.create({
            data: {
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                resourceName: event.resourceName,
                eventType: event.eventType,
                newValue: event.newValue || {},
                previousValue: event.previousValue || null,
                effectiveFrom: event.effectiveFrom || new Date(),
                effectiveTo: event.effectiveTo || null,
                reason: event.reason || null,
                detectedBy: event.detectedBy || 'system',
                projectId: event.projectId || null,
                stationId: event.stationId || null,
                moldId: event.moldId || null,
                capacityDelta: event.capacityDelta || null,
                status: 'NEW',
                source: event.source || 'resourceMonitor',
            },
            include: {
                project: { select: { id: true, code: true, name: true } },
                station: { select: { id: true, code: true, name: true } },
                mold: { select: { id: true, moldCode: true, moldName: true } },
            },
        });

        console.log(`[resourceMonitor] Created availability event ${created.id}: ${event.eventType} for ${event.resourceType}`);
        return { success: true, event: created };
    } catch (error) {
        console.error('[resourceMonitor] Failed to create availability event:', error);
        throw error;
    }
}

/**
 * Watch for project completions and create availability events
 * Detects projects recently completed and emits machine/mold availability events
 */
async function watchProjectCompletions() {
    try {
        // Find projects completed in last 24 hours
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentlyCompleted = await prisma.project.findMany({
            where: {
                // Assuming projects have a status field or completion tracking
                // Adjust based on your actual schema
                OR: [
                    { WorkflowStage: { some: { status: 'COMPLETED', updatedAt: { gte: yesterday } } } },
                ],
            },
            include: {
                stations: {
                    include: {
                        machines: { where: { currentProjectId: { not: null } } },
                    },
                },
                molds: { where: { status: 'approved' } },
            },
            take: 50,
        });

        const events = [];
        for (const project of recentlyCompleted) {
            // Emit machine availability events
            for (const station of project.stations) {
                for (const machine of station.machines) {
                    if (machine.currentProjectId === project.id) {
                        const event = await createAvailabilityEvent({
                            resourceType: 'machine',
                            resourceId: machine.id,
                            resourceName: machine.name,
                            eventType: 'increased_capacity',
                            newValue: { status: 'available', projectId: null },
                            previousValue: { status: 'in_use', projectId: project.id },
                            reason: `Project ${project.code} completed`,
                            detectedBy: 'system',
                            projectId: project.id,
                            stationId: station.id,
                            source: 'watchProjectCompletions',
                        });
                        events.push(event.event);
                    }
                }
            }

            // Emit mold availability events
            for (const mold of project.molds) {
                const event = await createAvailabilityEvent({
                    resourceType: 'mold',
                    resourceId: mold.id,
                    resourceName: mold.moldName,
                    eventType: 'new_resource',
                    newValue: { status: 'available', cavities: mold.cavities },
                    reason: `Project ${project.code} completed, mold available for reuse`,
                    detectedBy: 'system',
                    projectId: project.id,
                    moldId: mold.id,
                    capacityDelta: mold.cavities,
                    source: 'watchProjectCompletions',
                });
                events.push(event.event);
            }
        }

        console.log(`[resourceMonitor] Scanned project completions: ${recentlyCompleted.length} projects, ${events.length} events created`);
        return { scanned: recentlyCompleted.length, eventsCreated: events.length, events };
    } catch (error) {
        console.error('[resourceMonitor] Failed to watch project completions:', error);
        return { scanned: 0, eventsCreated: 0, events: [], error: error.message };
    }
}

/**
 * Watch for changes in machine status
 * Detects machines that have become available or gone down
 */
async function watchMachineStatus() {
    try {
        const recentlyChanged = await prisma.stationMachine.findMany({
            where: {
                updatedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
                OR: [
                    { status: 'available' },
                    { status: 'broken' },
                    { status: 'maintenance' },
                ],
            },
            include: {
                Station: { select: { id: true, code: true, name: true } },
            },
            take: 100,
        });

        const events = [];
        for (const machine of recentlyChanged) {
            const eventType = machine.status === 'available' ? 'increased_capacity' :
                machine.status === 'broken' ? 'breakdown' : 'maintenance';

            const event = await createAvailabilityEvent({
                resourceType: 'machine',
                resourceId: machine.id,
                resourceName: machine.name,
                eventType,
                newValue: { status: machine.status, machineType: machine.machineType },
                reason: `Machine status changed to ${machine.status}`,
                detectedBy: 'system',
                stationId: machine.stationId,
                capacityDelta: machine.status === 'available' ? 1 : -1,
                source: 'watchMachineStatus',
            });
            events.push(event.event);
        }

        console.log(`[resourceMonitor] Scanned machine status: ${recentlyChanged.length} changes, ${events.length} events created`);
        return { scanned: recentlyChanged.length, eventsCreated: events.length, events };
    } catch (error) {
        console.error('[resourceMonitor] Failed to watch machine status:', error);
        return { scanned: 0, eventsCreated: 0, events: [], error: error.message };
    }
}

/**
 * Watch for new molds added to inventory
 */
async function watchMoldInventory() {
    try {
        const recentlyAdded = await prisma.mold.findMany({
            where: {
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                status: { in: ['approved', 'testing'] },
            },
            include: {
                project: { select: { id: true, code: true, name: true } },
            },
            take: 50,
        });

        const events = [];
        for (const mold of recentlyAdded) {
            const event = await createAvailabilityEvent({
                resourceType: 'mold',
                resourceId: mold.id,
                resourceName: mold.moldName,
                eventType: 'new_resource',
                newValue: {
                    status: mold.status,
                    cavities: mold.cavities,
                    material: mold.material,
                },
                reason: 'New mold added to inventory',
                detectedBy: 'system',
                projectId: mold.projectId,
                moldId: mold.id,
                capacityDelta: mold.cavities,
                source: 'watchMoldInventory',
            });
            events.push(event.event);
        }

        console.log(`[resourceMonitor] Scanned mold inventory: ${recentlyAdded.length} new molds, ${events.length} events created`);
        return { scanned: recentlyAdded.length, eventsCreated: events.length, events };
    } catch (error) {
        console.error('[resourceMonitor] Failed to watch mold inventory:', error);
        return { scanned: 0, eventsCreated: 0, events: [], error: error.message };
    }
}

module.exports = {
    createAvailabilityEvent,
    watchProjectCompletions,
    watchMachineStatus,
    watchMoldInventory,
};

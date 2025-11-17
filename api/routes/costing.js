const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// POST /api/costing/projects/:projectId - create new costing draft
router.post('/projects/:projectId', async (req, res) => {
    try {
        const projectId = Number(req.params.projectId);
        const { createdBy } = req.body || {};

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const latest = await prisma.projectCosting.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
        const version = latest ? latest.version + 1 : 1;

        const costing = await prisma.projectCosting.create({
            data: {
                projectId,
                version,
                status: 'draft',
                createdBy: createdBy || req.user.userId,
            }
        });

        res.status(201).json({ costing });
    } catch (e) {
        console.error('costing:create', e);
        res.status(500).json({ error: 'Failed to create project costing' });
    }
});

// GET /api/costing/projects/:projectId - list versions
router.get('/projects/:projectId', async (req, res) => {
    try {
        const projectId = Number(req.params.projectId);
        const versions = await prisma.projectCosting.findMany({ where: { projectId }, orderBy: { version: 'desc' } });
        res.json({ versions });
    } catch (e) {
        console.error('costing:list', e);
        res.status(500).json({ error: 'Failed to list project costing versions' });
    }
});

// GET /api/costing/:id - get costing details
router.get('/:id', async (req, res) => {
    try {
        const id = String(req.params.id);
        const costing = await prisma.projectCosting.findUnique({
            where: { id },
            include: { components: true, pricingTiers: true, approvals: true }
        });
        if (!costing) return res.status(404).json({ error: 'Costing not found' });
        res.json({ costing });
    } catch (e) {
        console.error('costing:get', e);
        res.status(500).json({ error: 'Failed to get costing' });
    }
});

// PUT /api/costing/:id - update costing summary fields
router.put('/:id', async (req, res) => {
    try {
        const id = String(req.params.id);
        const {
            exFactoryCost, fobCost, sellingPrice, status
        } = req.body || {};

        const costing = await prisma.projectCosting.update({
            where: { id },
            data: {
                ...(exFactoryCost !== undefined ? { exFactoryCost: Number(exFactoryCost) } : {}),
                ...(fobCost !== undefined ? { fobCost: Number(fobCost) } : {}),
                ...(sellingPrice !== undefined ? { sellingPrice: Number(sellingPrice) } : {}),
                ...(status !== undefined ? { status: String(status) } : {}),
            }
        });
        res.json({ costing });
    } catch (e) {
        console.error('costing:update', e);
        res.status(500).json({ error: 'Failed to update costing' });
    }
});

// POST /api/costing/:id/components - add cost component
router.post('/:id/components', async (req, res) => {
    try {
        const projectCostingId = String(req.params.id);
        const { name, category, unit, allocation, quantity, costPerUnit, oneTime = false } = req.body || {};

        if (!name || !category) return res.status(400).json({ error: 'name and category are required' });

        const totalCost = oneTime ? Number(costPerUnit || 0) : Number(quantity || 0) * Number(costPerUnit || 0);

        const component = await prisma.costComponent.create({
            data: {
                projectCostingId,
                name: String(name),
                category: String(category),
                unit: unit || null,
                allocation: allocation || 'per_unit',
                quantity: quantity !== undefined ? Number(quantity) : null,
                costPerUnit: costPerUnit !== undefined ? Number(costPerUnit) : null,
                totalCost,
                oneTime: Boolean(oneTime)
            }
        });

        res.status(201).json({ component });
    } catch (e) {
        console.error('costing:add-component', e);
        res.status(500).json({ error: 'Failed to add component' });
    }
});

// PUT /api/costing/components/:componentId - update component
router.put('/components/:componentId', async (req, res) => {
    try {
        const componentId = String(req.params.componentId);
        const { name, category, unit, allocation, quantity, costPerUnit, oneTime } = req.body || {};

        const component = await prisma.costComponent.update({
            where: { id: componentId },
            data: {
                ...(name !== undefined ? { name: String(name) } : {}),
                ...(category !== undefined ? { category: String(category) } : {}),
                ...(unit !== undefined ? { unit: unit || null } : {}),
                ...(allocation !== undefined ? { allocation: allocation || 'per_unit' } : {}),
                ...(quantity !== undefined ? { quantity: quantity !== null ? Number(quantity) : null } : {}),
                ...(costPerUnit !== undefined ? { costPerUnit: costPerUnit !== null ? Number(costPerUnit) : null } : {}),
                ...(oneTime !== undefined ? { oneTime: Boolean(oneTime) } : {}),
            }
        });

        res.json({ component });
    } catch (e) {
        console.error('costing:update-component', e);
        res.status(500).json({ error: 'Failed to update component' });
    }
});

// DELETE /api/costing/components/:componentId - remove component
router.delete('/components/:componentId', async (req, res) => {
    try {
        const componentId = String(req.params.componentId);
        await prisma.costComponent.delete({ where: { id: componentId } });
        res.json({ ok: true });
    } catch (e) {
        console.error('costing:remove-component', e);
        res.status(500).json({ error: 'Failed to remove component' });
    }
});

// POST /api/costing/:id/calculate - rollup all costs and compute exFactory/fob/selling
router.post('/:id/calculate', async (req, res) => {
    try {
        const id = String(req.params.id);
        const costing = await prisma.projectCosting.findUnique({ where: { id } });
        if (!costing) return res.status(404).json({ error: 'Costing not found' });

        const components = await prisma.costComponent.findMany({ where: { projectCostingId: id } });

        const exFactory = components.reduce((sum, c) => sum + (c.totalCost || 0), 0);

        // FOB and selling are placeholders; apply margin rules later
        const fobCost = exFactory; // add logistics later
        const sellingPrice = exFactory; // apply margins later

        const updated = await prisma.projectCosting.update({ where: { id }, data: { exFactoryCost: exFactory, fobCost, sellingPrice } });

        res.json({ costing: updated, totals: { exFactory, fobCost, sellingPrice } });
    } catch (e) {
        console.error('costing:calculate', e);
        res.status(500).json({ error: 'Failed to calculate costing' });
    }
});

// POST /api/costing/:id/pricing-tiers - add pricing tier
router.post('/:id/pricing-tiers', async (req, res) => {
    try {
        const projectCostingId = String(req.params.id);
        const { minQty, pricePerUnit, currency = 'USD' } = req.body || {};
        if (minQty == null || pricePerUnit == null) return res.status(400).json({ error: 'minQty and pricePerUnit required' });

        const tier = await prisma.pricingTier.create({
            data: {
                projectCostingId,
                minQty: Number(minQty),
                pricePerUnit: Number(pricePerUnit),
                currency: String(currency)
            }
        });

        res.status(201).json({ tier });
    } catch (e) {
        console.error('costing:add-tier', e);
        res.status(500).json({ error: 'Failed to add pricing tier' });
    }
});

// GET /api/costing/:id/pricing-tiers - list tiers
router.get('/:id/pricing-tiers', async (req, res) => {
    try {
        const projectCostingId = String(req.params.id);
        const tiers = await prisma.pricingTier.findMany({ where: { projectCostingId }, orderBy: { minQty: 'asc' } });
        res.json({ tiers });
    } catch (e) {
        console.error('costing:list-tiers', e);
        res.status(500).json({ error: 'Failed to list pricing tiers' });
    }
});

// POST /api/costing/:id/submit - submit for approval
router.post('/:id/submit', async (req, res) => {
    try {
        const id = String(req.params.id);
        const costing = await prisma.projectCosting.update({ where: { id }, data: { status: 'submitted' } });
        res.json({ costing });
    } catch (e) {
        console.error('costing:submit', e);
        res.status(500).json({ error: 'Failed to submit costing' });
    }
});

// POST /api/costing/:id/approve - approve costing
router.post('/:id/approve', async (req, res) => {
    try {
        const id = String(req.params.id);
        const { approvedBy, comments } = req.body || {};

        const costing = await prisma.projectCosting.update({
            where: { id },
            data: { status: 'approved', approvedBy: approvedBy || req.user.userId, approvedAt: new Date() }
        });

        await prisma.costingApproval.create({
            data: {
                projectCostingId: id,
                status: 'approved',
                approverId: approvedBy || req.user.userId,
                comments: comments || null,
                actedAt: new Date()
            }
        });

        res.json({ costing });
    } catch (e) {
        console.error('costing:approve', e);
        res.status(500).json({ error: 'Failed to approve costing' });
    }
});

// POST /api/costing/:id/reject - reject costing
router.post('/:id/reject', async (req, res) => {
    try {
        const id = String(req.params.id);
        const { rejectedBy, comments } = req.body || {};

        const costing = await prisma.projectCosting.update({
            where: { id },
            data: { status: 'rejected' }
        });

        await prisma.costingApproval.create({
            data: {
                projectCostingId: id,
                status: 'rejected',
                approverId: rejectedBy || req.user.userId,
                comments: comments || null,
                actedAt: new Date()
            }
        });

        res.json({ costing });
    } catch (e) {
        console.error('costing:reject', e);
        res.status(500).json({ error: 'Failed to reject costing' });
    }
});

// POST /api/costing/:id/apply-margins - compute pricing from active margin rule and persist tiers
router.post('/:id/apply-margins', async (req, res) => {
    try {
        const id = String(req.params.id);

        // Get costing and components for rollup
        const costing = await prisma.projectCosting.findUnique({ where: { id } });
        if (!costing) return res.status(404).json({ error: 'Costing not found' });

        // Determine ex-factory base (fallback to rollup if not set)
        const components = await prisma.costComponent.findMany({ where: { projectCostingId: id } });
        let exFactory = costing.exFactoryCost != null ? Number(costing.exFactoryCost) : null;
        if (exFactory == null) {
            exFactory = components.reduce((sum, c) => sum + (Number(c.totalCost || 0)), 0);
            await prisma.projectCosting.update({ where: { id }, data: { exFactoryCost: exFactory } });
        }

        // Gather context for rule selection
        const project = await prisma.project.findUnique({ where: { id: costing.projectId }, include: { customer: true, skus: true } });
        const totalQty = (project?.skus || []).reduce((sum, sku) => sum + (Number(sku.orderQuantity || sku.orderQty || 0)), 0);
        const customer = project?.customer || {};

        // Select active margin rule using current schema
        const activeRules = await prisma.marginRule.findMany({ where: { active: true }, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] });
        function matches(rule) {
            const volOk = (rule.minVolume == null || totalQty >= Number(rule.minVolume)) && (rule.maxVolume == null || totalQty <= Number(rule.maxVolume));
            const custList = Array.isArray(rule.applicableToCustomer) ? rule.applicableToCustomer : [];
            const marketList = Array.isArray(rule.applicableToMarket) ? rule.applicableToMarket : [];
            const custOk = custList.length === 0 || custList.includes(String(customer.id)) || custList.includes(String(customer.tier)) || custList.includes('*');
            const marketOk = marketList.length === 0 || marketList.includes(String(project?.market || 'default')) || marketList.includes('*');
            return volOk && custOk && marketOk;
        }
        const rule = activeRules.find(matches) || null;
        const marginPercent = rule?.marginValue != null ? Number(rule.marginValue) : 25; // default 25%

        // Derive a unit base price; if no quantity, fall back to unitCost or exFactory
        const unitBase = totalQty > 0 ? exFactory / totalQty : (costing.unitCost != null ? Number(costing.unitCost) : exFactory);
        const basePrice = unitBase * (1 + marginPercent / 100);

        // Tier definitions and prices
        const tierDefs = [
            { minQty: 0, discount: 0 },
            { minQty: 1001, discount: 5 },
            { minQty: 5001, discount: 10 },
            { minQty: 10001, discount: 15 },
        ];

        const tiers = [];
        for (const def of tierDefs) {
            const pricePerUnit = basePrice * (1 - def.discount / 100);

            // Upsert by (projectCostingId, minQty) — emulate unique via find + update/create
            const existing = await prisma.pricingTier.findFirst({ where: { projectCostingId: id, minQty: def.minQty } });
            let tier;
            if (existing) {
                tier = await prisma.pricingTier.update({
                    where: { id: existing.id },
                    data: { pricePerUnit, currency: existing.currency || 'USD' },
                });
            } else {
                tier = await prisma.pricingTier.create({
                    data: { projectCostingId: id, minQty: def.minQty, pricePerUnit, currency: 'USD' },
                });
            }
            tiers.push({ id: tier.id, minQty: def.minQty, pricePerUnit });
        }

        // Persist headline selling price (unit price at base tier)
        const updated = await prisma.projectCosting.update({
            where: { id },
            data: { sellingPrice: basePrice },
        });

        res.json({
            costing: updated,
            exFactory,
            totalQty,
            customer: { id: customer.id || null, tier: customer.tier || null },
            marginPercent,
            baseUnitPrice: basePrice,
            tiers,
            ruleApplied: rule ? { id: rule.id, name: rule.name, priority: rule.priority } : null,
        });
    } catch (e) {
        console.error('costing:apply-margins', e);
        res.status(500).json({ error: 'Failed to apply margin rules' });
    }
});

module.exports = router;

# Phase 2 Implementation - Quick Start Guide

## ✅ Completed So Far

### Database & Services
- ✅ All Phase 2 models added to Prisma schema
- ✅ Migration applied successfully
- ✅ Calculation Engine (`api/lib/calculationEngine.js`)
- ✅ Learning Engine (`api/lib/learningEngine.js`)
- ✅ Notification Service extended
- ✅ Stations API (`api/routes/stations.js`) - Complete CRUD for entire hierarchy

### Remaining Backend Routes (Simplified Templates)

All routes should follow this pattern:
```javascript
const router = express.Router();
router.get('/', authGuard, async (req, res) => { /* LIST */ });
router.get('/:id', authGuard, async (req, res) => { /* GET ONE */ });
router.post('/', authGuard, permissionGuard('create'), async (req, res) => { /* CREATE */ });
router.put('/:id', authGuard, permissionGuard('edit'), async (req, res) => { /* UPDATE */ });
router.delete('/:id', authGuard, permissionGuard('delete'), async (req, res) => { /* DELETE */ });
```

### Files to Create

1. **api/routes/workflows.js** - WorkflowStage, WorkflowTask, WorkflowDependency CRUD
2. **api/routes/production.js** - ProcessConfig, ProductionCalculation, ProductionEntry
3. **api/routes/materials.js** - Material, MaterialLot, MaterialConsumption, MaterialReservation
4. **api/routes/workers.js** - Worker, ThirdPartyProvider, Shift, ShiftPlan CRUD + performance
5. **api/routes/daily-plans.js** - DailyPlan, DailyPlanStation + scenario generation + learning
6. **api/routes/batches.js** - Batch, BatchMovement + traceability queries
7. **api/routes/approvals.js** - ApprovalRequest, ApprovalReminder + buffer monitoring

### Frontend Structure

```
web/src/
├── lib/api/
│   ├── stations.ts        - API client for stations
│   ├── workflows.ts       - API client for workflows
│   ├── production.ts      - API client for production
│   ├── materials.ts       - API client for materials
│   ├── workers.ts         - API client for workers
│   ├── dailyPlans.ts      - API client for daily plans
│   ├── batches.ts         - API client for batches
│   └── approvals.ts       - API client for approvals
├── components/phase2/
│   ├── StationSelector.tsx
│   ├── WorkerSelector.tsx
│   ├── MaterialValidator.tsx
│   ├── BufferIndicator.tsx
│   └── ScenarioComparison.tsx
└── pages/
    ├── Stations.tsx       - Station hierarchy management
    ├── WorkflowBuilder.tsx
    ├── ProductionConfig.tsx
    ├── Workforce.tsx
    ├── DailyPlanning.tsx
    ├── BatchTracking.tsx
    └── Approvals.tsx
```

### Quick Implementation Checklist

#### Backend (Remaining)
- [ ] Create 6 more route files (workflows, production, materials, workers, daily-plans, batches, approvals)
- [ ] Register all routes in `api/index.js`
- [ ] Test each endpoint with Postman/curl

#### Frontend
- [ ] Create API client functions in `web/src/lib/api/`
- [ ] Create 5 shared components in `web/src/components/phase2/`
- [ ] Create 7 page components in `web/src/pages/`
- [ ] Add routes to `web/src/App.tsx`
- [ ] Add navigation menu items

### Priority Order
1. Materials & Production (needed for daily planning)
2. Workers & Workforce (needed for daily planning)
3. Daily Planning (core execution module)
4. Batches (can be done in parallel)
5. Workflows & Approvals (integrations)

### Testing Flow
1. Create factory → floor → section → room → station
2. Create station types (molding, painting, etc.)
3. Add materials and process configs
4. Add workers and shifts
5. Generate daily plan with scenarios
6. Create batch and track through stations
7. Submit QC at each station
8. View production entries and variances


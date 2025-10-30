# Backend Development Implementation Checklist
**Created:** October 30, 2025  
**Status:** In Progress  
**Order:** Complete all backend before starting UI/UX

---

## 🎯 PHASE 1: DATABASE SCHEMA UPDATES

### Task 1.1: Update Batch Model ✅ PRIORITY
- [ ] Add new fields to Batch model in schema.prisma
  - [ ] `subSkuIdentifier`, `parentBatchId`, `subBatchIdentifier`, `lotId`
  - [ ] `totalWeight`, `containerWeight`, `calculatedQty`, `quantityMethod`
  - [ ] `isRejection`, `rejectionReason`, `rejectionStationId`
  - [ ] `reworkRequired`, `reworkCompleted`
  - [ ] `assembledFrom` (String[]), `assembledInto`, `assemblyStation`, `assemblyOperator`, `assemblyDate`
- [ ] Add self-referential relation for parent/sub-batches
- [ ] Add Lot relation
- [ ] Update indexes

### Task 1.2: Create Lot Model ✅ PRIORITY
- [ ] Create Lot model
- [ ] Fields: lotCode, projectId, poNumber, totalQty, cartonCount, palletCount
- [ ] Packing fields: packingStation, packingOperators, packingDate
- [ ] Shipping fields: shippingDestination, customerPO, shippingDate
- [ ] Status tracking
- [ ] Relations to Batch

### Task 1.3: Update BatchMovement Model
- [ ] Ensure all fields present: condition, photos[], notes
- [ ] Verify relations to FromStation and ToStation

### Task 1.4: Rename/Update Station to Workstation
- [ ] Decide: Rename Station model or keep both?
- [ ] Add new fields: workstationType, subType
- [ ] Add: simultaneousOps, canRelocate
- [ ] Add: primaryAssetType, requiredAssets (Json)
- [ ] Add: avgCycleTime, maintenanceInterval
- [ ] Update relations

### Task 1.5: Create Asset Model ✅ NEW
- [ ] Create Asset model
- [ ] Fields: assetCode, assetType, name, specifications (Json)
- [ ] Mobility: isMovable, currentWorkstationId, currentLocation
- [ ] Status: status, condition
- [ ] Maintenance: lastMaintenance, nextMaintenance, maintenanceHistory
- [ ] Tracking: acquisitionDate, cost, depreciation
- [ ] Indexes

### Task 1.6: Create WorkstationAsset Junction Model
- [ ] Create WorkstationAsset model
- [ ] Fields: workstationId, assetId, assignedAt, removedAt
- [ ] isPrimary, isRequired flags
- [ ] Relations and unique constraints

### Task 1.7: Create/Update ProcessConfig Model
- [ ] Verify/create ProcessConfig model
- [ ] Fields: processName, cycleTime, setupTime
- [ ] requiredAssets (Json), materialConsumption (Json)
- [ ] workersRequired, skillsRequired
- [ ] Validation fields

### Task 1.8: Run Migration
- [ ] Generate Prisma migration
- [ ] Review migration SQL
- [ ] Test on development database
- [ ] Apply migration
- [ ] Verify all models and relations

---

## 🎯 PHASE 2: BATCH TRACKING API IMPLEMENTATION

### Task 2.1: Batch Creation Endpoint ✅ CRITICAL
- [ ] POST /api/batches
- [ ] Auto-generate batch code: `PRJ-{code}-SKU-{code}-{YYYYMMDD}-{seq}`
- [ ] Handle weight-based quantity calculation
- [ ] Material lot linking
- [ ] Return batch + handover sheet URL

### Task 2.2: Batch Retrieval Endpoints
- [ ] GET /api/batches (list with filters)
- [ ] GET /api/batches/:id (detailed view with relations)
- [ ] Query params: projectId, status, stationId, date range
- [ ] Include: movements, QC, sub-batches, assembly links

### Task 2.3: Batch Movement Endpoint
- [ ] POST /api/batches/:id/move
- [ ] Create BatchMovement record
- [ ] Update currentStationId
- [ ] Handle partial moves (create sub-batch)
- [ ] Photo upload handling
- [ ] Operator logging

### Task 2.4: Sub-Batch Creation
- [ ] POST /api/batches/:id/split
- [ ] Accept containers array with identifiers and quantities
- [ ] Create child batches with proper linkage
- [ ] Generate labels for each sub-batch
- [ ] Update parent batch status

### Task 2.5: Rejection Handling
- [ ] POST /api/batches/:id/reject
- [ ] Add REJ prefix to batch code
- [ ] Create rejection record
- [ ] Photo upload for defects
- [ ] Route to rework or scrap

### Task 2.6: Rework Completion
- [ ] POST /api/batches/:id/rework-complete
- [ ] Schedule re-inspection
- [ ] Remove REJ prefix if passed
- [ ] Update status

### Task 2.7: Assembly Endpoint
- [ ] POST /api/batches/assemble
- [ ] Validate source batch availability
- [ ] Create new assembled batch
- [ ] Link source batches in assembledFrom
- [ ] Update source batch status (assembledInto)

### Task 2.8: Lot Management Endpoints
- [ ] POST /api/lots (create lot from batches)
- [ ] GET /api/lots/:id (lot details with batches)
- [ ] PUT /api/lots/:id/ship (update shipping info)
- [ ] Generate lot labels

### Task 2.9: Traceability Query Endpoints ✅ IMPORTANT
- [ ] GET /api/batches/:batchCode/trace/forward
- [ ] GET /api/batches/:batchCode/trace/backward
- [ ] GET /api/materials/:lotNumber/batches (recall query)
- [ ] GET /api/workers/:operatorId/batches (quality tracking)

### Task 2.10: Printable Documents
- [ ] GET /api/batches/:id/handover-sheet (PDF/HTML)
- [ ] GET /api/batches/:id/label (QR code generation)
- [ ] GET /api/lots/:id/packing-list
- [ ] Install dependencies: qrcode, pdfkit (if needed)

---

## 🎯 PHASE 3: WORKSTATION & ASSET API IMPLEMENTATION

### Task 3.1: Workstation CRUD Endpoints
- [ ] GET /api/workstations (with filters)
- [ ] GET /api/workstations/:id (detailed with assets)
- [ ] POST /api/workstations (create)
- [ ] PUT /api/workstations/:id (update)
- [ ] DELETE /api/workstations/:id (soft delete)

### Task 3.2: Asset CRUD Endpoints ✅ NEW SYSTEM
- [ ] GET /api/assets (with filters: type, status, location)
- [ ] GET /api/assets/:id (with assignment history)
- [ ] POST /api/assets (create new asset)
- [ ] PUT /api/assets/:id (update specs, status)
- [ ] DELETE /api/assets/:id (soft delete)

### Task 3.3: Asset Assignment Endpoints
- [ ] POST /api/workstations/:id/assets/:assetId/assign
- [ ] POST /api/workstations/:id/assets/:assetId/remove
- [ ] GET /api/workstations/:id/assets (list assigned assets)
- [ ] Validate compatibility before assignment

### Task 3.4: Process Configuration Endpoints
- [ ] POST /api/process-configs (define process)
- [ ] GET /api/process-configs (query by project/workstation)
- [ ] PUT /api/process-configs/:id (update)
- [ ] DELETE /api/process-configs/:id

### Task 3.5: Workstation Performance Tracking
- [ ] Update avgOutputRate on production entries
- [ ] Update avgQualityRate on QC submissions
- [ ] Calculate avgCycleTime from actual vs spec
- [ ] Track totalJobsCompleted

---

## 🎯 PHASE 4: CAPACITY OPTIMIZATION ENGINE

### Task 4.1: Cycle Time Ratio Calculator
- [ ] Create lib/capacityEngine.js
- [ ] Function: calculateWorkstationRatios(stageCycleTimes)
- [ ] Returns optimal station count per stage
- [ ] Example: [60s, 30s, 45s] → [2, 1, 1.5] → [2, 1, 2] stations

### Task 4.2: Workstation Assignment Optimizer
- [ ] Function: optimizeWorkstationAssignments(project, constraints)
- [ ] Input: available workstations, target output, cycle times
- [ ] Algorithm: assign stations to minimize bottlenecks
- [ ] Output: station assignments, expected output, completion time

### Task 4.3: Cross-SKU Balance Monitor
- [ ] Function: checkProductionBalance(projectId)
- [ ] Query all SKUs for project
- [ ] Calculate packing readiness (cartons possible)
- [ ] Identify lagging SKUs
- [ ] Calculate imbalance ratio

### Task 4.4: Rebalancing Recommendation Engine
- [ ] Function: generateRebalancingSuggestions(projectId)
- [ ] Detect bottleneck SKUs
- [ ] Analyze root causes (cycle time, assets, workers, quality)
- [ ] Generate prioritized recommendations
- [ ] Simulate impact of each recommendation

### Task 4.5: Scenario Generator
- [ ] POST /api/optimization/scenarios
- [ ] Generate 3 scenarios: fastest, cheapest, balanced
- [ ] For each: calculate cost, time, resource allocation
- [ ] Return comparison with pros/cons

### Task 4.6: What-If Simulation
- [ ] POST /api/optimization/simulate
- [ ] Accept modified parameters (add workers, change assignments)
- [ ] Run simulation using historical data
- [ ] Return expected outcomes vs current plan

### Task 4.7: Optimization API Endpoints
- [ ] POST /api/optimization/calculate (run optimizer)
- [ ] GET /api/optimization/scenarios (generate scenarios)
- [ ] POST /api/projects/:id/rebalance (rebalancing recommendations)
- [ ] GET /api/projects/:id/balance (check current balance)

---

## 🎯 PHASE 5: LEARNING ENGINE ENHANCEMENTS

### Task 5.1: Enhance Worker Performance Learning
- [ ] Update lib/learningEngine.js
- [ ] Track worker performance by workstation AND process
- [ ] Learn skill specialization patterns
- [ ] Identify training needs automatically

### Task 5.2: Maintenance Pattern Learning
- [ ] Track actual maintenance vs scheduled
- [ ] Identify failure patterns by machine type
- [ ] Predict maintenance needs based on usage
- [ ] Suggest preventive maintenance timing

### Task 5.3: Quality-Workstation Correlation
- [ ] Track quality rates by workstation
- [ ] Identify high-performing stations
- [ ] Correlate quality issues with specific stations/assets
- [ ] Suggest improvements (maintenance for machines, training for workers)

### Task 5.4: User Preference Learning
- [ ] Log when user overrides system suggestions
- [ ] Track outcomes of overrides
- [ ] Learn user preferences (speed vs cost, specific assignments)
- [ ] Adapt future suggestions based on patterns

### Task 5.5: Impact Analysis & Learning
- [ ] When user modifies suggestion: predict impact
- [ ] After completion: compare predicted vs actual
- [ ] Calculate accuracy of predictions
- [ ] Adjust future predictions based on errors

### Task 5.6: Pattern Recognition
- [ ] Identify recurring bottlenecks
- [ ] Detect seasonal/time-based patterns
- [ ] Find process inefficiencies
- [ ] Alert on unusual patterns

---

## 🎯 PHASE 6: WORKER & MANPOWER MANAGEMENT

### Task 6.1: Worker CRUD (Verify Existing)
- [ ] Verify GET /api/workers exists
- [ ] Verify POST /api/workers exists
- [ ] Verify PUT /api/workers/:id exists
- [ ] Add worker exit/termination endpoint if missing

### Task 6.2: Contractor Management
- [ ] Verify ThirdPartyProvider CRUD exists
- [ ] POST /api/contractors (create contractor)
- [ ] GET /api/contractors (list with workers)
- [ ] Link workers to contractors

### Task 6.3: Worker Type Management
- [ ] Ensure workerType field supports: "direct", "contractual", "third_party"
- [ ] Filter workers by type
- [ ] Track contractor vs company split

### Task 6.4: Worker Performance Endpoints
- [ ] Verify GET /api/workers/:id/performance exists
- [ ] Verify GET /api/workers/suggest exists (from learningEngine)
- [ ] Add performance history query
- [ ] Add skill assessment endpoint

---

## 🎯 PHASE 7: EXISTING ENDPOINTS TO COMPLETE

### Task 7.1: Complete Workflow Endpoints
- [ ] Verify api/routes/workflows.js exists (from PHASE2_HANDOVER)
- [ ] If not: create complete workflows.js
- [ ] WorkflowStage CRUD
- [ ] WorkflowTask CRUD
- [ ] WorkflowDependency management

### Task 7.2: Complete Production Endpoints
- [ ] Verify api/routes/production.js exists
- [ ] ProcessConfig CRUD
- [ ] Production calculation (uses calculationEngine)
- [ ] Production entry logging
- [ ] Variance reporting

### Task 7.3: Complete Daily Plans Endpoints
- [ ] Verify api/routes/daily-plans.js exists
- [ ] Generate 3 scenarios endpoint
- [ ] DailyPlan CRUD
- [ ] Material validation
- [ ] Worker suggestions
- [ ] Adaptations tracking

### Task 7.4: Complete Approvals Endpoints
- [ ] Verify api/routes/approvals.js exists
- [ ] ApprovalRequest CRUD
- [ ] Buffer monitoring
- [ ] Override handling with risk logging
- [ ] Reminder integration with notificationService

---

## 🎯 PHASE 8: INTEGRATION & TESTING

### Task 8.1: Register All Routes in api/index.js
- [ ] Register /api/batches
- [ ] Register /api/lots
- [ ] Register /api/workstations (if renamed from stations)
- [ ] Register /api/assets
- [ ] Register /api/optimization
- [ ] Register /api/process-configs
- [ ] Verify all existing routes registered

### Task 8.2: Test Batch Tracking Flow
- [ ] Create batch at molding
- [ ] Move to next station
- [ ] Split into sub-batches
- [ ] Reject some sub-batches
- [ ] Complete rework
- [ ] Assemble multiple SKUs
- [ ] Create lot
- [ ] Test all traceability queries

### Task 8.3: Test Workstation & Asset Management
- [ ] Create workstations
- [ ] Create assets
- [ ] Assign assets to workstations
- [ ] Move assets between workstations
- [ ] Update workstation status
- [ ] Track maintenance

### Task 8.4: Test Capacity Optimization
- [ ] Create project with multiple SKUs
- [ ] Run optimization algorithm
- [ ] Generate scenarios
- [ ] Check production balance
- [ ] Generate rebalancing suggestions
- [ ] Simulate what-if scenarios

### Task 8.5: Test Learning Engine
- [ ] Log worker assignments
- [ ] Log outcomes
- [ ] Verify learning from overrides
- [ ] Check updated suggestions
- [ ] Verify pattern detection

### Task 8.6: Integration Testing
- [ ] Test complete flow: batch creation → production → assembly → packing
- [ ] Test with multiple concurrent projects
- [ ] Test resource conflicts
- [ ] Test bottleneck detection
- [ ] Test rebalancing recommendations

### Task 8.7: Performance Testing
- [ ] Test with large datasets (1000+ batches)
- [ ] Query performance on traceability
- [ ] Optimization algorithm speed
- [ ] Database query optimization
- [ ] Add indexes where needed

---

## 📋 IMPLEMENTATION ORDER (PRIORITY)

### IMMEDIATE (Do First):
1. ✅ Phase 1: Database Schema Updates (ALL tasks)
2. ✅ Phase 2: Batch Tracking API (ALL tasks) - CRITICAL
3. ✅ Phase 3: Workstation & Asset API (ALL tasks) - CRITICAL

### NEXT:
4. Phase 4: Capacity Optimization Engine
5. Phase 5: Learning Engine Enhancements
6. Phase 6: Worker Management (verify/complete)
7. Phase 7: Complete Existing Endpoints

### FINAL:
8. Phase 8: Integration & Testing

---

## ✅ COMPLETION CRITERIA

**Backend Development COMPLETE when:**
- [ ] All database migrations applied successfully
- [ ] All API endpoints implemented and registered
- [ ] All core engines operational (calculation, learning, capacity, optimization)
- [ ] Complete batch tracking flow working end-to-end
- [ ] Workstation and asset management functional
- [ ] Capacity optimization and rebalancing working
- [ ] Learning engine actively improving suggestions
- [ ] All integration tests passing
- [ ] Performance acceptable (<2s response times)
- [ ] Documentation complete for all endpoints

**THEN and ONLY THEN:** Proceed to UI/UX implementation

---

**Current Status:** Starting Phase 1 - Database Schema Updates
**Next Action:** Update Prisma schema with new Batch, Lot, Asset models

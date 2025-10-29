# Phase 2 End-to-End Testing Plan
**Created:** October 29, 2025  
**Status:** Ready for Execution  
**Estimated Duration:** 20-25 minutes

---

## Executive Summary

This document provides a comprehensive E2E testing plan for Phase 2 implementation covering:
- ✅ 18 Backend API Routes
- ✅ 12 Frontend Pages
- ✅ 5 Critical Integration Flows
- ✅ Self-Learning Algorithm Testing
- ✅ Performance & Load Testing

---

## Prerequisites

### Environment Setup
```bash
# 1. Ensure backend is running
cd api
npm run dev
# Should be running on http://localhost:3000

# 2. Ensure frontend is running
cd web
npm run dev
# Should be running on http://localhost:5173

# 3. Database should be accessible (Neon PostgreSQL)
# Check .env file has DATABASE_URL configured
```

### Test User Setup
```sql
-- Create test users in database (run via Prisma Studio or SQL)
-- Admin user: admin@pramara.com / Test@123
-- Manager user: manager@pramara.com / Test@123
-- Worker user: worker@pramara.com / Test@123
```

---

## Test Categories

### Category 1: Backend API Tests (18 Routes)
**Duration:** ~8-10 minutes  
**Tool:** Jest + Supertest  
**Location:** `tests/api/`

| # | API Route | Test Cases | Priority |
|---|-----------|-----------|----------|
| 1 | `/api/workflow` | CRUD, dependencies, approval | High |
| 2 | `/api/process-config` | CRUD, calculation, validation | High |
| 3 | `/api/materials` | CRUD, receive, adjust, alerts | High |
| 4 | `/api/workers` | CRUD, performance, leaderboard | High |
| 5 | `/api/daily-plans` | Generate 3 scenarios, adapt | High |
| 6 | `/api/approvals` | CRUD, buffer status, reminders | High |
| 7 | `/api/mrp` | Calculate, BOM, learning, recommendations | Critical |
| 8 | `/api/stations` | CRUD, capacity | Medium |
| 9 | `/api/tasks` | CRUD, assignment | Medium |
| 10 | `/api/qc-submissions` | CRUD, defects | Medium |
| 11 | `/api/production-entries` | CRUD, batch tracking | Medium |
| 12 | `/api/batches` | CRUD, status tracking | Medium |
| 13 | `/api/shift-entries` | CRUD, worker assignment | Medium |
| 14 | `/api/wip-ledger` | Read, analytics | Medium |
| 15 | `/api/pre-production` | CRUD (molds, trials, PPS) | Low |
| 16 | `/api/compliance` | CRUD (certifications, tests) | Low |
| 17 | `/api/project-policies` | CRUD, versioning | Low |
| 18 | `/api/process-flows` | CRUD, flow steps | Low |

### Category 2: Frontend UI Tests (12 Pages)
**Duration:** ~6-8 minutes  
**Tool:** Playwright  
**Location:** `tests/e2e/frontend/`

| # | Page | Test Cases | Priority |
|---|------|-----------|----------|
| 1 | ProcessConfigurationPage | Form submit, calculate, delete | High |
| 2 | MaterialDashboardPage | Alerts display, receive stock, adjust | High |
| 3 | WorkforceManagementPage | Tabs, leaderboard, providers | High |
| 4 | DailyPlanningPage | Generate scenarios, select, adapt | High |
| 5 | ApprovalTrackerPage | Filter, approve, send reminder | High |
| 6 | MRPCalculatorPage | Calculate, recommendations, accept | Critical |
| 7 | WorkflowBuilderPage | Add stage, dependencies, blocked | High |
| 8 | WIPLedgerPage | Table display, filters | Medium |
| 9 | StationsPage | CRUD operations | Medium |
| 10 | WorkflowPage | View stages | Medium |
| 11 | QCManagementPage | Submit inspection | Medium |
| 12 | ProductionEntryPage | Log production | Medium |
| 13 | BatchTrackingPage | View batches | Medium |

### Category 3: Integration Flows (5 Flows)
**Duration:** ~5-7 minutes  
**Tool:** Jest + Playwright  
**Location:** `tests/integration/`

| # | Flow | Steps | Priority |
|---|------|-------|----------|
| 1 | Production Planning → Material Requirements | Planning → Materials → MRP | Critical |
| 2 | Workflow → QC → Production | Stage → Inspect → Produce → Batch | Critical |
| 3 | Approval Workflow with Buffer Monitoring | Create → Monitor → Remind → Approve | High |
| 4 | Process Config → Cycle Time → Daily Plan | Configure → Calculate → Generate Scenarios | High |
| 5 | MRP Learning Algorithm | Calculate → Record Actual → Improve Accuracy | Critical |

### Category 4: Performance Tests
**Duration:** ~2-3 minutes  
**Tool:** Artillery / k6  
**Location:** `tests/performance/`

| Test | Scenario | Target |
|------|----------|--------|
| API Response Time | 100 concurrent requests | < 500ms avg |
| MRP Calculation | Calculate for 10 projects | < 2s each |
| Dashboard Load | Load with 1000 records | < 1s |
| Daily Planning Generation | Generate 3 scenarios | < 3s |

---

## Test Execution Order

### Phase 1: Backend API Tests (Zero to Hero)
```bash
npm run test:api
```

**Test Sequence:**
1. Authentication & Authorization
2. Stations API (foundation)
3. Workflow Stages API
4. Process Config API
5. Materials API
6. Workers API
7. MRP API (self-learning)
8. Daily Planning API
9. Approval Requests API
10. QC, Production, Batches APIs
11. Supporting APIs (Pre-Prod, Compliance, etc.)

### Phase 2: Frontend UI Tests
```bash
npm run test:e2e
```

**Test Sequence:**
1. Login & Navigation
2. Process Configuration Page
3. Material Dashboard Page
4. Workforce Management Page
5. Daily Planning Page
6. Approval Tracker Page
7. MRP Calculator Page
8. Workflow Builder Page
9. Supporting Pages (WIP, Stations, QC, Production, Batches)

### Phase 3: Integration Tests
```bash
npm run test:integration
```

**Test Sequence:**
1. End-to-End Production Flow
2. MRP Learning Cycle
3. Approval Workflow
4. Daily Planning with Material Validation

### Phase 4: Performance Tests
```bash
npm run test:performance
```

---

## Critical Test Cases (Must Pass)

### 1. MRP Self-Learning Algorithm ⭐⭐⭐
**Why Critical:** Core Phase 2 feature with business value

**Test Steps:**
1. Calculate MRP for Project A (estimated loss: 10%)
2. Record actual consumption (actual loss: 12%)
3. System learns and adjusts avgLossPercent
4. Calculate MRP again - should use 12% instead of 10%
5. Verify confidence score increases with more data points
6. Check recommendations are generated when deviation > 5%

**Expected Results:**
- ✅ First calculation uses estimated 10%
- ✅ Second calculation uses learned 12%
- ✅ Accuracy improves over time
- ✅ Recommendations appear when appropriate
- ✅ Confidence score: 50% initially → 95% after 30 data points

### 2. Daily Planning - 3 Scenario Generation ⭐⭐⭐
**Why Critical:** Core Phase 2 feature with business value

**Test Steps:**
1. Select project with 3 stages
2. Set target quantity: 1000 units
3. Click "Generate 3 Scenarios"
4. System generates: Fastest, Cheapest, Balanced
5. Compare: cost, duration, worker assignments
6. Select "Balanced" and save
7. Adapt plan (change worker)
8. Verify adaptation logged

**Expected Results:**
- ✅ 3 scenarios generated in < 3 seconds
- ✅ Fastest has shortest duration
- ✅ Cheapest has lowest cost
- ✅ Balanced is optimized
- ✅ Material availability checked
- ✅ Adaptation logged with reason

### 3. Approval Tracker - Buffer Monitoring ⭐⭐⭐
**Why Critical:** Core Phase 2 feature with business value

**Test Steps:**
1. Create approval request (due in 3 days)
2. Check buffer status = "At Risk" (yellow)
3. Wait or change due date to tomorrow
4. Buffer status = "Critical" (red)
5. Send reminder via email
6. Approve request
7. Status changes to "Approved" (green)

**Expected Results:**
- ✅ Buffer color coding correct:
  - Green (>5 days)
  - Yellow (2-5 days)
  - Red (<2 days or overdue)
- ✅ Reminder sent successfully
- ✅ Approval workflow completes

### 4. Workforce Management - Performance Leaderboard ⭐⭐
**Why Important:** Tracks worker efficiency

**Test Steps:**
1. Create 5 workers with different performance scores
2. Navigate to Workforce Management page
3. Click "Leaderboard" tab
4. Verify workers sorted by overall score (descending)
5. Check efficiency %, quality %, total shifts displayed

**Expected Results:**
- ✅ Leaderboard shows top performers first
- ✅ Overall score calculated correctly
- ✅ Efficiency and quality metrics accurate

### 5. Process Configuration - Cycle Time Calculation ⭐⭐
**Why Important:** Foundation for daily planning

**Test Steps:**
1. Create process config for "Molding" station
2. Set parameters: setup=30min, cycle=5min/unit, cooldown=10min
3. Calculate cycle time for 100 units
4. Verify: totalTime = 30 + (100 * 5) + 10 = 540 minutes

**Expected Results:**
- ✅ Calculation accurate
- ✅ Results displayed immediately
- ✅ Used in daily planning scenarios

### 6. Material Management - Low Stock Alerts ⭐⭐
**Why Important:** Prevents production delays

**Test Steps:**
1. Create material with stockQuantity=50, minStockLevel=100
2. Navigate to Material Dashboard
3. Verify low stock alert appears (red background)
4. Receive 100 units
5. Alert disappears

**Expected Results:**
- ✅ Alert triggers when stock < minStockLevel
- ✅ Alert clears when stock >= minStockLevel
- ✅ Dashboard summary shows alert count

### 7. Workflow Builder - Dependency Management ⭐⭐
**Why Important:** Prevents blocked production stages

**Test Steps:**
1. Create Stage A (Molding)
2. Create Stage B (Painting) with dependency on Stage A
3. Try to start Stage B before A completes
4. Verify "Blocked Stages" alert appears
5. Complete Stage A
6. Stage B becomes available

**Expected Results:**
- ✅ Dependency enforced
- ✅ Blocked stages clearly indicated
- ✅ Status updates when dependency resolved

---

## Test Data Requirements

### Projects
```javascript
{
  id: "test-project-1",
  name: "Test Project Alpha",
  customerName: "Test Customer",
  status: "active"
}
```

### SKUs
```javascript
{
  id: "test-sku-1",
  projectId: "test-project-1",
  name: "SKU-001",
  targetQuantity: 1000
}
```

### Materials
```javascript
{
  id: "test-material-1",
  name: "Plastic Resin",
  type: "raw_material",
  stockQuantity: 500,
  minStockLevel: 100,
  unitCost: 50
}
```

### Stations
```javascript
{
  id: "test-station-1",
  name: "Molding Station 1",
  type: "molding",
  capacity: 8
}
```

### Workers
```javascript
{
  id: "test-worker-1",
  name: "John Doe",
  type: "company",
  skills: ["molding", "qc"]
}
```

---

## Expected Test Results

### Success Criteria
- ✅ **API Tests:** 90%+ pass rate (minimum)
- ✅ **Frontend Tests:** 85%+ pass rate (minimum)
- ✅ **Integration Tests:** 100% pass rate (critical flows)
- ✅ **Performance Tests:** All targets met
- ✅ **Zero Critical Bugs:** No blocker issues found

### Known Issues (Expected Failures)
- ⚠️ Email sending may fail if Resend API not configured (non-critical)
- ⚠️ S3 uploads may fail if credentials not set (non-critical)
- ⚠️ Some permission tests may fail if RBAC not fully seeded

---

## Test Execution Commands

### Run All Tests
```bash
# Complete test suite (20-25 minutes)
npm run test:all
```

### Run Individual Suites
```bash
# Backend API tests only (~8 minutes)
npm run test:api

# Frontend E2E tests only (~6 minutes)
npm run test:e2e

# Integration tests only (~5 minutes)
npm run test:integration

# Performance tests only (~2 minutes)
npm run test:performance
```

### Run Specific Test Files
```bash
# Test MRP API only
npm test -- tests/api/mrp.test.js

# Test Material Dashboard page only
npx playwright test tests/e2e/frontend/material-dashboard.spec.js
```

### Debug Mode
```bash
# Run with debugging enabled
npm run test:debug

# Run single test in headed mode (see browser)
npx playwright test --headed --debug
```

---

## Test Report Generation

After test execution, reports are generated in:
- **API Tests:** `test-results/api/report.html`
- **E2E Tests:** `test-results/playwright/report.html`
- **Coverage:** `coverage/lcov-report/index.html`
- **Performance:** `test-results/performance/report.json`

### View Reports
```bash
# Open API test report
start test-results/api/report.html

# Open Playwright report
npx playwright show-report

# Open coverage report
start coverage/lcov-report/index.html
```

---

## Troubleshooting

### Common Issues

**Issue 1: Tests fail with "Connection refused"**
```bash
# Solution: Ensure backend is running
cd api && npm run dev
```

**Issue 2: Tests fail with "Database connection error"**
```bash
# Solution: Check DATABASE_URL in .env
# Verify Neon database is accessible
```

**Issue 3: Frontend tests fail with "Timeout"**
```bash
# Solution: Increase timeout in playwright.config.js
# Or ensure frontend is running on correct port (5173)
```

**Issue 4: Authentication fails**
```bash
# Solution: Seed test users
npm run db:seed
# Or use scripts/bootstrap-auth.js
```

---

## Success Checklist

After running all tests, verify:

- [ ] All critical test cases passed (MRP, Daily Planning, Approvals)
- [ ] API response times < 500ms average
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser
- [ ] All 18 backend routes functional
- [ ] All 12 frontend pages accessible
- [ ] Navigation menu works correctly
- [ ] Integration flows complete successfully
- [ ] Test reports generated
- [ ] Coverage > 70% (target)

---

## Next Steps After Testing

1. **Review Test Results:** Check all reports for failures
2. **Fix Critical Bugs:** Address any blocker issues immediately
3. **Update Documentation:** Note any changes needed
4. **Performance Optimization:** If any tests missed targets
5. **Update MASTER_BLUEPRINT:** Mark testing complete
6. **Prepare for Phase 3:** Based on lessons learned

---

**Test Plan Prepared By:** GitHub Copilot  
**Ready for Execution:** When user returns home  
**Estimated Completion:** 20-25 minutes after start

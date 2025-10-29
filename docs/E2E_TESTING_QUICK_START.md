# E2E Testing Quick Start Guide

Welcome home! 🏠 Here's everything ready for you to run the complete E2E test suite.

---

## 🚀 Quick Start (3 Steps)

### 1. Start the Servers (2 terminals)

**Terminal 1 - Backend:**
```bash
cd api
npm run dev
```
Wait for: `Server running on port 3000`

**Terminal 2 - Frontend:**
```bash
cd web
npm run dev
```
Wait for: `Local: http://localhost:5173/`

### 2. Run All Tests
```bash
npm run test:all
```

That's it! Tests will run for 20-25 minutes and show you real-time results.

---

## 📋 What Gets Tested

### ✅ Backend APIs (18 routes)
- Workflow Stages
- Process Configuration
- Materials Management
- **MRP Calculator (Self-Learning)** ⭐
- Workers Management
- **Daily Planning (3 Scenarios)** ⭐
- **Approval Tracker (Buffer Monitoring)** ⭐
- QC, Production, Batches
- Pre-Production, Compliance
- And more...

### ✅ Frontend Pages (12 pages)
- Process Configuration Page
- Material Dashboard Page
- Workforce Management Page
- **Daily Planning Page** ⭐
- **Approval Tracker Page** ⭐
- **MRP Calculator Page** ⭐
- Workflow Builder Page
- WIP Ledger, Stations, QC, Production, Batches

### ✅ Integration Flows (5 critical flows)
- Complete Production Flow (Planning → MRP → Production → QC → Batch)
- MRP Self-Learning Cycle
- Approval Workflow with Buffer Monitoring
- Daily Planning with Material Validation
- Process Configuration → Cycle Time Calculation

---

## 🎯 Individual Test Commands

If you want to run specific test categories:

### Backend API Tests Only (~8 min)
```bash
npm run test:api
```

### Frontend E2E Tests Only (~6 min)
```bash
npm run test:e2e
```

### Integration Tests Only (~5 min)
```bash
npm run test:integration
```

### With Visual Browser (See tests run)
```bash
npm run test:e2e:headed
```

### Debug Mode (Step through tests)
```bash
npm run test:debug
```

---

## 📊 Test Reports

After tests complete, view reports:

### API Test Report
```bash
# Open in browser
start test-results/api/report.html
```

### E2E Test Report
```bash
npx playwright show-report
```

### Test Summary
```bash
# JSON summary of all results
cat test-results/test-summary.json
```

---

## 🔍 Prerequisites Check

Before running tests, verify:

1. **Backend running:** http://localhost:3000/api/debug should respond
2. **Frontend running:** http://localhost:5173 should load
3. **Database accessible:** Check DATABASE_URL in .env
4. **Test user exists:** admin@pramara.com / Test@123

---

## 🧪 Critical Tests to Watch

These are the most important Phase 2 features:

### 1. MRP Self-Learning Algorithm ⭐⭐⭐
**What it tests:**
- Calculates material requirements
- Records actual consumption
- Learns from deviations
- Improves accuracy over time
- Generates recommendations

**Pass criteria:**
- ✅ First calculation uses estimated loss (10%)
- ✅ After learning, uses actual loss (12%)
- ✅ Confidence score improves (50% → 95%)
- ✅ Recommendations appear when deviation > 5%

### 2. Daily Planning - 3 Scenarios ⭐⭐⭐
**What it tests:**
- Generates 3 scenarios: Fastest, Cheapest, Balanced
- Compares cost vs duration
- Validates material availability
- Worker assignment optimization
- Plan adaptation (worker change, qty change)

**Pass criteria:**
- ✅ 3 scenarios generated in < 3 seconds
- ✅ Fastest has shortest duration
- ✅ Cheapest has lowest cost
- ✅ Adaptation logged with reason

### 3. Approval Tracker - Buffer Monitoring ⭐⭐⭐
**What it tests:**
- Buffer status calculation (days remaining)
- Color-coded indicators (red/yellow/green)
- Reminder sending (email/SMS/WhatsApp)
- Approval workflow completion

**Pass criteria:**
- ✅ Red (<2 days), Yellow (2-5d), Green (>5d)
- ✅ Reminders sent successfully
- ✅ Status updates correctly

---

## 🐛 Troubleshooting

### Tests fail with "Connection refused"
**Solution:** Backend not running
```bash
cd api && npm run dev
```

### Tests fail with "Timeout waiting for element"
**Solution:** Frontend not running
```bash
cd web && npm run dev
```

### Tests fail with "Database connection error"
**Solution:** Check .env file
```bash
# Verify DATABASE_URL is set correctly
cat .env | grep DATABASE_URL
```

### Tests fail with "Authentication error"
**Solution:** Seed test users
```bash
npm run db:seed
# Or use bootstrap script
node scripts/bootstrap-auth.js
```

### All tests pass but some warnings appear
**Expected:** Non-critical warnings about:
- Email sending (if Resend not configured)
- S3 uploads (if credentials not set)
- Some RBAC permissions (if not fully seeded)

---

## ⏱️ Expected Duration

| Test Category | Duration | Priority |
|--------------|----------|----------|
| Backend APIs | 8-10 min | High |
| Frontend E2E | 6-8 min | High |
| Integration | 5-7 min | Critical |
| Performance | 2-3 min | Medium |
| **TOTAL** | **20-25 min** | - |

---

## ✅ Success Criteria

After all tests complete, you should see:

```
📊 TEST SUMMARY
==================================================
Total Tests: 3
✅ Passed: 3
❌ Failed: 0
⏱️  Total Duration: 1420.50s

🎉 All tests passed! Phase 2 implementation verified.
```

---

## 📞 What to Do After Tests

### If All Tests Pass ✅
1. Review test reports
2. Check coverage reports (should be > 70%)
3. Verify no console errors in browser
4. Update MASTER_BLUEPRINT.md with testing complete
5. Celebrate! 🎉

### If Some Tests Fail ❌
1. Review error messages in terminal
2. Check test-results/ directory for details
3. Fix critical bugs first (MRP, Daily Planning, Approvals)
4. Re-run failed tests: `npm run test:api` (for specific category)
5. Let me know - I'll help debug!

---

## 🎓 Understanding Test Results

### Test Output Explained
```
🧪 Running: Backend API Tests
==================================================
  MRP API Tests
    ✓ should calculate MRP with estimated loss (1234ms)
    ✓ should use learned loss percentage if available (2345ms)
    ✓ should demonstrate learning improvement over time (5678ms)
    
  ✅ 15 passing (8.5s)
  ❌ 0 failing
```

### What Each Symbol Means
- ✓ = Individual test passed
- ✗ = Individual test failed
- ⚠ = Warning (non-critical)
- ✅ = Test suite passed
- ❌ = Test suite failed

---

## 💡 Pro Tips

1. **Run tests in order:**
   - Backend first (foundation)
   - Frontend second (UI)
   - Integration last (full flow)

2. **Watch the browser during E2E tests:**
   ```bash
   npm run test:e2e:headed
   ```
   You'll see Playwright actually using your app!

3. **Parallel execution:**
   Tests run sequentially by default for stability.
   For faster runs (after first pass), edit `playwright.config.js`

4. **Keep servers running:**
   Don't stop backend/frontend during tests

5. **Check reports after:**
   Screenshots and videos are saved for failed tests

---

## 📚 Documentation

For detailed test cases and expected results, see:
- **Test Plan:** `docs/E2E_TESTING_PLAN.md`
- **Verification Report:** `docs/PHASE2_BACKEND_FRONTEND_VERIFICATION.md`
- **Master Blueprint:** `docs/MASTER_BLUEPRINT.md`

---

**Ready when you are! Just run `npm run test:all` and let me know how it goes!** 🚀

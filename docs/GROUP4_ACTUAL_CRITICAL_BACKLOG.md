# Group 4: ACTUAL Critical Backlog Items

**Date**: November 3, 2025  
**Current Status**: Groups 1-3 from Missing Items Backlog NOT YET STARTED  
**Source**: MISSING_ITEMS_BACKLOG.md (the REAL priority list)

---

## ⚠️ CORRECTION: What We Actually Need To Do

I apologize for the confusion. I was referencing the **MASTER_IMPLEMENTATION_TASKLIST.md** (UI/UX enhancements like batch tracking, theme system, etc.), but the **MISSING_ITEMS_BACKLOG.md** contains the **CRITICAL FIXES** that are blocking production:

### The Real Priority Order (from MISSING_ITEMS_BACKLOG.md):

🔴 **Group 1: Critical API Fixes** (Days 1-7) - **NOT STARTED**
- Fix project context architecture issue FIRST (affects everything)
- Restore all broken API endpoints (Workforce, QC, Compliance, Certifications, Approvals, Materials, MRP)

🟠 **Group 2: Core Workflows** (Days 8-14) - **NOT STARTED**
- Approval creation flows
- Execution auto-fill
- Certificate uploads
- Files ACL
- Board fix

🟡 **Group 3: Infrastructure** (Days 15-24) - **NOT STARTED** 
- Factory hierarchy
- Central Workforce
- Tasks/Reminders
- Search

🟢 **Group 4: UX & Analytics** (Days 25-34) - **NOT STARTED**
- Home dashboard
- Context improvements
- Clarity/tooltips
- Polish items

---

## 🔥 CRITICAL: Group 1 Should Be Started NOW

### Group 1 Breakdown: Critical API Fixes (7 Issues)

#### **Priority 1: Fix Project Context Architecture** 🚨
- **Issue**: [UX-PROJECT-TAB-INTEGRATION-021]
- **Problem**: Pages moved from global sidebar to project tabs without proper redesign
  - Forms inside project tabs still show "Select Project" dropdown (should auto-select current project)
  - No ProjectProvider context being consumed
  - Blank dropdowns in Planning, QC, Station management
- **Impact**: Affects ALL project-scoped features
- **Estimated Time**: 1-2 days
- **Files**:
  - Frontend: Add ProjectProvider context wrapper
  - Update all project tab pages to use `useProjectContext()`
  - Remove/disable project dropdowns when in project context

---

#### **Priority 2: Fix Broken API Endpoints** (6 Critical Issues)

##### 1. **Workforce Management API - 500 Errors**
- **Issue**: [API-WORKFORCE-500-005]
- **Status**: ✅ **ALREADY FIXED** (Nov 3, 2025)
- **Fix Applied**: Fixed route ordering in `api/routes/workers.js`

##### 2. **Materials Dashboard API - 500 Errors**
- **Issue**: [API-MATERIALS-500-006]
- **Status**: ✅ **ALREADY FIXED** (Nov 3, 2025)
- **Fix Applied**: Fixed route ordering in `api/routes/materials.js`

##### 3. **MRP Calculator API - 500 Errors**
- **Issue**: [API-MRP-500-008]
- **Problem**: `/api/mrp/calculate` returns 500 or doesn't exist
- **Estimated Time**: 3-4 hours
- **Implementation**:
  - Create `POST /api/mrp/calculate` endpoint
  - Accept: projectId, skuId, targetQuantity, lossType, lossPercentage
  - Calculate: required materials from BOM + loss factor
  - Return: materials needed, total cost, shortfall alerts

##### 4. **Approvals API - 500 Errors**
- **Issue**: [API-APPROVALS-500-010]
- **Status**: ✅ **ALREADY FIXED** (Nov 3, 2025)
- **Fix Applied**: Fixed route ordering in `api/routes/approval-requests.js`

##### 5. **Compliance API - 404 Not Found**
- **Issue**: [API-COMPLIANCE-404-012]
- **Problem**: `/api/compliance` doesn't exist
- **Estimated Time**: 2-3 hours
- **Implementation**:
  - Create `api/routes/compliance.js`
  - Endpoints: GET/POST/PUT/DELETE for compliance requirements
  - Register in `api/index.js`

##### 6. **Certifications API - 404 Not Found**
- **Issue**: [API-CERTIFICATIONS-404-013]
- **Problem**: `/api/certifications` doesn't exist
- **Estimated Time**: 2-3 hours
- **Implementation**:
  - Create `api/routes/certifications.js`
  - Endpoints: GET/POST/PUT/DELETE for certifications
  - Register in `api/index.js`

##### 7. **QC Management API - 500 Errors**
- **Issue**: [API-QC-500-018]
- **Problem**: `/api/qc-submissions` returns 500
- **Estimated Time**: 3-4 hours
- **Implementation**:
  - Fix/create `api/routes/qc-submissions.js`
  - Endpoints: GET/POST/PUT/DELETE for QC inspections
  - Analytics summary endpoint

---

## 📊 Group 1 Implementation Plan

### **Total Estimated Time**: 3-4 days

| Issue | Status | Priority | Est. Time | Assigned |
|-------|--------|----------|-----------|----------|
| Project Context Architecture | ⏳ TO DO | P0 | 1-2 days | Frontend |
| Workforce API | ✅ DONE | P0 | - | - |
| Materials API | ✅ DONE | P0 | - | - |
| MRP Calculator API | ⏳ TO DO | P0 | 3-4 hours | Backend |
| Approvals API | ✅ DONE | P0 | - | - |
| Compliance API | ⏳ TO DO | P0 | 2-3 hours | Backend |
| Certifications API | ⏳ TO DO | P0 | 2-3 hours | Backend |
| QC Management API | ⏳ TO DO | P0 | 3-4 hours | Backend |

### **Completion Status**: 3/8 Done (37.5%)

---

## 🎯 Recommendation: Start Group 1 Immediately

### What Should Happen Next:

1. **Day 1**: Fix Project Context Architecture
   - Add ProjectProvider wrapper
   - Update all project tab pages
   - Remove redundant project dropdowns

2. **Day 2**: Complete Missing API Endpoints
   - MRP Calculator API (3-4 hours)
   - Compliance API (2-3 hours)
   - Certifications API (2-3 hours)

3. **Day 3**: Fix QC Management
   - QC Submissions API (3-4 hours)
   - Test all endpoints
   - Verify no 500/404 errors

4. **Day 4**: Testing & Validation
   - Test all Group 1 fixes
   - Verify project context propagation
   - Document completion

---

## ❌ What I Was Doing (WRONG)

I was working on **MASTER_IMPLEMENTATION_TASKLIST.md** items:
- ✅ Group 3 Infrastructure (Factory Hierarchy, Reminders, Search) - COMPLETED
- ⏳ Proposed Group 4: Lot Management - NOT RELEVANT

**BUT** these are UI/UX enhancements, NOT critical bug fixes!

---

## ✅ What We Should Do (CORRECT)

Work on **MISSING_ITEMS_BACKLOG.md** items:
- 🔴 Group 1: Critical API Fixes (3/8 done, 5 remaining)
- 🟠 Group 2: Core Workflows (not started)
- 🟡 Group 3: Infrastructure (not started)
- 🟢 Group 4: UX & Analytics (not started)

---

## 🚀 Next Steps

**Option A: Continue with Group 1 Critical Fixes** (RECOMMENDED)
- Fix project context architecture (1-2 days)
- Complete 5 remaining API endpoints (1-2 days)
- Total: 3-4 days to complete Group 1

**Option B: Document Current Status**
- Create detailed Group 1 task breakdown
- Prioritize remaining 5 issues
- Create implementation checklist

---

**Which would you like me to proceed with?**

1. Start implementing Group 1 Critical Fixes (Project Context + Missing APIs)
2. Create detailed implementation plan for Group 1
3. Something else?

I apologize for the confusion - I should have checked the MISSING_ITEMS_BACKLOG.md first!


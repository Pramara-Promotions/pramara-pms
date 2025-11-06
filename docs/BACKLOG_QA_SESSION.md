# Backlog Q&A Session - Pre-Implementation Clarifications

**Date**: November 3, 2025  
**Total Items**: 22  
**Status**: Awaiting user responses before implementation

---

## 📐 ARCHITECTURAL DECISIONS (Critical - Must Answer First)

### Q1: Project-Specific vs. Global Features
**Context**: Items affected: UX-PROJECT-TAB-INTEGRATION-021, UX-PROJECT-CONTEXT-019, Daily Planning, QC Management

**Question**: Should these features be **project-specific** (only show data for current project when accessed from project tabs) OR **global** (show all data across projects with filters)?

| Feature | Your Preference? | Impact |
|---------|------------------|--------|
| **Daily Planning** | Project-specific / Global / Both views? | If project-specific: remove from project tabs, Planning tab shows only that project's plans. If global: keep as sidebar item, allow multi-project selection |
| **QC Management** | Project-specific / Global / Both views? | If project-specific: QC in project shows only that project's inspections |
| **Station Management** | Project-specific / Global / Both views? | Stations are usually shared resources - should be global? |
| **Process Flow Builder** | Project-specific / Global / Both views? | Flows usually project-specific or reusable templates? |
| **Materials Dashboard** | Project-specific / Global / Both views? | Inventory is typically global, but can reserve per project? |
| **MRP Calculator** | Project-specific / Global / Both views? | Calculate for one project at a time or cross-project? |

**My Recommendation**: 
- **Project-Specific** (in project tabs, auto-use current project): Daily Planning, QC inspections, Compliance, Files, Board, Execution
- **Global** (Admin/sidebar, multi-project view): Station Management, Workforce Management, Materials Dashboard, Process Flow Library (with templates)
- **Both Views**: MRP Calculator (can calculate for one project or compare across projects)

**Your Answer**: as per your recommendation, but for project specific item, when looked from search they should show universal overview and report and then when clicked on any item, take to specifc project and section

---

### Q2: Factory Hierarchy - Current Setup
**Context**: Item STATION-HIERARCHY-017 - Missing factory/floor/room hierarchy

**Question**: Do you currently operate:
- [ ] **Single factory** (one location, but need floors/rooms for organization)
- [ ] **Multiple factories** (different cities/locations)
- [ ] **Planning for multiple factories** (future-proofing even if single now)

**Follow-up**: If multiple factories, should user switch between factories in UI, or see aggregate data across all factories?

**Your Answer**: we have multiple factory. so we will have factory/ floor/ room/ and then our workstations. and the user can switch between factory in ui and also see aggrefate data as i suggested showing on home page also

---

### Q3: Workforce - Company vs. 3rd Party Split
**Context**: Item WORKFORCE-CENTRAL-004 - Central Workforce Management

**Question**: What's your typical workforce split?
- Company employees: not fixed, varies
- 3rd-party contractors: not fixed, varies
this is not a uniform sprit, varies always. so when adding a workforce, system will ask whether it company or contactors. and which contractor. we will have ability to add new contractor also

**Follow-up**: Are 3rd-party workers:
- [X] Supplied by contractors (contractor manages workers, you just use them) - they supply
- [ ] Individual freelancers (you hire directly)
- [ ] Both

**Performance Tracking**: Should contractor performance affect their future assignments/contract renewals?
- [X] Yes - track and use for evaluation
- [ ] No - just track for visibility

**Your Answer**: this report will be used for evaluation and rate discussions also

---

## 🔧 FEATURE SCOPE CLARIFICATIONS

### Q4: Tasks & Reminders System
**Context**: Item TASK-REM-001 - Global task creation + consolidated hub

**Question**: What types of tasks do you need?
- [x] Project tasks (linked to specific project)
- [x] Personal tasks (individual to-do items)
- [x] Team tasks (assign to multiple people)
- [x] Recurring tasks (daily/weekly/monthly)

**Reminders**: Should reminders be:
- [ ] Separate from tasks (standalone reminder system)
- [ ] Linked to tasks (task due date triggers reminder)
- [x] Both

**Notifications**: How should users be notified?
- [ ] In-app only
- [ ] Email
- [x] Both (user preference)

**Your Answer**: ________________________________________

---

### Q5: Approval Workflows - Priority Order
**Context**: Items API-APPROVALS-500-010, APPROVAL-WORKFLOW-011

**Question**: Which approval types are most urgent for your business?

| Approval Type | Priority (1=urgent, 5=can wait) | Notes |
|---------------|--------------------------------|-------|
| **Document approvals** (Files, Compliance docs) | ___ | |
| **Stage gate approvals** (PreProd → Production) | ___ | |
| **Budget approvals** (material purchases, capacity) | ___ | |
| **QC approvals** (batch release, quality sign-off) | ___ | |
| **Design approvals** (mold, PPS, artwork) | ___ | |

All of above

**Approval Routing**: Should approvals go to:
- [x] Specific named person (user selects approver) if not selected then the 2nd option below
- [x] Role-based (any Manager/Admin can approve)
- [ ] Sequential chain (Manager → Admin → Executive)

**Your Answer**: ________________________________________

---

### Q6: Execution Auto-Fill - Data Sources
**Context**: Item EXEC-AUTOFILL-015 - Shift Entries auto-fetch from planning

**Question**: When creating Shift Entry, system should prefill from:
- [ ] **Daily Plan** (what to produce, targets)
- [ ] **Manpower Plan** (worker-to-station assignments)
- [x] **Both** (preferred - full auto-fill)

**Manual Override**: If plan changed during the day (worker absent, target adjusted), should user:
- [x] Edit prefilled data directly (modify in Shift Entry form)
- [ ] Update original plan first (go back to Daily Plan)
- [ ] Either (flexible)

**Your Answer**: this will be then used to check planned vs actual and then improve on the same

---

### Q7: MRP Calculator - Loss Factor Logic
**Context**: Items API-MRP-500-008, UX-MRP-009 - MRP calculation clarity

**Question**: How do you calculate material loss/waste?

**Option A: Project-Wide Loss**
- Apply same loss % to all materials for this project
- Example: 5% waste across all materials

**Option B: Per-Material Loss**
- Each material has its own loss % (e.g., fabric 8%, plastic 3%)
- More accurate but requires setup per material

**Option C: Historical Learning**
- System learns actual loss from past production
- Auto-adjusts loss % based on historical data

**Your Preference**: A / B / C / Combination?

**Your Answer**: B with C, user will enter, but system will also suggest on historical data
---

### Q8: Materials Dashboard - Workflow Clarification
**Context**: Item UX-MATERIALS-007 - Materials workflow unclear

**Question**: Describe your typical materials workflow:

**Step 1**: ________ (e.g., "Purchase materials and add to inventory")  
**Step 2**: ________ (e.g., "Reserve materials for project when order confirmed")  
**Step 3**: ________ (e.g., "Consume materials during production, log usage")  
**Step 4**: ________ (e.g., "System alerts when stock below minimum, trigger reorder")

**Follow-up**: Should materials be:
- [ ] Reserved per project (locked, can't use for other projects)
- [ ] Allocated per project (soft allocation, can reallocate if needed)
- [ ] First-come-first-served (no reservation, just check availability)

**Your Answer**: material is sourced for a proiject only, so there is no such thing as sharing between projects. and as fasr as flow is concerned, allow it to be custoisable with some standard data there and allow the custom flow and field to be saved

---

### Q9: Home Dashboard - Data Priority
**Context**: Item HOME-DASHBOARD-ANALYTICS-022 - Comprehensive home dashboard

**Question**: Rank dashboard sections by importance (1=most important, 6=least)

| Section | Rank | Show by default? |
|---------|------|------------------|
| **Factory Performance** (multi-factory overview) | ___ | Yes / No |
| **Production Performance** (output vs. plan) | ___ | Yes / No |
| **Quality Metrics** (QC pass rates, defects) | ___ | Yes / No |
| **Workforce Status** (active workers, productivity) | ___ | Yes / No |
| **Project Health** (on-track vs. at-risk) | ___ | Yes / No |
| **My Work** (personal tasks, pending actions) | ___ | Yes / No |

**Refresh Rate**: How often should dashboard update?
- [x] Real-time (live updates via WebSocket)
- [ ] Every 30 seconds (auto-refresh)
- [ ] Every 1 minute
- [ ] Manual refresh only

**Your Answer**: section view can be priortized by user as they want, you can keep the one you suggested as default

---

### Q10: Certification File Uploads - Storage Duration
**Context**: Item CERT-UPLOAD-014 - Certificate file uploads

**Question**: Certificate files (ISO docs, audit reports) are typically large PDFs. 

**Storage**: Should system:
- [x] Keep all certificate files forever (for audit trail)
- [ ] Archive after expiry (move to cold storage)
- [ ] Delete after X years (specify: ___ years)

**Audit Trail**: When certificate expires or is replaced, should old file:
- [x] Remain accessible (historical records)
- [ ] Be marked as "Superseded" but still viewable
- [ ] Be deleted (only keep current)

**Your Answer**: ________________________________________

---

## 🚦 IMPLEMENTATION FLOW PROPOSAL

Based on all 22 items, I propose this implementation flow:

### 🔴 **Phase 1: Critical Blockers (Fix First - Week 1)**
**Goal**: Unblock completely broken pages

1. **UX-PROJECT-TAB-INTEGRATION-021** - Fix architectural issue with project context (affects multiple items)
2. **API-WORKFORCE-500-005** - Workforce Management APIs (needed by dashboard + execution)
3. **API-QC-500-018** - QC Management APIs (critical quality control)
4. **API-COMPLIANCE-404-012** - Project Compliance APIs
5. **API-CERTIFICATIONS-404-013** - Certifications APIs
6. **API-APPROVALS-500-010** - Approval Tracker APIs
7. **API-MATERIALS-500-006** - Materials Dashboard APIs
8. **API-MRP-500-008** - MRP Calculator APIs

**Outcome**: All pages load without 500/404 errors; empty states show correctly

---

### 🟠 **Phase 2: Core Workflows (Week 2)**
**Goal**: Complete critical business workflows

9. **APPROVAL-WORKFLOW-011** - Approval creation workflow (documents, stage gates, budgets)
10. **EXEC-AUTOFILL-015** - Execution auto-fill from planning (eliminate double entry)
11. **CERT-UPLOAD-014** - Certificate file uploads (compliance requirement)
12. **FILES-AGG-ACL-001** - Files tab aggregation + ACL (information architecture)
13. **PROJ-BOARD-LOAD-001** - Fix Board tab loading spinner

**Outcome**: Users can complete end-to-end workflows; data flows correctly from planning → execution

---

### 🟡 **Phase 3: Infrastructure & Scalability (Week 3)**
**Goal**: Build foundation for growth

14. **STATION-HIERARCHY-017** - Factory/floor/room hierarchy (must-have for scaling)
15. **WORKFORCE-CENTRAL-004** - Central Workforce Management system
16. **TASK-REM-001** - Global tasks/reminders system
17. **SEARCH-GLB-001** - Fix global search functionality

**Outcome**: System scales to multiple factories; workforce tracking in place; findability improved

---

### 🟢 **Phase 4: UX Polish & Analytics (Week 4)**
**Goal**: Improve usability and insights

18. **HOME-DASHBOARD-ANALYTICS-022** - Comprehensive home dashboard
19. **UX-PROJECT-CONTEXT-019** - Remove redundant project selectors
20. **UX-MATERIALS-007** - Materials workflow clarity (tooltips, help)
21. **UX-MRP-009** - MRP calculation clarity (formula explanation)
22. **API-STATION-ANALYTICS-500-016** - Station analytics endpoint
23. **PROJ-TABS-ORDER-002** - Tab order consistency
24. **PROCESS-FLOW-ADD-OP-020** - Process Flow "Add Operation" button
25. **AUTH-PREFS-401-003** - Fix 401 on user preferences
26. **HOME-BG-001** - Home page background improvement
27. **HOME-THEME-002** - Dark/light mode toggle
28. **NAV-ADMIN-001** - Move Admin actions to avatar menu

**Outcome**: Professional, polished UI; actionable analytics; user delight

---

## 📊 ESTIMATED TIMELINE

| Phase | Duration | Items | Dependencies |
|-------|----------|-------|--------------|
| **Phase 1** | 5-7 days | 8 items (API fixes) | Architectural decision (Q1) required first |
| **Phase 2** | 5-7 days | 5 items (workflows) | Phase 1 APIs must be complete |
| **Phase 3** | 7-10 days | 4 items (infrastructure) | Prisma migrations, major refactors |
| **Phase 4** | 7-10 days | 10 items (UX polish) | Can run parallel to Phase 3 in some areas |
| **Total** | **24-34 days** | **27 items** | (includes buffer for testing/fixes) |

---

## ❓ QUESTIONS SUMMARY (Answer These to Start)

**Must Answer**:
- [ ] Q1: Project-specific vs. global features (architectural decision)
- [ ] Q2: Factory hierarchy - single or multiple?
- [ ] Q3: Workforce split (company vs. 3rd-party)

**Should Answer**:
- [ ] Q4: Tasks/reminders scope
- [ ] Q5: Approval priority order
- [ ] Q6: Execution auto-fill data sources
- [ ] Q7: MRP loss factor logic
- [ ] Q8: Materials workflow steps

**Nice to Answer**:
- [ ] Q9: Home dashboard data priority
- [ ] Q10: Certificate storage duration

---

## 🚀 NEXT STEPS

1. **You answer questions above** (at least Q1-Q3 are critical)
2. **I'll update backlog** with your decisions
3. **I'll create detailed implementation plan** for Phase 1
4. **We start with Phase 1 API fixes** (5-7 days)
5. **Daily progress updates** with demos of completed items
6. **Weekly review** to adjust priorities if needed

**Ready to proceed?** 🎯

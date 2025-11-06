# Missing Items Backlog

Purpose: Capture all gaps you report, agree on acceptance criteria, then execute in priority order. We won’t ship fixes until you confirm this backlog.

## How we’ll use this doc
- You list items; I add them to Inbox immediately.
- For each, we’ll fill: Context, Affected Areas, Acceptance Criteria, Priority, Owner, Status.
- After you confirm the list is complete and prioritized, we’ll move to Planned and start delivering in small PRs.

## Status legend
- Status: Inbox → Scoping → Planned → In-Progress → In-Review → Done
- Priority: P0 (Blocker), P1 (High), P2 (Medium), P3 (Low)

---

## Inbox (newly reported; awaiting triage)

<!-- Add new items below as bullet points or use the template. -->

### [HOME-DASHBOARD-ANALYTICS-022] Home page lacks comprehensive factory performance dashboard with visual analytics
- Context: Home page currently shows basic widgets (My Work, Active Projects, simple stat cards: 8 Active Projects, 0 On Track, 0 Need Attention) but lacks a **comprehensive performance dashboard** that visualizes real-time factory operations and performance indicators. Required dashboard should show: (1) **Multi-factory overview**: How each factory is performing (if multiple factories exist per STATION-HIERARCHY-017), (2) **Output vs. Plan**: Actual production output compared to daily/weekly targets across all projects, (3) **Efficiency metrics**: OEE (Overall Equipment Effectiveness), utilization rates, downtime by factory/floor, (4) **Project health**: On-track vs. at-risk vs. delayed projects with visual indicators, (5) **Quality metrics**: QC pass rates, rejection rates, defect trends, (6) **Workforce metrics**: Active workers, absenteeism, productivity per shift. All data should be presented in **graphical, visual, animated, and text formats** (charts, gauges, sparklines, animated counters, status badges). This dashboard serves as **executive overview** for management to quickly assess overall operations health.
- Affected Areas:
  - Frontend: `web/src/pages/home/HomePage.tsx` (major redesign)
    - Replace basic stat cards with rich dashboard layout
    - Add chart components: Bar charts (output vs. plan per project/factory), Line charts (trends over time), Gauge charts (OEE, efficiency %), Donut charts (project status distribution, QC pass/fail), Heatmap (downtime by station/floor)
    - Add animated counters for key metrics (total output today, active workers, projects)
    - Add visual status indicators: green (on track), amber (attention needed), red (critical)
    - Layout: Grid with sections for Factories, Projects, Production, Quality, Workforce
  - Backend/API: `api/routes/dashboard.js` or `analytics.js`
    - `GET /api/dashboard/overview` (aggregated data for home dashboard)
      - Response: `{ factories: [...], production: {...}, quality: {...}, workforce: {...}, projects: {...} }`
    - Factories section: per-factory stats (if multi-factory setup exists)
      - `{ factoryId, name, status, utilization, outputToday, efficiency, onTimeDelivery }`
    - Production section:
      - `{ totalOutputToday, targetOutputToday, variance, topPerformingProjects: [...], underperformingProjects: [...], outputTrend: [{ date, actual, target }] }`
    - Quality section:
      - `{ qcPassRate, rejectionRate, defectRate, topDefectTypes: [...], qualityTrend: [{ date, passRate }] }`
    - Workforce section:
      - `{ activeWorkers, totalWorkers, absenteeism, productivityAvg, topPerformers: [...] }`
    - Projects section:
      - `{ totalProjects, onTrack, needAttention, critical, projectHealthDistribution: { onTrack: N, atRisk: M, delayed: K } }`
  - Data Aggregation: Query and calculate metrics from multiple sources
    - Production data: aggregate from ShiftEntry, ProductionEntry (actual output), DailyPlan (target output)
    - Quality data: aggregate from QCSubmission (pass/fail counts, defect types)
    - Workforce data: aggregate from attendance, worker assignments, performance records
    - Project health: calculate from project timelines, milestones, delivery dates
  - Charting Library: Integrate charts (Recharts, Chart.js, or Tremor)
    - Bar Chart: Output vs. Plan (X-axis: projects or dates, Y-axis: units, two bars: actual + target)
    - Line Chart: Trend over time (production output, QC pass rate, efficiency % over last 7/30 days)
    - Gauge Chart: OEE percentage (0-100%), color-coded (green >85%, amber 70-85%, red <70%)
    - Donut Chart: Project status distribution (green slice = on track, amber = at risk, red = delayed)
    - Heatmap: Downtime by station/floor (color intensity = hours of downtime)
  - Animation: Add smooth animations
    - Counters: animate from 0 to actual value on page load (e.g., 1,245 units produced today)
    - Chart transitions: smooth bar/line animations when data updates
    - Status badges: pulse animation for critical items
    - Auto-refresh: dashboard data refreshes every 30 seconds (real-time updates via WebSocket or polling)
- Acceptance Criteria:
  - Dashboard Layout & Structure
    - [ ] Home page divided into clear sections: Factories Overview (if multi-factory), Production Performance, Quality Metrics, Workforce Status, Project Health.
    - [ ] Responsive grid layout: desktop 2-3 columns, tablet 2 columns, mobile single column.
    - [ ] Each section has header with icon and "View Details" link to drill-down page.
  - Factory Performance (Multi-Factory)
    - [ ] If multiple factories exist (per STATION-HIERARCHY-017), show factory cards with: Factory Name, Status badge (Operational/Maintenance/Offline), Utilization % (gauge chart), Output Today vs. Target, Efficiency %.
    - [ ] Click factory card → navigate to factory-specific dashboard with floor/room breakdowns.
    - [ ] If single factory: show factory-wide metrics at top of dashboard.
  - Production Performance Section
    - [ ] **Output vs. Plan Bar Chart**: Shows today's or this week's output vs. target for top 5 projects; bars color-coded (green if ahead, amber if on target, red if behind).
    - [ ] **Key Metrics Cards**: Total Output Today (animated counter), Target Output Today, Variance (± units with % and colored indicator), On-Time Delivery Rate %.
    - [ ] **Trend Line Chart**: Production output over last 7 days (two lines: actual output + planned target).
    - [ ] Top Performing Projects list (3-5 projects ahead of schedule) and Underperforming Projects list (behind schedule).
  - Quality Metrics Section
    - [ ] **QC Pass Rate Gauge**: Large gauge showing overall pass rate % (0-100%), color-coded.
    - [ ] **Key Metrics Cards**: Rejection Rate %, Defect Rate %, Total Inspections Today.
    - [ ] **Donut Chart**: Pass vs. Fail distribution for today's QC inspections.
    - [ ] **Top Defect Types**: List of most common defects with counts (e.g., "Surface Scratch: 12, Dimension Error: 8").
    - [ ] **Quality Trend Line Chart**: QC pass rate over last 7/30 days.
  - Workforce Status Section
    - [ ] **Key Metrics Cards**: Active Workers Today (animated counter), Total Workforce, Absenteeism Rate %, Average Productivity (units per worker per shift).
    - [ ] **Top Performers List**: Top 3-5 workers by output/efficiency this week with names and scores.
    - [ ] **Workforce Utilization Bar Chart**: Workers assigned vs. available by shift (Morning/Afternoon/Night).
    - [ ] Link to Workforce Management page (WORKFORCE-CENTRAL-004).
  - Project Health Section
    - [ ] **Donut Chart**: Project status distribution (On Track: green slice, At Risk: amber, Delayed: red, Completed: blue).
    - [ ] **Key Metrics Cards**: Total Active Projects (number), On Track (number + %), Need Attention (number + %), Critical (number + %).
    - [ ] **Projects List**: Show 5-10 active projects with status badges, progress bars, and due dates.
    - [ ] Click project → navigate to project detail page.
  - Visual & Animation Requirements
    - [ ] **Animated Counters**: All numeric metrics (output, active workers, projects) animate from 0 to value on page load (smooth counting effect).
    - [ ] **Chart Animations**: All charts (bars, lines, gauges) animate on initial render and when data updates.
    - [ ] **Color Coding**: Consistent color scheme (green = good/on-track, amber = caution/at-risk, red = critical/delayed, blue = neutral/info).
    - [ ] **Status Badges**: Animated pulse or glow effect on critical/urgent items.
    - [ ] **Sparklines**: Mini trend charts next to key metrics showing trend direction (up arrow + green if improving, down arrow + red if declining).
    - [ ] **Loading States**: Skeleton loaders for charts/cards while data fetches; smooth fade-in when loaded.
  - Real-Time Updates
    - [ ] Dashboard data auto-refreshes every 30-60 seconds (configurable).
    - [ ] Use WebSocket connection for real-time production updates (when new shift entry logged, output counter increments live).
    - [ ] Show "Last updated: X seconds ago" timestamp in dashboard header.
    - [ ] Manual refresh button available for immediate data reload.
  - Interactivity & Drill-Down
    - [ ] Click chart elements (bars, slices, data points) → navigate to detailed view or filter data.
    - [ ] Hover tooltips on charts showing exact values and context.
    - [ ] Time range selector: "Today", "This Week", "This Month" toggle to change dashboard data scope.
    - [ ] "View Details" links in each section navigate to dedicated pages (Production Analytics, Quality Dashboard, Workforce Management, Projects List).
  - Performance & UX
    - [ ] Dashboard loads in <2 seconds; charts render progressively (don't block UI).
    - [ ] Lazy load off-screen sections; prioritize above-the-fold content.
    - [ ] Charts responsive: scale down gracefully on smaller screens; consider mobile-friendly chart types (avoid tiny text).
    - [ ] Empty states: If no data available (e.g., new system), show helpful message: "No production data yet. Start by creating a daily plan and logging shift entries."
  - Accessibility
    - [ ] Charts have alt text or accessible data tables for screen readers.
    - [ ] Color-blind friendly: use patterns/icons in addition to colors for status indicators.
    - [ ] Keyboard navigation: can tab through dashboard sections and interact with filters.
- Priority: P1 (High) — Home page is first impression and primary navigation hub; should provide actionable insights, not just static cards.
- Dependencies: 
  - Production data (EXEC-AUTOFILL-015 for shift/production entries)
  - QC data (API-QC-500-018 for QC submissions)
  - Workforce data (WORKFORCE-CENTRAL-004 for worker tracking)
  - Factory hierarchy (STATION-HIERARCHY-017 for multi-factory support)
  - Project health calculation logic (project timelines, milestones)
- Owner: Frontend + Backend + Data Analytics
- Status: Inbox
- Notes: This transforms Home page from simple task list to **executive command center**. Requires significant backend aggregation logic and frontend charting work. Consider phased rollout: Phase 1 = Production + Projects dashboard, Phase 2 = Quality + Workforce, Phase 3 = Multi-factory + advanced analytics.

---

### [HOME-BG-001] Home page background overhaul
- Context: The Home page still shows the basic background; requested a richer/modern background (gradients/patterns) and it hasn’t been applied yet. See attached screenshot from 2025-11-03.
- Affected Areas: 
  - `web/src/pages/home/Home.tsx` (page container)
  - `web/src/components/layout/AppLayout.tsx` (global shell)
  - `web/src/index.css` (design system utilities)
  - `web/tailwind.config.cjs` (colors/gradients as needed)
- Acceptance Criteria:
  - [ ] Background uses a modern, subtle animated gradient or tasteful pattern that matches the design system (no banding, good contrast with cards).
  - [ ] Works in both light and dark modes with complementary palettes.
  - [ ] Performance: no layout jank; CLS < 0.01; animation disabled when prefers-reduced-motion is set.
  - [ ] BG scales well for 1280–1920 widths; no visible seams at common breakpoints.
  - [ ] No degradation of text and card readability (contrast AA+ on key text).
- Priority: P1 (High) — please confirm
- Owner: Frontend
- Status: Inbox

### [HOME-THEME-002] Dark/Light mode toggle missing on Home
- Context: There is no visible dark/light mode switch on the Home page (and possibly app-wide). Tailwind is configured with `darkMode: "class"`, but the UI control is missing in header.
- Affected Areas:
  - `web/src/components/layout/AppLayout.tsx` (header actions area)
  - `web/src/index.css` + `tailwind.config.cjs` (ensure tokens exist for both modes)
  - `web/src/utils/` or `hooks/` (persist theme to `localStorage` + system preference)
- Acceptance Criteria:
  - [ ] Theme toggle visible in the top-right header (icon button with tooltip), keyboard accessible.
  - [ ] Toggle cycles Light ↔ Dark (and optionally System). State persisted in `localStorage` and respected on reload.
  - [ ] Honors system preference on first load (prefers-color-scheme) until user explicitly sets a choice.
  - [ ] No FOUC: app renders with correct theme class before paint.
  - [ ] Works across all pages (global provider or root-level class on `<html>`), not just Home.
- Priority: P1 (High) — please confirm
- Owner: Frontend
- Status: Inbox

---

### [NAV-ADMIN-001] Move Admin actions to avatar menu (remove from Projects page)
- Context: On the All Projects page, an "Admin Quick Actions" card shows Create Project, Manage Users, and Critical Projects. These should not live inside the Projects view; they belong under the top-right avatar/user menu. See screenshot attached in chat (2025-11-03).
- Affected Areas:
  - `web/src/pages/projects/ProjectsList.tsx` (remove Admin Quick Actions panel rendered under `{isAdmin && (...)}`)
  - `web/src/components/layout/AppLayout.tsx` (extend user menu under avatar to include an Admin section with links)
  - Routing: keep deep-links working for `/projects/new`, `/admin`, and `/projects?status=critical`
- Acceptance Criteria:
  - [ ] The Admin Quick Actions block no longer appears on the Projects list page for any role.
  - [ ] The avatar menu contains an "Admin" section (visible only to admin roles) with actions:
        - Create Project → navigates to `/projects/new`
        - Manage Users → navigates to `/admin`
        - Critical Projects → navigates to `/projects?status=critical`
  - [ ] Role-gating: Only admins see the Admin section in the avatar menu; non-admin users do not.
  - [ ] Keyboard accessible menu items with proper focus states; works in light/dark modes.
  - [ ] No regression to existing quick filters and counts; direct URLs continue to work.
- Priority: P1 (High) — please confirm
- Owner: Frontend
- Status: Inbox

---

### [TASK-REM-001] Global task creation/assignment and reminders + consolidated hub
- Context: Users need the ability to create and assign Tasks and create Reminders from anywhere in the app (header, context menus, project pages, lists, detail views). Currently, task creation is fragmented (QuickAdd local-only) and there is no universal Reminder creation. Also requested is a dedicated consolidated view (left sidebar entry) to see all tasks and reminders across projects in one place.
- Affected Areas:
  - Frontend
    - `web/src/components/layout/AppLayout.tsx` (global “+”/Quick Add in header; left sidebar nav entry)
    - `web/src/features/common/QuickAddModal.tsx` (extend to support server-backed Task + standalone Reminder; assignment UI)
    - Context entry points: project cards, lists, tables, detail pages (`web/src/pages/**`, `web/src/components/**`) add “Add Task / Add Reminder” actions
    - New consolidated page: `web/src/pages/inbox/TasksRemindersHub.tsx` (filters, search, tabs: My, Team, All; calendar & list views)
  - Backend/API
    - Tasks: add quick-create endpoint if missing `POST /api/tasks` with assignee/project/section/minimal fields
    - Reminders: new model + endpoints `POST /api/reminders`, `GET /api/reminders`, `PATCH /api/reminders/:id`, `DELETE /api/reminders/:id`
    - Notifications: emit via Socket.IO on create/update; optional email for reminders
    - Prisma: add `Reminder` model, relations to `User`, optional `Task`, optional `Project`
- Acceptance Criteria:
  - Global Creation
    - [ ] A top-right header action (keyboard: Cmd/Ctrl+K then “new …” or a + button) opens a modal allowing: Create Task, Create Reminder.
    - [ ] From project lists, detail pages, and entity rows, a contextual “Add Task” and “Add Reminder” action is available.
    - [ ] Task creation supports: title, description (optional), assignee (user), due date, priority, project (optional), section/status; creates on server and appears instantly for assignee.
    - [ ] Reminder creation supports: title, due date/time, repeat (None/Daily/Weekly/Monthly), assignee/self, related entity (optional: task/project/free-text), delivery channel (in-app; email optional), snooze/dismiss.
  - Consolidated Hub
    - [ ] A left sidebar item “Tasks & Reminders” navigates to a hub showing My items by default with filters (status, assignee, project, due, type Task/Reminder).
    - [ ] Tabs: My, Team (if manager/admin), All (admin). Search across title/description.
    - [ ] Bulk actions: complete tasks, snooze/dismiss reminders (permissions respected).
    - [ ] Calendar view (month/week) and list view; items are color-coded by urgency.
  - System behavior
    - [ ] Role gating: creation available to all positions (as requested); visibility governed by role-based access to entities.
    - [ ] Real-time: assignee sees new items within 2s via WebSocket without refresh.
    - [ ] Email (optional): reminders with email channel send at scheduled time.
    - [ ] Audit log entry recorded for creations and status changes.
  - UX/Accessibility
    - [ ] Modal and hub pages are keyboard accessible with focus traps and ARIA labels; works in light/dark modes.
  - Performance
    - [ ] Hub initial load under 500ms for typical user (<500 items) on local network; server paginates results.
- Priority: P0 (Blocker) — please confirm
- Dependencies: WebSocket notifications service, email provider config (for email channel), Prisma schema migration
- Owner: Frontend + Backend
- Status: Inbox

---

### [PROJ-BOARD-LOAD-001] Project Board tab stuck on loading spinner
- Context: The Board tab within a project page shows an infinite loading spinner. Root cause analysis indicates the component reads the project from context incorrectly. `ProjectProvider` provides the project object directly, but `BoardTab.tsx` does `const context = useProjectContext(); const project = context?.project;` so `project` becomes undefined and `loadBoardData()` never runs, leaving `loading=true` forever.
- Affected Areas:
  - `web/src/pages/projects/tabs/BoardTab.tsx` (use the context value directly; add robust guards and early-exit rendering)
  - Optional: telemetry/error UI to surface API errors vs. missing project
- Acceptance Criteria:
  - [ ] Board loads columns from `/api/projects/:id/board-config` and tasks from `/api/projects/:id/tasks` when a valid project is present.
  - [ ] No infinite spinner: if project is missing, show a clear message; if API fails, show inline error with Retry.
  - [ ] Drag-and-drop move persists via `/api/tasks/:id/move` and reloads correctly.
  - [ ] Add a minimal unit test or runtime assertion to guard context shape (ts or runtime check).
- Priority: P0 (Blocker)
- Owner: Frontend
- Status: Inbox

---

### [SEARCH-GLB-001] Global header search not functional
- Context: The top header search input (placeholder: "Search projects, tasks, QC…") accepts text but doesn’t perform any action when typing or pressing Enter. We do have a Command Palette (`features/common/CommandPalette.tsx`) that calls backend `/api/search`, and the backend routes exist (`api/routes/search.js`), but the header input isn’t wired to open the palette or navigate to a results page.
- Affected Areas:
  - `web/src/components/layout/AppLayout.tsx` (header search input: attach onFocus/Enter to open CommandPalette prefilled; or navigate to a dedicated `/search?q=...` route)
  - Optional new page: `web/src/pages/search/SearchResults.tsx` to render grouped results using `/api/search`
  - `features/common/CommandPalette.tsx` (ensure it can accept an initial query prop)
- Acceptance Criteria:
  - [ ] Typing in the header search and pressing Enter opens results (either via Command Palette with the query pre-filled or a Search Results page), and calls `/api/search` with scopes and filters.
  - [ ] Keyboard shortcut Cmd/Ctrl+K continues to open the Command Palette; header search behaves consistently with it.
  - [ ] Results show grouped counts (tasks, projects, people, batches, stations, documents); clicking navigates correctly.
  - [ ] Recent/saved searches load without breaking even if corresponding tables are missing (graceful empty state already supported by API).
  - [ ] Debounced calls and minimum 2-character threshold to avoid noisy requests; loading indicator visible during fetch.
  - [ ] Works in light/dark mode and is keyboard accessible.
- Priority: P0 (Blocker) — user expectation is that search works from anywhere.
- Owner: Frontend (minor UI wire-up) + QA
- Status: Inbox

---

### [API-WORKFORCE-500-005] Workforce Management API endpoints return 500 Internal Server Error
  - Backend/API: `api/routes/workforce.js` or similar (may not exist yet)
    - Implement `GET /api/workers` (list all workers with type, skills, provider, shifts)
    - Implement `GET /api/workers/providers/list` (list all providers/contractors)
    - Implement `GET /api/workers/performance/leaderboard` (aggregated performance metrics)
  - Prisma schema: ensure Worker, Provider, WorkerAssignment, WorkerPerformance models exist with proper relations
  - Frontend: `web/src/pages/workforce/WorkforceManagementPage.tsx` (already exists but hitting missing API)
  - [x] All three endpoints return 200 with valid JSON (empty arrays if no data) instead of 500.
  - [x] `GET /api/workers` returns array of workers with schema: `{ id, name, type, skills, providerId, isActive, shiftsWorked, avgEfficiency }`.
  - [x] `GET /api/workers/providers/list` returns array: `{ id, name, activeWorkers, totalWorkers, stabilityScore, avgPerformance, contractStatus }`.
  - [x] `GET /api/workers/performance/leaderboard?days=X` returns sorted array: `{ workerId, name, efficiency, output, quality, rank }`.
  - [x] Frontend displays data correctly once endpoints return valid responses; empty states show "No workers yet" instead of error.
  - **Fix Applied (Nov 3, 2025)**: Fixed Express route ordering in `api/routes/workers.js` - moved specific routes (`/performance/leaderboard`, `/providers/list`, `/suggest`, `/dashboard/summary`) BEFORE `/:id` route. Removed duplicate routes. Tested: endpoints now return 401 (auth required) instead of 500.
- Status: Done

---

### [API-MATERIALS-500-006] Materials Dashboard API endpoint returns 500 Internal Server Error
  - Backend/API: `api/routes/materials.js` or similar
    - Implement `GET /api/materials` (list all materials with type, stock, reserved, available, minStock, cost/unit, status)
    - Optional: `GET /api/materials/stats` (summary: total count, total value, low stock count, reservations)
  - Prisma schema: ensure Material model exists with fields for inventory tracking
  - Frontend: `web/src/pages/materials/MaterialDashboardPage.tsx` (exists but hitting missing API)
  - [x] `GET /api/materials` returns 200 with array of materials: `{ id, name, type, stock, reserved, available, minStock, costPerUnit, status }`.
  - [x] Optional stats endpoint returns summary for dashboard cards.
  - [x] Frontend displays inventory table with columns: Material, Type, Stock, Reserved, Available, Min Stock, Cost/Unit, Status, Actions.
  - [x] Empty state: "No materials in inventory yet" with "Add Material" CTA.
  - **Fix Applied (Nov 3, 2025)**: Fixed Express route ordering in `api/routes/materials.js` - moved specific routes (`/alerts/summary`, `/forecast`, `/movements`, `/dashboard/summary`, `/reserve`, `/reservations/:id/release`) BEFORE `/:id` route. Tested: endpoints now return 401 instead of 500.
- Status: Done


### [UX-MATERIALS-007] Materials Dashboard lacks clarity on purpose and workflow
- Context: The Materials Dashboard shows inventory columns (Material, Type, Stock, Reserved, Available, Min Stock, Cost/Unit, Status, Actions) but it's unclear: (1) What workflow users should follow (reservation → consumption → replenishment?), (2) How materials relate to projects/SKUs/BOMs, (3) What "Reserved" vs "Available" means, (4) How to trigger alerts for low stock or replenish materials. No guidance, tooltips, or contextual help.
- Affected Areas:
  - `web/src/pages/materials/MaterialDashboardPage.tsx` (add contextual help, workflow hints, tooltips)
  - Optional: onboarding tour or info modals explaining inventory flow
  - Documentation: in-app help section or hover tooltips for each column
- Acceptance Criteria:
  - [ ] Page includes a short description or "How it works" section explaining: "Track raw materials, reserve for projects, monitor stock levels, and trigger replenishment alerts."
  - [ ] Column headers have tooltips: "Stock" (total on hand), "Reserved" (allocated to projects/orders), "Available" (stock - reserved), "Min Stock" (reorder threshold), "Status" (OK/Low/Critical).
  - [ ] Actions column shows clear icons/labels: "Reserve for Project", "Adjust Stock", "Replenish", "View History".
  - [ ] Empty state provides guidance: "Add materials to track inventory. Reserve materials for projects to ensure availability. Set min stock levels to receive low-stock alerts."
  - [ ] Optional: link to help doc or video tutorial.
- Priority: P1 (High) — usability issue.
- Owner: Frontend + UX/Documentation
- Status: Inbox

---

### [API-MRP-500-008] MRP Calculator API endpoint returns 500 Internal Server Error
- Context: The MRP Calculator page is likely hitting a missing or broken endpoint (possibly `/api/mrp/calculate` or similar) when user clicks "Calculate MRP". The console may show 500 errors. The page shows "0 data points" and 0% accuracy because no calculation history exists or the endpoint fails.
- Affected Areas:
  - Backend/API: implement MRP calculation endpoint
    - `POST /api/mrp/calculate` with body: `{ projectId, skuId, targetQuantity, lossType, lossPercentage }`
    - Calculate material requirements based on SKU BOM, apply loss factor, return breakdown by material
  - Prisma schema: BOM (Bill of Materials) model linking SKU → Materials with quantities; MRPCalculation model to store history
  - Frontend: `web/src/pages/mrp/MRPCalculatorPage.tsx` (exists but missing backend)
- Acceptance Criteria:
  - [ ] `POST /api/mrp/calculate` returns 200 with: `{ requiredMaterials: [{ materialId, name, quantity, unit, availableStock, shortfall }], totalCost, recommendations: [...] }`.
  - [ ] Calculation applies BOM quantities × target quantity × (1 + loss%).
  - [ ] Response includes "Pending Recommendations" (materials to order) and stores result in MRPCalculation table for accuracy tracking.
  - [ ] Frontend displays result table with material breakdown and total cost.
  - [ ] Error handling: if SKU has no BOM, show "No BOM configured for this SKU. Please add materials first."
- Priority: P0 (Blocker) — core feature non-functional.
- Owner: Backend
- Status: Inbox

---

### [UX-MRP-009] MRP Calculator lacks clarity on calculation logic and workflow
- Context: The MRP Calculator page shows inputs (Project, SKU, Target Quantity, Loss Type, Loss %) and a "Calculate MRP" button, but: (1) No explanation of what MRP calculation does (Material Requirements Planning), (2) How loss factor is applied (waste/scrap adjustment), (3) What "Project-Wide Loss" means vs. per-material loss, (4) How the system learns (self-learning mention but no clarity), (5) What happens after calculation (recommendations? purchase orders?). Users are confused about the purpose and next steps.
- Affected Areas:
  - `web/src/pages/mrp/MRPCalculatorPage.tsx` (add contextual help, explanatory text, tooltips, workflow guidance)
  - Optional: info modal or help sidebar explaining MRP logic
- Acceptance Criteria:
  - [ ] Page includes description: "Calculate material requirements for production. The system uses SKU Bill of Materials (BOM) and applies loss factors to determine exact quantities needed, accounting for waste/scrap."
  - [ ] Field tooltips:
    - Project: "Select the project to calculate materials for."
    - SKU: "Choose the product/SKU to produce."
    - Target Quantity: "How many units to produce."
    - Loss Type: "Apply loss/waste factor (project-wide % or per-material-specific)."
    - Loss %: "Expected waste/scrap percentage (e.g., 5% = 0.05)."
  - [ ] Calculation logic explained: "Formula: Required Material = (BOM Quantity × Target Quantity) × (1 + Loss %). Example: To produce 10,000 units of SKU-A with 5% loss, if BOM requires 2kg Material-X per unit, system calculates: 2 × 10,000 × 1.05 = 21,000kg."
  - [ ] Result section shows: "Materials Needed" table, "Total Cost", "Recommendations" (materials to order), "Shortfall Alerts" (insufficient stock).
  - [ ] Self-learning note: "Accuracy improves as you record actual material usage vs. calculated. System adjusts loss factors over time."
  - [ ] Empty state for 0% accuracy: "No calculation history yet. Run your first MRP calculation to start tracking accuracy."
- Priority: P1 (High) — usability/clarity issue.
- Owner: Frontend + UX/Documentation
- Status: Inbox

---

### [API-APPROVALS-500-010] Approval Tracker API endpoints return 500 Internal Server Error
- Context: The Approval Tracker page is fetching multiple endpoints that all return 500 errors: `GET /api/approvals` (main list), `GET /api/approvals/analytics/buffer-status`, `GET /api/approvals/dashboard/summary`. The page shows "No approvals found" and all dashboard cards show 0 (Total Pending, Overdue, Critical, At Risk, Healthy) because the API fails. Console shows errors from `ApprovalTrackerPage.tsx:53`, `:62`, `:71`.
- Affected Areas:
  - Backend/API: `api/routes/approvals.js` (may exist but routes are broken or missing)
    - Fix/implement `GET /api/approvals` (list all approval requests with filters)
    - Fix/implement `GET /api/approvals/analytics/buffer-status` (buffer status analysis)
    - Fix/implement `GET /api/approvals/dashboard/summary` (summary stats for dashboard cards)
  - Prisma schema: ensure Approval model exists with fields: id, title, type, projectId, requestedBy, approver, status, dueDate, bufferDays, createdAt
  - Frontend: `web/src/pages/approvals/ApprovalTrackerPage.tsx` (exists but hitting broken API)
    - [x] All three endpoints return 200 with valid JSON (empty arrays/objects if no data) instead of 500.
    - [x] `GET /api/approvals` returns array: `{ id, title, type, project, contact, dueDate, status, actions }`.
    - [x] `GET /api/approvals/analytics/buffer-status` returns: `{ critical, atRisk, healthy, bufferDistribution }`.
    - [x] `GET /api/approvals/dashboard/summary` returns: `{ totalPending, overdue, critical, atRisk, healthy }`.
    - [x] Frontend displays approvals table and dashboard cards correctly once API returns valid data.
    - [x] Empty state: "No approvals yet. Approvals will appear here when requested from projects, documents, or workflows."
    - **Fix Applied (Nov 3, 2025)**: Fixed Express route ordering in `api/routes/approval-requests.js` - moved specific routes (`/reminders/auto-send`, `/analytics/buffer-status`, `/dashboard/summary`) BEFORE `/:id` route. Tested: endpoints now return 401 instead of 500.
  - Status: Done


### [APPROVAL-WORKFLOW-011] No approval creation workflow integrated into system
- Context: The Approval Tracker shows a centralized list of approvals, but there is no way to create or request approvals anywhere in the system. Users need the ability to: (1) Request approval for documents (compliance docs, design approvals, BOM sign-offs), (2) Request approval for workflow stage transitions (PreProd → Production gate, QC → Dispatch gate), (3) Request approval for budget changes, material purchases, capacity adjustments. Currently, these critical approval gates are missing from their respective workflows.
- Affected Areas:
  - Frontend: Add "Request Approval" actions in multiple modules
    - `web/src/pages/projects/tabs/FilesTab.tsx` (document approval: after upload, "Submit for Approval" button)
    - `web/src/pages/projects/tabs/ComplianceTab.tsx` (compliance doc approval)
    - `web/src/pages/preprod/` modules (design/mold/PPS approval before production)
    - `web/src/pages/projects/tabs/BoardTab.tsx` or workflow pages (stage gate approvals: "Request Approval to Proceed")
    - Material purchase requisitions, budget change requests (Planning tab or Materials Dashboard)
  - Backend/API: Approval creation and lifecycle
    - `POST /api/approvals` with body: `{ title, type, description, projectId, entityType, entityId, requestedBy, approver, dueDate, bufferDays, metadata }`
    - `PUT /api/approvals/:id/approve` (approve action)
    - `PUT /api/approvals/:id/reject` (reject with reason)
    - `POST /api/approvals/:id/reminders` (send reminder to approver)
    - Notifications: emit real-time notification + email to approver on creation; notify requester on approve/reject
  - Prisma schema: Approval model with relations to Project, Document, User (requester/approver)
  - Workflow integration: Enforce approval gates (e.g., can't move batch from PreProd → Production without approval)
- Acceptance Criteria:
  - Document Approvals
    - [ ] Files tab: after uploading a document (or for existing docs), "Request Approval" button opens modal with fields: Approver (user picker), Due Date, Buffer Days (optional), Comments.
    - [ ] POST creates approval record; approver receives notification (in-app + email).
    - [ ] Document shows "Pending Approval" badge; view-only until approved.
    - [ ] Approver sees approval in Approval Tracker; can Approve/Reject with comments.
    - [ ] On approval, document status → Approved; requester notified.
    - [ ] On rejection, document status → Rejected; requester can revise and re-submit.
  - Workflow Stage Gate Approvals
    - [ ] PreProd tab (or Board): "Request Approval to Start Production" button at stage transition.
    - [ ] Modal: select approver (manager/admin), set due date, add justification/comments.
    - [ ] Batch/task cannot move to Production stage until approval granted.
    - [ ] Approver sees request in Approval Tracker with context (project, stage, requester).
    - [ ] Similar gates for QC → Dispatch, Compliance sign-offs.
  - Budget/Purchase Approvals
    - [ ] Material purchase requisition or budget change form includes "Submit for Approval" flow.
    - [ ] Approval request created with type "Budget" or "Purchase"; linked to material/requisition entity.
  - Approval Tracker Actions
    - [ ] Approver can Approve/Reject from tracker; actions trigger state changes in linked entities.
    - [ ] "Send Reminder" button sends follow-up notification to approver.
    - [ ] Overdue approvals highlighted in red; critical (within buffer) in amber.
  - Audit & Compliance
    - [ ] All approval actions logged in audit trail (who requested, who approved/rejected, when).
    - [ ] Approval history viewable from linked entity (document, stage transition).
- Priority: P0 (Blocker) — critical workflow gaps; approval gates are industry-standard requirement.
- Dependencies: Notification system (in-app + email), approval state enforcement in workflow modules.
- Owner: Backend + Frontend
- Status: Inbox

---

### [API-COMPLIANCE-404-012] Project Compliance endpoint returns 404 Not Found
- Context: When clicking on Project Compliance page inside a project, the page shows error modal "Failed to load compliance records" and console shows `GET http://localhost:5173/api/compliance` returns 404 (Not Found) from `ProjectCompliancePage.tsx:81` and `:78:20`. The page displays empty state "No compliance requirements found" but can't add requirements because API is missing.
- Affected Areas:
  - Backend/API: `api/routes/compliance.js` (missing or not registered)
    - Implement `GET /api/compliance?projectId=:id` (list compliance requirements for project)
    - Implement `GET /api/compliance/:id` (single requirement details)
    - Implement `POST /api/compliance` (create requirement with body: `{ projectId, title, description, status, dueDate }`)
    - Implement `PUT /api/compliance/:id` (update requirement)
    - Implement `DELETE /api/compliance/:id` (delete requirement)
  - Prisma schema: ensure ComplianceRequirement model exists with fields: id, projectId, title, description, status, dueDate, createdBy, updatedAt
  - Frontend: `web/src/pages/projects/tabs/ProjectCompliancePage.tsx` (exists but hitting missing API)
  - Route registration: `api/index.js` needs `app.use('/api/compliance', require('./routes/compliance'))`
- Acceptance Criteria:
  - [ ] `GET /api/compliance?projectId=17` returns 200 with array of compliance requirements (empty array `[]` if none exist, not 404).
  - [ ] Page loads without error modal; shows empty state with "Add Requirement" button functional.
  - [ ] Create flow: "Add Requirement" button → modal with form → POST creates record → list refreshes.
  - [ ] Requirements table displays: Title, Status (dropdown: Pending/In Progress/Completed/Overdue), Due Date, Actions (Edit/Delete).
  - [ ] Status changes: clicking status dropdown → PUT updates → real-time refresh.
  - [ ] Link to documents: each requirement can have associated compliance documents (Files tab integration).
- Priority: P0 (Blocker) — page completely broken.
- Owner: Backend
- Status: Inbox

---

### [API-CERTIFICATIONS-404-013] Company Certifications endpoint returns 404 Not Found
- Context: Company Certifications page shows error modal "Failed to load certifications" and console shows `GET http://localhost:5173/api/compliance` returns 404 (Not Found) from `CertificationsPage.tsx:65` and `:62:20`. The page is trying to fetch company-wide certifications (ISO 9001, ISO 14001, etc.) but endpoint doesn't exist. Empty state shows "No certifications found".
- Affected Areas:
  - Backend/API: `api/routes/certifications.js` (missing or broken)
    - Implement `GET /api/certifications` (list all company certifications)
    - Implement `GET /api/certifications/:id` (single certification details)
    - Implement `POST /api/certifications` (create certification)
    - Implement `PUT /api/certifications/:id` (update certification)
    - Implement `DELETE /api/certifications/:id` (delete certification)
  - Prisma schema: ensure Certification model exists with fields: id, type (Quality/Environmental/Safety/Social), name, body (certifying body), number, issueDate, expiryDate, lastAudit, nextAudit, certificateUrl, documentId (for uploaded file)
  - Frontend: `web/src/pages/compliance/CertificationsPage.tsx` (exists but hitting missing API)
  - Route registration: `api/index.js` needs certification routes
- Acceptance Criteria:
  - [ ] `GET /api/certifications` returns 200 with array of certifications (empty array `[]` if none, not 404).
  - [ ] Page loads without error; shows empty state or list of certifications.
  - [ ] "Add Certification" button → modal with form → POST creates record → list updates.
  - [ ] Certifications table shows: Type, Name, Body, Number, Issue Date, Expiry Date, Last Audit, Next Audit, Actions.
  - [ ] Audit tracking: shows days until next audit; highlights expired/expiring soon certifications.
  - [ ] Reminders: system sends reminder notification 30/60/90 days before expiry and next audit dates.
- Priority: P0 (Blocker) — page completely broken.
- Owner: Backend
- Status: Inbox

---

### [CERT-UPLOAD-014] Certifications only support URL; missing file upload with drag-drop and paste
- Context: The "Add Certification" modal only has a "Certificate URL" field, but users need to upload actual certificate PDF files, especially when certificates are stored locally or scanned documents. The modal should support the same rich upload experience as Files tab: drag-and-drop, paste screenshot (auto-converts to file), browse and select files. Currently, if user has a PDF certificate, they have no way to attach it—only a URL field which doesn't fit most workflows.
- Affected Areas:
  - Frontend: `web/src/pages/compliance/CertificationsPage.tsx` or modal component
    - Replace/supplement "Certificate URL" with file upload zone (similar to `FilesTab.tsx` upload area)
    - Support drag-and-drop: drop PDF/image → upload to S3 → attach to certification
    - Support paste: Ctrl+V screenshot → convert to PNG → upload → attach
    - Support browse: click to open file picker → select PDF/JPEG/PNG → upload
    - Display uploaded file: thumbnail/icon + filename + size; allow preview/download
    - Keep "Certificate URL" as optional field for external links (e.g., certifying body's online verification)
  - Backend/API: `POST /api/certifications` and `PUT /api/certifications/:id`
    - Accept `documentId` field linking to uploaded Document record (same as Files tab flow)
    - When file uploaded, create Document record with S3 key, then link to certification
  - Prisma schema: Certification model needs `documentId` field (relation to Document)
  - Upload flow: reuse existing presign/upload logic from documents.js (presign → client uploads to S3 → POST /api/documents → link to certification)
- Acceptance Criteria:
  - [ ] "Add Certification" modal has file upload zone below form fields with text: "Drag & drop certificate file, paste screenshot, or click to browse".
  - [ ] Drag PDF/image onto zone → shows uploading indicator → file uploads to S3 → displays uploaded file (icon + name + size).
  - [ ] Paste screenshot (Ctrl+V) in modal → auto-converts to PNG → uploads → attaches to certification.
  - [ ] Click upload zone → file picker opens → select PDF/JPEG/PNG → uploads → attaches.
  - [ ] "Certificate URL" field remains optional; user can provide URL or upload file or both.
  - [ ] Certifications list shows file attachment: clicking certificate row opens preview modal showing uploaded file or navigates to URL.
  - [ ] Edit certification: can replace file (upload new one), remove file, or change URL.
  - [ ] Delete certification: also deletes linked document from S3 (or marks as deleted).
  - [ ] File preview: click file icon/name → opens file in modal (PDF viewer or image lightbox).
- Priority: P1 (High) — URL-only is insufficient for compliance workflows; file uploads are standard requirement.
- Dependencies: Existing document upload API (`api/routes/documents.js`), S3 presign flow, Document model.
- Owner: Frontend + Backend
- Status: Inbox

---

### [API-STATION-ANALYTICS-500-016] Station Management analytics endpoint returns 500 Internal Server Error
- Context: When clicking "Analytics" button on a station card in Station Management page, console shows `GET http://localhost:5173/api/stations/4...` returns 500 (Internal Server Error) from `StationsPage.tsx:125`. The analytics modal should display station performance metrics (utilization, output, downtime, efficiency) but API is broken or missing.
- Affected Areas:
  - Backend/API: `api/routes/stations.js`
    - Fix/implement `GET /api/stations/:id/analytics` (returns station performance data)
    - Response schema: `{ utilization: number, totalOutput: number, downtime: number, efficiency: number, recentJobs: array, performanceTrend: array }`
  - Frontend: `web/src/pages/stations/StationsPage.tsx` (exists but hitting broken API)
  - Analytics calculation: aggregate data from ShiftEntry, ProductionEntry, Downtime records for the station
- Acceptance Criteria:
  - [ ] `GET /api/stations/:id/analytics` returns 200 with valid analytics data (not 500).
  - [ ] Analytics modal displays: Utilization %, Total Output (units), Downtime Hours, Efficiency %, Recent Jobs table.
  - [ ] Performance trend chart: output per shift over last 7/30 days.
  - [ ] Empty state: "No production data yet for this station" if no historical data exists.
- Priority: P1 (High) — Analytics is key feature; broken implementation blocks station performance insights.
- Owner: Backend
- Status: Inbox

---

### [STATION-HIERARCHY-017] Missing factory/floor/room hierarchy for station organization
- Context: Station Management currently only allows creating individual stations with flat structure (just station name, code, type). However, manufacturing facilities are organized hierarchically: Factory → Floor → Room/Cell → Station. This hierarchy is critical for: (1) Organizing stations by physical location, (2) Calculating capacity by floor/room, (3) Reporting downtime/efficiency by area, (4) Planning maintenance by zone, (5) Workforce allocation by floor/room. Without this hierarchy, users can't group stations logically or generate area-level reports. User has requested this multiple times.
- Affected Areas:
  - Prisma schema: Add models for Factory, Floor, Room/Cell
    - Factory: id, name, code, location (address), status, createdAt
    - Floor: id, factoryId, name (Floor 1, Floor 2), code, area (sqm), status
    - Room/Cell: id, floorId, name (Assembly Room A, Molding Cell 1), code, type (Assembly/Molding/QC/Storage), area (sqm)
    - Station: add fields floorId, roomId (foreign keys linking to hierarchy)
  - Backend/API: `api/routes/stations.js` and new routes for hierarchy
    - `GET /api/factories` (list all factories)
    - `POST /api/factories` (create factory)
    - `GET /api/factories/:id/floors` (list floors in factory)
    - `POST /api/floors` (create floor with factoryId)
    - `GET /api/floors/:id/rooms` (list rooms on floor)
    - `POST /api/rooms` (create room with floorId)
    - `GET /api/rooms/:id/stations` (list stations in room)
    - Update `POST /api/stations` to accept floorId, roomId
  - Frontend: `web/src/pages/stations/StationsPage.tsx` or new hierarchy management pages
    - Add "Factory Setup" or "Facility Management" page (Admin section)
    - Tree view or multi-level navigation: Factory → Floors → Rooms → Stations
    - "New Station" modal: add dropdowns for Floor (auto-fetches from factory), Room (auto-fetches from floor)
    - Station cards grouped by Room; rooms grouped by Floor in UI
    - Breadcrumb navigation: Factory > Floor 1 > Assembly Room A > Station ST-003
  - Reporting & Analytics:
    - Capacity reports: aggregate by Room/Floor/Factory (total stations, available capacity)
    - Utilization dashboards: show efficiency by Floor/Room
    - Downtime tracking: identify which Floor/Room has most issues
- Acceptance Criteria:
  - Factory Management
    - [ ] "Facility Management" page in Admin section allows creating Factories (name, location, code).
    - [ ] Within Factory view, can create Floors (name, code, area, status).
    - [ ] Within Floor view, can create Rooms/Cells (name, code, type, area).
  - Station Assignment to Hierarchy
    - [ ] "New Station" modal includes: Floor dropdown (lists floors in factory), Room dropdown (lists rooms on selected floor).
    - [ ] Stations linked to Room → Floor → Factory via foreign keys.
    - [ ] Station cards show location: "Floor 1 > Assembly Room A > ST-003".
  - Hierarchical Navigation
    - [ ] Station Management page has tree view or filters: select Factory → Floor → Room → see stations in that room.
    - [ ] Breadcrumb trail: "Pramara Factory > Floor 2 > Molding Cell 1" with clickable links.
    - [ ] Group stations by Room in list view; collapsible sections per Room.
  - Capacity & Reporting
    - [ ] Capacity report shows: Factory total capacity (sum of all stations), breakdown by Floor, breakdown by Room.
    - [ ] Utilization dashboard: filter by Factory/Floor/Room; shows avg efficiency per area.
    - [ ] Downtime report: aggregate by Room/Floor to identify problem areas.
  - Multi-Factory Support
    - [ ] System supports multiple factories (e.g., Factory A in City X, Factory B in City Y).
    - [ ] User can switch between factories in UI; station lists filtered by selected factory.
- Priority: P1 (High) — Essential for real-world manufacturing facility management; blocking proper organization and reporting.
- Dependencies: Prisma schema migration, hierarchy CRUD APIs, UI refactor for multi-level navigation.
- Owner: Backend + Frontend
- Status: Inbox

---

### [API-QC-500-018] QC Management endpoints return 500 Internal Server Error
- Context: QC Management page shows multiple 500 errors in console: `GET http://localhost:5173/api/workers` → 500 (related to fetching inspectors list), `GET http://localhost:5173/api/qc-submissions` → 500 from `QCManagementPage.tsx:100` and `:97:20`, `GET http://localhost:5173/api/qc-submissions/analytics/summary` → 500 from `QCManagementPage.tsx:111`. Additionally, error "fetching users: Error: Failed to fetch workers" and "Error fetching analytics" from line `:138`. The page shows empty state "No QC submissions found" but can't fetch or create QC inspection records.
- Affected Areas:
  - Backend/API: `api/routes/qc.js` or `qc-submissions.js` (missing or broken)
    - Implement `GET /api/qc-submissions` (list all QC inspections with filters: project, station, result)
    - Implement `GET /api/qc-submissions/:id` (single inspection details)
    - Implement `POST /api/qc-submissions` (create QC inspection with body: `{ projectId, stationId, batchCode, inspectionDate, inspectorId, sampleSize, passedQty, failedQty, defectQty, result, notes }`)
    - Implement `GET /api/qc-submissions/analytics/summary` (summary stats: total inspections, pass rate, fail rate, defect rate)
    - Implement `PUT /api/qc-submissions/:id` (update inspection)
    - Implement `DELETE /api/qc-submissions/:id` (delete inspection)
  - Backend/API: Workers endpoint for inspector list
    - Fix `GET /api/workers` to return workers with role "Inspector" or "QC" (already logged as API-WORKFORCE-500-005 but impacts QC Management)
  - Prisma schema: ensure QCSubmission (or QCInspection) model exists with fields: id, projectId, stationId, batchCode, inspectionDate, inspectorId, sampleSize, passedQty, failedQty, defectQty, result (Pass/Fail/Pending), notes
  - Frontend: `web/src/pages/qc/QCManagementPage.tsx` (exists but hitting broken APIs)
- Acceptance Criteria:
  - [ ] `GET /api/qc-submissions` returns 200 with array of QC inspections (empty array `[]` if none, not 500).
  - [ ] `GET /api/qc-submissions/analytics/summary` returns 200 with `{ totalInspections, passRate, failRate, defectRate }`.
  - [ ] `GET /api/workers?role=Inspector` returns 200 with list of QC inspectors (for Inspector dropdown in "New Inspection" modal).
  - [ ] Page loads without errors; shows empty state or list of QC submissions.
  - [ ] "New Inspection" button → modal with form → POST creates record → list refreshes.
  - [ ] QC submissions table shows: Project, Station, Batch Code, Inspection Date, Inspector, Sample Size, Passed/Failed/Defect Qty, Result, Actions.
  - [ ] Analytics summary cards display: Total Inspections, Pass Rate %, Fail Rate %, Defect Rate %.
  - [ ] Filter by Project, Station, Result (Pass/Fail/Pending), Date Range.
- Priority: P0 (Blocker) — QC Management page completely broken; critical quality control workflow blocked.
- Owner: Backend
- Status: Inbox

---

### [UX-PROJECT-CONTEXT-019] Redundant project selection inside project-specific pages
- Context: Multiple pages within a project context (e.g., New QC Inspection modal, New Station modal inside project, Process Flow Builder inside project) are asking user to select a project via dropdown, even when the user is already inside that specific project. The system should automatically detect and prefill the current project context. For example: (1) "New QC Inspection" modal shows "Project *" dropdown with "Select Project" — should auto-select current project if accessed from project page, (2) "New Station" modal shows "Project" dropdown with "No Project" — should auto-select if creating station from project context, (3) Process Flow Builder shows "Test Project 1761754644340" in card but asks for project in forms. This creates unnecessary friction and confusion.
- Affected Areas:
  - Frontend: All project-related modals/forms that have "Project" dropdown
    - `web/src/pages/qc/QCManagementPage.tsx` — "New Inspection" modal
    - `web/src/pages/stations/StationsPage.tsx` — "New Station" modal
    - `web/src/pages/process-flow/ProcessFlowBuilderPage.tsx` — flow creation forms
    - Any other forms within project tabs (Compliance, Files, Board, etc.)
  - Implementation:
    - Detect current route context: if URL contains `/projects/:id/...`, extract project ID from route params
    - OR use React Context (ProjectProvider) to pass current project to child components
    - Auto-populate projectId in form state when modal opens
    - Change "Project" dropdown behavior:
      - If in project context: show current project name as read-only or pre-selected (user can't change)
      - If in global context (e.g., accessing QC Management from Admin): show dropdown to select project (editable)
    - Add helper text: "Creating for [Project Name]" below dropdown when auto-selected
- Acceptance Criteria:
  - QC Management in Project Context
    - [ ] When accessing QC Management from project page or creating inspection from project Board/Execution tab, "New Inspection" modal auto-selects current project.
    - [ ] "Project" field shows current project name as pre-selected; dropdown disabled or read-only.
    - [ ] User can still access QC Management globally (from Admin or sidebar), in which case dropdown is enabled to select any project.
  - Station Management in Project Context
    - [ ] If creating station from project page (e.g., "Add Station to this Project" link), "New Station" modal auto-selects project.
    - [ ] If accessing Station Management globally (Admin), dropdown allows selecting any project or "No Project" (global station).
  - Process Flow Builder in Project Context
    - [ ] When creating/editing process flow from project page, flow automatically linked to that project.
    - [ ] "New Flow" modal pre-fills project; user doesn't see "Select Project" dropdown.
  - Global vs. Contextual Behavior
    - [ ] System detects route context: `/projects/:id/*` → auto-fill project; `/admin/*` or `/qc` → allow selection.
    - [ ] Consistent pattern across all modules: auto-fill when context is clear, allow selection when ambiguous.
  - Visual Clarity
    - [ ] When auto-filled, show badge or helper text: "📍 Creating for [Project Name]" or project name in read-only field.
    - [ ] User understands they're working within specific project without needing to select it.
- Priority: P1 (High) — UX friction; causes confusion and wasted clicks; impacts multiple workflows.
- Owner: Frontend
- Status: Inbox

---

### [PROCESS-FLOW-ADD-OP-020] "Add First Operation" button not working in Process Flow Builder
- Context: In Process Flow Builder page, after creating a new flow, the right panel shows "Operations Flow (0)" with empty state "No operations defined yet" and a blue "Add First Operation" button. Clicking this button does nothing — no modal opens, no action happens, button appears non-functional. Users cannot define operations (steps) in the process flow, making the flow builder unusable. Expected behavior: clicking "Add First Operation" should open a modal/form to add an operation with fields like: Operation Name, Type (Manual/Automated), Duration, Station, Instructions, Quality Checks.
- Affected Areas:
  - Frontend: `web/src/pages/process-flow/ProcessFlowBuilderPage.tsx` or related component
    - "Add First Operation" button likely missing `onClick` handler or handler is broken
    - Need modal/drawer component for "Add Operation" form
    - Form fields: Name, Type (dropdown: Manual/Automated/Inspection), Duration (mins), Station (dropdown), Sequence (auto or manual), Instructions (textarea), Quality Checks (checkboxes or sub-form)
  - Backend/API: `api/routes/process-flows.js` or `operations.js`
    - `POST /api/process-flows/:flowId/operations` (add operation to flow)
    - Body: `{ name, type, duration, stationId, sequence, instructions, qualityChecks }`
    - `GET /api/process-flows/:flowId/operations` (list operations in flow)
    - `PUT /api/operations/:id` (update operation)
    - `DELETE /api/operations/:id` (remove operation)
  - Prisma schema: ensure Operation model exists with fields: id, processFlowId, name, type, duration, stationId, sequence, instructions, qualityChecks (JSON or relation to QC template)
  - UI Flow: After adding first operation, "Add Operation" button should change to "Add Next Operation" and allow adding sequential operations; drag-to-reorder operations list
- Acceptance Criteria:
  - [ ] Clicking "Add First Operation" button opens modal/drawer titled "Add Operation".
  - [ ] Modal has form fields: Name (text), Type (dropdown: Manual/Automated/Inspection/Assembly/QC), Duration (number in mins), Station (dropdown from stations list), Instructions (textarea), Quality Checks (optional: link to QC template or add inline checks).
  - [ ] "Save" button POSTs to `/api/process-flows/:flowId/operations` with operation data.
  - [ ] On success, modal closes; operation appears in "Operations Flow" list with sequence number (1, 2, 3...).
  - [ ] "Add Next Operation" button appears after first operation; can add multiple operations sequentially.
  - [ ] Operations list displays: Sequence #, Name, Type icon, Duration, Station, Edit/Delete buttons.
  - [ ] Edit operation: click Edit → opens modal with pre-filled data → PUT updates operation.
  - [ ] Delete operation: click Delete → confirmation dialog → DELETE removes operation; re-sequences remaining operations.
  - [ ] Drag-to-reorder: drag operation cards to change sequence; updates sequence numbers on backend.
  - [ ] Flow visualization (optional but nice): show operations as connected nodes/cards with arrows indicating flow sequence.
- Priority: P0 (Blocker) — core feature completely non-functional; process flow builder is unusable.
- Owner: Frontend + Backend
- Status: Inbox

---

### [PROCESS-FLOW-ADD-OP-020] "Add First Operation" button not working in Process Flow Builder
- Context: In Process Flow Builder page, after creating a new flow, the right panel shows "Operations Flow (0)" with empty state "No operations defined yet" and a blue "Add First Operation" button. Clicking this button does nothing — no modal opens, no action happens, button appears non-functional. Users cannot define operations (steps) in the process flow, making the flow builder unusable. Expected behavior: clicking "Add First Operation" should open a modal/form to add an operation with fields like: Operation Name, Type (Manual/Automated), Duration, Station, Instructions, Quality Checks.
- Affected Areas:
  - Frontend: `web/src/pages/process-flow/ProcessFlowBuilderPage.tsx` or related component
    - "Add First Operation" button likely missing `onClick` handler or handler is broken
    - Need modal/drawer component for "Add Operation" form
    - Form fields: Name, Type (dropdown: Manual/Automated/Inspection), Duration (mins), Station (dropdown), Sequence (auto or manual), Instructions (textarea), Quality Checks (checkboxes or sub-form)
  - Backend/API: `api/routes/process-flows.js` or `operations.js`
    - `POST /api/process-flows/:flowId/operations` (add operation to flow)
    - Body: `{ name, type, duration, stationId, sequence, instructions, qualityChecks }`
    - `GET /api/process-flows/:flowId/operations` (list operations in flow)
    - `PUT /api/operations/:id` (update operation)
    - `DELETE /api/operations/:id` (remove operation)
  - Prisma schema: ensure Operation model exists with fields: id, processFlowId, name, type, duration, stationId, sequence, instructions, qualityChecks (JSON or relation to QC template)
  - UI Flow: After adding first operation, "Add Operation" button should change to "Add Next Operation" and allow adding sequential operations; drag-to-reorder operations list
- Acceptance Criteria:
  - [ ] Clicking "Add First Operation" button opens modal/drawer titled "Add Operation".
  - [ ] Modal has form fields: Name (text), Type (dropdown: Manual/Automated/Inspection/Assembly/QC), Duration (number in mins), Station (dropdown from stations list), Instructions (textarea), Quality Checks (optional: link to QC template or add inline checks).
  - [ ] "Save" button POSTs to `/api/process-flows/:flowId/operations` with operation data.
  - [ ] On success, modal closes; operation appears in "Operations Flow" list with sequence number (1, 2, 3...).
  - [ ] "Add Next Operation" button appears after first operation; can add multiple operations sequentially.
  - [ ] Operations list displays: Sequence #, Name, Type icon, Duration, Station, Edit/Delete buttons.
  - [ ] Edit operation: click Edit → opens modal with pre-filled data → PUT updates operation.
  - [ ] Delete operation: click Delete → confirmation dialog → DELETE removes operation; re-sequences remaining operations.
  - [ ] Drag-to-reorder: drag operation cards to change sequence; updates sequence numbers on backend.
  - [ ] Flow visualization (optional but nice): show operations as connected nodes/cards with arrows indicating flow sequence.
- Priority: P0 (Blocker) — core feature completely non-functional; process flow builder is unusable.
- Owner: Frontend + Backend
- Status: Inbox

---

### [UX-PROJECT-TAB-INTEGRATION-021] Daily Planning and other pages improperly moved into project tabs without redesign
- Context: User reported that Daily Planning (and likely other global pages) were simply moved from left sidebar into project tabs without proper architectural redesign. Key issues: (1) **Blank project dropdown**: When inside project Planning tab, the "Generate New Plan" form shows "Select Project" dropdown with only "Select Project" option (blank list) — should auto-select current project and hide dropdown or make read-only. (2) **Redundant project selection**: User is already inside a specific project (e.g., `/projects/:id/planning`), yet every form asks "Select Project" — violates UX principle of contextual awareness. (3) **Poor integration**: Pages were moved from global sidebar to project tabs without adapting the UI/UX to project context — described as "not a proper way to fix things" and "just moved items without proper redesign". This is a systemic issue affecting multiple modules (Planning, QC, Stations, Process Flow, etc.).
- Root Cause Analysis:
  - Pages designed for global/multi-project context (with project selector) were moved into project-specific tabs without refactoring for single-project context
  - No architectural decision on: Is Daily Planning project-specific or global? If project-specific, dropdown should be removed; if global, it shouldn't be in project tabs
  - Missing project context propagation: ProjectProvider context not being consumed by child pages to auto-populate projectId
  - Navigation structure issue: unclear whether Planning/QC/Stations are project-specific features (belong in project tabs) or global features (belong in Admin/sidebar)
- Affected Areas:
  - **Architecture Decision Required**: Determine which features are project-specific vs. global
    - **Project-Specific** (should be in project tabs, auto-use current project): Daily Planning for this project, QC inspections for this project, Compliance for this project
    - **Global** (should be in Admin/sidebar, allow multi-project view): All plans across projects, All QC submissions, Station Management (shared resource), Process Flow library
  - Frontend: Multiple pages in project context
    - `web/src/pages/projects/tabs/PlanningTab.tsx` or `DailyPlanningPage.tsx` (inside project)
      - If project-specific: Remove "Select Project" dropdown; use `const project = useProjectContext()` to get current project; auto-pass `projectId` to all API calls
      - If global: Move out of project tabs to Admin section; keep dropdown for multi-project selection
    - `web/src/pages/qc/QCManagementPage.tsx` (if accessed from project)
      - Project-specific view: filter QC submissions by current project; "New Inspection" auto-fills project
    - `web/src/pages/stations/StationsPage.tsx` (if accessed from project)
      - Project-specific view: show stations assigned to current project; "New Station" auto-links to project
    - Apply same pattern to: Compliance, Certifications, Process Flow, Materials, MRP (if accessed from project context)
  - Routing Structure:
    - **Project-specific routes**: `/projects/:id/planning`, `/projects/:id/qc`, `/projects/:id/compliance` → auto-use projectId from route params
    - **Global routes**: `/admin/planning`, `/admin/qc`, `/admin/stations` → show all projects, allow filtering/selection
  - Project Context Provider:
    - Ensure `ProjectProvider` exposes `projectId` and `projectData` to all child components
    - Create `useProjectContext()` hook that throws error if used outside project context (fail-fast for developer mistakes)
    - Pages inside `/projects/:id/*` automatically have project context; pages outside should not try to use it
  - API Calls:
    - When in project context: append `?projectId={currentProject.id}` to GET requests automatically; omit project field from POST/PUT bodies (backend infers from context or route)
    - When global: require project selection; validate project access permissions
- Acceptance Criteria:
  - Architectural Clarity
    - [ ] Document decision: Which features are project-specific vs. global in architecture doc or README.
    - [ ] Project-specific features (Planning, QC, Compliance) accessible from project tabs; auto-use current project.
    - [ ] Global features (Station library, Workforce, MRP, Materials inventory) accessible from Admin/sidebar; show all projects with filter.
  - Daily Planning in Project Context (Example Fix)
    - [ ] Accessing Planning from project tab (e.g., `/projects/17/planning`) auto-selects Project 17.
    - [ ] "Generate New Plan" form: "Project" field removed or shown as read-only badge: "📍 Planning for [Project Name]".
    - [ ] "Select Project" dropdown only visible if accessed globally (e.g., `/admin/planning`).
    - [ ] API calls from project-context planning page automatically include `projectId=17`; no manual selection needed.
  - QC Management in Project Context
    - [ ] Accessing QC from project tab shows only QC submissions for that project.
    - [ ] "New Inspection" button auto-fills project; "Project" dropdown hidden.
    - [ ] Global QC page (if needed) in Admin shows all inspections across projects with project filter dropdown.
  - Station Management (Global Only)
    - [ ] Stations are shared resources (not project-specific); remain in Admin/sidebar, not in project tabs.
    - [ ] "New Station" modal allows optional project assignment (stations can be project-specific or shared).
  - Contextual UX Patterns
    - [ ] All project-tab pages show current project name in page header or breadcrumb.
    - [ ] Forms in project context never ask "Select Project"; auto-use current project silently.
    - [ ] If user needs to work on different project, they navigate to that project's page; no cross-project selection within project tabs.
    - [ ] Consistent pattern: project tabs = single-project view, Admin pages = multi-project view.
  - Developer Experience
    - [ ] `useProjectContext()` hook documented; throws clear error if used outside ProjectProvider.
    - [ ] Code review checklist: "Does this page need project context? If in project tabs, use useProjectContext(). If global, require project selection."
    - [ ] Reusable components (modals, forms) accept `projectId` prop; adapt UI based on whether projectId is auto-provided or user-selected.
  - Blank Dropdown Fix
    - [ ] "Select Project" dropdown in Planning tab no longer shows blank list; either removed (if project-specific) or populated with actual projects (if global).
    - [ ] If dropdown intentionally blank (loading state), show loading spinner + "Loading projects..." placeholder.
- Priority: P0 (Critical) — Systemic UX failure affecting multiple modules; reflects poor architectural integration; user explicitly called out as "not a proper way to fix things".
- Dependencies: Architectural decision on feature scope (project-specific vs. global), ProjectProvider refactor, route structure clarity.
- Owner: Frontend Lead + Product (architecture decision) + All Frontend devs (implementation across modules)
- Status: Inbox
- Notes: This is a **cross-cutting architectural issue**, not just a single bug. Requires design review meeting to decide feature scope, then systematic refactor across all affected pages. User frustration indicates this is high-priority perception issue impacting trust in system quality.

---

### [EXEC-AUTOFILL-015] Shift Entries and Production Entry lack auto-fetch from planning data
- Context: In the Execution tab, "Shift Entries" and "Production Entry" currently require manual data entry for: worker assignments to stations, production tasks, SKUs/quantities per station. However, this data was already defined in earlier planning stages: (1) Daily Plan specifies what needs to be produced where and when, (2) Manpower Plan (workforce planning) assigns specific workers to specific stations/shifts. Currently, users must re-enter all this information in Shift Entries and Production Entry, which is redundant and error-prone. The system should auto-fetch and prefill: date, shift, station, assigned workers, SKU, target quantity from Daily Plan and Manpower Plan. Users should only need to fill in actual output achieved and rejection/defect counts.
- Affected Areas:
  - Frontend: `web/src/pages/execution/ShiftEntriesPage.tsx` or equivalent
    - On page load or "New Shift Entry" action: fetch today's daily plan + manpower assignments for selected shift
    - Prefill form with: Date (today), Shift (Morning/Afternoon/Night), Station assignments with workers, SKU + target quantity per station
    - Display prefilled data as read-only or editable (user can override if plan changed)
    - User only inputs: Actual Output (units produced), Rejection Count, Rejection Reasons, Downtime (if any), Comments
    - "Add Entry" button for manual entries if production happens outside the plan (ad-hoc tasks)
  - Frontend: `web/src/pages/execution/ProductionEntryPage.tsx` or equivalent
    - Similar auto-fetch: when logging production output, prefill station, worker, SKU, target quantity from plan
    - User fills: Actual Output, Quality Status (Pass/Fail), Rejection data
  - Backend/API: 
    - `GET /api/execution/shift-plan?date=YYYY-MM-DD&shift=morning` (fetch daily plan + manpower for shift)
      - Returns: `{ stations: [{ stationId, stationName, workers: [{ id, name }], tasks: [{ skuId, skuName, targetQuantity }] }] }`
    - `POST /api/execution/shift-entries` (save shift entry with actuals)
    - `POST /api/execution/production-entries` (save production output with actuals)
  - Prisma schema: ensure relations between DailyPlan, ManpowerPlan, ShiftEntry, ProductionEntry
    - ShiftEntry links to DailyPlan + ManpowerPlan (prefilled data source)
    - ProductionEntry links to DailyPlan task + Worker + Station
- Acceptance Criteria:
  - Shift Entries Auto-Fetch
    - [ ] On "Shift Entries" page load, system auto-fetches today's plan for current/next shift.
    - [ ] Form prefills: Date, Shift, list of stations with assigned workers and production tasks (SKU + target qty).
    - [ ] Prefilled data shown in cards/table with station name, worker names, SKU, target quantity (all read-only or lightly editable).
    - [ ] User adds actuals: "Actual Output" field per task, "Rejection Count", "Rejection Reason" dropdown (defect type).
    - [ ] "Add Manual Entry" button allows creating entry for unplanned tasks (full manual input).
    - [ ] Submit saves: links entry to DailyPlan + ManpowerPlan records, stores actuals, calculates efficiency (actual/target).
  - Production Entry Auto-Fetch
    - [ ] On "Production Entry" page, user selects Date + Shift → system fetches plan for that shift.
    - [ ] Table displays: Station, Worker(s), SKU, Target Quantity (prefilled from plan).
    - [ ] User adds: Actual Output, Quality Status, Rejection Count, Comments per row.
    - [ ] "Log Output" button per row saves production entry linked to plan task.
    - [ ] Real-time aggregation: page shows total output vs. target, rejection rate, efficiency % for shift.
  - Manual Override
    - [ ] If plan doesn't exist for date/shift, user can still create manual entries (no prefill, full input required).
    - [ ] If user needs to add worker not in plan (replacement, overtime), "Add Worker" option available.
  - Integration with Planning
    - [ ] Changes in Daily Plan or Manpower Plan reflect in Execution prefill (e.g., plan updated → next shift entry uses new data).
    - [ ] Execution data flows back to analytics: actual output updates project progress, worker performance tracked.
  - Audit & Traceability
    - [ ] Shift Entry and Production Entry records store link to source DailyPlan and ManpowerPlan records (auditability).
    - [ ] Variance reporting: system calculates deviation (actual vs. target) and highlights in dashboard.
- Priority: P1 (High) — eliminates redundant data entry, ensures planning data is utilized, critical for real-world usability.
- Dependencies: Daily Plan and Manpower Plan modules must exist with worker-station assignments and task schedules.
- Owner: Backend + Frontend
- Status: Inbox

---

### [WORKFORCE-CENTRAL-004] Central Workforce Management system (left sidebar + global)
- Context: A new top-level "Workforce Management" section is needed in the left sidebar (4th item after Home, Projects, Admin). This is distinct from the project-specific "Workforce Management" card shown in the Planning tab. The central system manages all workers (company employees + 3rd-party contractors), tracks their performance across all projects, evaluates contractors/providers, and monitors workforce stability (same people coming daily to reduce training overhead). The project-specific Planning → Workforce card should only show worker assignments for that specific project, not global performance.
- Affected Areas:
  - Frontend
    - `web/src/components/layout/AppLayout.tsx` (add "Workforce Management" nav item in sidebar, between Projects and Admin)
    - New route and page: `web/src/pages/workforce/WorkforceManagementPage.tsx` (central hub)
      - Tabs: Workers, Providers/Contractors, Leaderboard/Performance
      - Workers tab: list all workers (company + 3rd-party), filter by type/skill/provider, add/edit/deactivate
      - Providers tab: list contractors, their worker count, stability metrics (daily attendance consistency), performance score, contract details
      - Leaderboard: rank workers by efficiency/output/quality across all projects they've worked on
    - `web/src/pages/projects/tabs/PlanningTab.tsx` (ensure Workforce Management card links to project-scoped worker assignment, not global management)
  - Backend/API
    - New routes: `api/routes/workforce.js` or extend existing if present
      - `GET /api/workforce/workers` (list all workers with filters)
      - `POST /api/workforce/workers` (add company worker or link 3rd-party worker)
      - `PUT /api/workforce/workers/:id` (update worker details, skills, provider)
      - `GET /api/workforce/providers` (list contractors/providers with metrics)
      - `POST /api/workforce/providers` (add new provider/contractor)
      - `GET /api/workforce/performance` (aggregated performance metrics across projects)
      - `GET /api/workforce/stability` (attendance consistency: % of same workers daily per provider)
    - Prisma schema additions:
      - `Worker` model: id, name, type (company/3rd-party), skills (JSON), providerId (nullable), isActive, createdAt
      - `Provider` model (contractors): id, name, contact, contract details, status
      - `WorkerAssignment` (links worker to project/shift/station)
      - `WorkerPerformance` (tracks output, efficiency, quality per project per worker)
      - Relations: Worker → Provider, Worker → WorkerAssignments, Worker → WorkerPerformance
  - Notifications/audit: log worker additions, provider changes, performance updates
- Acceptance Criteria:
  - Sidebar Navigation
    - [ ] "Workforce Management" appears as 4th item in left sidebar (after Home, Projects, Admin), visible to managers and admins.
    - [ ] Clicking navigates to `/workforce` (central hub), not project-scoped.
  - Central Workforce Hub
    - [ ] Workers tab: displays all workers (company + 3rd-party) with columns: Name, Type, Skills, Provider, Shifts Worked, Avg Efficiency, Status (active/inactive).
    - [ ] Add Worker button opens modal with fields: Name, Type (Company/3rd-Party), Skills (multi-select or tags), Provider (dropdown if 3rd-party), Contact.
    - [ ] Edit/deactivate actions per worker; deactivated workers hidden by default (filter to show).
    - [ ] Providers tab: lists contractors with columns: Name, Active Workers, Total Workers Supplied, Stability Score (% same workers daily), Avg Performance, Contract Status.
    - [ ] Add Provider button; edit provider details including contract terms, rates.
    - [ ] Leaderboard tab: ranks workers by efficiency/output/quality across all projects; filterable by date range, project, skill.
  - Stability Metrics
    - [ ] Stability Score: calculated as (number of unique workers who worked ≥X days in last 30 days) / (total shifts in last 30 days) × 100. Higher = more consistent workforce.
    - [ ] Visual indicator (badge/color) for stability: green >80%, yellow 60-80%, red <60%.
  - Performance Tracking
    - [ ] Performance aggregated per worker across all projects they've participated in: tasks completed, output (units), efficiency (vs. target), quality (QC pass rate).
    - [ ] Drill-down: click worker → see per-project breakdown of their contributions.
  - Project-Specific vs. Global
    - [ ] Planning tab's "Workforce Management" card links to a project-scoped assignment page (not the global hub).
    - [ ] Project-scoped page shows only workers assigned to that project, with quick actions to assign/unassign from shifts/stations.
    - [ ] Global `/workforce` page aggregates data from all projects; no assignment UI, only management and analytics.
  - Permissions
    - [ ] Managers can view workforce data and assign workers to their own projects.
    - [ ] Admins can add/edit/deactivate workers and providers globally; view all performance.
    - [ ] Workers see limited view (their own performance only).
  - Real-time & Audit
    - [ ] Worker additions/edits trigger audit log entries.
    - [ ] Performance updates recalculated daily or on shift completion.
- Priority: P0 (Blocker) — core operational need for workforce tracking.
- Dependencies: Prisma migration for Worker/Provider/WorkerAssignment/WorkerPerformance models; shift/task tracking integration for performance calculation.
- Owner: Backend + Frontend
- Status: Inbox

---

### [AUTH-PREFS-401-003] AppLayout preferences fetch fails with 401 Unauthorized
- Context: On project pages (and likely other pages), the AppLayout component fetches `/api/user/preferences` on mount to load pinned items. This request returns 401 Unauthorized, causing a console error. Root cause: the React Query hook in AppLayout runs before authentication is fully established, or the API route's local `requireAuth` middleware isn't aligned with the global `authGuard`. The backend route exists in `api/routes/user.js` with its own `requireAuth` function that checks `req.user`, and the route is registered at `/api/user` in `api/index.js`.
- Affected Areas:
  - `api/routes/user.js` (replace local `requireAuth` with the global `authGuard` middleware for consistency)
  - `web/src/components/layout/AppLayout.tsx` (ensure `useQuery` is only enabled after user is authenticated; add better error handling/fallback)
  - Optional: add retry logic or silent error suppression for non-critical preferences
- Acceptance Criteria:
  - [ ] `/api/user/preferences` endpoint correctly authenticates using the global authGuard; no 401 when user is logged in.
  - [ ] AppLayout query only fires when `user` is truthy; gracefully falls back to empty pinned array if fetch fails or user not authenticated yet.
  - [ ] Console shows no 401 errors under normal authenticated flow; if a race condition occurs during initial load, the query retries or silently fails without breaking the UI.
  - [ ] Pinned items load and unpin correctly after fix.
  - [ ] Other routes in `user.js` (pin/unpin/reorder) also use global authGuard for consistency.
- Priority: P1 (High) — visible console errors and potential race condition.
- Owner: Backend + Frontend
- Status: Inbox

---

### [PROJ-TABS-ORDER-002] Project tab order and labeling consistency
- Context: Project header tabs should follow this exact sequence for clarity: Overview, SKUs, Board, Files, Planning, Compliance, Pre Production, Execution. Current order in `ProjectShell.tsx` is different, which breaks expected flow.
- Affected Areas:
  - `web/src/pages/projects/ProjectShell.tsx` (tabs array order and labels; keep route paths as-is)
  - Visual consistency across related pages that render tab links
- Acceptance Criteria:
  - [ ] Tabs render in the specified order above across all project pages.
  - [ ] Active-state styling and routing remain correct; deep links continue to work.
  - [ ] Labels match exactly: “SKUs”, “Board”, “Files”, “Planning”, “Compliance”, “Pre Production”, “Execution”.
  - [ ] Mobile overflow/tab scrolling still works.
- Priority: P1 (High) — please confirm
- Owner: Frontend
- Status: Inbox

---

### [FILES-AGG-ACL-001] Project Files tab: aggregate all files + per-file access control
- Context: Any file uploaded anywhere in the project must appear in the Files tab with metadata describing where it originated (module/page). Clicking a file should navigate to the source context. Viewing must respect per-file access control: on upload, ask who can view (default: All) and enforce at API level. Users without access shouldn’t see or open restricted files.
- Affected Areas:
  - Frontend
    - `web/src/pages/projects/tabs/FilesTab.tsx` (aggregate view, source links, lock badges, filter by origin/type, access indicators)
    - Upload flows in relevant modules (Compliance, PreProd, Planning, etc.) to include “Who can view” selector
  - Backend/API
    - `api/routes/documents.js` (extend POST/GET to accept/enforce ACL; include origin metadata)
    - `api/routes/projects.js` documents endpoints (ensure aggregation by project)
    - Prisma: add `DocumentAccess` or fields on `Document` (visibility: all/private/custom) and a join for user/role IDs
    - Middleware: enforce ACL on document fetch/download and signed URL endpoints; return 403 when not allowed
  - Notifications/audit: record who granted access and changes to ACL
- Acceptance Criteria:
  - [ ] Files tab lists all documents for the project regardless of where uploaded; supports filtering by origin (Compliance, PreProd, Planning, Board, Manual Upload, etc.).
  - [ ] Each file shows: title, type, uploader, created date, origin, and a link/button “View in context” that deep-links to its source page.
  - [ ] Upload UI includes “Who can view?” with defaults to All; supports Users, Roles, Departments; persisted to DB.
  - [ ] API enforces ACL; unauthorized users cannot fetch metadata or content; attempts yield 403 and are logged.
  - [ ] Existing uploads default to All; migration backfills visibility accordingly.
  - [ ] Search results (`/api/search`) respect ACL and omit restricted documents for non-authorized users.
- Priority: P0 (Blocker) — core information architecture and security.
- Owner: Backend + Frontend
- Status: Inbox

---

## Item template (will be duplicated per item)

### [ID-TBD] Title
- Context: 
- Affected Areas: (API routes, DB schema, UI pages/components, automation, infra)
- Acceptance Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
- Priority: P?
- Dependencies: 
- Owner: 
- Notes/Links: 
- Status: Inbox

---

## Planned (approved & queued)

<!-- Items moved here once you confirm scope and priority. -->

## In-Progress

<!-- One or few at a time, linked to PR/commit. -->

## Done (linked to commits/PRs)

<!-- Closed items with verification notes. -->




//**********************************************************************************//
above all were the issue highlighted, there are no issues below this
//**********************************************************************************//

✅ Your Answers Summary - Confirmed
Key Decisions:

✅ Project-specific in tabs, Global in sidebar - with universal search showing overview → click to specific project
✅ Multiple factories - with factory switcher + aggregate home dashboard
✅ Mixed workforce - contractor tracking for performance evaluation and rate negotiations
✅ Full task/reminder system - all types, both notification channels
✅ All approval types - specific person OR role-based fallback
✅ Both planning sources - auto-fill from Daily Plan + Manpower Plan
✅ Per-material loss + AI learning - manual entry with historical suggestions
✅ Project-specific materials - customizable workflow with standard templates
✅ User-prioritizable dashboard - real-time WebSocket updates
✅ Keep all certificates forever - full audit trail
🚀 IMPLEMENTATION STARTS NOW
Avoiding "phase" terminology as requested - Using "Group" instead.

Implementation Groups:
🔴 Group 1: Critical API Fixes (Days 1-7)

Fix project context architecture issue FIRST (affects everything)
Then restore all broken API endpoints (Workforce, QC, Compliance, Certifications, Approvals, Materials, MRP)
🟠 Group 2: Core Workflows (Days 8-14)

Approval creation flows, Execution auto-fill, Certificate uploads, Files ACL, Board fix
🟡 Group 3: Infrastructure (Days 15-24)

Factory hierarchy, Central Workforce, Tasks/Reminders, Search
🟢 Group 4: UX & Analytics (Days 25-34)

Home dashboard, Context improvements, Clarity/tooltips, Polish items
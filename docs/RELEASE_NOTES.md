# Phase-1 — Foundations & Intake (Complete)

Includes: Projects/SKUs/Docs, Auth/RBAC, MinIO, API, React shell, Audit layer.
Known gaps: Pre-production forms (partial), Compliance forms (partial).
Next: Phase-2 models (Tasks/QC/Roster/Alerts), Asana-style UI, inventory linkage, daily plan.

## 2025-11-06 — Board fix + Tasks & Reminders hub + nav/style tweaks

Highlights
- Fixed Board tab 500 error by aligning Prisma model and backend create paths (BoardColumn.updatedAt now @updatedAt; default column creation sets updatedAt).
- Board tab now boots reliably; default columns auto-create on first load.
- Implemented CreateTaskModal and wired the Board “New Task” button to open modal and POST to project tasks endpoint; board reloads after create.
- Surfaced the global “Tasks & Reminders” hub in the left sidebar and mobile nav (route: /reminders). No project-level tabs for Tasks/Reminders (per docs).
- Dark-mode nav text corrected so “Projects” (and peers) aren’t black in dark theme.

Docs and code links
- Web: `web/src/pages/projects/tabs/BoardTab.tsx` (modal integration)
- Web: `web/src/components/tasks/CreateTaskModal.tsx` (new)
- Web: `web/src/pages/inbox/TasksRemindersHub.tsx` (global hub)
- Web: `web/src/components/layout/AppLayout.tsx` (sidebar/mobile nav tweaks)
- API: `api/lib/kanban.js` (default columns + updatedAt handling)
- Prisma: `prisma/schema.prisma` (BoardColumn.updatedAt @updatedAt)

Dependency changes
- None added for these changes; all used packages were already in repo.

Pending validations / follow-ups
- Verify POST /api/projects/:id/tasks contract vs modal payload (priority/status mapping).
- Reconfirm TasksRemindersHub endpoints and RBAC across environments.
- Consider wiring global quick-add in header to create Task/Reminder (parity with hub forms).
- Optional: add unit/integration tests for board boot and task creation.

Quality gates
- Build (web): PASS (vite build).
- Lint/Typecheck: Deferred (no new TS errors observed during build).
- Tests: Deferred (backend tests require env/db; none added in this change).


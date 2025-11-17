# Missing Features Log – Up to Phase 4

Note: Per instruction, Phase 2 items (Execution) and MFA/Email are on hold. Logged here for completeness but will not be implemented in this pass.

## Phase 0 – Auth & Security
- MFA full flow (QR, TOTP, backup codes, trust device logic) – ON HOLD
- Security email alerts wiring (flagged audits, device login) – ON HOLD

## Phase 1 – Foundations & Intake
- Compliance Tracker (BIS/EN71/ASTM) – dedicated routes/UI missing or partial
- Project Policy Pack (shipment windows, packing composition, changeover policy) – schema/routes exist partially; needs UI and enforcement hooks
- WIP Ledger – endpoints exist; requires UI and automatic postings on batch moves
- Shift Entry System – basic production entries exist; needs authoritative shift abstraction and UI
- Process Flow Builder UI – visual builder not present (dependencies, approvers, docs)

## Phase 2 – Execution Control (ON HOLD)
- Factory/Floor/Section/Room full hierarchy management UI & APIs
- Workforce performance metrics and skill-based assignment
- Adaptive learning loop (override logging → improved suggestions)
- Maintenance scheduler UI and predictive suggestions
- Station assignment optimizer and asset mobility planning
- Full rework lifecycle with escalation
- Assembly balancing intelligence (multi-SKU)

## Phase 3 – Time & Cutoff Planning
- Policy-driven scheduler parameters (urgency/value/effort weights) – Missing
- Resource-aware scheduling (availability constraints) – Missing (simplified integration)
- Auto reallocation suggestions when risk thresholds exceeded – Missing endpoint
- Planner Dashboard UI (time buffers, slips, quick fixes) – Missing

## Phase 4 – Cost & Advisory
- Cost Templates library (CRUD + apply to costing) – Missing
- Margin Rules engine (rules CRUD + application in pricing) – Partially present in service; routes missing and wiring incomplete
- Multi-currency support (rates, conversion strategy) – Minimal (currency on tiers only); need conversion service
- Amortization engine (one-time/tooling spread, ROI) – Missing (service-level calc improvement)
- P&L tracking (standard vs actual) – Missing
- Optimization engine (box parity / gate-aware / constraints) – Missing
- What-if scenarios and scenario comparison endpoints – Comparison in service; routes/UI missing

---

## Implementation Plan (This Pass)
- Exclude MFA/Email and all Phase 2 items as requested.
- Implement Phase 3 items:
  - /api/time-planning/policies CRUD
  - Use policies in backward schedule (weights influence risk and ordering)
  - /api/time-planning/auto-reallocate → leverage resource suggestions for at-risk projects
  - Time Planning Dashboard UI in web
- Implement Phase 4 items:
  - /api/cost-templates (list/create/apply)
  - /api/margin-rules (list/create/update/delete)
  - Wire costingService applyMarginRules to rules
  - Basic multi-currency conversion utility (static rates, optional parameter)
  - P&L endpoint comparing standard vs actuals from ProductionEntry & MaterialConsumption
  - Scenario compare + simple what-if endpoint

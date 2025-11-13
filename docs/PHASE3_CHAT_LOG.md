# Phase 3 Chat Log & Handoff Context
Date: 2025-11-14
Branch: phase2-complete

## Purpose
This file captures the distilled conversation history, clarified decisions, and pending domain questions for Phase 3 (Time & Cutoff Planning + Daily Production Intelligence) so any subsequent system/agent can continue seamlessly. It complements `DAILY_PLANNING_REQUIREMENTS.md` (the canonical requirements + clarifications log).

## Conversation Timeline (Condensed)
1. Initial request: Implement Phase 3 (Time & Cutoff Planning) and Phase 4 (Cost & Advisory).
2. Pivot: User clarified daily planning is currently manual and broken → need deep requirement extraction first.
3. Excel ingestion: Provided `HIT - Sunglasses project tracker.xlsx` (31 sheets) containing BOM, DPRs, capacity tables, planning timeline, trackers.
4. Analysis: Extracted sheet names and parsed Planning, Tracker, DPR (Molding ABS), Final Processes capacity.
5. Requirements doc: Created `DAILY_PLANNING_REQUIREMENTS.md` (capacity formulas, plan generation, progress tracking, bottleneck logic, roadmap).
6. Clarification Q&A started: BOM vs process mapping, component ratios, capacity & changeover modeling.
7. Logged clarifications Q0–Q2 inside `DAILY_PLANNING_REQUIREMENTS.md` + added sync snapshot.
8. Current state: Implementation paused awaiting remaining answers (Q3 onward) before schema locking.

## Implemented So Far (Relevant to Phase 3/4)
- New route files: `api/routes/time-planning.js`, `api/routes/costing.js` (Phase 3 & 4 placeholders/MVP endpoints).
- Prisma schema extended with costing models (Phase 4). Phase 3 still relies on existing planning/production models.
- Requirements & clarifications logged up to Q2.

## Clarifications Captured
### Q0: BOM Module Design
- BOM = physical composition only (SKU → components). Process mapping is planner task; system later suggests flows.
### Q1: Sunglass Component Ratios
- 1 frame : 2 temples for this product; configurable per product category (no hardcoding). Drives exploded material/component counts.
### Q2: Capacity & Changeover Modeling
- Daily capacity = cycle time + cavities + machine count + shifts + utilization.
- Changeover/ramp-up time manually deducted initially; system must learn transition-specific durations (color/material/product change).
- Cross-project machine allocation variability; mid-run adjustments require simulation and user approval.

(Full verbatim Q0–Q2 answers + implementation notes live in `DAILY_PLANNING_REQUIREMENTS.md`.)

## Pending Domain Questions (Need User Answers Before Final Design)
These originate from earlier structured question list and must be answered sequentially. Ask ONE at a time and log verbatim in `DAILY_PLANNING_REQUIREMENTS.md` Phase 3 Clarifications Log.

Q3. Available Inventory Logic:
- How is "Available" computed per process (immediate upstream only vs cumulative downstream deductions)?
- Color-level pooled inventory or per-SKU segregation?
- Does zero availability automatically suppress planned output or require manual adjustment?

Q4. Days Required Rounding & Partial Days:
- Do you always ceil days or represent fractional (e.g., 8.3 days → 8 full + partial)?
- Any rule for splitting remainder into last day vs distributing earlier days?

Q5. Daily Planned Allocation Strategy:
- Uniform capacity assignment until remainder on last day OR balanced distribution across days?
- Manual override frequency and rationale?

Q6. Start Date Determination:
- Forward scheduling (material readiness) vs backward from cutoff with buffers vs manual entry?
- Standard buffer rules (QC, packing, shipping)?

Q7. Clear Frames / Unpainted Flow:
- Do clear frames skip painting entirely (Molding → Buffing → Assembly) or require separate surface process?

Q8. Lacquer DPR Purpose:
- Tracks cycle-based lacquering capacity OR purely material consumption confirmation?

Q9. Availability Blocking Behavior:
- If downstream planned > available upstream, does system (Excel) highlight, auto-zero, or rely on manual correction?

Q10. Multi-SKU Capacity Split:
- When multiple colors share same molding pool, how is daily capacity divided (priority, equal share, FIFO, manual)?

Q11. Rubberized Paint Path:
- Separate process line or variant of standard painting with extended changeover/ramp timings?

Q12. Lens Procurement vs Internal Production:
- Lenses treated as purchased items with lead times (no internal DPR) or do they have internal capacity tracking?

Q13. Packing Inner vs Outer Sequencing:
- Always sequential (inner packaged units then outer carton) OR parallel depending on resources?

Q14. WIP Tracking Granularity:
- Is WIP tracked between all process pairs or only major milestones (e.g., post painting, post assembly)?

Q15. Manual Intervention Set:
- Typical daily manual actions in Excel (update actuals, adjust start dates, rebalance capacity, flag shortages)?

Q16. Bottleneck Detection Heuristics:
- Exact red flags currently used (progress gap threshold, zero availability streak, rising pending days)?

Q17. Historical Data Use:
- Any existing offline notes for changeover/ramp durations or machine downtime causes we can seed learning with?

## Handoff Instructions for Next Agent/System
1. Pull latest branch `phase2-complete`.
2. Open `docs/DAILY_PLANNING_REQUIREMENTS.md` and append each new answer under the Phase 3 Clarifications Log (Q3 onward).
3. Preserve verbatim user wording; follow with extracted key points + implementation notes.
4. After Q3–Q10 answered: finalize inventory & capacity schema extensions.
5. After Q11–Q13 answered: refine process flow templates (painting variants, packing pipeline).
6. After Q14–Q17 answered: design learning data structures (ChangeoverHistory, RampProfile, BottleneckEvent, DowntimeCause).
7. Only then start implementation tasks: capacity engine (Todo #3), daily plan generator (#4), progress tracking (#5).
8. Commit changes referencing question IDs, e.g., `feat(phase3): add inventory model (Q3)`.
9. Maintain audit trail for assumptions if user defers a question.

## Risks If Questions Remain Unanswered
- Mis-modeled inventory could cause infeasible schedules.
- Lack of bottleneck heuristics leads to poor reallocation suggestions.
- Insufficient changeover modeling reduces accuracy of capacity predictions and undermines trust.

## Next Immediate Action (If Continuing Now)
Ask Q3 (Available inventory logic) → log answer → proceed sequentially.

---
Generated automatically as part of synchronization step. Do not edit prior Q&A; append only.

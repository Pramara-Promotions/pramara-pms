# Daily Planning System Requirements
**Analyzed from:** HIT - Sunglasses project tracker.xlsx  
**Date:** November 14, 2025

## Executive Summary

The current manual planning process in Excel needs to be automated in PMS with intelligent capacity calculation, dependency management, and real-time adaptation. This document maps the Excel logic to PMS architecture.

---

## Current Excel Structure (What We're Replacing)

### Key Sheets & Their Purpose

1. **Planning Sheet**
   - **Purpose:** Master timeline with processes, sub-processes, start/end dates, status tracking
   - **Data:** Process hierarchy, lead times, dependencies, status (not started/ongoing/received/initiated)
   - **Intelligence:** Manual date calculations with buffers

2. **DPR Sheets (Daily Production Rate)** - Multiple sheets per material/process
   - Examples: "Molding ABS DPR", "Molding PP DPR", "Buffing DPR - ABS", etc.
   - **Purpose:** Daily capacity planning per SKU/color with day-by-day planned vs actual tracking
   - **Structure:**
     - Columns: Pantone Code, Color, Order Qty, Done Till Date, Pending, Daily Capacity, Days Required
     - Then 50+ day columns with Planned/Actual pairs
   - **Key Intelligence:**
     - `Days Required = Pending Qty / Daily Capacity`
     - Tracks actual against planned daily

3. **Final Processes Daily Output**
   - **Purpose:** Capacity calculation for each process stage
   - **Formula Pattern:**
     ```
     Per Minute = 60 / Cycle Time (seconds)
     Per Hour = Per Minute × 60
     Per Day = Per Hour × Working Hours (typically 20 hours for 2 shifts)
     Total Output = Per Day × No. of Machines/Workers
     ```
   - **Example:**
     - Screwing: 8 sec cycle → 7.5/min → 450/hr → 9000/day × 3 machines = 27,000 units/day

4. **Tracker Sheet**
   - **Purpose:** Milestone tracking across processes (Mold development, Paint machine setup, RM orders)
   - **Structure:** Process stages with milestone dates and status

5. **BOM & Material Sheets**
   - Sunglasses BOM, Raw Material Requirement, Paint requirement
   - Material-to-SKU mappings with quantities

6. **Lens Color Sheets** (Black, Silver, Yellow, Red, Orange, Green, Blue)
   - Per-color SKU breakdown and order quantities

---

## Core Planning Logic to Implement in PMS

### 1. Capacity Calculation Engine

**Input Parameters (from ProcessConfig):**
- `cycleTimeSec`: seconds per unit
- `cavities`: parts per cycle (for molding)
- `machines`: number of parallel machines/workers
- `shiftHours`: effective hours per shift (typically 8-10)
- `shiftsPerDay`: number of shifts (1, 2, or 3)
- `utilizationRate`: efficiency % (default 85%)

**Formulas:**
```javascript
unitsPerMinute = (60 / cycleTimeSec) * cavities
unitsPerHour = unitsPerMinute * 60 * utilizationRate
outputPerShift = unitsPerHour * shiftHours
outputPerDay = outputPerShift * shiftsPerDay * machines
daysRequired = Math.ceil(targetQty / outputPerDay)
```

**Real Example from Excel:**
- Screwing: 8 sec, 1 cavity, 3 machines, 20 hrs/day (2 shifts)
  - Per min: 60/8 = 7.5
  - Per hour: 7.5 * 60 = 450
  - Per day: 450 * 20 = 9,000
  - Total: 9,000 * 3 = 27,000 units/day

### 2. Multi-SKU/Color Planning

**Current Excel Pattern:**
- Each DPR sheet lists all color variants with:
  - Order Qty (target)
  - Done Till Date (progress)
  - Pending = Order Qty - Done
  - Daily Capacity (calculated from capacity engine)
  - Days Required = Pending / Daily Capacity

**PMS Implementation:**
```javascript
// For each ProjectSku in a Project
const planning = {
  skuCode: "Black 6C",
  color: "Black",
  orderQty: 218400,
  doneTillDate: 0, // from production entries
  pending: 218400,
  dailyCapacity: 27456, // from capacity calc
  daysRequired: Math.ceil(218400 / 27456), // 7.95 → 8 days
  allocatedStations: ["M-01", "M-02"], // station codes
  allocatedMachines: 3
}
```

### 3. Day-by-Day Production Scheduling

**Excel Structure:**
- 50+ columns: Day 1, Day 2, ... Day 50
- Each day has Planned and Actual sub-columns
- Dates are Excel serial numbers (45974 = Oct 4, 2025)

**PMS Implementation:**
- Store in `DailyPlanStation` table
- Generate rows per station/SKU/date with `targetQty`
- Track actual via `ProductionEntry` linking back to plan

```javascript
// Generate daily plan
const startDate = new Date('2025-10-04');
for (let day = 0; day < daysRequired; day++) {
  const date = addDays(startDate, day);
  const targetForDay = Math.min(dailyCapacity, remainingQty);
  
  await DailyPlanStation.create({
    dailyPlanId,
    stationId,
    projectSkuId,
    date,
    targetQty: targetForDay,
    status: 'pending'
  });
  
  remainingQty -= targetForDay;
}
```

### 4. Process Flow & Dependencies

**Excel "Planning" Sheet Logic:**
- Hierarchical processes with sub-processes
- Sequential dependencies (PPS → Paint Sampling → Trials → Machine Setup → RM Order → Production)
- Lead times per process
- Start/End dates calculated with buffers

**PMS Mapping:**
```javascript
// WorkflowStage for project
{
  sequence: 1,
  name: "PPS",
  estimatedDays: 10,
  dependencies: [], // nothing before
  requiresApproval: true
}
{
  sequence: 2,
  name: "Paint Sampling",
  estimatedDays: 8,
  dependencies: ["PPS"], // blocks until PPS approved
  requiresApproval: false
}
// ... continues
```

### 5. Multi-Material Process Variants

**Excel Pattern:**
- Separate DPR sheets for ABS vs PP (different materials)
- Each material has different:
  - Cycle times
  - Machine configurations
  - Color variants
  - Daily capacities

**PMS Implementation:**
- `ProcessConfig` per material type + station combo
- Filter SKUs by material attribute
- Generate separate plans per material stream

```javascript
// Example: Molding ABS vs Molding PP
const absConfig = {
  stationType: 'molding',
  material: 'ABS',
  cycleTimeSec: 45,
  cavities: 4,
  machines: 3
}

const ppConfig = {
  stationType: 'molding',
  material: 'PP',
  cycleTimeSec: 50,
  cavities: 2,
  machines: 2
}
```

### 6. Real-Time Progress Tracking

**Excel Tracking:**
- Planned vs Actual columns per day
- Status flags (not started, ongoing, received, initiated)
- Comments and blockers

**PMS Implementation:**
- `ProductionEntry` records actual output per shift/station
- Compare against `DailyPlanStation.targetQty`
- Auto-calculate variance and trigger alerts
- Update `DailyPlanStation.actualQty` and `completedAt`

```javascript
// After shift ends
const variance = actualQty - targetQty;
const variancePercent = (variance / targetQty) * 100;

if (variancePercent < -20) {
  // Create alert: significant underproduction
  Alert.create({
    level: 'RED',
    message: `Station ${stationCode} produced ${actualQty} vs target ${targetQty} (${variancePercent.toFixed(1)}% short)`
  });
}
```

### 7. Bottleneck Detection & Cross-SKU Balance

**Excel Intelligence (Manual):**
- Planner visually scans DPR sheets
- Identifies SKUs with slower progress
- Manually reallocates machines/workers

**PMS Automation:**
```javascript
// System detects imbalance
const skuProgress = calculateProgressPerSKU(projectId);

// Example output:
// SKU 1-7: 90% complete
// SKU 8: 35% complete ❌ BOTTLENECK

const bottlenecks = skuProgress.filter(s => 
  s.percentComplete < avgProgress * 0.7
);

if (bottlenecks.length > 0) {
  // Suggest reallocation
  const suggestion = {
    action: 'reallocate',
    fromStations: findOvercapacityStations(projectId),
    toStations: findBottleneckStations(bottlenecks),
    expectedImpact: calculateImpact(),
    reasoning: "SKU 8 is 55% behind schedule, reallocating 2 machines will balance by Day 12"
  };
  
  // Store in PlanAdaptation for planner review
  PlanAdaptation.create(suggestion);
}
```

---

## Intelligent Planning Features to Add (Beyond Excel)

### 1. Backward Scheduling from Cutoff
- Start from project cutoff date
- Subtract shipping buffer (2 days)
- Subtract QC buffer (1 day)
- Walk backward through stages with dependencies
- Assign start/end to each WorkflowStage

### 2. Multi-Project Resource Optimization
- Detect station conflicts across projects
- Prioritize by cutoff urgency and revenue
- Suggest optimal allocation to maximize throughput

### 3. Predictive Alerts
- Forecast slip before it happens
- "At current rate, SKU 5 will be 3 days late"
- Proactive reallocation suggestions

### 4. Learning from History
- Track planner overrides and outcomes
- Learn optimal station-SKU pairings
- Improve capacity estimates over time

### 5. Material Availability Pre-Check
- Before approving daily plan, verify materials
- Block stations if materials not available
- Auto-reserve materials for approved plans

---

## Implementation Roadmap

### Phase 1: Capacity Calculator (Week 1)
- [ ] Enhance `ProcessConfig` model with all capacity parameters
- [ ] Build capacity calculation service
- [ ] API: POST /api/capacity/calculate
- [ ] Test against Excel formulas for accuracy

### Phase 2: Daily Plan Generator (Week 2)
- [ ] Build plan generator service
- [ ] Input: Project + SKUs + Stations + Cutoff
- [ ] Output: DailyPlan + DailyPlanStation rows for next N days
- [ ] API: POST /api/daily-plans/generate
- [ ] Validate against Excel DPR sheets

### Phase 3: Progress Tracking (Week 3)
- [ ] Link ProductionEntry to DailyPlanStation
- [ ] Calculate actual vs planned variance
- [ ] Auto-update plan status
- [ ] Variance alerts and dashboards

### Phase 4: Intelligent Adaptation (Week 4)
- [ ] Bottleneck detection algorithm
- [ ] Reallocation suggestion engine
- [ ] Cross-SKU balance monitoring
- [ ] PlanAdaptation workflow

### Phase 5: UI & Visualization (Week 5-6)
- [ ] Planner dashboard with Gantt/timeline
- [ ] Per-station daily plan view
- [ ] Drag-drop reallocation
- [ ] Real-time progress charts

---

## Data Flow Summary

```
1. PROJECT SETUP
   ↓
   Project + SKUs + Target Qty + Cutoff Date entered

2. CAPACITY CONFIGURATION
   ↓
   ProcessConfig defined per station/SKU/process
   (cycle time, machines, shifts, utilization)

3. PLAN GENERATION (Replaces Excel DPR)
   ↓
   System calculates:
   - Daily capacity per station/SKU
   - Days required
   - Backward schedule from cutoff
   - Station allocations
   ↓
   Creates: DailyPlan + DailyPlanStation rows

4. EXECUTION (Replaces Excel Actual columns)
   ↓
   Workers log output via ProductionEntry
   ↓
   System updates DailyPlanStation.actualQty

5. MONITORING (Replaces Excel status tracking)
   ↓
   Compare actual vs planned
   ↓
   Detect bottlenecks, slips, imbalances
   ↓
   Generate Alerts + PlanAdaptation suggestions

6. ADAPTATION (New intelligence)
   ↓
   Planner reviews suggestions
   ↓
   Approves reallocation
   ↓
   System updates DailyPlan
   ↓
   Tracks outcome for learning
```

---

## Key Differences: Excel vs PMS

| Aspect | Excel (Manual) | PMS (Automated) |
|--------|----------------|-----------------|
| **Capacity Calc** | Manual formulas per sheet | Centralized engine with ProcessConfig |
| **Daily Planning** | Pre-filled 50-day grid | Dynamic generation based on capacity |
| **Multi-SKU Balance** | Visual scan by planner | Auto-detection with reallocation suggestions |
| **Progress Tracking** | Manual entry in Actual columns | Auto-update from ProductionEntry |
| **Bottleneck Detection** | Planner intuition | Algorithm-based with reasoning |
| **Dependencies** | Manual date adjustments | WorkflowStage dependency enforcement |
| **Reallocation** | Manual, no impact preview | Suggested with expected impact |
| **Learning** | None | Tracks outcomes, improves suggestions |
| **Multi-Project** | Separate files | Unified resource optimization |
| **Alerts** | None | Proactive slip detection |

---

## Next Steps

1. **Validation:** Review this analysis with the team to confirm accuracy
2. **Data Migration:** Plan to import existing Excel data into PMS
3. **Parallel Run:** Run PMS planning alongside Excel for validation period
4. **Training:** Prepare planner training on new system
5. **Cutover:** Phase out Excel once confidence is high

---

## Questions for Team

1. Are there other Excel files/sheets we should analyze?
2. What's the typical project complexity (number of SKUs, processes)?
3. Do cycle times vary by machine, or are they standard per process?
4. How often do you replan (daily, weekly)?
5. What are the most common planning challenges you face?

---

## Phase 3 Planning Clarifications Log

Purpose: Persistent record of Q&A that refines how we implement Time & Cutoff Planning + Daily Production Intelligence. This log captures concepts (not raw Excel data) and will drive schema/service/API decisions.

Date Started: 2025-11-14

### Q0: BOM Module Design (Component vs Process Representation)
**Question (System Prompt Recap):** When we build the PMS BOM module, should it be (A) component-based with explicit exploded quantities (1 frame, 2 temples, lenses), (B) process-based listing required manufacturing steps per SKU, or both with BOM driving auto-generated process requirements?
**Answer (User):** BOM always represents physical product composition. Processes are mapped afterward by the project manager. The system can learn and suggest processes but initial mapping remains a human planning action.
**Implementation Notes:**
 - BOM domain: physical decomposition only (SKU → components with ratios, materials, colors, attributes like rubberised).
 - Separate Process Definition layer linked via component types and product category templates.
 - Auto-suggestion engine (future) derives candidate process chains from BOM + historical patterns (e.g., ABS Frame → molding→buffing→painting→assembly→QC→packing).
 - Data model implication: Keep `BOMComponent` distinct from `ProcessStepTemplate`. Provide linkage table `BomComponentProcessMapping` for learned/suggested flows.
 - UI: BOM creation wizard first; process planning wizard second with system recommendations and planner overrides (record overrides for learning).

 Adding this for a more clear idea
 so see, the BOM will always be of physical products, what you are saying in option b is the process. A bom will always be defined by the project managed and then accodring to that they will also map out the process. now, sure, our PMS will learn and suggest the process, but this is work of the project manager. The system will also work hand in hand here, during this process planning. say the user sayes, one of the process is spary painting. now the system is aware that we have the spray painting booths. it has the quantity, it has their status, and where are they being used across process. so now it will tell, say how many machines are needed for this project as a whole and sku wise, then find how many machines are available, how the load is to be distributed across the machines. it has to know that frequent changes on machine to accomodate different project is also not a time saving venture as it has to also account for the changeover, start up and ramp up time. when ever their is change in product on the machine, may it be different sku from the same project or different project, it has to account for the changeover, startup and ramp up time. because that is practical planning and how the machines work, nothing start immedieately and gives full output. the system will learn from these timiings to plan for the best switchover process and ensure minimum downtime. if they are not availabel in the said timeline, it will also look at what we have previously done in such cases (given to external vendor, used different process, etc). if there is a new process, then system will confirm what machione is, what its cycle time is, how many are there, This data will be than needed to defined during the actual flow process where we add these new machine is system also and log their positions.

### Q1: Why is the frame:temple ratio 1:2 and how should PMS treat it?
**Answer (User):** Because a sunglass product physically consists of 1 frame (front) and 2 temples (left/right). This ratio is product-specific and belongs to the product BOM definition stage. Different product categories will have different component ratios. The BOM is defined per project by the project manager; downstream processes, material requirements, and purchasing flow from that BOM. The system may learn and suggest processes later but initial mapping is user-driven.
**Implementation Notes:**
 - Store component ratios in a `ProductBOMComponent` table (projectSkuId, componentType, ratio, material, color).
 - Do not hardcode 1:2; make it configurable per SKU/product category.
 - Use ratios to explode order quantity into required component counts (drives material, capacity planning).
 - Allow future recommendation engine to propose missing process steps based on component types (e.g., temples → molding + painting + assembly).

### Q2: How DPR Daily Capacity is calculated and how it handles changeover/machine variability

**Question:** In your current Excel setup, how exactly do the "Molding ABS DPR" and "Molding PP DPR" sheets obtain the Daily Capacity values for frames and temples: Are they direct cell references to the "Mold Daily Output" sheet (so changing cavities or machine count there propagates automatically), or are capacities copied manually into the DPR? When machine allocation changes mid-project (e.g., you add or remove a mold set), do you edit Mold Daily Output and let DPR recompute, or adjust DPR rows directly? How (if at all) do you currently account for changeover, startup, and ramp‑up time in those capacity numbers—do you: subtract fixed minutes/hours from the available shift, use a utilization factor (e.g., 0.85), ignore it in Excel and handle mentally, or record it in a separate adjustment column? Are partial-day losses (e.g., 2 hours lost for a switchover) reflected by reducing "Daily Capacity" that day, or not modeled? Do you track planned vs actual machine count per day anywhere, or is machine count assumed constant for the whole run?

**Answer (User - Verbatim):**
> so this data is calculated on the basis of the cycle time of the mold. a molding machine takes a certain time to molld the required part,. This starts with the closing of the mold and injection of melted plastic in the cavity. a mold may have multiple cavaties or a single cavaity (ths data will be availbe in our mold section in PMS). Once the incjection is done, cold water is cireculated though the mold, which cools down the injected part and solidifies it. once it cools down, the mold is opened again and then the part is ejected using ejector pin. this whole duation of mold closure to ejection using pin is called as cycle time. now once this cycle time is received, then we calculated how much is done in a minute, hour, day and how long will it take to mold all the products. now here we have to take into account the number of cavities in calculation. in our case , say the 4 cavity abs farem mold - it has 4 cavities and has a cycle time of 33 seconds. so in 33 seconds, i get 4 parts, and on the basis of this i can calulate how much i can do in the required time frame. there may be multi cavity mold having different product in the same mold - like different size of gears in a single mold. so in this case, each item will be tallied seperately. now if i have 3 same mold, that will give me 3 parts in 33 second. so on basis of all these calculations we get the final daily capacity, which is then taken in DPR.
> 
> now for your question of changeover, yes that down time has to be taken in account. now as you can see in certain cases, where i'm doing molding of 2 products, the sum of both those plan is not equal to the daily capacity as i've reduced that time for changeover. the calculation is neved fixed as this is complete manual process, so this is somethign the PMS has to ask for initially, but gradually have that shown as autfilled and ready for verification once it get hangs of the changeover and rmap up time. and this is not just for molding, it will be applicable in almost all process. say in painting, when going from one color to another, it takes time to clear existing stations, clear spay brushes and load up with new colors and check the flow. And yes machine count is always a variable, there may be cases when all the machines are not available and the system vbeing corss project aware, will know if machine is utlised else where. the system has to then plan dpr accordingly and also update it mid run if needed, but explain and get approval from user before implementing

**Key Points Extracted:**

1. **Cycle Time is Foundation**
   - Molding process: mold close → plastic injection → cooling (cold water circulation) → mold open → ejection via pins
   - Total duration = cycle time (e.g., 33 seconds for 4-cavity ABS frame mold)
   - Formula: `partsPerCycle = cavities × cycleTime`

2. **Cavity Count Matters**
   - A 4-cavity mold produces 4 parts per cycle (33 sec → 4 parts)
   - Multi-product molds possible (different gears in same mold) → tally each item separately
   - Must track cavity allocation per SKU/part type

3. **Machine Multiplier**
   - If 3 identical molds running: 3 × 4 cavities = 12 parts per 33 seconds
   - Daily capacity = `(partsPerCycle × machines × shiftsPerDay × shiftHours × 3600) / cycleTimeSec`

4. **Changeover Downtime is Real & Variable**
   - Excel: manually reduce planned capacity when switching products (sum of plans < theoretical daily capacity)
   - Changeover includes: cleanup, setup, ramp-up to full speed
   - **Not fixed duration** → varies by product/color/material combination
   - Applies across ALL processes (molding, painting, assembly, etc.)

5. **Painting Example**
   - Color changeover: clear stations → clean spray brushes → load new color → test flow
   - Time-consuming, must be accounted in capacity planning

6. **PMS Learning Requirement**
   - **Initial:** System must ASK user for changeover/ramp-up time per switchover
   - **Gradual:** System auto-fills estimated times based on historical data, presents for USER VERIFICATION
   - Learning inputs: actual changeover duration, ramp-up curve, product/color/material combinations

7. **Machine Count Variability**
   - Machines may not all be available (cross-project resource contention)
   - PMS must be **cross-project aware**: track which machines are used where
   - If machines unavailable in timeline → suggest alternatives:
     - External vendor outsourcing (with historical precedent)
     - Alternative process (if done before)
     - Delay/replan with justification

8. **Mid-Run Adjustments**
   - DPR must be updatable during execution (machine breakdown, reallocation, etc.)
   - System must **explain impact + get user approval** before applying changes
   - Track: planned vs actual machine count per day

9. **New Process/Machine Onboarding**
   - If new process introduced → system prompts for:
     - Machine type/ID
     - Cycle time
     - Number of machines
     - Physical location
   - Data persisted for future planning

**Implementation Notes:**

- **Schema Extensions:**
  - `MoldMaster` table: `id`, `code`, `cavities`, `cavityConfiguration` (JSON for multi-product molds), `cycleTimeSec`, `material`, `status`, `location`
  - `StationMachine` table: `id`, `stationId`, `machineType`, `code`, `status`, `currentProjectId`, `currentSkuId`, `cycleTimeSec`, `cavities`
  - `ChangeoverHistory` table: `id`, `machineId`, `fromProjectSkuId`, `toProjectSkuId`, `changeoverStartAt`, `changeoverEndAt`, `durationMinutes`, `rampUpEndAt`, `rampUpDurationMinutes`, `notes`
  - `DailyPlanStation` add fields: `allocatedMachines` (int), `changeoverDowntimeMinutes`, `effectiveCapacity` (after changeover deduction)

- **Capacity Calculation Service:**
  ```javascript
  function calculateDailyCapacity(config) {
    const { cycleTimeSec, cavities, machines, shiftHours, shiftsPerDay, utilizationRate = 0.85 } = config;
    
    const partsPerCycle = cavities;
    const cyclesPerHour = (3600 / cycleTimeSec);
    const partsPerHour = cyclesPerHour * partsPerCycle * utilizationRate;
    const partsPerShift = partsPerHour * shiftHours;
    const partsPerDay = partsPerShift * shiftsPerDay * machines;
    
    return Math.floor(partsPerDay); // floor to avoid fractional parts
  }
  
  function deductChangeoverTime(baseCapacity, changeoverMinutes, shiftHours, shiftsPerDay) {
    const totalMinutesAvailable = shiftHours * 60 * shiftsPerDay;
    const effectiveMinutes = totalMinutesAvailable - changeoverMinutes;
    const effectiveCapacity = (baseCapacity * effectiveMinutes) / totalMinutesAvailable;
    
    return Math.floor(effectiveCapacity);
  }
  ```

- **Changeover Learning System:**
  - When planner assigns SKU to station, system checks:
    1. Is this a switchover from different SKU/color/material?
    2. Query `ChangeoverHistory` for similar transitions (same fromSku/toSku material/color combo)
    3. Calculate average changeover + ramp-up duration
    4. Present to user: "Estimated changeover: 45 min (based on 3 similar switches). Adjust if needed."
    5. Record actual timing post-execution → feed learning loop

- **Cross-Project Machine Allocation:**
  - API: `GET /api/machines/availability?dateRange=2025-10-01:2025-10-15&machineType=molding`
    - Returns: machine list with current allocation status, available capacity %
  - Daily plan generator checks machine availability before allocation
  - If conflict: present alternatives with impact analysis (cost, timeline, quality)

- **Mid-Run Update Workflow:**
  - User requests change (e.g., add 1 machine to SKU X, remove from SKU Y)
  - System simulates impact:
    - SKU X: finish 2 days earlier
    - SKU Y: slip by 1 day, still meets cutoff
    - Overall project: no cutoff risk
  - Present impact report + approval prompt
  - On approval: update `DailyPlanStation`, create audit log entry

- **UI Implications:**
  - Process planning wizard: show available machines per station, real-time utilization %
  - Daily plan view: capacity bars with changeover time shaded differently (visual distinction)
  - Changeover input dialog: "Last time this took 38 minutes. Enter estimate or confirm."
  - Machine allocation drag-drop with conflict warnings

### Q3+: (Future) Additional process-specific nuances
Will define: Paint booth clearing protocol variations, assembly station setup time patterns, QC sampling frequencies.

### Logging Strategy
 - Each answered question appended here with: number, user answer summary, implementation notes.
 - When a note results in a schema/API change, cross-reference commit hash + ticket ID.
 - At Phase 3 design freeze, extract this section into `PHASE3_IMPLEMENTATION_SPEC.md` (unless user prefers to keep inline).

### Upcoming Items to Clarify
1. Daily capacity sourcing & dynamic adjustments (Q2)
2. Changeover time modeling (Q3)
3. Allocation heuristics across multi-project machine pools
4. Handling partial-day losses & micro-downtime
5. Automatic vs manual reallocation boundaries (planner override rules)
6. Learning signals: which events persist for modeling (e.g., actual cycle time drift, downtime causes)

---

## Chat & Clarification Sync Snapshot (2025-11-14)
Consolidated summary of all Phase 3 related discussion so far for cross-device continuity.

### What Has Been Captured
1. Excel analysis converted into structured PMS requirements (capacity engine, daily plan generator, tracking, adaptation).
2. BOM vs Process distinction (BOM physical composition; processes mapped separately; system will later recommend flows).
3. Sunglasses component ratio (1 frame : 2 temples) stored as configurable BOM components — not hardcoded globally.
4. Capacity derivation (cycle time + cavities + machine count + shifts + utilization; changeover deducts effective minutes).
5. Changeover & ramp-up concept (initially manual input; system learns typical durations per transition → suggests → user verifies).
6. Cross-project machine awareness (machine allocation is variable; system must detect contention and propose alternatives: outsource, reschedule, reassign).
7. Mid-run plan adjustments require simulation + user approval + audit trail.
8. Schema extension candidates (MoldMaster, StationMachine, ChangeoverHistory, DailyPlanStation enhancements).
9. Pending inventory availability modeling (next Q: WIP flow and “Available” logic between stages).

### Verbatim Answers Logged
- Q0: BOM module design (component-only vs process) → BOM physical; processes user-mapped; system augments with suggestions.
- Q1: Ratio explanation → physical construction of product; flexible for other product categories.
- Q2: Detailed molding capacity + changeover explanation (full text preserved above under Q2 section).

### Pending / To Be Answered
- Q3: Available inventory formula semantics (color-level pooling vs per-SKU, multi-stage deduction, blocking when zero available).
- Q4+: Dynamic WIP tracking granularity (every process pair vs selected checkpoints).

### Implementation Anchors Going Forward
- Introduce changeover deduction field in daily capacity computation (store raw and effective capacity).
- Maintain historical transitions keyed by fromSkuId, toSkuId, processType, material, color.
- Build proactive “impact simulation” service before applying mid-run adjustments.
- Add machine utilization view spanning all active projects.

### Sync Instructions (for team)
After updating this file, commit & push `phase2-complete` branch to make it available to all devices.

---


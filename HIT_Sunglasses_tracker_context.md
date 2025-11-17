# HIT – Sunglasses Project Tracker: Functional Context

This Excel workbook acts as a focused mini-ERP for a single sunglasses program. Below is a structured interpretation of each sheet and the data flow between them, distilled from the provided domain narrative.

---
## 1. Core Definition Layer
### Sunglasses BOM ("master recipe")
Each row = a SKU / design variant (e.g. 6223 Black, 6224 Blue/Black, 6207 Clear/Blue).
Fields cover: PO number/date, internal part number, description, total ordered quantity (pieces), frame & temple materials (ABS / PP / Clear ABS / PC for lens), lens type (mono / mirror / tinted / two‑tone), color breakdown (frame inside/outside, temple inside/outside) and Pantone codes. Rubberised flag for paint logic.
Purpose: Canonical list of "what must be produced" and in what quantities/materials/colors.
Outputs referenced: Total ABS pieces, Total PP pieces, Grand Totals → feed downstream material, capacity, and planning sheets.

---
## 2. Material Translation Layer
### Raw Material Requirement
Derives per-color part counts (temples, frames) by joining BOM with per-SKU component multiplicities (1 frame + 2 temples). Applies per-piece gram weights → converts counts to kg for ABS, Clear ABS, PP. Computes masterbatch kg via % factors and rubberised paint kg for marked SKUs.
Purpose: Converts design/color demand into purchase quantities (plastics, masterbatch, paint).

### Paint Requirement
Aggregates total painted parts per color (excluding clear/non-painted). Applies paint consumption rate per part → paint kg. Assumes 1:1 paint:lacquer → lacquer kg. Adds thinner requirement via mixing ratio.
Purpose: Determines liquid coating inputs from BOM counts + consumption coefficients.

---
## 3. Capacity Definition Layer
### Mold Daily Output
Per mold: cavities, cycle time (sec), pieces per cycle, sets running → pieces / minute / hour / day. Summarizes daily output for frames vs temples per material.
Purpose: Source of molding daily capacity used in molding DPR sheets and planning durations.

### Final Processes Daily Output
For each downstream process (buffing, screwing, lacquer spray, riveting, pad printing, lens assembly, sticker/cleaning/FQC, packing): cycle time (sec) → per minute / hour / day. Multiplies by machines/manpower → Total Output.
Purpose: Master capacity table feeding every Daily Capacity field in all DPR sheets.

---
## 4. Execution & Tracking Layer (DPR Sheets)
Shared pattern: One row per color/SKU. Columns: Order Qty, Done Till Date, Pending, Daily Capacity (from capacity sheets), Days Required (derived), then a temporal grid of Day N Planned vs Actual. "Available" columns gate work by upstream completed quantities.

- Molding ABS DPR & Molding PP DPR: Color-based molding progression.
- Buffing DPR – ABS: Transforms molded frames into buffed parts; availability checks molded output minus downstream consumption.
- Screwing, Lacquer, Riveting, Pad Printing DPRs (ABS & PP variants): Sequential transformation stages; each pulls capacity from Final Processes Daily Output; availability constrained by prior stage completions.
- Lens Assembly DPR – ABS / PP: Fits lenses into frames; availability depends on upstream processed frames and lens stock.
- Sticker, Cleaning and FQC – ABS / PP: Final internal QC & prep before ready-to-ship status.

Purpose: Day-by-day operational realization of plan, with real-time variance capture versus plan.

---
## 5. Structural & Bridging Sheets
### Pre Assembly BOM
Explicit mapping: 1 frame + 2 temples per sunglass. Reinforces component-to-finished-unit proportionality. Rubberised flag reused by paint-related sheets.
Purpose: Enables calculating how many complete units possible from available component stock; feeds assembly readiness logic.

### Lens Color Sheets (Black, Silver, Yellow, Red, Orange, Green, Blue)
Map SKU part numbers to lens color/material (PC). Support procurement and lens-fit availability checks.
Purpose: Ensures lens supply alignment with frame production for assembly gating.

### Packing Material Requirement
Translates total ABS/PP units into cartons, partitions, polybags; breaks down by PO for procurement. Feeds planning and vendor coordination.
Purpose: Determines non-production physical supply needs proportional to output quantities.

### Vendor Details
Supplier master (contact + GRS compliance). Used for procurement & compliance tracking; not computational.
Purpose: Reference table for sourcing decisions & certification coverage.

### Tracker
Milestone sequencing for major process streams (mold development, machine setup, raw material orders, coating prep). Focused on status phrase progression, not quantities.
Purpose: High-level project milestone governance.

### Checklist
Compliance & approval governance (BOM approval, GRS tests, certifications, packaging approvals). Includes responsible party, duration, critical dates, remarks.
Purpose: Ensures regulatory & client-specific requirements parallel production flow.

### Planning
Integrates required quantities (from BOM / raw material conversions) with capacity (from Mold Daily Output & Final Processes). Calculates days required, applies start dates to derive end dates; includes commentary for practical constraints.
Purpose: Calendar layer aligning supply readiness, production capacities, and milestone timelines.

---
## 6. Data Flow Summary
BOM → Raw Material Requirement / Paint Requirement → (kg inputs)
BOM + component ratios → per-part counts → capacities (Mold Daily Output, Final Processes) → DPR sheets (time-phased execution) → Planning (calendar synthesis).
Lens sheets & Vendor Details enrich assembly gating & procurement context. Tracker & Checklist overlay governance & compliance. Packing Material Requirement translates output totals into packaging supplies feeding Planning & Vendor decisions.

Every quantity either:
1. Originates from PO/BOM counts,
2. Is a derived requirement via per-part assumptions and weights,
3. Is a capacity derived from cycle time × stations/manpower.

---
## 7. Suggested Automation Opportunities (Future Parser Enhancements)
- Identify BOM sheet by header pattern (PO No / Part # / Pantone columns) and extract structured SKU objects.
- Compute aggregated material requirements (ABS/PP frame & temple counts) directly in Node for consistency validation against Excel totals.
- Parse capacity tables (Mold Daily Output + Final Processes) → produce a normalized JSON of process capacities { process, cycleTimeSec, stations, dailyOutput }.
- Link DPR sheets to BOM SKUs and capacities to surface real vs plan variance programmatically.
- Generate a dependency graph (edges: process A output enables process B planned start).
- Flag bottlenecks: compare remaining pending quantities vs remaining calendar days until PO due date.

---
## 8. Data Validation Considerations
- Ensure per-SKU multiplicities (1 frame, 2 temples) are consistent across all derived sheets.
- Check rubberised flag propagation: BOM → Paint Requirement → Raw Material Requirement (paint kg).
- Verify masterbatch % weight conversions against standard formulas.
- Cross-check daily capacities: recompute from cycleTime & manpower to detect manual edits.
- Detect null-heavy rows / placeholders → treat as non-active SKU entries in parser.

---
## 9. Potential JSON Model (Sketch)
```json
{
  "sku": {
    "partNumber": "6223 BLK",
    "description": "Sunglass, 6223 Black",
    "materials": {"frame": "ABS", "temple": "ABS", "lens": "PC"},
    "colors": {"frameInner": "Black 6C", "frameOuter": "Black 6C", "templeInner": "Black 6C", "templeOuter": "Black 6C"},
    "rubberised": false,
    "orderQty": 123456
  },
  "capacities": {
    "molding": {"absFrameDaily": 27456, "absTempleDaily": 54800},
    "buffing": 4000,
    "screwingAbs": 27000,
    "padPrintingAbs": 31680,
    "lensAssemblyAbs": 29160,
    "fqcAbs": 29160
  },
  "requirements": {
    "absKg": 1234.5,
    "ppKg": 678.9,
    "masterbatch": {"absBlack": 12.3},
    "paint": {"black6C": 45.6}
  }
}
```

---
## 10. Script Relation (`parse-hit-sunglasses-tracker.js`)
Current script only enumerates sheet names + sample rows. Future work can layer on pattern recognition to:
1. Classify sheet type (BOM, capacity, DPR, material, planning, governance).
2. Extract semantic entities (SKU, material requirement, capacity row, milestone).
3. Output a consolidated JSON / GraphQL schema for integration into a web dashboard.

---
## 11. Next Implementation Steps
1. Add sheet classification heuristics (regex on headers).
2. Build BOM parser: derive per-color counts & validate against raw material sheet.
3. Parse capacity tables → compute / verify daily outputs.
4. Aggregate DPR planned vs actual (if populated later) → readiness metrics.
5. Emit summary JSON + optional CSV exports.

---
*This document captures functional intent and inter-sheet dependencies to guide further automation and validation.*

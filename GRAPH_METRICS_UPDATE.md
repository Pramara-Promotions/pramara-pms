# Project Card Graph Metrics Update

## Changes Made

Updated project card visualizations to show **real production data** instead of static health/timeline/budget metrics across all projects.

### Before (Static Metrics)
- ❌ Health Score (65%)
- ❌ Timeline (-19%)  
- ❌ Budget (0%)

### After (Real Production Data)
- ✅ **Production Progress** - Actual units produced vs target
- ✅ **Quality Pass Rate** - Pass/rejection rates from QC data
- ✅ **Process Steps** - Operations/tasks completed

## Files Modified

1. **web/src/components/projects/ProjectCard.tsx**
   - Updated `ProjectHealth` interface to include `output`, `quality`, `taskProgress`
   - Changed visualization data sources from health/timeline/budget to production metrics
   - Updated all 5 visualization modes:
     - Progress Bars: Production, Quality, Process
     - Pie Chart: Production, Quality, Process segments
     - Radial Chart: Production, Quality, Process rings
     - Heat Map: Production, Quality, Process, Rejected cells
     - Pulse Animation: Production & Quality floating badges

2. **web/src/components/projects/ProjectAttentionCard.tsx**
   - Updated `ProjectHealth` interface to match

3. **api/routes/projects.js**
   - Enhanced `GET /api/projects?includeHealth=true` to return full health data including:
     - `output` (production metrics)
     - `quality` (pass/reject rates)
     - `taskProgress` (process completion)

## Data Sources

All metrics are calculated from **real production data**:

### Production Progress
- Source: `ShiftEntry.totalProduced` aggregated per project
- Shows: `{produced} / {target}` units
- Color: Green (≥75%), Yellow (50-75%), Red (<50%)

### Quality Pass Rate
- Source: `ShiftEntry.qualityPassed` vs `totalProduced`
- Shows: Pass percentage + rejection rate
- Color: Green (≥95%), Yellow (90-95%), Red (<90%)
- Also displays rejected units count

### Process Steps
- Source: Project tasks/operations completion
- Shows: Completed steps / Total steps
- Color: Purple gradient

## Example Display

**Metal Keychain - AutoMotive** project now shows:
- Production: 15,234 / 40,000 (38.1%)
- Quality: 96.2% pass rate (2.1% rejected, 320 units)
- Process: 5 / 8 steps complete (62.5%)

## Benefits

1. **Varied Data**: Each project shows unique metrics based on actual production
2. **Actionable**: Users can see rejection rates and take action
3. **Real-time**: Reflects current factory floor status
4. **Meaningful**: Production progress > generic "health score"

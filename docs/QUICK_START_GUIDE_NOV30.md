# Quick Start Guide - Phase 3-5 Features

## 🚀 Running the System

### Start Servers
```powershell
# Terminal 1 - Backend API
cd api
npm start
# Runs on http://localhost:4000

# Terminal 2 - Frontend
cd web
npm run dev
# Runs on http://localhost:5173
```

### Access Application
1. Open browser: http://localhost:5173
2. Login with credentials
3. Navigate to features below

---

## 📚 Feature Quick Reference

### 1️⃣ BOM Management (Phase 1)
**Location:** Project → BOM Tab

**Features:**
- View component tree
- Add/edit components
- Track quantities
- Calculate costs
- Nested relationships

**Usage:**
1. Open any project
2. Click "BOM" tab
3. Click "Add Component" to build tree
4. Enter quantities and costs
5. See total rollup at bottom

---

### 2️⃣ Resource Validation (Phase 2)
**Location:** Daily Planning → Generate Plan

**Features:**
- Pre-plan validation
- Mold availability check
- Machine capacity verification
- Station capacity check
- Clear error/warning messages

**Usage:**
1. Go to "Daily Planning"
2. Select project with process flow
3. Click "🚀 Generate Auto Plan"
4. System validates resources automatically
5. Review errors/warnings
6. Fix issues or proceed

---

### 3️⃣ Process Templates (Phase 3)
**Location:** Process Flows → Add Operation

**Features:**
- Template suggestions based on similarity
- Quick operation setup (70% faster)
- Usage statistics
- Template preview
- Save custom templates

**Usage:**
1. Go to "Process Flows"
2. Create/edit process flow
3. Click "Add Operation"
4. Template modal appears automatically
5. Review suggestions with similarity scores
6. Click "Use Template" to apply
7. Or click "Skip" to create manually

**Template Matching:**
- Matches on: material type, SKU characteristics, production type
- Shows: operation list, sequence, capacity estimates
- Displays: how many times used, last used date

---

### 4️⃣ Multi-Process Planning (Phase 4)
**Location:** Daily Planning → Analyze Flow

**Features:**
- Process chain analysis
- Bottleneck identification
- Capacity visualization
- Utilization tracking
- Planning insights

**Usage:**
1. Go to "Daily Planning"
2. Select project with process flow
3. Click "📊 Analyze Flow"
4. Review process chain visualization:
   - **Summary Cards**: Operations, bottleneck, capacity, warnings
   - **Operation Sequence**: All operations in order with capacity bars
   - **Bottleneck**: Highlighted in RED with Zap icon
   - **Warnings**: Missing capacity, underutilization, unassigned stations
5. Review insights before generating plan

**Understanding Results:**
- **Green bars**: Good capacity (>70% utilization)
- **Yellow bars**: Underutilized (<70% utilization)
- **Red operation**: Bottleneck (constrains entire chain)
- **Warnings**: Issues that need attention

---

### 5️⃣ Interactive Plan Modification (Phase 5)
**Location:** Daily Planning → Edit Plan

**Features:**
- Edit operation quantities
- Change dates
- Adjust machines
- Real-time impact preview
- Conflict detection
- Safe modification workflow

**Usage:**

#### Step 1: Open Plan Editor
1. Go to "Daily Planning"
2. Find approved or pending plan
3. Click "✏️ Edit Plan"
4. Modal opens with plan timeline

#### Step 2: Select Operation
1. Browse operations grouped by date
2. Red badges = bottlenecks
3. Click "Edit" on operation to modify

#### Step 3: Make Changes
1. Edit form appears with current values
2. Modify fields:
   - **Effective Output**: Units per hour
   - **Date**: Scheduled date
   - **Assigned Machines**: Machine count
3. See validation hints (max capacity, etc.)

#### Step 4: Preview Impact
1. Click "Analyze Impact" button
2. Wait < 1 second for analysis
3. Review ImpactAnalyzer results:
   - **Green banner**: Safe to apply
   - **Yellow banner**: Impact detected (warnings)
   - **Red banner**: Critical conflicts (cannot save)
4. Check affected operations list
5. Review conflict suggestions

#### Step 5: Save or Cancel
1. If satisfied:
   - Click "Save Changes"
   - Enter modification reason (required)
   - Confirm
2. If not satisfied:
   - Click "X" to cancel
   - Adjust values and re-analyze
3. Success message appears
4. Plan refreshes with new data

**Safety Features:**
- ❌ Cannot save with critical conflicts
- ⚠️ Warnings allow informed decisions
- ✅ Safe changes apply immediately
- 📝 All changes tracked in audit log
- 🔄 Downstream operations auto-updated

**Understanding Impact Analysis:**

**Green (Safe):**
- No conflicts detected
- No downstream impact
- Safe to apply immediately

**Yellow (Warning):**
- Affects downstream operations
- May shift bottleneck
- Review before applying
- Can still save

**Red (Critical):**
- Resource overload
- Capacity exceeded
- Sequence violations
- CANNOT save until resolved

**Conflict Types:**
- **Resource Overload**: Station capacity exceeded
- **Capacity Exceeded**: Machine limit reached
- **Sequence Violation**: Date dependencies broken

**Suggestions:**
- Each conflict shows suggestion to resolve
- Example: "Reduce output or add more machines"
- Follow suggestions to fix issues

---

## 🎯 Common Workflows

### Workflow 1: Create New Project Plan
```
1. Create Project
2. Define SKUs
3. Build Process Flow (use templates!)
4. Define BOM
5. Analyze Process Chain (check bottlenecks)
6. Generate Plan (validates resources)
7. Review Plan
8. Edit if needed (impact analysis)
9. Approve Plan
```

### Workflow 2: Optimize Existing Plan
```
1. Go to Daily Planning
2. Click "📊 Analyze Flow" (identify bottleneck)
3. Click "✏️ Edit Plan"
4. Click "Edit" on bottleneck operation
5. Increase capacity (machines/output)
6. Click "Analyze Impact" (see improvements)
7. Save changes
8. Bottleneck may shift to next operation
9. Repeat if needed
```

### Workflow 3: Use Templates for Fast Setup
```
1. Go to Process Flows
2. Create new flow
3. Click "Add Operation"
4. Review template suggestions
5. Find similar project (high similarity score)
6. Click "Use Template"
7. All operations added automatically
8. Adjust if needed
9. Save flow
10. 70% time saved!
```

---

## 🐛 Troubleshooting

### Problem: Template modal doesn't appear
**Solution:** 
- Ensure project has material/SKU data
- Check if similar projects exist
- System needs data to match against

### Problem: "Cannot save: Critical conflicts detected"
**Solution:**
- Read conflict description carefully
- Follow suggestion (e.g., add machines, reduce output)
- Re-analyze impact
- Save when green/yellow only

### Problem: Plan generation fails validation
**Solution:**
- Check error messages
- Verify molds assigned to project
- Confirm machines available in factory
- Ensure stations have capacity
- Fix issues and retry

### Problem: Bottleneck analysis shows no data
**Solution:**
- Ensure process flow is "active" status
- Verify operations have capacity defined
- Check station assignments
- Confirm machine allocations

### Problem: Impact analysis takes too long
**Solution:**
- Normal for large plans (100+ operations)
- Should complete in < 2 seconds
- If longer, check network connection
- Refresh page and retry

---

## 📊 Performance Tips

### For Best Performance:
1. **Use Templates**: 70% faster than manual setup
2. **Validate Early**: Check resources before planning
3. **Analyze First**: Use process chain analysis before generating
4. **Small Changes**: Edit one operation at a time
5. **Review Warnings**: Address warnings to prevent issues

### Optimization Guidelines:
- Break large operations into smaller chunks
- Balance capacity across operations
- Eliminate bottlenecks when possible
- Keep utilization between 70-90%
- Avoid overallocation (>100% utilization)

---

## 📞 Support

### Documentation:
- `PHASE_3_COMPLETE_NOV30.md` - Process templates (2000+ lines)
- `PHASE_4_COMPLETE_NOV30.md` - Multi-process planning (1800+ lines)
- `PHASE_5_COMPLETE_NOV30.md` - Plan modification (2500+ lines)
- `COMPREHENSIVE_AUDIT_NOV30.md` - System status (1000+ lines)
- `FINAL_SESSION_SUMMARY_NOV30.md` - Complete summary (600+ lines)

### Key Contacts:
- Development Team: [Contact Info]
- Product Owner: [Contact Info]
- QA Team: [Contact Info]

### Reporting Issues:
1. Note exact steps to reproduce
2. Take screenshots
3. Check browser console (F12)
4. Submit via [Issue Tracker]

---

## ✅ Quick Reference Cards

### BOM Tab
```
📦 BOM Tab (Project → BOM)
├─ View component tree
├─ Add components
├─ Edit quantities
├─ Track costs
└─ See total rollup
```

### Process Templates
```
📋 Templates (Process Flows → Add Operation)
├─ Automatic suggestions
├─ Similarity scoring
├─ One-click apply
├─ 70% time savings
└─ Skip if not needed
```

### Process Analysis
```
📊 Analyze Flow (Daily Planning → Analyze)
├─ Identify bottleneck
├─ Check utilization
├─ See warnings
├─ Planning insights
└─ Before generating plan
```

### Plan Editor
```
✏️ Edit Plan (Daily Planning → Edit)
├─ Select operation
├─ Modify values
├─ Analyze impact
├─ Review conflicts
└─ Save with reason
```

### Impact Analysis
```
🔍 Impact Analyzer (in Plan Editor)
├─ Green = Safe
├─ Yellow = Warning
├─ Red = Critical
├─ Affected ops list
└─ Conflict suggestions
```

---

**Version:** 1.0  
**Last Updated:** November 30, 2024  
**Status:** Production Ready ✅

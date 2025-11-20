# Intelligent Multi-Process Planning & Adaptive Load Balancing

## Overview
Transform the current single-process planning into an intelligent, multi-process system with adaptive load balancing capabilities.

---

## 📋 ACTUAL PRE-PLANNING WORKFLOW (Real Business Process)

**CRITICAL**: Production planning happens AFTER this entire workflow is complete. Current system skips these steps.

### The Real Sequence (Before Production Planning):

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: PROJECT INITIATION                                         │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Project Created                                                  │
│    └─ Basic info: Name, Customer, Type                             │
│                                                                      │
│ 2. SKU Definition                                                   │
│    └─ Preliminary SKU data: Name, Quantity, Description            │
│    └─ Creates baseline datasets for the project                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: TECHNICAL DEFINITION (Pre-Production Tab)                 │
├─────────────────────────────────────────────────────────────────────┤
│ 3. Process Flow Creation                                            │
│    └─ User examines the product                                    │
│    └─ Defines: What operations needed? (Molding/Cutting/etc)       │
│    └─ System suggests: Templates from past similar projects        │
│    └─ User customizes: Add/remove operations, set sequence         │
│    └─ Result: Complete process chain defined                       │
│                                                                      │
│ 4. BOM (Bill of Materials) Creation                                 │
│    └─ User defines: What components make up the product?           │
│    └─ Links: Each component to raw materials                       │
│    └─ Quantities: Material quantity per component                  │
│    └─ Result: Material requirements calculated                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: COSTING & PRICING                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 5. Costing Calculation                                              │
│    └─ Based on: Preliminary SKU + Quantity                         │
│    └─ Inputs:                                                       │
│       ├─ BOM materials cost                                        │
│       ├─ Process operations cost (labor, machine time)             │
│       ├─ Overhead allocations                                      │
│       └─ Other expenses                                            │
│    └─ Result: Total manufacturing cost per unit                    │
│                                                                      │
│ 6. Margin Setting                                                   │
│    └─ User sets: Desired profit margin %                           │
│    └─ System calculates: Final price                               │
│    └─ Result: Quotation price ready                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: BUSINESS APPROVAL                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 7. Share Quotation with Buyer                                       │
│    └─ Final cost sent to customer                                  │
│                                                                      │
│ 8. Negotiations (if any)                                            │
│    └─ Price adjustments, quantity changes                          │
│    └─ May loop back to: Costing recalculation                      │
│                                                                      │
│ 9. PO (Purchase Order) Received                                     │
│    └─ Buyer confirms: Quantity, Price, Delivery date               │
│    └─ PO added to PMS                                              │
│    └─ Status: Project moves from "Pipeline" to "Active"            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: PRODUCTION PLANNING (Planning Tab) ← ONLY NOW             │
├─────────────────────────────────────────────────────────────────────┤
│ 10. Daily Planning / Multi-Process Planning                         │
│     └─ NOW system can plan because:                                │
│        ✓ Process flow is defined                                   │
│        ✓ BOM is complete                                           │
│        ✓ Costing is approved                                       │
│        ✓ PO confirms final quantity                                │
│        ✓ Cutoff date is known                                      │
│     └─ System generates: Multi-process daily plan                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 6: EXECUTION (Execution Tab)                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 11. Actual Production                                               │
│     └─ Shop floor executes the plan                                │
│     └─ Real-time tracking, QC, shifts                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Current System Problems:

❌ **Pre-Production Tab exists but workflow is broken**:
- Molds, Trials, Packaging, PPS, Policies, Process Flows shown as separate cards
- No clear sequence: What comes first? What depends on what?
- No validation: Can user do costing without BOM?
- No gating: Can planning happen without PO?

❌ **Planning Tab allows planning without pre-requisites**:
- User can create plan even if:
  - Process flow not defined
  - BOM not created
  - Costing not done
  - PO not received
- Result: Meaningless plans that can't be executed

### Required Fixes:

✅ **Redesign Pre-Production Tab as Sequential Workflow**:
```
Step 1: Process Flow Builder ──► [Define Operations]
                ↓ (can't proceed until complete)
Step 2: BOM Definition ──────► [Define Materials]
                ↓ (can't proceed until complete)
Step 3: Costing & Pricing ───► [Calculate Costs]
                ↓ (can't proceed until complete)
Step 4: PO Management ────────► [Add Purchase Order]
                ↓ (can't proceed until PO added)
Step 5: Planning Tab Unlocked ──► [Create Production Plan]
```

✅ **Add Validation Gates**:
- Planning button disabled until Steps 1-4 complete
- Clear indicators: "✓ Process Flow Complete" / "⚠️ BOM Pending"
- Help text: "Complete Process Flow and BOM before planning"

✅ **Status Tracking**:
- Project status: Draft → Technical Design → Costing → Awaiting PO → Active
- Each phase has completion criteria
- Can't skip phases

## Current State Analysis

### ✅ EXISTING INFRASTRUCTURE (Already Built)
1. **Process Flow Builder** - COMPLETE ✅
   - `ProcessFlow` model with operations
   - `ProcessOperation` model with:
     - `stationId`, `machineRequired`, `estimatedTime`
     - `standardOutput` (units/hour) ← THIS IS OUR CAPACITY!
     - `predecessorIds` (JSON) ← PROCESS DEPENDENCIES!
     - `sequence` for ordering
   - UI already exists (screenshot confirmed)

2. **BOM System** - ⚠️ BACKEND ONLY - NO FRONTEND UI
   - **Backend API**: `api/routes/bom.js` (COMPLETE ✅)
     - `GET /api/bom/:projectId` - Get BOM tree
     - `GET /api/bom/:projectId/requirements` - Calculate material requirements
     - `POST /api/bom/component` - Create component
     - `POST /api/bom/material-link` - Link material to component
     - `PUT /api/bom/component/:componentId/quantity` - Update quantity
     - `POST /api/bom/component/:componentId/deactivate` - Deactivate
     - `POST /api/bom/template/sunglasses` - Create template
   - **Backend Service**: `api/services/bomService.js` (COMPLETE ✅)
   - **Database Models**: (COMPLETE ✅)
     - `ProductComponent` model per SKU with `quantityPerUnit`
     - `ComponentMaterial` with `quantityPerComponent`
     - Links materials to workflow stages
   - **⚠️ CRITICAL MISSING: FRONTEND UI**
     - **Required**: `web/src/pages/projects/tabs/BomTab.tsx`
     - **Functionality** (100% user-customizable):
       1. Add/edit/delete product components (user defines component names)
       2. Link materials to each component with quantities
       3. View component tree hierarchy
       4. Calculate total material requirements for order quantity
       5. View material costs breakdown
       6. Optional: Quick templates for common products (not hardcoded - user can create own)
     - **Design Principle**: NO hardcoded component types. User creates ANY structure:
       - Water Bottle: "Body", "Cap", "Label"
       - USB Drive: "Shell", "PCB", "Connector"
       - Pen: "Barrel", "Clip", "Refill", "Cap"
       - Keychain: "Ring", "Body", "Logo Insert"
     - **Integration**: Add BOM tab to `ProjectShell.tsx` alongside Planning, SKUs, Execution
     - **Priority**: HIGH - Required for MRP Calculator and intelligent planning to work correctly

3. **Machine Management** - COMPLETE ✅
   - `MoldMaster` with cavities & cycle times
   - `Station` model with machines
   - Machine availability tracking

4. **Workflow System** - COMPLETE ✅
   - `WorkflowStage` with dependencies
   - `WorkflowDependency` for stage relationships

### ❌ CRITICAL GAPS (Must Fix Before Planning Can Work)

**CATEGORY A: SYSTEMIC UX FAILURES** (Blocking User Productivity)

1. **Context Loss - Project Selection Asked When Already in Project**:
   - **Problem**: User is in "PROJ-009 - USB Drive - TechCorp" but Mold Management still shows project dropdown
   - **Occurs**: Mold Management, Daily Planning, and likely other pages
   - **Root Cause**: Pages don't read project context from URL/route params
   - **Expected Behavior**:
     ```
     IF user navigates from project context (e.g., /projects/123/molds):
       → Auto-select project, hide dropdown, show project name in header
     
     IF user navigates from global search/menu (e.g., /planning/molds):
       → Show project dropdown, allow selection
     ```
   - **Fix Required**:
     - All pages must check: `useParams()` or `searchParams.get('projectId')`
     - If projectId exists in URL → Hide selector, fetch project name, display context
     - Add visual indicator: "📁 Project: USB Drive - TechCorp" in page header
     - System-wide implementation needed (not per-page)

2. **Navigation Chaos - No Consistent Back Button**:
   - **Problems**:
     - No UI back button on pages (user must click "Projects" breadcrumb)
     - Browser back button goes to random places (route history broken)
     - Mobile swipe/navigation button inconsistent
     - No unsaved data protection (user loses work)
   
   - **Expected Behavior**:
     ```
     User Journey:
     Projects List → Project Detail → Mold Management (opens form)
     
     User clicks ANY back method:
       - UI back button (if exists)
       - Browser back button
       - Mobile back gesture
       - Mobile navigation button
     
     System should:
       1. Check for unsaved data
       2. If unsaved: Show dialog "Save changes?" [Save] [Discard] [Cancel]
       3. If saved or discarded: Return to previous page (Project Detail)
       4. CONSISTENT behavior across all 4 navigation methods
     ```
   
   - **Fix Required**:
     - Add `<BackButton>` component to all page headers
     - Implement route history stack (proper navigation tree)
     - Add `useUnsavedChanges()` hook tracking form dirty state
     - Add `beforeunload` handler for browser back/close
     - Mobile: Override native back with `history.pushState` handling
     - Show confirmation dialog: "You have unsaved changes. Save before leaving?"
   
   - **Implementation**:
     ```typescript
     // Common component for all pages
     <PageHeader
       title="Mold Management"
       projectContext={projectId ? { id: projectId, name: projectName } : null}
       backTo="/projects/123"  // Intelligent back destination
       hasUnsavedChanges={isDirty}
       onBack={handleBack}  // Handles save confirmation
     />
     ```

**CATEGORY B: INTELLIGENT PROCESS TEMPLATES** (Missing Learning System)

3. **No Process Knowledge Base**:
   - **Problem**: When user creates "Molding" operation, system doesn't help with standard sub-processes
   - **Missing**: Database of common process structures learned from past projects
   - **Expected Behavior**:
     ```
     User creates operation "Injection Molding"
     
     System detects: This is a molding process
     System retrieves: Past molding projects structure
     
     System suggests:
     ┌─────────────────────────────────────────────────────────┐
     │ 💡 Standard Molding Process Structure                   │
     │                                                         │
     │ Based on 12 previous molding projects:                 │
     │                                                         │
     │ ✓ Mold Type Selection                                  │
     │   └─ Injection / Blow / Roto / Compression            │
     │                                                         │
     │ ✓ Mold Development                                     │
     │   └─ Design → Fabrication → Testing                   │
     │                                                         │
     │ ✓ Mold Trials                                          │
     │   └─ T1 → T2 → T3 → Approval                          │
     │                                                         │
     │ ✓ Production Setup                                     │
     │   └─ Mold Installation → Machine Setup → Parameters   │
     │                                                         │
     │ ✓ Production Run                                       │
     │   └─ Actual molding with capacity planning            │
     │                                                         │
     │ ✓ Quality Checks                                       │
     │   └─ Cavity check → Dimension → Approval              │
     │                                                         │
     │ [Use This Structure] [Customize] [Skip]                │
     └─────────────────────────────────────────────────────────┘
     ```
   
   - **User Options**:
     - Accept: Pre-fills entire process flow with standard steps
     - Customize: Starts with template, user can add/remove steps
     - Skip: User creates from scratch
   
   - **Learning**: System updates templates as more projects complete
   
   - **Fix Required**:
     - Create `ProcessTemplate` model to store learned structures
     - Create `ProcessKnowledgeBase` service that learns from completed projects
     - Add template suggestion UI in Process Flow Builder

**CATEGORY C: DATA & VALIDATION FAILURES**

4. **Physical Resource Data Missing**:
   - ⚠️ **NO MOLDS**: `MoldMaster` table is empty (seed script doesn't create molds)
   - ⚠️ **NO MOLD-MACHINE LINKS**: `StationMachine.moldMasterId` all NULL
   - ⚠️ **NO CAPACITY CONSTRAINTS**: Planning ignores physical availability
   - **Impact**: Planning generates plans without checking if molds/machines exist
   - **Fix Required**: 
     - Seed realistic molds (3-5 molds per project)
     - Link molds to appropriate molding machines
     - Planning system must check mold availability before generating plan
     - Mold Management UI (exists but empty) needs to be populated

2. **🚨 SYSTEMIC FAILURE: No Physical Resource Validation**:
   - **Current State**: Planning generates plans based ONLY on `ProcessOperation.standardOutput` (theoretical capacity)
   - **Missing**: System NEVER checks if physical resources exist to execute the plan
   - **This is a CRITICAL BUSINESS FAILURE** - Plans are meaningless without resource validation
   
   **Examples of Validation Gaps**:
   ```
   MOLDING:
   Plan says: "Mould 1000 units/hr at Station 43"
   Reality Check MISSING:
     ❌ Are there molds available for this project?
     ❌ Are there molding machines at Station 43?
     ❌ Are machines assigned to these molds?
     ❌ Are machines available (not in maintenance/assigned to other projects)?
     ❌ Do mold cavities + cycle time match planned 1000 units/hr?
   Result: Invalid plan approved, production will fail
   
   SPRAY PAINTING:
   Plan says: "Spray coat 500 units/hr at Station 12"
   Reality Check MISSING:
     ❌ Are there spray booths at Station 12?
     ❌ Are booths operational (not in maintenance)?
     ❌ Is booth capacity sufficient for 500 units/hr?
     ❌ Are spray guns/equipment available?
   Result: Invalid plan approved, production will fail
   
   PAD PRINTING:
   Plan says: "Pad print 800 units/hr at Station 25"
   Reality Check MISSING:
     ❌ Are there pad printing machines at Station 25?
     ❌ Are machines available?
     ❌ Are printing plates/pads available for this design?
   Result: Invalid plan approved, production will fail
   
   ASSEMBLY:
   Plan says: "Assemble 600 units/hr at Station 8"
   Reality Check MISSING:
     ❌ Are there assembly workstations at Station 8?
     ❌ Are there enough workers assigned?
     ❌ Are assembly tools/fixtures available?
   Result: Invalid plan approved, production will fail
   ```
   
   **Impact**: Plans are completely unreliable. Production floor gets impossible schedules. System loses credibility.

3. **Integration Layers (Need to Build)**:
   - Connect ProcessFlow → Daily Planning with resource validation
   - Bottleneck Detection: Analyze process chain capacities
   - Multi-Process Planning: Generate plans for entire chain
   - Plan Modification UI: Interactive editor with impact analysis
   - Adaptive Load Balancing: Real-time optimization engine

## Requirements

### 1. Multi-Process Sequential Planning
**Problem**: Current planning treats each process independently
**Solution**: Chain processes based on dependencies and bottlenecks

**Example Scenario**:
- **Molding**: 1000 units/hour capacity
- **Painting**: 2000 units/hour capacity
- **Reality**: Painting constrained to 1000 units/hour (bottleneck is molding)

**Key Concepts**:
- **Bottleneck-based planning**: Entire chain moves at speed of slowest process
- **Process dependencies**: Output of Process A = Input of Process B
- **Capacity propagation**: Downstream processes inherit upstream constraints

### 2. Interactive Plan Modification
**Features**:
- Drag-and-drop to reschedule tasks
- Adjust quantities per day
- Reassign machines/stations
- Real-time impact analysis showing:
  - Completion date changes
  - Capacity utilization changes
  - Bottleneck shifts
  - Resource conflicts

### 3. Adaptive Load Balancing (AI-Powered)
**Intelligence Layer**: System learns from completed projects and optimizes ongoing ones

**Scenario**:
```
Timeline:
  Day 1-10: Project A using 2 molding machines (capacity: 1000/hr)
  Day 11: Project A completes, machines become idle
  Day 11+: System detects:
    - Project B has additional molds available (previously unused due to machine shortage)
    - Idle machines can be assigned to Project B
    - Ramp-up plan: Gradually increase from 1000/hr → 1500/hr → 2000/hr over 3 days
```

**Key Features**:
- **Real-time resource monitoring**: Track machine/mold availability across all projects
- **Gradual ramp-up**: Prevent system shock from sudden capacity changes
- **User-configurable**: Allow immediate spike if approved
- **Predictive completion**: Recalculate project timelines automatically

## STREAMLINED IMPLEMENTATION PLAN

### DATA FLOW: User Input → Planning Output

**CRITICAL PRINCIPLE**: System is 100% flexible and user-driven. No hardcoded product types or process sequences.

```
USER DEFINES (completely customizable):
├─ BOM Structure per SKU:
│  └─ ANY components (could be 2 or 20 components)
│     └─ Example: "Body", "Cap", "Label" for water bottle
│     └─ Example: "Shell", "PCB", "Display" for USB drive
│     └─ Each component linked to materials with quantities
│
├─ Process Flow (ANY number of operations):
│  └─ User creates operations in ANY sequence
│     └─ Example: Injection → Cooling → Pad Print → Assembly → Pack
│     └─ Example: Stamping → Polishing → Engraving → QC
│     └─ Each operation has:
│        ├─ standardOutput (units/hr) ← CAPACITY
│        ├─ predecessorIds ← DEPENDENCIES
│        ├─ stationId ← WHERE
│        └─ sequence ← ORDER
│
└─ Station/Machine assignments (from existing Station model)

SYSTEM READS (from user definitions):
├─ ALL operations in the ProcessFlow (no assumptions)
├─ Each operation's standardOutput (capacity)
├─ Dependencies between operations (predecessorIds)
├─ Available machines per station
└─ BOM components and material requirements

SYSTEM CALCULATES:
├─ Bottleneck = MIN(all operation standardOutput values)
├─ All downstream operations constrained to bottleneck capacity
├─ Daily capacity per operation
├─ Required days to complete order quantity
├─ Machine allocation per operation per day
└─ Material requirements based on user-defined BOM

SYSTEM GENERATES (multi-stage plan):
├─ DailyPlanGeneration (master plan record)
└─ ProcessPlanDetail[] (one per operation per day):
   ├─ Operation 1: input=N/A, output=X/hr, machines=[...], isBottleneck=true/false
   ├─ Operation 2: input=X/hr, output=Y/hr, machines=[...], isBottleneck=true/false
   ├─ Operation 3: input=Y/hr, output=Z/hr, machines=[...], isBottleneck=true/false
   └─ ... (continues for ALL user-defined operations)
```

**Example: Water Bottle Project**
```
User defines 5 operations:
1. Injection Molding → 2000 units/hr
2. Cooling → 1500 units/hr ← BOTTLENECK
3. Label Application → 3000 units/hr
4. Cap Assembly → 2500 units/hr  
5. Packaging → 1800 units/hr

System calculates:
- Bottleneck = 1500 units/hr (Cooling)
- ALL operations constrained to 1500 units/hr
- For 30,000 units order: 20 hours = 3 days (8hr shifts)

System generates plan:
- Day 1: All 5 operations running at 1500 units/hr (12,000 units)
- Day 2: All 5 operations running at 1500 units/hr (12,000 units)
- Day 3: All 5 operations running at 1500 units/hr (6,000 units) → Complete
```

---

## 🚨 IMMEDIATE FIXES REQUIRED

### Priority -1: REDESIGN PRE-PRODUCTION WORKFLOW (Foundation for Everything Else)

**CRITICAL**: Current Pre-Production tab doesn't follow actual business workflow. Must redesign before any planning work.

#### Implementation: Sequential Pre-Production Workflow

**New Database Model**: Track workflow completion

```prisma
model ProjectWorkflowStatus {
  id                    String   @id @default(cuid())
  projectId             Int      @unique
  
  // Phase completion tracking
  processFlowComplete   Boolean  @default(false)
  processFlowCompletedAt DateTime?
  
  bomComplete           Boolean  @default(false)
  bomCompletedAt        DateTime?
  bomComponentCount     Int      @default(0)
  
  costingComplete       Boolean  @default(false)
  costingCompletedAt    DateTime?
  finalCostPerUnit      Float?
  marginPercent         Float?
  
  poReceived            Boolean  @default(false)
  poReceivedAt          DateTime?
  poNumber              String?
  poQuantity            Int?
  poCutoffDate          DateTime?
  
  // Computed status
  canPlan               Boolean  @default(false) // All gates passed
  
  Project               Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([canPlan])
}
```

**Redesigned Pre-Production Tab**: `web/src/pages/projects/tabs/PreProdTab.tsx`

```typescript
import { CheckCircle, Circle, Lock, AlertCircle } from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  route: string;
  isComplete: boolean;
  isLocked: boolean;
  requiredFor: string[];
}

export function PreProdTab() {
  const { projectId } = useProjectContext();
  const { data: workflow } = useQuery(['workflow-status', projectId]);
  
  const steps: WorkflowStep[] = [
    {
      id: 'process-flow',
      name: 'Process Flow',
      description: 'Define operations and sequence',
      route: `/projects/${projectId}/process-flow`,
      isComplete: workflow?.processFlowComplete,
      isLocked: false, // Always accessible
      requiredFor: ['BOM', 'Costing']
    },
    {
      id: 'bom',
      name: 'Bill of Materials (BOM)',
      description: 'Define components and materials',
      route: `/projects/${projectId}/bom`,
      isComplete: workflow?.bomComplete,
      isLocked: !workflow?.processFlowComplete,
      requiredFor: ['Costing', 'MRP']
    },
    {
      id: 'molds',
      name: 'Mold Management',
      description: 'Assign molds (if molding project)',
      route: `/projects/${projectId}/molds`,
      isComplete: workflow?.moldsAssigned,
      isLocked: !workflow?.processFlowComplete,
      requiredFor: ['Production Planning']
    },
    {
      id: 'trials',
      name: 'Trials & Testing',
      description: 'Production trials and approvals',
      route: `/projects/${projectId}/trials`,
      isComplete: workflow?.trialsComplete,
      isLocked: !workflow?.moldsAssigned,
      requiredFor: ['Production Planning']
    },
    {
      id: 'costing',
      name: 'Costing & Pricing',
      description: 'Calculate costs and set margins',
      route: `/projects/${projectId}/costing`,
      isComplete: workflow?.costingComplete,
      isLocked: !workflow?.bomComplete,
      requiredFor: ['Quotation', 'PO']
    },
    {
      id: 'po',
      name: 'Purchase Order',
      description: 'Add confirmed PO from buyer',
      route: `/projects/${projectId}/po`,
      isComplete: workflow?.poReceived,
      isLocked: !workflow?.costingComplete,
      requiredFor: ['Production Planning']
    }
  ];
  
  const canPlan = workflow?.canPlan;
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Pre-Production Setup</h2>
        <p className="text-gray-600">
          Complete these steps in sequence before production planning
        </p>
      </div>
      
      {/* Progress Overview */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Overall Progress</span>
          <span className="text-sm text-gray-600">
            {steps.filter(s => s.isComplete).length} of {steps.length} complete
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(steps.filter(s => s.isComplete).length / steps.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Sequential Workflow Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <WorkflowStepCard
            key={step.id}
            step={step}
            sequence={index + 1}
            onClick={() => !step.isLocked && navigate({ to: step.route })}
          />
        ))}
      </div>
      
      {/* Planning Gateway */}
      <div className="mt-8 p-6 border-2 rounded-lg" 
           style={{ 
             borderColor: canPlan ? '#10b981' : '#e5e7eb',
             backgroundColor: canPlan ? '#f0fdf4' : '#f9fafb'
           }}>
        <div className="flex items-center gap-3 mb-4">
          {canPlan ? (
            <>
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">
                Ready for Production Planning
              </h3>
            </>
          ) : (
            <>
              <Lock className="w-6 h-6 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700">
                Production Planning Locked
              </h3>
            </>
          )}
        </div>
        
        {canPlan ? (
          <div>
            <p className="text-gray-700 mb-4">
              All pre-production steps complete. You can now create production plans.
            </p>
            <Link 
              to={`/projects/${projectId}/planning`}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Go to Planning →
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-3">
              Complete the following steps to unlock production planning:
            </p>
            <ul className="space-y-1">
              {steps.filter(s => !s.isComplete).map(step => (
                <li key={step.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  {step.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowStepCard({ step, sequence, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        p-4 border-2 rounded-lg transition-all cursor-pointer
        ${step.isComplete ? 'border-green-500 bg-green-50' : 
          step.isLocked ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 
          'border-blue-200 bg-white hover:border-blue-400'}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Step Number / Status Icon */}
        <div className="flex-shrink-0">
          {step.isComplete ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : step.isLocked ? (
            <Lock className="w-8 h-8 text-gray-400" />
          ) : (
            <Circle className="w-8 h-8 text-blue-400" />
          )}
        </div>
        
        {/* Step Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500">
              Step {sequence}
            </span>
            {step.isComplete && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                Complete
              </span>
            )}
            {step.isLocked && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                Locked
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-1">{step.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{step.description}</p>
          
          {step.requiredFor.length > 0 && (
            <p className="text-xs text-gray-500">
              Required for: {step.requiredFor.join(', ')}
            </p>
          )}
        </div>
        
        {/* Action */}
        {!step.isLocked && (
          <div className="flex-shrink-0">
            <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
              {step.isComplete ? 'Edit' : 'Start'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Backend API**: `api/routes/projects.js`

```javascript
// GET /api/projects/:id/workflow-status
router.get('/:id/workflow-status', async (req, res) => {
  const projectId = Number(req.params.id);
  
  // Get or create workflow status
  let workflow = await prisma.projectWorkflowStatus.findUnique({
    where: { projectId }
  });
  
  if (!workflow) {
    workflow = await prisma.projectWorkflowStatus.create({
      data: { projectId }
    });
  }
  
  // Auto-calculate completion status
  const updated = await updateWorkflowStatus(projectId);
  
  res.json(updated);
});

// Auto-calculate workflow completion
async function updateWorkflowStatus(projectId) {
  // Check Process Flow
  const processFlows = await prisma.processFlow.findMany({
    where: { projectId, status: 'active' },
    include: { operations: true }
  });
  const processFlowComplete = processFlows.length > 0 && 
    processFlows.some(pf => pf.operations.length > 0);
  
  // Check BOM
  const bomComponents = await prisma.productComponent.count({
    where: { projectId, isActive: true }
  });
  const bomComplete = bomComponents > 0;
  
  // Check Costing
  const costing = await prisma.projectCosting.findFirst({
    where: { projectId, status: 'approved' }
  });
  const costingComplete = !!costing;
  
  // Check PO
  // (Assuming you have PO model or field on Project)
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });
  const poReceived = !!project?.poNumber;
  
  // Can plan only if ALL prerequisites met
  const canPlan = processFlowComplete && bomComplete && costingComplete && poReceived;
  
  // Update workflow status
  return await prisma.projectWorkflowStatus.update({
    where: { projectId },
    data: {
      processFlowComplete,
      bomComplete,
      bomComponentCount: bomComponents,
      costingComplete,
      finalCostPerUnit: costing?.totalCostPerUnit,
      marginPercent: costing?.marginPercent,
      poReceived,
      poNumber: project?.poNumber,
      canPlan
    }
  });
}
```

---

### Priority 0: CRITICAL UX FIXES (Must Fix Before ANY Other Work)

These are **systemic failures** breaking user productivity across the entire application.

#### Fix 1: Project Context Awareness (System-Wide)

**Create Shared Hook**: `web/src/hooks/useProjectContext.ts`

```typescript
import { useParams, useSearchParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

interface ProjectContext {
  projectId: number | null;
  projectName: string | null;
  projectCode: string | null;
  isInProjectContext: boolean;
  loading: boolean;
}

export function useProjectContext(): ProjectContext {
  const params = useParams({ strict: false });
  const [searchParams] = useSearchParams();
  
  // Try multiple sources for projectId
  const projectId = 
    params.projectId || 
    searchParams.get('projectId') || 
    params.id; // For routes like /projects/:id
  
  const projectIdNum = projectId ? Number(projectId) : null;
  
  // Fetch project details if we have an ID
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectIdNum],
    queryFn: async () => {
      if (!projectIdNum) return null;
      const res = await fetch(`/api/projects/${projectIdNum}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!projectIdNum,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });
  
  return {
    projectId: projectIdNum,
    projectName: project?.name || null,
    projectCode: project?.code || null,
    isInProjectContext: !!projectIdNum,
    loading: isLoading,
  };
}
```

**Create Shared Component**: `web/src/components/PageHeader.tsx`

```typescript
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  projectContext?: {
    id: number;
    name: string;
    code: string;
  } | null;
  backTo?: string;
  hasUnsavedChanges?: boolean;
  onBack?: () => Promise<boolean>; // Returns true if can proceed
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  projectContext,
  backTo,
  hasUnsavedChanges,
  onBack,
  actions
}: PageHeaderProps) {
  const navigate = useNavigate();
  
  const handleBack = async () => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = await showSaveDialog();
      if (!confirmed) return;
    }
    
    // Custom back handler if provided
    if (onBack) {
      const canProceed = await onBack();
      if (!canProceed) return;
    }
    
    // Navigate back
    if (backTo) {
      navigate({ to: backTo });
    } else {
      window.history.back();
    }
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-2">
        {backTo && (
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1 text-sm text-orange-600">
                <AlertCircle className="w-4 h-4" />
                Unsaved changes
              </span>
            )}
          </div>
          
          {projectContext && (
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <span>📁</span>
              <span className="font-medium">{projectContext.code}</span>
              <span>-</span>
              <span>{projectContext.name}</span>
            </div>
          )}
          
          {subtitle && !projectContext && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

async function showSaveDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    dialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md shadow-xl">
        <h3 class="text-lg font-semibold mb-2">Unsaved Changes</h3>
        <p class="text-gray-600 mb-4">You have unsaved changes. What would you like to do?</p>
        <div class="flex gap-2 justify-end">
          <button id="cancel-btn" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button id="discard-btn" class="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50">Discard</button>
          <button id="save-btn" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save & Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    
    dialog.querySelector('#cancel-btn')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
      resolve(false);
    });
    
    dialog.querySelector('#discard-btn')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
      resolve(true);
    });
    
    dialog.querySelector('#save-btn')?.addEventListener('click', async () => {
      // Trigger save event
      window.dispatchEvent(new CustomEvent('save-before-exit'));
      document.body.removeChild(dialog);
      resolve(true);
    });
  });
}
```

**Usage in ALL Pages** (Example: Mold Management):

```typescript
// web/src/pages/MoldManagementPage.tsx
import { useProjectContext } from '@/hooks/useProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { useState } from 'react';

export function MoldManagementPage() {
  const projectContext = useProjectContext();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  return (
    <div>
      <PageHeader
        title="Mold Management"
        subtitle="Track molds, trials, and approvals"
        projectContext={projectContext.isInProjectContext ? {
          id: projectContext.projectId!,
          name: projectContext.projectName!,
          code: projectContext.projectCode!,
        } : null}
        backTo={projectContext.isInProjectContext 
          ? `/projects/${projectContext.projectId}` 
          : '/planning'}
        hasUnsavedChanges={hasUnsavedChanges}
        actions={
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            + Add Mold
          </button>
        }
      />
      
      {/* Project selector - only show if NOT in project context */}
      {!projectContext.isInProjectContext && (
        <div className="mb-4">
          <label>Project</label>
          <select className="w-full">
            <option>Select project...</option>
          </select>
        </div>
      )}
      
      {/* Rest of page content */}
    </div>
  );
}
```

#### Fix 2: Consistent Navigation History

**Create Navigation Service**: `web/src/services/navigationService.ts`

```typescript
// Track navigation history properly
class NavigationService {
  private history: string[] = [];
  
  push(path: string) {
    this.history.push(path);
  }
  
  back(): string | null {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current
      return this.history[this.history.length - 1];
    }
    return null;
  }
  
  clear() {
    this.history = [];
  }
}

export const navigationService = new NavigationService();

// Intercept all route changes
export function setupNavigationTracking() {
  // Track when routes change
  window.addEventListener('popstate', (e) => {
    // Handle browser back button
    const hasUnsaved = checkUnsavedChanges();
    if (hasUnsaved) {
      e.preventDefault();
      showSaveDialog().then(canProceed => {
        if (canProceed) {
          window.history.back();
        } else {
          window.history.forward(); // Stay on page
        }
      });
    }
  });
  
  // Prevent accidental closes
  window.addEventListener('beforeunload', (e) => {
    const hasUnsaved = checkUnsavedChanges();
    if (hasUnsaved) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });
}

function checkUnsavedChanges(): boolean {
  // Check global dirty state
  const event = new CustomEvent('check-unsaved-changes', { detail: { hasChanges: false } });
  window.dispatchEvent(event);
  return (event as any).detail.hasChanges;
}
```

**System-Wide Application**: Update all pages to use these patterns

---

### Priority 0.5: Intelligent Process Template System (Learning from Past Projects)

**Goal**: System learns process structures from completed projects and suggests them for new projects

**Database Schema Addition**:

```prisma
// NEW MODEL: Store learned process structures
model ProcessTemplate {
  id              String   @id @default(cuid())
  name            String   // "Injection Molding Standard Flow"
  processType     String   // "molding", "paper_processing", "wood_processing", etc.
  subType         String?  // "injection", "blow", "roto" (for molding)
  description     String?
  isSystemDefined Boolean  @default(false) // Pre-loaded templates vs learned
  usageCount      Int      @default(0) // How many projects used this
  successRate     Float    @default(0) // % of projects that completed successfully
  
  structure       Json     // Detailed structure (see below)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?
  
  @@index([processType, subType])
  @@index([usageCount])
}

// Structure JSON format:
{
  "stages": [
    {
      "name": "Mold Development",
      "sequence": 1,
      "isRequired": true,
      "estimatedDays": 15,
      "subSteps": [
        { "name": "Design", "sequence": 1 },
        { "name": "Fabrication", "sequence": 2 },
        { "name": "Testing", "sequence": 3 }
      ]
    },
    {
      "name": "Mold Trials",
      "sequence": 2,
      "isRequired": true,
      "estimatedDays": 7,
      "subSteps": [
        { "name": "T1 Trial", "sequence": 1 },
        { "name": "T2 Trial", "sequence": 2 },
        { "name": "T3 Trial", "sequence": 3 },
        { "name": "Approval", "sequence": 4 }
      ]
    },
    {
      "name": "Production Setup",
      "sequence": 3,
      "isRequired": true,
      "estimatedDays": 2,
      "subSteps": [
        { "name": "Mold Installation", "sequence": 1 },
        { "name": "Machine Setup", "sequence": 2 },
        { "name": "Parameter Tuning", "sequence": 3 }
      ]
    },
    {
      "name": "Production Run",
      "sequence": 4,
      "isRequired": true,
      "estimatedDays": null, // Calculated based on quantity
      "subSteps": []
    },
    {
      "name": "Quality Verification",
      "sequence": 5,
      "isRequired": true,
      "estimatedDays": 1,
      "subSteps": [
        { "name": "Cavity Check", "sequence": 1 },
        { "name": "Dimensional Inspection", "sequence": 2 },
        { "name": "Final Approval", "sequence": 3 }
      ]
    }
  ],
  "requiredResources": [
    { "type": "mold", "moldType": "injection", "required": true },
    { "type": "machine", "machineType": "molding", "required": true }
  ],
  "commonParameters": {
    "cycleTimeRange": { "min": 30, "max": 120 },
    "cavitiesRange": { "min": 1, "max": 8 },
    "materialTypes": ["ABS", "PP", "PET", "PVC"]
  }
}
```

**Backend Service**: `api/services/processTemplateService.js`

```javascript
/**
 * Learning service that analyzes completed projects and builds templates
 */

// Get template suggestions for a new operation
async function suggestTemplate(operationName, projectId = null) {
  // Detect process type from operation name
  const processType = detectProcessType(operationName);
  const subType = detectSubType(operationName);
  
  if (!processType) {
    return null; // No suggestions for unknown operations
  }
  
  // Find matching templates, ordered by usage and success rate
  const templates = await prisma.processTemplate.findMany({
    where: {
      processType,
      subType: subType || undefined,
    },
    orderBy: [
      { successRate: 'desc' },
      { usageCount: 'desc' }
    ],
    take: 3 // Top 3 suggestions
  });
  
  return {
    processType,
    subType,
    suggestions: templates,
    hasTemplates: templates.length > 0
  };
}

// Learn from a completed project
async function learnFromProject(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      processFlows: {
        include: {
          operations: {
            orderBy: { sequence: 'asc' }
          }
        }
      }
    }
  });
  
  if (!project || project.status !== 'completed') {
    return; // Only learn from successful projects
  }
  
  for (const flow of project.processFlows) {
    for (const operation of flow.operations) {
      const processType = detectProcessType(operation.operationName);
      if (!processType) continue;
      
      // Check if template exists
      let template = await prisma.processTemplate.findFirst({
        where: {
          processType,
          subType: detectSubType(operation.operationName)
        }
      });
      
      if (template) {
        // Update existing template
        await prisma.processTemplate.update({
          where: { id: template.id },
          data: {
            usageCount: { increment: 1 },
            successRate: calculateSuccessRate(template.usageCount + 1, template.successRate),
            updatedAt: new Date()
          }
        });
      } else {
        // Create new template from this operation
        await createTemplateFromOperation(operation, processType);
      }
    }
  }
}

// Detect process type from operation name
function detectProcessType(operationName) {
  const name = operationName.toLowerCase();
  
  if (name.includes('mould') || name.includes('injection') || name.includes('blow')) {
    return 'molding';
  }
  if (name.includes('cut') || name.includes('roll') || name.includes('paper')) {
    return 'paper_processing';
  }
  if (name.includes('wood') || name.includes('carv') || name.includes('lathe')) {
    return 'wood_processing';
  }
  if (name.includes('stamp') || name.includes('metal') || name.includes('press')) {
    return 'metal_processing';
  }
  if (name.includes('spray') || name.includes('paint')) {
    return 'coating';
  }
  if (name.includes('pad') || name.includes('print') || name.includes('screen')) {
    return 'printing';
  }
  if (name.includes('assembl')) {
    return 'assembly';
  }
  if (name.includes('pack')) {
    return 'packaging';
  }
  
  return null; // Unknown process type
}

// Detect sub-type for more specific templates
function detectSubType(operationName) {
  const name = operationName.toLowerCase();
  
  // Molding sub-types
  if (name.includes('injection')) return 'injection';
  if (name.includes('blow')) return 'blow';
  if (name.includes('roto')) return 'rotational';
  if (name.includes('compression')) return 'compression';
  
  // Add more sub-types as needed
  return null;
}

// Create template from successful operation
async function createTemplateFromOperation(operation, processType) {
  const structure = {
    stages: analyzeOperationStages(operation),
    requiredResources: inferRequiredResources(processType),
    commonParameters: extractCommonParameters(operation)
  };
  
  await prisma.processTemplate.create({
    data: {
      name: `${operation.operationName} Standard Flow`,
      processType,
      subType: detectSubType(operation.operationName),
      description: `Learned from successful ${operation.operationName} operations`,
      isSystemDefined: false,
      usageCount: 1,
      successRate: 100,
      structure
    }
  });
}

module.exports = {
  suggestTemplate,
  learnFromProject,
  detectProcessType
};
```

**Frontend Integration**: Update Process Flow Builder

```typescript
// In Process Flow Builder, when user adds a new operation
async function handleAddOperation(operationName: string) {
  // Get template suggestions
  const suggestions = await fetch(
    `/api/process-templates/suggest?operation=${encodeURIComponent(operationName)}`
  ).then(r => r.json());
  
  if (suggestions.hasTemplates) {
    // Show template dialog
    showTemplateDialog(suggestions);
  } else {
    // Create blank operation (existing behavior)
    createBlankOperation(operationName);
  }
}

function showTemplateDialog(suggestions) {
  // Modal with template options
  return (
    <Dialog>
      <h3>💡 Process Structure Suggestions</h3>
      <p>Based on {suggestions.suggestions[0].usageCount} previous {suggestions.processType} projects</p>
      
      {suggestions.suggestions.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onSelect={() => applyTemplate(template)}
        />
      ))}
      
      <Button onClick={createBlankOperation}>
        Create from scratch
      </Button>
    </Dialog>
  );
}
```

**API Endpoints**:

```javascript
// GET /api/process-templates/suggest?operation=Injection%20Molding
router.get('/suggest', async (req, res) => {
  const { operation } = req.query;
  const suggestions = await processTemplateService.suggestTemplate(operation);
  res.json(suggestions);
});

// POST /api/process-templates/learn/:projectId
router.post('/learn/:projectId', async (req, res) => {
  await processTemplateService.learnFromProject(Number(req.params.projectId));
  res.json({ success: true });
});

// POST /api/process-templates/apply
router.post('/apply', async (req, res) => {
  const { templateId, processFlowId } = req.body;
  // Apply template structure to process flow
  const result = await applyTemplateToFlow(templateId, processFlowId);
  res.json(result);
});
```

---

### Priority 1: Seed Physical Resources (Molds + Machine Links)

**Current Problem**: 
- Mold Management UI shows "No molds found"
- Planning generates plans without checking physical resource availability
- No connection between planned capacity and actual mold/machine setup

**Fix Required in `scripts/reset-and-seed-e2e.js`**:

```javascript
// ADD: Seed realistic molds for each project
async function seedMoldsForProjects(projects, stations) {
  const moldingStations = stations.filter(s => s.code.startsWith('MOULD-'));
  
  for (const project of projects) {
    // Create 3-5 molds per project (realistic variation)
    const moldCount = randInt(3, 5);
    
    for (let m = 1; m <= moldCount; m++) {
      const cavities = [1, 2, 4, 8][randInt(0, 3)]; // Realistic cavity counts
      const cycleTime = randInt(30, 120); // 30-120 seconds
      
      const mold = await prisma.moldMaster.create({
        data: {
          code: `MOLD-${project.code}-${String(m).padStart(2, '0')}`,
          name: `${project.name} Mold ${m}`,
          cavities,
          cycleTimeSec: cycleTime,
          material: pick(['ABS', 'PP', 'PET', 'PVC']),
          productType: pick(['body', 'cap', 'component']),
          status: 'active',
          location: `Warehouse ${randInt(1, 3)}`,
          manufacturer: pick(['MoldTech', 'PrecisionMolds', 'QualityDies']),
          purchaseDate: new Date(2024, randInt(0, 11), randInt(1, 28)),
        },
      });
      
      // CRITICAL: Link mold to a molding machine
      // This creates the physical constraint
      const assignedMachine = pick(moldingStations);
      await prisma.stationMachine.create({
        data: {
          stationId: assignedMachine.id,
          code: `MACH-${assignedMachine.code}-${m}`,
          name: `${assignedMachine.name} - Mold ${m}`,
          machineType: 'molding',
          moldMasterId: mold.id, // LINK TO MOLD
          cycleTimeSec: cycleTime,
          cavities,
          status: 'available',
          currentProjectId: project.id,
        },
      });
    }
  }
  console.log(`✅ Molds created and linked to machines`);
}

// Call this function after seedProjects()
```

### Priority 2: MANDATORY Resource Validation Layer

**CRITICAL**: Planning service MUST validate physical resources BEFORE generating any plan.

**Create New Service**: `api/services/resourceValidator.js`

```javascript
/**
 * ═══════════════════════════════════════════════════════════════════
 * CRITICAL DESIGN PRINCIPLE: ZERO HARDCODED PROCESS ASSUMPTIONS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * The system NEVER assumes which processes a project needs.
 * It validates ONLY what the user actually defined in their ProcessFlow.
 * 
 * REAL PROJECT EXAMPLES (all valid, all different):
 * 
 * 1. Water Bottle (Plastic Product):
 *    Injection Molding → Cooling → Label → Cap Assembly → Packaging
 *    ✓ Has molding, needs molds + molding machines
 * 
 * 2. Paper Stick (Paper Product):
 *    Cut Paper Rolls → Roll Sticks → Packaging
 *    ✓ NO molding, needs cutting + rolling machines
 * 
 * 3. Wooden Pencil (Wood Product):
 *    Wood Processing → Shaping → Painting → Assembly → Packaging
 *    ✓ NO molding, needs woodworking + shaping machines
 * 
 * 4. USB Drive (Electronic Product):
 *    Injection Molding → PCB Assembly → Pad Printing → Final Assembly
 *    ✓ Has molding for shell, also needs electronics assembly
 * 
 * 5. Metal Keychain (Metal Product):
 *    Stamping → Polishing → Engraving → Quality Check → Packaging
 *    ✓ NO molding, needs metal stamping + polishing machines
 * 
 * 6. Executive Pen (Multi-Material):
 *    Barrel Molding → Metal Clip Stamping → Refill Assembly → Packaging
 *    ✓ Has BOTH molding AND metal work
 * 
 * VALIDATION APPROACH:
 * 1. UNIVERSAL checks: station operational, capacity defined (applies to ALL)
 * 2. OPTIONAL special checks: IF operation name suggests molding, THEN check molds
 * 3. NEVER fails if special equipment not found - only warns
 * 4. User defines reality, system validates against that reality
 * 
 * MANDATORY validation before plan generation
 * Returns: { valid: true/false, errors: [], warnings: [] }
 */
async function validatePlanningResources(projectId, processFlowId) {
  const errors = [];
  const warnings = [];
  
  const operations = await prisma.processOperation.findMany({
    where: { processFlowId },
    include: { Station: { include: { machines: true } } },
    orderBy: { sequence: 'asc' }
  });
  
  // Validate EACH operation the user defined (NO assumptions)
  for (const op of operations) {
    // 1. Basic validation (applies to ALL operations)
    await validateBasicOperation(op, errors, warnings);
    
    // 2. Station validation (does station exist and work?)
    await validateStation(op, errors, warnings);
    
    // 3. Capacity validation (does station have enough capacity?)
    await validateCapacity(op, errors, warnings);
    
    // 4. Machine validation (IF operation requires machines)
    if (op.machineRequired) {
      await validateMachineAvailability(op, projectId, errors, warnings);
    }
    
    // 5. Special equipment validation (ONLY if detected, not mandatory)
    // This is OPTIONAL - only validates if operation type detected
    const specialValidation = trySpecialValidation(op, projectId);
    if (specialValidation) {
      await specialValidation(op, projectId, errors, warnings);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    canProceed: errors.length === 0,
    message: errors.length > 0 
      ? `Cannot create plan: ${errors.length} validation errors found`
      : 'All resources validated successfully'
  };
}

// ===== UNIVERSAL VALIDATORS (Apply to ALL operations) =====

async function validateBasicOperation(op, errors, warnings) {
  // Every operation must have basic data
  if (!op.operationName) {
    errors.push({
      operation: op.sequence,
      issue: 'Operation has no name',
      severity: 'CRITICAL'
    });
  }
  
  if (!op.stationId) {
    errors.push({
      operation: op.operationName,
      issue: 'No station assigned',
      severity: 'CRITICAL',
      fix: 'Assign a station in Process Flow Builder'
    });
  }
  
  if (!op.standardOutput || op.standardOutput <= 0) {
    errors.push({
      operation: op.operationName,
      issue: 'No capacity (standardOutput) defined',
      severity: 'CRITICAL',
      fix: 'Set units/hour capacity in Process Flow Builder'
    });
  }
}

async function validateStation(op, errors, warnings) {
  if (!op.Station) return;
  
  const station = op.Station;
  
  // Station must be operational
  if (station.status !== 'operational') {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: `Station status is "${station.status}", not operational`,
      severity: 'CRITICAL',
      fix: `Activate station "${station.name}" before planning`
    });
  }
}

async function validateCapacity(op, errors, warnings) {
  if (!op.Station) return;
  
  const station = op.Station;
  
  // If station has capacity limit, check if operation exceeds it
  if (station.capacity > 0 && op.standardOutput > station.capacity * 1.5) {
    warnings.push({
      operation: op.operationName,
      station: station.name,
      issue: `Planned capacity (${op.standardOutput}/hr) significantly exceeds station capacity (${station.capacity}/hr)`,
      severity: 'WARNING',
      note: 'Plan may be optimistic'
    });
  }
}

async function validateMachineAvailability(op, projectId, errors, warnings) {
  // Operation explicitly requires machines
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      status: { in: ['available', 'in_use'] }
    }
  });
  
  if (machines.length === 0) {
    errors.push({
      operation: op.operationName,
      station: op.Station?.name,
      issue: 'Operation requires machines but none available at station',
      severity: 'CRITICAL',
      fix: 'Add machines to this station or change operation requirements'
    });
  }
}

// ===== OPTIONAL SPECIAL VALIDATORS (Only if detected) =====

function trySpecialValidation(op, projectId) {
  const name = op.operationName.toLowerCase();
  const code = op.operationCode?.toLowerCase() || '';
  
  // Try to detect special equipment needs (OPTIONAL, not required)
  // These are intelligent hints, NOT mandatory checks
  
  // Plastic/Injection processes
  if (name.includes('mould') || name.includes('injection') || code.includes('mould')) {
    return validateMoldingResources;
  }
  
  // Coating/Painting processes
  if (name.includes('spray') || name.includes('paint') || name.includes('coat') || code.includes('spray')) {
    return validateSprayResources;
  }
  
  // Printing processes
  if (name.includes('pad') || name.includes('print') || name.includes('screen') || code.includes('print')) {
    return validatePadPrintResources;
  }
  
  // Paper processes (Paper Stick project)
  if (name.includes('cut') || name.includes('roll') || name.includes('paper') || name.includes('stick')) {
    return validatePaperProcessingResources;
  }
  
  // Wood processes (Wooden Pencil project)
  if (name.includes('wood') || name.includes('carv') || name.includes('shape') || name.includes('lathe') || name.includes('pencil')) {
    return validateWoodProcessingResources;
  }
  
  // Metal processes (Metal Keychain project)
  if (name.includes('stamp') || name.includes('polish') || name.includes('engrav') || name.includes('metal') || name.includes('press')) {
    return validateMetalProcessingResources;
  }
  
  // Assembly processes (all projects may have this)
  if (name.includes('assembl') || name.includes('assm') || code.includes('assm')) {
    return validateAssemblyResources;
  }
  
  // Packaging (all projects may have this)
  if (name.includes('pack') || code.includes('pack')) {
    return validatePackagingResources;
  }
  
  // No special validation detected - generic checks are sufficient
  // This is NORMAL and EXPECTED for custom operations
  return null;
}

// ===== OPTIONAL SPECIAL VALIDATORS (Called only if operation type detected) =====

/**
 * ONLY validates molding if operation name/code suggests it needs molds
 * NOT called for paper stick, wooden pencil, or other non-molding projects
 */
async function validateMoldingResources(op, projectId, errors, warnings) {
  const station = op.Station;
  
  // 1. Check if station has molding machines
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      machineType: 'molding',
      status: { in: ['available', 'in_use'] }
    },
    include: { MoldMaster: true }
  });
  
  if (machines.length === 0) {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: 'No molding machines available',
      severity: 'CRITICAL',
      fix: `Add molding machines to station "${station.name}" or change operation station`
    });
    return;
  }
  
  // 2. Check if machines have molds assigned
  const machinesWithMolds = machines.filter(m => m.moldMasterId !== null);
  if (machinesWithMolds.length === 0) {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: 'No molds assigned to molding machines',
      severity: 'CRITICAL',
      fix: `Go to Mold Management and assign molds to machines at station "${station.name}"`
    });
    return;
  }
  
  // 3. Check if molds are for this project
  const projectMolds = await prisma.moldMaster.findMany({
    where: {
      id: { in: machinesWithMolds.map(m => m.moldMasterId) },
      // Could add: currentProjectId: projectId (if tracked)
    }
  });
  
  // 4. Calculate real capacity vs planned capacity
  const totalCavities = machinesWithMolds.reduce((sum, m) => sum + m.cavities, 0);
  const avgCycleTime = machinesWithMolds[0].MoldMaster.cycleTimeSec;
  const realCapacityPerHour = Math.floor((3600 / avgCycleTime) * totalCavities);
  
  if (op.standardOutput > realCapacityPerHour * 1.2) {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: `Planned capacity (${op.standardOutput}/hr) exceeds physical capacity (${realCapacityPerHour}/hr)`,
      severity: 'CRITICAL',
      fix: `Reduce planned capacity to ${realCapacityPerHour}/hr or add more machines/molds`
    });
  } else if (op.standardOutput > realCapacityPerHour) {
    warnings.push({
      operation: op.operationName,
      station: station.name,
      issue: `Planned capacity (${op.standardOutput}/hr) is ${Math.round((op.standardOutput/realCapacityPerHour - 1) * 100)}% above physical capacity (${realCapacityPerHour}/hr)`,
      severity: 'WARNING',
      note: 'Plan may be optimistic'
    });
  }
  
  // 5. Check machine availability (not assigned to other projects)
  const busyMachines = machinesWithMolds.filter(m => 
    m.currentProjectId && m.currentProjectId !== projectId
  );
  if (busyMachines.length > 0) {
    warnings.push({
      operation: op.operationName,
      station: station.name,
      issue: `${busyMachines.length} machines are assigned to other projects`,
      severity: 'WARNING',
      note: 'May need to wait for machines to become available'
    });
  }
}

async function validateSprayResources(op, errors, warnings) {
  const station = op.Station;
  
  // Check if station has spray booths/machines
  const sprayMachines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      machineType: { in: ['painting', 'spray', 'coating'] },
      status: { in: ['available', 'in_use'] }
    }
  });
  
  if (sprayMachines.length === 0) {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: 'No spray booths/machines available',
      severity: 'CRITICAL',
      fix: `Add spray equipment to station "${station.name}" or change operation station`
    });
    return;
  }
  
  // Check booth capacity
  const totalCapacity = sprayMachines.reduce((sum, m) => {
    // If machine has cycleTimeSec, calculate capacity
    if (m.cycleTimeSec) {
      return sum + Math.floor(3600 / m.cycleTimeSec);
    }
    return sum + station.capacity; // Fallback to station capacity
  }, 0);
  
  if (op.standardOutput > totalCapacity * 1.2) {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: `Planned capacity (${op.standardOutput}/hr) exceeds booth capacity (${totalCapacity}/hr)`,
      severity: 'CRITICAL',
      fix: `Reduce planned capacity or add more spray booths`
    });
  }
}

async function validatePadPrintResources(op, errors, warnings) {
  const station = op.Station;
  
  const printMachines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      machineType: { in: ['pad_printing', 'printing'] },
      status: { in: ['available', 'in_use'] }
    }
  });
  
  if (printMachines.length === 0) {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: 'No pad printing machines available',
      severity: 'CRITICAL',
      fix: `Add pad printing equipment to station "${station.name}"`
    });
  }
}

async function validateAssemblyResources(op, errors, warnings) {
  const station = op.Station;
  
  // Check if station exists and is operational
  if (station.status !== 'operational') {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: `Station status is "${station.status}", not operational`,
      severity: 'CRITICAL',
      fix: `Activate station "${station.name}" before planning`
    });
  }
  
  // Check if station has capacity
  if (station.capacity === 0) {
    warnings.push({
      operation: op.operationName,
      station: station.name,
      issue: 'Station has zero capacity configured',
      severity: 'WARNING',
      note: 'May need to configure station capacity'
    });
  }
}

/**
 * Paper processing validator - for projects like Paper Stick
 * Operations: Cut Rolls → Roll Sticks (NO molding needed)
 */
async function validatePaperProcessingResources(op, errors, warnings) {
  const station = op.Station;
  
  // Check for cutting/rolling equipment
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      machineType: { in: ['cutting', 'rolling', 'paper_processing'] },
      status: { in: ['available', 'in_use'] }
    }
  });
  
  if (machines.length === 0) {
    warnings.push({
      operation: op.operationName,
      station: station.name,
      issue: 'No specialized paper processing machines found',
      severity: 'WARNING',
      note: 'Ensure station has cutting/rolling equipment'
    });
  }
}

/**
 * Wood processing validator - for projects like Wooden Pencil
 * Operations: Wood Process → Shape → Paint (NO molding needed)
 */
async function validateWoodProcessingResources(op, errors, warnings) {
  const station = op.Station;
  
  // Check for woodworking equipment
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      machineType: { in: ['woodworking', 'shaping', 'carving', 'lathe'] },
      status: { in: ['available', 'in_use'] }
    }
  });
  
  if (machines.length === 0) {
    warnings.push({
      operation: op.operationName,
      station: station.name,
      issue: 'No specialized woodworking machines found',
      severity: 'WARNING',
      note: 'Ensure station has wood processing equipment'
    });
  }
}

/**
 * Metal processing validator - for projects like Metal Keychain
 * Operations: Stamping → Polishing → Engraving (NO molding needed)
 */
async function validateMetalProcessingResources(op, errors, warnings) {
  const station = op.Station;
  
  // Check for metal processing equipment
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      machineType: { in: ['stamping', 'press', 'polishing', 'engraving', 'cnc'] },
      status: { in: ['available', 'in_use'] }
    }
  });
  
  if (machines.length === 0) {
    warnings.push({
      operation: op.operationName,
      station: station.name,
      issue: 'No specialized metal processing machines found',
      severity: 'WARNING',
      note: 'Ensure station has stamping/polishing equipment'
    });
  }
}

async function validatePackagingResources(op, errors, warnings) {
  // Packaging is simple - just needs operational station
  // No special equipment required
  const station = op.Station;
  
  if (station && station.status !== 'operational') {
    errors.push({
      operation: op.operationName,
      station: station.name,
      issue: 'Packaging station not operational',
      severity: 'CRITICAL'
    });
  }
}

module.exports = {
  validatePlanningResources,
  detectOperationType
};
```

**Integration Point**: Modify `api/services/dailyPlanService.js`

```javascript
const resourceValidator = require('./resourceValidator');

async function generateDailyPlan(params) {
  const { projectId, processFlowId, ... } = params;
  
  // ⚠️ MANDATORY: Validate resources FIRST
  const validation = await resourceValidator.validatePlanningResources(
    projectId, 
    processFlowId
  );
  
  if (!validation.valid) {
    throw new Error(
      `Cannot generate plan due to resource constraints:\n` +
      validation.errors.map(e => `- ${e.operation}: ${e.issue}`).join('\n')
    );
  }
  
  // Log warnings but allow plan to proceed
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Planning warnings:', validation.warnings);
  }
  
  // NOW safe to generate plan
  // ... rest of planning logic
}
```

### Phase 1: Multi-Process Planning Engine (Days 1-3)
**Goal**: Generate complete process chain plans with bottleneck detection

**Schema Changes** (add to existing models):
```prisma
// Extend DailyPlanGeneration
model DailyPlanGeneration {
  // ... existing fields
  processFlowId       String?        // Link to ProcessFlow used
  bottleneckOperation String?        // Which operation is the constraint
  effectiveCapacity   Int?           // Units/hour (bottleneck capacity)
  
  ProcessFlow         ProcessFlow?   @relation(fields: [processFlowId], references: [id])
  processDetails      ProcessPlanDetail[]  // NEW RELATION
}

// NEW MODEL: Per-operation daily breakdown
model ProcessPlanDetail {
  id                  String         @id @default(cuid())
  planId              Int            // Link to DailyPlanGeneration
  operationId         String         // Link to ProcessOperation
  date                DateTime       @db.Date
  sequence            Int            // Operation order (1=first, 2=second...)
  
  // Capacity Info
  inputCapacity       Int?           // From previous operation (null for first)
  operationCapacity   Int            // This operation's max capacity
  effectiveOutput     Int            // Actual output (MIN of input, capacity)
  isBottleneck        Boolean        @default(false)
  
  // Resource Allocation
  stationId           Int?
  assignedMachines    Int            // Number of machines allocated
  machineIds          Int[]          // Specific machine IDs
  assignedWorkers     Int?
  
  // Utilization
  capacityUtilization Float          // effectiveOutput / operationCapacity
  hoursRequired       Float          // Based on cycle time
  
  // Status
  status              String         @default("planned") // planned, in_progress, completed
  actualOutput        Int?           // Real output (filled during execution)
  notes               String?
  
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  
  DailyPlanGeneration DailyPlanGeneration @relation(fields: [planId], references: [id], onDelete: Cascade)
  ProcessOperation    ProcessOperation    @relation(fields: [operationId], references: [id])
  Station             Station?            @relation(fields: [stationId], references: [id])
  
  @@unique([planId, operationId, date])
  @@index([planId])
  @@index([date])
  @@index([operationId])
}
```

**New Services** (create these files):

1. **`api/services/processChainAnalyzer.js`**
```javascript
// Functions:
- analyzeProcessChain(processFlowId) → identifies bottleneck, calculates effective capacity
- getOperationCapacity(operationId) → reads standardOutput from ProcessOperation
- calculateChainThroughput(operations[]) → finds MIN capacity
- identifyBottlenecks(operations[]) → marks which operations are constraints
```

2. **`api/services/multiProcessPlanner.js`**
```javascript
// Functions:
- generateMultiProcessPlan(projectId, processFlowId) → creates DailyPlanGeneration + ProcessPlanDetails
- allocateMachinesPerOperation(operation, date) → assigns available machines
- calculateDailyBreakdown(effectiveCapacity, totalQty, days) → distributes work
- propagateConstraints(operations[], bottleneckCapacity) → applies bottleneck to all downstream
```

3. **Update `api/services/dailyPlanService.js`**
```javascript
// Changes:
- Replace single-process logic with multiProcessPlanner.generateMultiProcessPlan()
- Add processFlowId parameter
- Return ProcessPlanDetail[] along with DailyPlanGeneration
```

**API Endpoints** (add to `api/routes/auto-planning.js`):
```javascript
// NEW
POST   /api/auto-planning/analyze-process-flow/:flowId
  → Returns: { bottleneck, effectiveCapacity, operationBreakdown[] }

GET    /api/auto-planning/plans/:planId/operations
  → Returns: ProcessPlanDetail[] grouped by date

PUT    /api/auto-planning/plans/:planId/operations/:detailId
  → Update individual operation plan (for manual adjustments)

// EXISTING (enhance these)
POST   /api/auto-planning/generate
  → Now requires processFlowId
  → Generates multi-process plan

GET    /api/auto-planning/plans/:planId
  → Now includes processDetails[] in response
```

### Phase 2: Interactive Plan Modification (Days 4-6)
**Goal**: Allow users to adjust plans with real-time impact analysis

**UI Components** (create in `web/src/pages/planning/`):

1. **`ProcessChainView.tsx`** - Visualize the entire operation chain
```tsx
// Displays:
- All operations in sequence
- Current capacity per operation
- Bottleneck highlighted in red
- Downstream constraints shown in yellow
- Timeline/Gantt view of daily breakdown
```

2. **`PlanEditor.tsx`** - Interactive modification interface
```tsx
// Features:
- Drag operations to reschedule
- Click to edit quantities
- Machine selector dropdown
- Real-time impact preview panel:
  ├─ New completion date
  ├─ Capacity utilization changes
  ├─ New bottlenecks (if any)
  └─ Resource conflicts warnings
```

3. **`ImpactAnalyzer.tsx`** - Show before/after comparison
```tsx
// Displays:
┌─────────────────────────────────────────────┐
│ CURRENT PLAN         →    MODIFIED PLAN     │
│ Completion: Dec 20   →    Dec 15  (5d faster)│
│ Bottleneck: Spray    →    Moulding (shifted!)│
│ Avg Utilization: 78% →    85%               │
│ Conflicts: None      →    2 machine overlaps│
└─────────────────────────────────────────────┘
```

**Backend Services**:

4. **`api/services/planModificationService.js`**
```javascript
// Functions:
- validateModification(planId, changes) → check feasibility
- applyModification(planId, changes) → update ProcessPlanDetail records
- calculateImpact(planId, changes) → simulate effects WITHOUT saving
- detectConflicts(planId, changes) → find resource overlaps
```

**API Endpoints**:
```javascript
POST   /api/auto-planning/plans/:planId/simulate
  Body: { modifications: [...] }
  → Returns: { impactAnalysis, conflicts[], newCompletionDate }

PUT    /api/auto-planning/plans/:planId/apply-changes
  Body: { modifications: [...], force: boolean }
  → Applies changes if no conflicts (or if force=true)

POST   /api/auto-planning/plans/:planId/validate
  Body: { modifications: [...] }
  → Returns: { valid: boolean, errors: [], warnings: [] }
```

### Phase 3: Adaptive Load Balancing Engine (Days 7-12)
**Goal**: Real-time resource optimization with gradual ramp-up

**Schema Changes**:
```prisma
// NEW MODEL: Track resource availability events
model ResourceAvailabilityEvent {
  id              String         @id @default(cuid())
  eventType       String         // project_complete, machine_freed, machine_added, mold_available
  resourceType    String         // machine, mold, worker, station
  resourceId      Int
  projectId       Int?           // Which project freed the resource (if applicable)
  availableFrom   DateTime
  detectedAt      DateTime       @default(now())
  status          String         // pending_analysis, opportunities_found, no_opportunities, processed
  
  Project         Project?       @relation(fields: [projectId], references: [id])
  opportunities   LoadBalancingOpportunity[]
  
  @@index([eventType, status])
  @@index([availableFrom])
}

// NEW MODEL: Identified optimization opportunities
model LoadBalancingOpportunity {
  id                    String         @id @default(cuid())
  eventId               String
  targetProjectId       Int            // Project that can benefit
  targetOperationId     String         // Specific operation to optimize
  
  // Proposal
  proposalType          String         // add_machine, increase_capacity, parallel_processing
  currentCapacity       Int            // Units/hour before
  proposedCapacity      Int            // Units/hour after
  resourcesRequired     Json           // { machines: [1,2], molds: [3], workers: 5 }
  
  // Ramp-up plan
  rampUpDays            Int            @default(3)  // Gradual increase over N days
  dailyIncrement        Int            // Units/hour increase per day
  
  // Impact
  currentCompletionDate DateTime
  newCompletionDate     DateTime
  daysSaved             Int
  riskLevel             String         // low, medium, high
  
  // Approval
  status                String         @default("pending_approval") // pending_approval, approved, rejected, executed
  approvedBy            String?
  approvedAt            DateTime?
  rejectionReason       String?
  
  // Execution
  executedAt            DateTime?
  actualResults         Json?          // Actual vs predicted performance
  
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  
  ResourceEvent         ResourceAvailabilityEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  Project               Project        @relation(fields: [targetProjectId], references: [id])
  ProcessOperation      ProcessOperation @relation(fields: [targetOperationId], references: [id])
  User                  User?          @relation(fields: [approvedBy], references: [id])
  rampUpSchedule        RampUpSchedule[]
  
  @@index([status])
  @@index([targetProjectId])
}

// NEW MODEL: Day-by-day ramp-up execution plan
model RampUpSchedule {
  id                  String         @id @default(cuid())
  opportunityId       String
  date                DateTime       @db.Date
  dayNumber           Int            // 1, 2, 3... (day in ramp-up sequence)
  plannedCapacity     Int            // Target capacity for this day
  machinesAssigned    Int[]          // Which machines active this day
  actualCapacity      Int?           // Real capacity achieved
  status              String         @default("scheduled") // scheduled, active, completed
  notes               String?
  
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  
  LoadBalancingOpportunity LoadBalancingOpportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  
  @@unique([opportunityId, date])
  @@index([date, status])
}
```

**New Services**:

1. **`api/services/resourceMonitor.js`**
```javascript
// Real-time monitoring
- watchProjectCompletions() → triggers when project status = completed
- watchMachineStatus() → detects machines returning to available
- watchMoldInventory() → tracks new molds added to system
- createAvailabilityEvent(type, resourceId) → logs event

// Runs as background job every 5 minutes
```

2. **`api/services/opportunityDetector.js`**
```javascript
// Opportunity identification
- analyzeAvailability Event(eventId) → finds projects that can benefit
- calculateRampUpPlan(projectId, operationId, newResources) → creates gradual increase plan
- assessRisk(rampUpPlan) → evaluates if change is safe
- generateProposal(opportunity) → creates LoadBalancingOpportunity record

// Decision logic:
IF (project has idle machines/molds)
AND (project has operations below capacity)
AND (ramp-up won't create new bottlenecks)
THEN create opportunity
```

3. **`api/services/rampUpExecutor.js`**
```javascript
// Execute approved ramp-ups
- executeRampUp(opportunityId) → implements capacity increase
- updateDailySchedule(date, capacity, machines) → modifies ProcessPlanDetail
- monitorRampUpProgress(opportunityId) → tracks actual vs planned
- adjustIfNeeded(opportunityId) → course-correct if targets not met

// Runs daily to progress active ramp-ups
```

**API Endpoints**:
```javascript
// Resource monitoring
GET    /api/load-balancing/events
  → List all resource availability events

POST   /api/load-balancing/events/manual
  Body: { resourceType, resourceId, availableFrom }
  → Manually trigger analysis (e.g., "we just bought a new machine")

// Opportunities
GET    /api/load-balancing/opportunities
  Query: ?status=pending_approval&projectId=10
  → List optimization opportunities

GET    /api/load-balancing/opportunities/:id
  → Detailed view with impact analysis

POST   /api/load-balancing/opportunities/:id/approve
  → Approve and execute ramp-up

POST   /api/load-balancing/opportunities/:id/reject
  Body: { reason }
  → Decline opportunity

// Monitoring
GET    /api/load-balancing/active-rampups
  → Currently executing capacity increases

GET    /api/load-balancing/opportunities/:id/progress
  → Day-by-day progress of ramp-up
```

**UI Components** (create in `web/src/pages/planning/`):

4. **`LoadBalancingDashboard.tsx`**
```tsx
// Real-time view of:
- Recent resource availability events
- Pending opportunities awaiting approval
- Active ramp-ups in progress
- Historical performance (opportunities taken vs results)
```

5. **`OpportunityCard.tsx`**
```tsx
// Shows:
┌─────────────────────────────────────────────────┐
│ 🎯 OPTIMIZATION OPPORTUNITY                     │
│                                                 │
│ Project: Water Bottle - GreenCo                 │
│ Operation: Moulding                             │
│                                                 │
│ Available Resources:                            │
│   • 2 Moulding Machines (freed from PROJ-009)  │
│   • 3 Additional Molds in inventory             │
│                                                 │
│ Proposed Change:                                │
│   Current: 1000 units/hr                        │
│   New:     1500 units/hr (+50%)                 │
│   Ramp-up: 3 days gradual increase              │
│                                                 │
│ Impact:                                         │
│   Completion: Dec 20 → Dec 15 (5 days earlier) │
│   Risk: LOW ✅                                  │
│                                                 │
│ [Approve & Execute]  [View Details]  [Reject]  │
└─────────────────────────────────────────────────┘
```

### Phase 4: Learning & Optimization
**Duration**: Ongoing
**Goal**: System improves with usage

**Features**:
- Historical performance analysis
- Pattern recognition for bottlenecks
- Predictive capacity planning
- Anomaly detection

## Success Metrics
1. **Pl

anning Accuracy**: ±5% of predicted completion dates
2. **Capacity Utilization**: >85% across all processes
3. **Early Completions**: 15-20% projects finish ahead of schedule
4. **Resource Efficiency**: 30% reduction in idle machine time

## Technical Stack
- **Backend**: Node.js + Prisma + PostgreSQL
- **Real-time**: Socket.IO for live updates
- **Analytics**: Time-series data for capacity tracking
- **UI**: React + Recharts for visualization

## Next Steps
1. ✅ Document complete
2. ⏭️ Phase 1: Implement process chain planning
3. ⏭️ Phase 2: Build plan editor
4. ⏭️ Phase 3: Create load balancing engine
5. ⏭️ Phase 4: Add learning capabilities

---
**Note**: This is a significant enhancement that will transform the PMS from a planning tool into an intelligent manufacturing optimization system.

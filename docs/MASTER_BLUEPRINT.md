# 📘 Pramara PMS - Implementation Status & Master Plan
**Last Updated:** October 23, 2025  
**Phase:** Foundation & Security Setup  
**Next Phase:** Email Integration → MFA Implementation → Production Modules

---

## 🎯 PROJECT OVERVIEW

**System Purpose:** Execution Tracker & Control Tower for manufacturing  
**Architecture:** React + TypeScript (Frontend) | Node.js + Express (Backend) | PostgreSQL (Neon) | S3-compatible storage  
**Positioning:** Sits on top of SAP ERP; provides real-time operational intelligence

---

## ✅ COMPLETED MODULES

### 1. Authentication & Security (Phase 0 - Foundation)
**Status:** ✅ Complete  
**Completion Date:** October 23, 2025

#### What's Working:
- ✅ JWT-based authentication with session tracking
- ✅ Role-based access control (RBAC)
- ✅ Permission-based UI guards
- ✅ Device fingerprinting & management
- ✅ Force logout capability (immediate session revocation)
- ✅ Audit logging system (15-day minimum retention)
- ✅ User management (invite, edit, delete)
- ✅ Department management
- ✅ Role & permission system with granular controls
- ✅ Temporary permission grants
- ✅ Permission request workflow

#### Key Features:
- Session validation on every request (theft/breach protection)
- Device tracking with trust duration settings
- Audit retention per user (15-365 days)
- Super Admin unlimited retention
- No-delete policy on audit logs (server access only)

#### Database Schema:
```prisma
User {
  mfaSecret, mfaEnforcedAt (placeholder - pending full MFA)
  trustDeviceDuration (30 days default)
  auditRetentionDays (90 days default)
}
Device {
  fingerprint, trusted, trustUntil
  sessions[] (active tracking)
}
Session {
  refreshTokenHash (JWT)
  expiresAt, deviceId
}
AuditLog {
  action, entity, changes, meta
  flagged (for security review)
}
```

#### API Endpoints:
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/change-password
GET    /api/me
GET    /api/admin/users
PUT    /api/admin/users/:id
PUT    /api/admin/users/:id/mfa (placeholder)
POST   /api/admin/users/:id/force-logout
GET    /api/devices
DELETE /api/devices/:id
POST   /api/devices/:id/logout
GET    /api/audit-logs
GET    /api/audit-logs/flagged
```

---

### 2. User Interface Foundation
**Status:** ✅ Complete  
**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite

#### Components Built:
- ✅ Login page
- ✅ Dashboard shell
- ✅ Admin panel (Users, Roles, Departments, Devices, Audit Logs)
- ✅ Modal system (EditUserModal, TemporaryPermissionsModal, etc.)
- ✅ Permission gates
- ✅ Dark mode support

---

## 🔄 IN PROGRESS

### Email Integration (Current Sprint)
**Status:** 🟡 Planning Complete - Implementation Next  
**Priority:** High (Foundation for MFA, invitations, alerts)

#### Scope:
1. **Service Setup:** Resend.com integration
2. **Core Templates:**
   - User invitation emails
   - Password reset
   - MFA setup confirmation
   - Security alerts (breach notifications)
   - Permission request notifications
   - Audit log alerts (flagged actions)

3. **Architecture:**
```javascript
// Abstraction layer for easy provider switching
class EmailService {
  constructor(provider: 'resend' | 'ses' | 'sendgrid')
  async send({to, template, data})
  async sendBulk([{to, template, data}])
}
```

4. **Database Schema (to add):**
```prisma
EmailTemplate {
  id, name, subject, html, variables[]
}
EmailLog {
  id, to, template, status, sentAt, error
  sourceId (links to invitation, audit log, etc.)
}
```

#### Implementation Plan:
- **Day 1-2:** Service setup + abstraction layer
- **Day 3-4:** Email templates (HTML + variables)
- **Day 5:** Invitation flow integration
- **Day 6:** Password reset flow
- **Day 7:** MFA + security alerts

---

### MFA (Multi-Factor Authentication)
**Status:** 🟡 UI Ready - Logic Placeholder  
**Priority:** High (Security requirement)

#### What Exists:
- ✅ Database schema (mfaSecret, mfaEnforcedAt)
- ✅ UI for Enable/Disable/Reset
- ✅ Status display (Disabled → Pending Setup → Enabled)
- ✅ Trust device settings (skip MFA for X days)

#### What's Missing:
- ❌ QR code generation (speakeasy + qrcode)
- ❌ TOTP verification during login
- ❌ Backup codes generation
- ❌ MFA enforcement check

#### Implementation Plan:
- **Day 1:** Install dependencies (speakeasy, qrcode)
- **Day 2:** Setup flow (generate secret → QR code → verify → store encrypted)
- **Day 3:** Login flow (check MFA → request TOTP → verify)
- **Day 4:** Backup codes (generate 10 one-time codes)
- **Day 5:** Trust device logic + email alerts

#### Database Schema (to add):
```prisma
MfaBackupCode {
  id, userId, code (hashed), used, usedAt
}
```

---

## 📋 PENDING MODULES (From Master Blueprint)

### Phase 1: Foundations & Intake (Partially Complete)

#### ✅ Complete:
- Master Project Tracker skeleton
- Document Repository structure
- Version Control concept

#### 🔴 Pending:
- **Pre-Production Workflow** (mold, trials, packaging design, PPS approvals)
- **Compliance Tracker** (BIS, EN71, ASTM, lab tests)
- **Project Policy Pack** (shipment windows, packing composition, changeover policy)
- **Process Flow Builder** (operations, sub-operations, dependencies)
- **Shift Entry System** (authoritative qty entry)
- **WIP Ledger** (opening/receipts/completed/transferred/closing)

---

### Phase 2: Execution Control (In Progress)

**Status:** 🟡 Active Development  
**Scope:** Full workflow management, station tracking, adaptive planning, real-time optimization  
**Philosophy:** System learns, adapts, and optimizes across concurrent projects with minimal human intervention

---

#### ✅ Completed:
- **Task Model & API** (Basic CRUD, sections, dependencies)
- **QC Schema** (Generic, station-aware, multi-criteria templates)

#### � In Progress:
- **Workflow Definition & Tracking**
- **Station Modeling (Multi-Level)**
- **Production Output & Material Consumption**
- **Workforce Management & Performance**
- **Daily Planning & Adaptive Optimization**
- **Batch Tracking & Traceability**

---

## 2.1 WORKFLOW MANAGEMENT (Core Execution Backbone)

### Overview
Every project has a custom workflow: stages, sub-stages, dependencies, responsibilities, and approvals. The system tracks progress at every step, enforces dependencies, and adapts the plan in real time.

### Features

**Workflow Definition:**
- Custom stages per project (e.g., Molding → Spray Painting → Pad Printing)
- Sub-stages within stages (e.g., Masking Step 1, 2, 3 within Spray Painting)
- Each stage defines:
  - What work is to be done
  - Who is responsible (assignee)
  - Who approves (internal or external: client, vendor)
  - Required documents, QC sheets, materials
  - Dependencies (cannot start until previous stage approved/completed)
  - Approval tagging (link to email confirmation or internal sign-off)

**Task & Progress Tracking:**
- Tasks linked to workflow stages with status, assignee, due date, reminders
- Track items completed at each stage and sub-stage
- Show what's pending, blocked, or ready to start
- Reminders and notifications for responsible users

**Dependency & Impact Management:**
- Stages blocked by dependencies (e.g., production starts only after sample approval)
- System enforces dependencies, shows impact (delays, blockers)
- Downstream tasks notified if a stage is delayed
- Buffers recalculated dynamically

**Document & Evidence Linking:**
- Attach artwork, sample approvals, QC sheets, emails to stages/tasks
- Email approvals linked directly (click to view source)
- QC and production sheets attached to stations, printed/assigned as needed

**Adaptive Planning & Optimization:**
- System uses all data (tasks, QC, station capacity, batch progress) to suggest optimal assignments
- Learns from past overrides and outcomes
- Adjusts buffers and priorities dynamically to keep projects on track

**Multi-Project Coordination:**
- Tracks all concurrent projects
- Optimizes resource allocation and scheduling to avoid conflicts
- Maximizes throughput across the factory

### Database Schema
```prisma
model WorkflowStage {
  id              String   @id @default(cuid())
  projectId       Int
  name            String
  order           Int
  parentStageId   String?  // for sub-stages
  
  responsibleId   String?
  approverId      String?
  approverType    String?  // internal, client, vendor
  
  requiredDocs    String[] // document IDs or types
  qcTemplateId    String?
  materialIds     String[]
  
  dependencies    String[] // stage IDs that must complete first
  bufferDays      Int      @default(2)
  
  status          String   @default("not-started") // not-started, in-progress, blocked, approved, completed
  approvalProof   String?  // email link, file key, internal confirmation ID
  
  startedAt       DateTime?
  completedAt     DateTime?
  approvedAt      DateTime?
  
  Project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  ParentStage     WorkflowStage? @relation("SubStages", fields: [parentStageId], references: [id])
  SubStages       WorkflowStage[] @relation("SubStages")
  Tasks           Task[]
  
  @@index([projectId])
  @@index([status])
}
```

### API Endpoints
```
POST   /api/workflow/:projectId/stages          (create stage)
GET    /api/workflow/:projectId/stages          (list stages, with sub-stages)
PUT    /api/workflow/stages/:id                 (update stage)
DELETE /api/workflow/stages/:id                 (delete stage)
POST   /api/workflow/stages/:id/approve         (approve stage, unblock downstream)
POST   /api/workflow/stages/:id/override        (internal authority override, log risk)
GET    /api/workflow/:projectId/dependencies    (dependency graph)
GET    /api/workflow/:projectId/blocked         (list blocked stages)
```

### UI Screens
- **Workflow Builder** (per project): define stages, sub-stages, dependencies, approvers, documents
- **Progress Dashboard**: visual timeline showing stage status, blockers, upcoming deadlines
- **Approval Center**: list pending approvals, send reminders, escalate, view proof
- **Dependency Visualizer**: graph showing stage dependencies and impact of delays

---

## 2.2 STATION MODELING (Multi-Level, Flexible, Adaptive)

### Overview
Stations are modeled hierarchically (Factory > Floor > Section > Room > Station) with flexible types, maintenance tracking, and adaptive assignment logic. System learns optimal placement and suggests assignments with reasoning.

### Features

**Multi-Level Hierarchy:**
- Factory → Floor → Section → Room → Station (name/number)
- Track across multiple factories for scalability
- Each station has custom-defined type (workstation, machine, spray booth, assembly line, etc.)
- Grouping by type for capacity planning and reporting

**Station Types & Configuration:**
- Custom types defined per factory (e.g., "6-Cavity Molding Machine", "Spray Booth Type A")
- Each type has default parameters: cycle time, capacity, QC templates, maintenance schedules
- Station-level overrides when needed

**Maintenance Tracking:**
- Manual and automatic maintenance triggers
- Schedule by: hours run, units produced, calendar days, or system recommendation
- Maintenance history tracked per station
- System analyzes usage patterns and suggests optimal maintenance timing
- Alerts before maintenance due to avoid mid-shift downtime

**Work Assignment & Document Attachment:**
- When work is assigned to a station:
  - Required materials auto-linked
  - QC sheets attached
  - Production sheets (instructions, targets) attached
  - Approver details and station number printed on documents
- Print options: by station or all at once
- If same work assigned consecutively, system prompts to avoid duplicate printing

**Adaptive Learning & Assignment Logic:**
- System tracks station usage, output quality, cycle times, worker performance per station
- Suggests optimal station assignments with reasoning (e.g., "Station 3 has 15% faster cycle time for this SKU")
- If user overrides, system logs the choice and tracks outcome (benefit or loss)
- Next time, shows impact of past changes (e.g., "Last time you selected Station 5, output was 10% slower")
- Learns user preferences and adapts future suggestions

**Station Linking (Product Flow):**
- Define product flow from station to station (e.g., Molding → Degating → Painting → Assembly)
- Tracks batch movement through stations for traceability
- Shows bottlenecks and flow issues in real time

### Database Schema
```prisma
model Factory {
  id          String   @id @default(cuid())
  name        String
  location    String
  code        String   @unique
  capacity    Int?
  
  floors      Floor[]
  
  @@index([code])
}

model Floor {
  id          String   @id @default(cuid())
  factoryId   String
  name        String
  level       Int
  
  Factory     Factory  @relation(fields: [factoryId], references: [id], onDelete: Cascade)
  sections    Section[]
  
  @@index([factoryId])
}

model Section {
  id          String   @id @default(cuid())
  floorId     String
  name        String
  
  Floor       Floor    @relation(fields: [floorId], references: [id], onDelete: Cascade)
  rooms       Room[]
  
  @@index([floorId])
}

model Room {
  id          String   @id @default(cuid())
  sectionId   String
  name        String
  capacity    Int?
  
  Section     Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  stations    Station[]
  
  @@index([sectionId])
}

model StationType {
  id                  String   @id @default(cuid())
  name                String   @unique
  category            String   // molding, painting, assembly, inspection, etc.
  defaultCycleTimeSec Int?
  defaultCapacity     Int?
  defaultQcTemplateId String?
  maintenanceIntervalHours Int?
  
  stations            Station[]
  
  @@index([category])
}

model Station {
  id              Int      @id @default(autoincrement())
  projectId       Int      // kept for backward compatibility
  roomId          String?
  typeId          String?
  
  name            String
  stationNumber   String?
  status          String   @default("operational") // operational, down, maintenance
  
  downtimeStart   DateTime?
  downtimeEnd     DateTime?
  downtimeReason  String?
  
  hoursRun        Float    @default(0)
  unitsProduced   Int      @default(0)
  lastMaintenance DateTime?
  nextMaintenance DateTime?
  
  linkedStations  String[] // IDs of next stations in flow
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  Room            Room?    @relation(fields: [roomId], references: [id], onDelete: SetNull)
  Type            StationType? @relation(fields: [typeId], references: [id], onDelete: SetNull)
  
  documents       DocumentStation[]
  qcTemplates     QCChecklistTemplate[]
  qcSubmissions   QCSubmission[]
  processConfigs  ProcessConfig[]
  productionCalcs ProductionCalculation[]
  productionEntries ProductionEntry[]
  maintenanceLogs MaintenanceLog[]
  
  @@index([projectId])
  @@index([roomId])
  @@index([typeId])
  @@index([status])
}

model MaintenanceLog {
  id              String   @id @default(cuid())
  stationId       Int
  type            String   // scheduled, unplanned, preventive
  reason          String?
  performedBy     String?
  startTime       DateTime
  endTime         DateTime?
  downtime        Int?     // minutes
  cost            Float?
  notes           String?
  
  impactedProjects String[] // project IDs affected
  
  Station         Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  
  @@index([stationId])
  @@index([startTime])
}
```

### API Endpoints
```
POST   /api/factories                           (create factory)
GET    /api/factories                           (list all factories)
POST   /api/factories/:id/floors                (add floor)
POST   /api/floors/:id/sections                 (add section)
POST   /api/sections/:id/rooms                  (add room)
POST   /api/rooms/:id/stations                  (add station)

GET    /api/station-types                       (list types)
POST   /api/station-types                       (create type)

PATCH  /api/stations/:id/status                 (mark operational/down/maintenance)
POST   /api/stations/:id/downtime               (log downtime, trigger re-plan)
POST   /api/stations/:id/maintenance            (log maintenance)
GET    /api/stations/:id/performance            (output, quality, uptime stats)
GET    /api/stations/:id/flow                   (linked stations, product flow)
POST   /api/stations/:id/suggest-assignment     (system suggests work with reasoning)
POST   /api/stations/:id/assignment/override    (log user override and track outcome)
```

### UI Screens
- **Factory/Station Hierarchy Manager**: tree view, drag-drop, bulk operations
- **Station Configuration**: type, capacity, maintenance schedule, linked stations
- **Station Status Dashboard**: real-time status, downtime alerts, maintenance due
- **Assignment Suggestion**: system shows multiple stations with reasoning, user selects, system tracks
- **Maintenance Scheduler**: calendar view, auto-suggest optimal times, log history

---

## 2.2B COMPLETE BATCH TRACKING & TRACEABILITY SYSTEM (UPDATED OCT 30, 2025)

### Overview
Complete end-to-end batch tracking from raw material production through assembly to final packaging. Supports sub-batching, rejection tracking, multi-SKU assembly, and lot grouping with full traceability.

### Batch Lifecycle Flow

#### Phase 1: Initial Batch Creation (Production Start)
**Example: Molding Station**

**Inputs:**
- Raw materials (e.g., ABS granules)
- Project, SKU, Sub-SKU (if multi-part assembly)
- Target quantity OR weight-based calculation

**Batch Code Generation:**
```
Format: PRJ-{projectCode}-SKU-{skuCode}-{YYYYMMDD}-{seq}
Example: PRJ-ALPHA-SKU-A-20251030-001

Components:
- Project code
- SKU identifier  
- Sub-SKU (if applicable)
- Date (YYYYMMDD)
- Sequence number (auto-incremented per day per project)
```

**Quantity Capture Methods:**
1. **Manual Count:** User enters accurate quantity
2. **Weight-Based Calculation:**
   ```
   User inputs:
   - Total weight (with container)
   - Container weight (system asks or stored default)
   - Individual part weight (from SKU master)
   
   System calculates:
   Quantity = (Total Weight - Container Weight) / Part Weight
   ```

**Batch Creation Output:**
- Batch record created in database
- Material lots linked (traceability to raw materials)
- Next station assigned
- **Printable Handover Sheet Generated:**
  - Project number and name
  - SKU name, sub-SKU
  - Batch ID with QR code
  - Quantity
  - Current station
  - Next destination station
  - Material lots used
  - Operator/shift info

---

#### Phase 2: Station-to-Station Movement

**Step 1: Incoming QC (IQC)**
```
Batch arrives at new station
Operator scans QR code or enters batch ID
System shows:
- Batch details
- Expected quantity
- Source station
- Material history

IQC performed:
✅ Approved → Proceeds to next process
❌ Rejected → Rejection flow activated
```

**Step 2: Sub-Batch Creation (Container/Tray Splitting)**
**Example: Spray Painting Station**

```
Original Batch: PRJ-ALPHA-SKU-A-20251030-001 (1000 units)

Split into trays/containers:
Sub-Batch 1: PRJ-ALPHA-SKU-A-20251030-001-T01 (250 units)
Sub-Batch 2: PRJ-ALPHA-SKU-A-20251030-001-T02 (250 units)  
Sub-Batch 3: PRJ-ALPHA-SKU-A-20251030-001-T03 (250 units)
Sub-Batch 4: PRJ-ALPHA-SKU-A-20251030-001-T04 (250 units)

Each sub-batch:
- Gets unique identifier (T01, T02, etc.)
- Links to parent batch
- Has own quantity (count OR weight-based)
- Gets printed label/sheet
- Placed in physical container
```

**Step 3: Batch Movement Recording**
```
For each movement:
- From station (auto-detected or selected)
- To station (user selects from flow)
- Quantity moved (can be partial)
- Operator ID (logged in user or scanned)
- Condition notes (good, damaged, rework, etc.)
- Photos (optional, for quality/damage evidence)
- Timestamp (automatic)

System creates BatchMovement record
Updates batch.currentStationId
If partial move: creates new sub-batch for remaining qty
```

---

#### Phase 3: Rejection & Rework Handling

**Rejection Flow:**
```
Scenario: 4 trays rejected from spray painting

System creates rejection identifiers:
REJ-PRJ-ALPHA-SKU-A-20251030-001-T01
REJ-PRJ-ALPHA-SKU-A-20251030-001-T02
REJ-PRJ-ALPHA-SKU-A-20251030-001-T03
REJ-PRJ-ALPHA-SKU-A-20251030-001-T04

Rejection record includes:
- Original batch linkage
- Rejection reason (QC fail, damage, contamination, etc.)
- Rejection station
- Rejection operator
- Photos of defects
- Disposition: rework, scrap, return to supplier

Rejection bin sheet printed:
- Shows all rejected items
- Rework station assignment
- Priority level
- Expected fix time
```

**Rework Tracking:**
```
Rejected batch enters rework:
- Original batch ID maintained with REJ prefix
- Rework station assigned
- Rework completion logged
- Re-inspection required
- If passed: REJ prefix removed, batch continues
- If failed again: escalation/scrap decision
```

---

#### Phase 4: Multi-SKU Assembly

**Assembly Combination:**
```
Example: Toy with 3 parts

Component Batches:
Part A: PRJ-ALPHA-SKU-A-20251030-001 (1000 units)
Part B: PRJ-ALPHA-SKU-B-20251030-001 (1000 units)
Part C: PRJ-ALPHA-SKU-C-20251030-001 (1000 units)

Assembly creates new batch:
Main SKU Batch: PRJ-ALPHA-MAIN-20251030-001 (1000 assembled units)

Linkage stored in database:
{
  mainBatch: "PRJ-ALPHA-MAIN-20251030-001",
  assembledFrom: [
    "PRJ-ALPHA-SKU-A-20251030-001",
    "PRJ-ALPHA-SKU-B-20251030-001", 
    "PRJ-ALPHA-SKU-C-20251030-001"
  ],
  assemblyStation: "ASSY-001",
  assemblyOperator: "OP-123",
  assemblyDate: "2025-10-30T14:00:00Z"
}

Traceability: 
- Can trace assembled product back to all component batches
- Can trace component batches back to raw material lots
- Full genealogy tree available
```

**Uneven Assembly Handling:**
```
Problem: Component SKUs at different production levels
SKU-A: 2000 units ✅
SKU-B: 2000 units ✅  
SKU-C: 500 units ❌ BOTTLENECK

System detects imbalance:
⚠️ ASSEMBLY BLOCKED
Can only assemble 500 units (limited by SKU-C)
1500 units of SKU-A and SKU-B waiting

Recommendation:
💡 PRIORITIZE SKU-C PRODUCTION
- Allocate more workstations to SKU-C
- Increase SKU-C shift priority
- Target: Balance all SKUs to enable full assembly
```

---

#### Phase 5: Lot Grouping for Packing/Shipping

**Lot Creation:**
```
Multiple batches packed together into shipping lot:

LOT-PRJ-ALPHA-20251030-L01
  ├── PRJ-ALPHA-MAIN-20251030-001 (500 units)
  ├── PRJ-ALPHA-MAIN-20251030-002 (500 units)
  └── PRJ-ALPHA-MAIN-20251030-003 (500 units)
  
Total: 1500 units in this lot

Lot details:
- Lot code (unique identifier)
- Contains batch IDs array
- Total quantity
- Packing date/time
- Packing station
- Packing operator(s)
- Carton details (boxes, pallets)
- Shipping destination
- Customer PO reference

Lot label printed:
- Lot barcode/QR code
- Project info
- Total quantity
- List of batch IDs
- Packing date
- Destination
```

**Carton/Box Requirement Tracking:**
```
Example: Toy set with 8 SKUs
Each carton requires: 125 units of EACH SKU (1000 units total)

Current inventory:
SKU 1-7: 2000 units each ✅
SKU 8: 375 units ❌

System calculation:
Cartons possible: 3 (limited by SKU 8: 375 ÷ 125 = 3)
Revenue blocked: 13 cartons worth

System alerts:
⚠️ PACKING BOTTLENECK
SKU 8 shortage preventing shipment of 1625 units

Recommendation:
💡 PRIORITY SHIFT ALLOCATION
Focus 60% capacity on SKU 8 to balance inventory
Expected time to balance: 2 shifts
```

---

### Complete Traceability Queries

**1. Forward Traceability (Batch → Products):**
```
Query: "Where did batch PRJ-ALPHA-SKU-A-20251030-001 go?"

Result:
- Sub-batched into T01, T02, T03, T04
- T01 rejected, reworked, passed
- All assembled into PRJ-ALPHA-MAIN-20251030-001
- Packed into LOT-PRJ-ALPHA-20251030-L01
- Shipped to Customer X on Nov 2, 2025
```

**2. Backward Traceability (Product → Materials):**
```
Query: "What materials are in this final product?"

Result:
Main SKU: PRJ-ALPHA-MAIN-20251030-001
  ├── Component A: PRJ-ALPHA-SKU-A-20251030-001
  │   └── Material Lots: ABS-LOT-2025-100, Masterbatch-LOT-2025-050
  ├── Component B: PRJ-ALPHA-SKU-B-20251030-001
  │   └── Material Lots: PP-LOT-2025-075
  └── Component C: PRJ-ALPHA-SKU-C-20251030-001
      └── Material Lots: ABS-LOT-2025-101

Full material genealogy traced to supplier and receipt date
```

**3. Material Lot Recall:**
```
Query: "Defective material lot ABS-LOT-2025-100 - what products affected?"

Result:
Material Lot: ABS-LOT-2025-100
Used in batches:
- PRJ-ALPHA-SKU-A-20251030-001 (1000 units)
- PRJ-BETA-SKU-X-20251030-005 (500 units)
- PRJ-GAMMA-SKU-Y-20251031-002 (800 units)

Assembled into:
- 1000 units of Product Alpha
- 500 units of Product Beta  
- 800 units of Product Gamma

Shipped in lots:
- LOT-ALPHA-001 → Customer A
- LOT-BETA-003 → Customer B
- LOT-GAMMA-002 → Customer C

⚠️ RECALL REQUIRED: 2300 units across 3 customers
```

**4. Operator Quality Tracking:**
```
Query: "Show all batches handled by Operator OP-123"

Result:
Operator OP-123 involved in:
- 45 batches in October 2025
- Stations worked: Molding, Degating, Assembly
- Quality metrics:
  - 42 batches passed QC (93.3%)
  - 3 batches had rework (6.7%)
  - Average efficiency: 98%
  
Skill assessment: High performer in molding, needs training in assembly
```

---

### Database Schema Updates

```prisma
model Batch {
  id                  String          @id @default(cuid())
  batchCode           String          @unique
  projectId           Int
  poNumber            String?
  projectSkuId        Int
  subSkuIdentifier    String?         // "A", "B", "C" for multi-part
  
  // Quantity tracking
  targetQty           Int
  currentQty          Int
  rejectedQty         Int             @default(0)
  
  // Weight-based calculation
  totalWeight         Float?
  containerWeight     Float?
  calculatedQty       Int?
  quantityMethod      String          @default("count") // "count" or "weight"
  
  // Hierarchy
  parentBatchId       String?         // For sub-batches
  subBatchIdentifier  String?         // "T01", "T02" etc.
  lotId               String?         // When packed into lot
  
  // Status & Location  
  currentStationId    Int?
  status              String          @default("in_progress") // in_progress, completed, rejected, rework
  
  // Rejection tracking
  isRejection         Boolean         @default(false)
  rejectionReason     String?
  rejectionStationId  Int?
  reworkRequired      Boolean         @default(false)
  reworkCompleted     Boolean         @default(false)
  
  // Assembly linkage
  assembledFrom       String[]        // Array of source batch IDs
  assembledInto       String?         // Parent assembled batch ID
  assemblyStation     String?
  assemblyOperator    String?
  assemblyDate        DateTime?
  
  // Traceability
  materialLots        Json            // [{lotNumber, materialId, qty}]
  machineId           String?
  
  // Metadata
  createdBy           String
  createdAt           DateTime        @default(now())
  completedAt         DateTime?
  
  // Relations
  Project             Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  ProjectSku          ProjectSku      @relation(fields: [projectSkuId], references: [id])
  Station             Station?        @relation(fields: [currentStationId], references: [id])
  ParentBatch         Batch?          @relation("SubBatches", fields: [parentBatchId], references: [id])
  SubBatches          Batch[]         @relation("SubBatches")
  Lot                 Lot?            @relation(fields: [lotId], references: [id])
  
  BatchMovement       BatchMovement[]
  QCSubmission        QCSubmission[]
  WIPLedger           WIPLedger[]
  
  @@index([batchCode])
  @@index([projectId])
  @@index([currentStationId])
  @@index([status])
  @@index([parentBatchId])
  @@index([lotId])
  @@index([isRejection])
}

model BatchMovement {
  id                  String          @id @default(cuid())
  batchId             String
  fromStationId       Int?
  toStationId         Int
  qty                 Int
  operatorId          String?
  condition           String?         // "good", "damaged", "rework", etc.
  photos              String[]
  notes               String?
  timestamp           DateTime        @default(now())
  
  Batch               Batch           @relation(fields: [batchId], references: [id], onDelete: Cascade)
  FromStation         Station?        @relation("MovementFrom", fields: [fromStationId], references: [id])
  ToStation           Station         @relation("MovementTo", fields: [toStationId], references: [id])
  
  @@index([batchId])
  @@index([timestamp])
  @@index([toStationId])
}

model Lot {
  id                  String          @id @default(cuid())
  lotCode             String          @unique
  projectId           Int
  poNumber            String?
  
  totalQty            Int
  cartonCount         Int?
  palletCount         Int?
  
  packingStation      String?
  packingOperators    String[]        // Array of operator IDs
  packingDate         DateTime
  
  shippingDestination String?
  customerPO          String?
  shippingDate        DateTime?
  
  status              String          @default("packed") // packed, shipped, delivered
  
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  
  Project             Project         @relation(fields: [projectId], references: [id])
  Batches             Batch[]
  
  @@index([lotCode])
  @@index([projectId])
  @@index([status])
}
```

---

### API Endpoints

```javascript
// Batch Creation
POST   /api/batches
  - Input: projectId, skuId, targetQty OR weights, materialLots
  - Auto-generate batch code
  - Return: batch record + printable sheet URL

// Batch Retrieval
GET    /api/batches
  - Query params: projectId, status, stationId, date range
  - Return: filtered batch list

GET    /api/batches/:id
  - Include: movements, QC records, sub-batches, assembly linkage
  - Return: complete batch history

// Batch Movement
POST   /api/batches/:id/move
  - Input: toStationId, qty, operatorId, condition, photos
  - Create BatchMovement record
  - Update currentStationId
  - Handle partial moves (create sub-batch if needed)

// Sub-Batch Creation
POST   /api/batches/:id/split
  - Input: containers array [{identifier, qty}]
  - Create sub-batches
  - Link to parent
  - Generate labels for each sub-batch

// Rejection Handling  
POST   /api/batches/:id/reject
  - Input: reason, stationId, photos, disposition
  - Update status, add REJ prefix
  - Create rejection record
  - Route to rework or scrap

POST   /api/batches/:id/rework-complete
  - Mark rework done
  - Schedule re-inspection
  - Remove REJ prefix if passed

// Assembly
POST   /api/batches/assemble
  - Input: sourceBatchIds[], targetSkuId, qty, stationId
  - Validate component availability
  - Create assembled batch
  - Link source batches
  - Update component batch status

// Lot Management
POST   /api/lots
  - Input: batchIds[], cartonCount, destination
  - Create lot record
  - Link batches to lot
  - Generate lot label

GET    /api/lots/:id
  - Include: all batches, total qty, status
  
// Traceability Queries
GET    /api/batches/:batchCode/trace/forward
  - Show where batch went (sub-batches, assembly, lot, shipment)

GET    /api/batches/:batchCode/trace/backward  
  - Show material lots, source batches, full genealogy

GET    /api/materials/:lotNumber/batches
  - Find all batches using this material lot (recall query)

GET    /api/workers/:operatorId/batches
  - Find all batches handled by operator (quality tracking)

// Printable Documents
GET    /api/batches/:id/handover-sheet
  - Generate printable PDF/HTML handover sheet
  
GET    /api/batches/:id/label
  - Generate QR code label for batch

GET    /api/lots/:id/packing-list
  - Generate packing list for lot
```

---

## 2.2C WORKSTATION & ASSET MANAGEMENT SYSTEM (UPDATED OCT 30, 2025)

### Core Concept: Everything is a Workstation

**Definition:** A workstation is ANY location where work is performed, whether machine-based or manual.

**Workstation Types:**
1. **Machine-based Workstations:**
   - Molding machines
   - Spray booths
   - Pad printing machines
   - CNC machines
   - Any powered equipment

2. **Manual Workstations:**
   - Assembly tables
   - Inspection tables
   - Packing stations
   - Hand tool stations
   - Quality check stations

### Multi-Asset Workstation Model

**Concept:** Some workstations require multiple assets to operate.

**Example: Spray Painting Workstation**
```
Workstation: SPRAY-001
Primary Asset: Spray booth (fixed)
Secondary Assets:
  - Spray gun (default equipment)
  - Mask Set 1 (specific design, 2 units)
  - Mask Set 2 (different design, 1 unit)
  - Mask Set 3 (if needed, 1 unit)
  
Process Stages:
  Stage 1: Base coat with Mask 1 (cycle time: 60 seconds)
  Stage 2: Color coat with Mask 2 (cycle time: 30 seconds)
  Stage 3: Clear coat with Mask 3 (cycle time: 45 seconds)
```

**Asset Mobility:**
- **Fixed Assets:** Cannot be moved (large machines, spray booths)
- **Movable Assets:** Can be relocated between workstations (spray guns, masks, tools, fixtures)
- **Project-Dependent:** Asset allocation varies by project requirements

---

### Capacity Calculation Based on Cycle Times

**Workstation Ratio Formula:**
```
Stage 1 cycle time: 60 seconds → Need 2 workstations
Stage 2 cycle time: 30 seconds → Need 1 workstation
Optimal Ratio: 2:1

Logic:
- While 1 unit is in Stage 2 (30 sec), 2 units should be in Stage 1 (60 sec each)
- Maintains continuous flow without bottlenecks
- Ensures Stage 2 worker always has material to work on
```

**System Calculates:**
```
Input:
- Target output: 1000 units per shift
- Shift duration: 8 hours = 28,800 seconds
- Stage cycle times: [60s, 30s, 45s]

System determines:
- Units per hour per station: 3600 / cycle time
- Stations needed per stage: (target / units per hour) / shift hours
- Asset requirements: stations × assets per station
- Workforce: stations × workers per station
```

---

### Cross-SKU Production Balance Monitoring

**Problem:** Multi-SKU projects with uneven production

**Example Scenario:**
```
Product: Toy set with 8 different SKUs
Packing requirement: 125 units of EACH SKU per carton (1000 units total)

Current Production Status:
SKU 1: 2000 units (16 cartons worth) ✅
SKU 2: 2000 units (16 cartons worth) ✅
SKU 3: 2000 units (16 cartons worth) ✅
SKU 4: 2000 units (16 cartons worth) ✅
SKU 5: 2000 units (16 cartons worth) ✅
SKU 6: 2000 units (16 cartons worth) ✅
SKU 7: 2000 units (16 cartons worth) ✅
SKU 8: 375 units (3 cartons worth) ❌ BOTTLENECK

Shipping Capacity: Limited to 3 cartons (by SKU 8)
Blocked Revenue: 13 cartons × $X = $Y blocked
Excess Inventory: 1625 units of SKUs 1-7 sitting idle
```

**System Intelligence Response:**

**1. Detection:**
```
⚠️ PRODUCTION IMBALANCE ALERT

Project: Toy Set Alpha
Issue: SKU 8 lagging significantly behind other SKUs

Current Status:
- SKU 1-7: 100% complete (2000 units each)
- SKU 8: 18.75% complete (375 units)
- Imbalance ratio: 5.3:1

Impact:
- Can only ship 3 of 16 possible cartons
- $XX,XXX revenue blocked
- 1625 units per SKU in WIP (inventory holding cost)
- Estimated delay: 4-5 shifts at current rate
```

**2. Root Cause Analysis:**
```
📊 ANALYSIS

SKU 8 Bottleneck Factors:
- Complex geometry (longer cycle time: 90s vs 60s average)
- Requires specialized mask (only 2 available vs 4 for others)
- QC rejection rate: 12% (vs 5% average)
- Assigned to 2 workstations (vs 3-4 for other SKUs)

Contributing Issues:
- Mask availability limiting parallelization
- Worker skill gap (newer operators on SKU 8)
- Machine M-03 running slower than optimal
```

**3. Recommendation Engine:**
```
💡 RECOMMENDED ACTIONS (Priority Ordered)

IMMEDIATE (Next Shift):
1. WORKSTATION REALLOCATION
   - Reassign 2 stations from SKU 1-7 to SKU 8
   - New allocation: 4 stations on SKU 8, 2 on others
   - Expected output boost: +60% for SKU 8

2. ASSET OPTIMIZATION
   - Procure 2 additional masks for SKU 8 (1-day lead time)
   - Temporarily borrow masks from Project Beta (if compatible)
   
3. WORKER ASSIGNMENT
   - Assign top performer (Worker ID: W-042) to SKU 8
   - Pair inexperienced worker with mentor for training

SHORT-TERM (2-3 Shifts):
4. QUALITY IMPROVEMENT
   - Review QC failures for SKU 8
   - Adjust process parameters on Machine M-03
   - Additional training for operators

5. SCHEDULE EXTENSION
   - If needed: Add overtime shift focused solely on SKU 8
   - Cost: $X, Benefit: Unblock $Y revenue

PREVENTIVE (Future Projects):
6. PRODUCTION PLANNING
   - Allocate more resources upfront to complex SKUs
   - Factor in cycle time differences during initial planning
   - Buffer stock strategy for components with high reject rates
```

**4. Impact Simulation:**
```
🎮 SIMULATION RESULTS

If Recommendation Implemented:

Scenario A: Workstation reallocation only
- SKU 8 completion: 3.5 shifts
- Total project delay: Reduced from 5 to 3.5 shifts
- Cost: $0 (resource reallocation)

Scenario B: Reallocation + Additional masks
- SKU 8 completion: 2 shifts  
- Total project delay: Reduced from 5 to 2 shifts
- Cost: $500 (mask purchase)
- ROI: $XX,XXX revenue unlocked vs $500 cost

Scenario C: Reallocation + Masks + Overtime
- SKU 8 completion: 1.5 shifts
- Total project delay: Reduced from 5 to 1.5 shifts
- Cost: $500 (masks) + $800 (overtime) = $1,300
- ROI: $XX,XXX revenue + early delivery bonus

RECOMMENDED: Scenario B (best ROI)
```

**5. Proactive Monitoring:**
```
✅ CONTINUOUS MONITORING ENABLED

System will track:
- SKU production velocity (units/hour per SKU)
- Imbalance ratio (max SKU qty / min SKU qty)
- Carton shipping readiness
- Revenue at risk

Alerts trigger when:
- Imbalance ratio > 1.5:1
- Any SKU falls below 70% of target while others > 90%
- Shipping capacity < 50% of potential
- Estimated delay > 2 shifts

Rebalancing suggestions auto-generated every 4 hours
```

---

### Workstation Assignment Optimization

**Complex Flow Support:**
```
System must support ANY workflow complexity:

Linear Flow:
Molding → Degating → Painting → Assembly → Packing

Branching Flow:
Molding → Degating → {Path A: Spray Paint, Path B: Pad Print} → Assembly

Merging Flow:
{Part A: Molding → Paint, Part B: Separate Molding → Print} → Assembly → Pack

Parallel Processing:
Batch split → [Station 1, Station 2, Station 3 in parallel] → Merge → Continue

Rework Loops:
QC → If fail → Rework → QC → Continue
```

**Optimization Algorithm Inputs:**
```
1. Available Resources:
   - Workstations (by type, capacity, location)
   - Workers (by skill, shift preference, performance)
   - Assets (masks, tools, fixtures - by availability)
   - Materials (inventory levels, reservation status)

2. Project Requirements:
   - Target output quantity per SKU
   - Cycle times per process stage
   - Quality requirements
   - Delivery deadline
   - Priority level

3. Constraints:
   - Workstation capacity limits
   - Worker shift schedules
   - Asset availability windows
   - Material lead times
   - Dependency chains

4. Historical Data:
   - Similar project outcomes
   - Worker performance patterns
   - Machine reliability stats
   - Typical bottleneck points
```

**Optimization Algorithm Outputs:**
```
1. Workstation Assignments:
   - Which projects/SKUs at which stations
   - How many stations per process stage
   - Optimal ratios based on cycle times

2. Worker Allocation:
   - Who works at which station
   - Shift assignments
   - Skill-based matching
   - Training opportunities

3. Asset Distribution:
   - Which assets at which stations
   - Movement schedule for mobile assets
   - Sharing across projects if needed

4. Production Schedule:
   - Start times per batch
   - Expected completion times
   - Buffer periods
   - Maintenance windows

5. Risk Assessment:
   - Potential bottlenecks
   - Resource conflicts
   - Timing risks
   - Mitigation strategies
```

---

### Database Schema Updates

```prisma
model Workstation { // Replaces/enhances Station model
  id                  Int             @id @default(autoincrement())
  code                String          @unique
  name                String
  
  // Location Hierarchy
  roomId              Int
  factoryId           Int? // Denormalized for quick filtering
  floorId             Int? // Denormalized
  
  // Type & Classification
  workstationType     String // "machine", "manual", "inspection", "assembly", "packing"
  subType             String? // "molding_machine", "spray_booth", "assembly_table"
  
  // Capacity Specifications
  cycleTime           Int? // Seconds per unit/cycle
  capacity            Int? // Units per hour/shift
  simultaneousOps     Int @default(1) // Parallel operations possible
  
  // Asset Requirements
  primaryAssetType    String? // Main equipment type
  requiredAssets      Json // [{assetType, quantity, mandatory: boolean}]
  
  // Mobility & Flexibility
  isMovable           Boolean @default(false)
  canRelocate         Boolean @default(false) // Can this station be reconfigured
  
  // Performance Tracking
  avgOutputRate       Float?
  avgQualityRate      Float?
  avgCycleTime        Float? // Actual vs specification
  totalJobsCompleted  Int @default(0)
  
  // Current Status
  status              String @default("operational") // operational, maintenance, down, setup
  currentProjectId    Int?
  currentBatchId      String?
  
  // Maintenance
  lastMaintenance     DateTime?
  nextMaintenance     DateTime?
  maintenanceInterval Int? // Hours between maintenance
  
  // Relations
  Room                Room @relation(fields: [roomId], references: [id])
  CurrentProject      Project? @relation("CurrentProject", fields: [currentProjectId], references: [id])
  
  WorkstationAssets   WorkstationAsset[]
  Batches             Batch[]
  BatchMovements      BatchMovement[]
  ProcessConfigs      ProcessConfig[]
  ProductionEntries   ProductionEntry[]
  MaintenanceLogs     MaintenanceLog[]
  QCSubmissions       QCSubmission[]
  
  @@index([code])
  @@index([roomId])
  @@index([workstationType])
  @@index([status])
  @@index([currentProjectId])
}

model Asset {
  id                  String          @id @default(cuid())
  assetCode           String          @unique
  assetType           String // "spray_gun", "mask", "fixture", "tool", "machine"
  name                String
  description         String?
  
  // Specifications
  specifications      Json // {capacity, dimensions, material, etc}
  
  // Mobility
  isMovable           Boolean @default(true)
  currentWorkstationId Int?
  currentLocation     String? // If not at workstation
  
  // Status
  status              String @default("available") // available, in_use, maintenance, broken
  condition           String @default("good") // good, fair, needs_repair
  
  // Maintenance
  lastMaintenance     DateTime?
  nextMaintenance     DateTime?
  maintenanceHistory  Json[]
  
  // Tracking
  acquisitionDate     DateTime?
  cost                Float?
  depreciation        Float?
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  WorkstationAssets   WorkstationAsset[]
  
  @@index([assetCode])
  @@index([assetType])
  @@index([status])
  @@index([currentWorkstationId])
}

model WorkstationAsset {
  id                  String          @id @default(cuid())
  workstationId       Int
  assetId             String
  
  assignedAt          DateTime @default(now())
  removedAt           DateTime?
  
  isPrimary           Boolean @default(false) // Is this the main asset for the workstation?
  isRequired          Boolean @default(true) // Must have this to operate?
  
  notes               String?
  
  Workstation         Workstation @relation(fields: [workstationId], references: [id], onDelete: Cascade)
  Asset               Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  @@unique([workstationId, assetId, removedAt]) // Can reassign same asset later
  @@index([workstationId])
  @@index([assetId])
}

model ProcessConfig {
  id                  String          @id @default(cuid())
  projectId           Int
  projectSkuId        Int?
  workstationId       Int
  
  // Process Parameters
  processName         String // "molding", "spray_painting_stage_1", etc
  cycleTime           Int // Seconds
  setupTime           Int? // Minutes
  
  // Asset Configuration
  requiredAssets      Json // [{assetId, assetType, role}]
  
  // Output Specifications
  unitsPerCycle       Int @default(1)
  expectedQuality     Float? // Expected pass rate %
  
  // Material Usage
  materialConsumption Json? // [{materialId, qtyPerUnit, lossPercent}]
  
  // Worker Requirements
  workersRequired     Int @default(1)
  skillsRequired      String[]
  
  // Validation
  isActive            Boolean @default(true)
  validatedBy         String?
  validatedAt         DateTime?
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  Project             Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  ProjectSku          ProjectSku? @relation(fields: [projectSkuId], references: [id])
  Workstation         Workstation @relation(fields: [workstationId], references: [id])
  
  @@index([projectId])
  @@index([workstationId])
  @@index([processName])
}
```

---

### API Endpoints

```javascript
// Workstation Management
GET    /api/workstations
  - Query: roomId, type, status, availability
  - Return: filtered workstation list with current assignments

GET    /api/workstations/:id
  - Include: assets, current batch, performance metrics
  
POST   /api/workstations
  - Create new workstation
  - Input: name, type, room, capacity, assets required

PUT    /api/workstations/:id
  - Update specifications, status, location

// Asset Management
GET    /api/assets
  - Query: type, status, workstationId, location
  - Return: asset list with availability

GET    /api/assets/:id
  - Include: current assignment, maintenance history

POST   /api/assets
  - Create new asset
  - Input: type, specs, initial location

// Asset Assignment
POST   /api/workstations/:id/assets/:assetId/assign
  - Assign asset to workstation
  - Validate compatibility
  - Update asset location

POST   /api/workstations/:id/assets/:assetId/remove
  - Remove asset from workstation
  - Update availability

// Capacity Optimization
POST   /api/optimization/calculate
  - Input: projectId, targetQty, deadline, constraints
  - Run optimization algorithm
  - Return: recommended workstation assignments, ratios, schedules

GET    /api/optimization/scenarios
  - Generate multiple scenarios (fastest, cheapest, balanced)
  - Return: comparison with pros/cons

// Production Balance Monitoring
GET    /api/projects/:id/balance
  - Check cross-SKU production balance
  - Calculate carton readiness
  - Identify bottlenecks

POST   /api/projects/:id/rebalance
  - Generate rebalancing recommendations
  - Simulate impact
  - Return: action plan

// Process Configuration
POST   /api/process-configs
  - Define process for project/SKU at workstation
  - Input: cycle time, assets, materials, workers

GET    /api/process-configs
  - Query: projectId, workstationId, processName
  - Return: configurations with details
```

---

## 2.3 QC CHECKLISTS (Generic, Station-Aware, Multi-Criteria)

### Overview
QC templates are fully customizable per project, station, and SKU. Pantone is just one possible check among many. Templates support multiple item types, severity mapping, photo requirements, and alert triggers.

### Features

**Template Customization:**
- Per project, per station, per SKU, or default templates
- Each template defines:
  - What is checked (dimensions, color, surface defects, adhesion, alignment, etc.)
  - At which stage/station
  - What is acceptable (min/max, tolerance, pass/fail, pick-one options)
  - Who approves
  - Photo requirements
  - Alert severity if failed

**Item Types Supported:**
- **Boolean**: pass/fail checkbox
- **Number**: measured value with min/max/tolerance (e.g., dimension 50mm ± 0.5mm)
- **Text**: free text note (e.g., operator comments)
- **Enum**: pick one from options (e.g., "Match" / "Mismatch" for color)
- **Photo**: photo evidence required
- **Color**: color code or swatch (Pantone, RGB, etc.)

**Severity & Alerts:**
- Each item has severity: INFO, MINOR, MAJOR, CRITICAL
- Failed items create alerts with severity-based levels:
  - CRITICAL → RED alert
  - MAJOR/MINOR → AMBER alert
  - INFO → logged only
- Alert routing via existing AlertRule system (recipients, escalation)

**Document Attachment:**
- QC sheets attached to station assignments
- Print options: by station or batch
- QR codes for digital submission (optional)

**Submission & Results:**
- Operators submit checklists with photos
- System validates per-item (constraints, required fields)
- Computes pass/fail by item and overall
- Stores results, photos, and links to batch/station

### Database Schema
(Already implemented - see earlier schema with QCChecklistTemplate, QCItemTemplate, QCSubmission, QCItemResult)

### API Endpoints
```
GET    /api/qc/templates?projectId&stationId    (list templates)
POST   /api/qc/templates                        (create template with items)
PUT    /api/qc/templates/:id                    (update template)
POST   /api/qc/templates/:id/items              (add item to template)
PATCH  /api/qc/items/:id                        (update item)
DELETE /api/qc/items/:id                        (delete item)

POST   /api/qc/presign                          (presign photo upload)
POST   /api/qc/submissions                      (submit checklist)
GET    /api/qc/submissions?projectId&stationId  (list submissions)
GET    /api/qc/submissions/:id                  (view submission details)
```

### UI Screens
- **Template Manager**: create/edit templates, add/remove items, set rules and severity
- **Station QC Screen** (mobile-friendly): pick station → load template → fill form → attach photos → submit
- **Submissions History**: filter by project/station/date, view pass/fail, drill into failures
- **QC Dashboard**: failure trends, alert summary, station performance

---

## 2.4 PRODUCTION OUTPUT & MATERIAL CONSUMPTION TRACKING

### Overview
Track process parameters, calculate output, forecast completion time, manage machine allocation, and monitor material consumption in real time. Foundation for cost analysis in Phase 3/4.

### Features

**Process Parameters (Per Station/Process Type):**

**Molding:**
- Cycle time (seconds)
- Cavities (parts per cycle)
- Item weight (grams)
- Runner weight (grams)
- Setup time (minutes)
- Scrap rate (%)
- Machine capacity

**Spray Painting / Pad Printing:**
- Cycle time per step (base coat, masking, top coat, drying)
- Paint consumption per unit (ml)
- Thinner usage per unit (ml)
- Number of masking steps
- Setup time

**Assembly:**
- Assembly time per unit (seconds)
- Parts per unit
- Scrap rate

**Output Calculations (System-Calculated):**
- Output per hour = `(3600 / cycleTimeSec) × cavities × (1 - scrapRate)`
- Output per shift = `outputPerHour × shiftHours`
- Total time required = `targetQty / outputPerHour`
- Machines required = `ceil(totalTimeRequired / availableShiftHours)`

**Material Consumption Forecasting:**
- Molding: `(itemWeight + runnerWeight) × targetQty / 1000` (kg resin)
- Painting: `paintPerUnitMl × targetQty / 1000` (liters)
- Thinner: `thinnerPerUnitMl × targetQty / 1000` (liters)

**Real-Time Production Tracking:**
- Log actual output per shift (target vs. actual qty, rejected qty)
- Log actual material consumption per shift
- Calculate variances (output variance, material variance)
- Alert on significant variances (>5%, >10%)

**Capacity Planning:**
- Input: target qty, target date
- System suggests:
  - How many machines needed
  - How many shifts required
  - Material order quantity
  - Buffer recommendations

**Integration with Cost Analysis (Phase 3/4):**
- Standard costing uses planned consumption from ProcessConfig
- Actual costing uses actual consumption from ProductionEntry
- Variance analysis = actual - planned (material, labor, overhead)

### Database Schema
```prisma
model ProcessConfig {
  id              String   @id @default(cuid())
  stationId       Int
  stationType     String   // molding, spray_painting, pad_printing, assembly
  projectId       Int?
  projectSkuId    Int?
  
  // Molding
  cycleTimeSec    Int?
  cavities        Int?
  itemWeightGrams Float?
  runnerWeightGrams Float?
  setupTimeMins   Int?
  
  // Painting/Printing
  paintPerUnitMl  Float?
  thinnerPerUnitMl Float?
  dryingTimeSec   Int?
  maskingSteps    Int?
  
  // Assembly
  partsPerUnit    Int?
  assemblyTimeSec Int?
  
  // General
  scrapRate       Float?   @default(0.02)
  machineCapacity Int?     @default(1)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Station         Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  Project         Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  Sku             ProjectSku? @relation(fields: [projectSkuId], references: [id], onDelete: SetNull)
  calculations    ProductionCalculation[]
  
  @@index([stationId])
  @@index([projectId])
}

model ProductionCalculation {
  id                  String   @id @default(cuid())
  projectId           Int
  stationId           Int
  processConfigId     String
  
  targetQty           Int
  outputPerHour       Float
  outputPerShift      Float
  outputPerDay        Float
  
  totalTimeRequired   Float    // hours
  machinesRequired    Int
  shiftsRequired      Int
  
  materialConsumption Json     // { material: qty }
  
  calculatedAt        DateTime @default(now())
  
  Project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  Station             Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  ProcessConfig       ProcessConfig @relation(fields: [processConfigId], references: [id])
  
  @@index([projectId])
  @@index([stationId])
}

model ProductionEntry {
  id                  String   @id @default(cuid())
  projectId           Int
  stationId           Int
  shiftId             String
  batchCode           String?
  
  startTime           DateTime
  endTime             DateTime?
  
  targetQty           Int
  actualQty           Int
  rejectedQty         Int      @default(0)
  
  materialUsed        Json     // { material: actualQty }
  materialVariance    Json?    // { material: variance }
  outputVariance      Float    // actualQty - targetQty
  
  operatorId          String?
  notes               String?
  
  createdAt           DateTime @default(now())
  
  Project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  Station             Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  Shift               Shift    @relation(fields: [shiftId], references: [id])
  consumptions        MaterialConsumption[]
  
  @@index([projectId])
  @@index([stationId])
  @@index([shiftId])
}

model Material {
  id              String   @id @default(cuid())
  name            String
  type            String   // resin, paint, thinner, masterbatch
  unit            String   // kg, liters, grams, ml
  costPerUnit     Float?
  stockQty        Float    @default(0)
  minStock        Float?
  supplier        String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  consumptions    MaterialConsumption[]
  
  @@index([type])
}

model MaterialConsumption {
  id                  String   @id @default(cuid())
  materialId          String
  projectId           Int
  stationId           Int
  productionEntryId   String?
  
  plannedQty          Float
  actualQty           Float
  variance            Float    // actualQty - plannedQty
  
  consumedAt          DateTime @default(now())
  
  Material            Material @relation(fields: [materialId], references: [id])
  Project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  ProductionEntry     ProductionEntry? @relation(fields: [productionEntryId], references: [id])
  
  @@index([materialId])
  @@index([projectId])
  @@index([stationId])
}
```

### API Endpoints
```
POST   /api/stations/:id/process-config         (define parameters)
GET    /api/stations/:id/process-config         (get config)
PUT    /api/process-config/:id                  (update parameters)

POST   /api/production/calculate                (calculate output, time, materials)
GET    /api/production/capacity?stationId&date  (available capacity)

POST   /api/production/entry                    (log shift output & consumption)
GET    /api/production/entries?projectId        (view actual vs planned)
GET    /api/production/variance?projectId       (variance report)

POST   /api/materials/consume                   (log consumption, update stock)
GET    /api/materials/consumption?projectId     (consumption history)
GET    /api/materials/forecast?projectId        (forecast material needs)
```

### UI Screens
- **Process Configuration**: form to input cycle time, consumption rates, system calculates output/time/materials
- **Production Entry** (shift-level): log actual output, rejected qty, material used; system shows variance
- **Production Dashboard**: real-time output tracking, cumulative progress, variance alerts, projected completion
- **Capacity Planning**: input target qty/date, system suggests machines/shifts/materials/buffers

---

## 2.5 WORKFORCE MANAGEMENT & PERFORMANCE TRACKING

### Overview
Manage both company workers and 3rd party providers, track performance metrics, match skills to tasks, monitor stability of external providers, and enable system-suggested assignments based on historical performance. Supports daily planning with worker availability and capability awareness.

### Features

**Worker Management:**
- Company workers: name, skills, shift preference, hire date, status
- 3rd party workers: provider link, contract period, rate, location
- Skills/certifications: molding, painting, assembly, QC inspector, machine operator levels
- Availability: off days, leave, training, reassignment
- Active/inactive status

**3rd Party Provider Tracking:**
- Provider: name, contact, location, contract terms, rate structure
- Stability metrics:
  - Worker turnover rate (how often workers change)
  - Attendance rate (on-time vs. absences)
  - Performance score (average of worker performance)
  - Consistency rating (variance in output quality/speed)
- Contract renewal recommendations based on stability score

**Performance Tracking:**
- Per-shift metrics:
  - Output vs. target (efficiency %)
  - Rejection rate (quality %)
  - Task completion time vs. standard
  - QC pass/fail count
- Rolling averages (7-day, 30-day)
- Ranking within skill group

**Shift Planning:**
- Define shifts: name, start/end time, break duration
- Assign workers to stations per shift
- Plan stores availability (which shifts each worker works)
- Handover mechanism: outgoing shift logs issues/progress → incoming shift reviews

**Adaptive Learning for Assignment:**
- System tracks: worker + station + project → output, quality, time taken
- When creating daily plan, system suggests workers based on:
  - Skill match (required skills for station/task)
  - Recent performance (prefer high performers)
  - Availability (not on leave, not overloaded)
  - Stability (prefer workers from stable providers if external)
- Planner can override with reason (training, cross-skilling, cost)

**Performance Dashboard:**
- Worker leaderboard (by efficiency, quality, consistency)
- Provider comparison (stability, cost, performance)
- Alerts: repeated underperformance, high rejection rates, attendance issues

### Database Schema
```prisma
model Worker {
  id              String   @id @default(cuid())
  name            String
  workerType      String   // company, third_party
  providerId      String?
  
  skills          String[] // molding, painting, assembly, qc_inspector
  certifications  Json?    // { skill: level }
  shiftPreference String?  // day, night, any
  
  hireDate        DateTime?
  contractEnd     DateTime?
  hourlyRate      Float?
  
  status          String   @default("active") // active, on_leave, inactive
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Provider        ThirdPartyProvider? @relation(fields: [providerId], references: [id], onDelete: SetNull)
  shiftPlans      ShiftPlan[]
  performance     WorkerPerformance[]
  
  @@index([workerType])
  @@index([providerId])
  @@index([status])
}

model ThirdPartyProvider {
  id              String   @id @default(cuid())
  name            String
  contactPerson   String?
  phone           String?
  email           String?
  location        String?
  
  contractStart   DateTime?
  contractEnd     DateTime?
  rateStructure   String?  // hourly, daily, monthly
  
  turnoverRate    Float?   @default(0)
  attendanceRate  Float?   @default(100)
  performanceScore Float?  @default(0)
  consistencyRating Float? @default(0)
  stabilityScore  Float?   @default(0) // calculated from above
  
  active          Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  workers         Worker[]
  
  @@index([stabilityScore])
}

model Shift {
  id              String   @id @default(cuid())
  name            String
  startTime       String   // HH:mm
  endTime         String   // HH:mm
  breakDuration   Int      // minutes
  
  active          Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  plans           ShiftPlan[]
  ProductionEntry ProductionEntry[]
}

model ShiftPlan {
  id              String   @id @default(cuid())
  dailyPlanId     String
  shiftId         String
  workerId        String
  stationId       Int
  
  date            DateTime
  assignedBy      String?
  assignmentReason String? // auto_suggested, override_training, etc.
  
  createdAt       DateTime @default(now())
  
  DailyPlan       DailyPlan @relation(fields: [dailyPlanId], references: [id], onDelete: Cascade)
  Shift           Shift     @relation(fields: [shiftId], references: [id])
  Worker          Worker    @relation(fields: [workerId], references: [id])
  Station         Station   @relation(fields: [stationId], references: [id])
  handovers       ShiftHandover[]
  
  @@index([dailyPlanId])
  @@index([workerId])
  @@index([stationId])
  @@index([date])
}

model ShiftHandover {
  id              String   @id @default(cuid())
  shiftPlanId     String
  projectId       Int
  
  outgoingWorker  String
  incomingWorker  String
  
  completedQty    Int
  remainingQty    Int
  issuesNoted     String?
  photos          String[] // S3 keys
  
  handoverTime    DateTime @default(now())
  
  ShiftPlan       ShiftPlan @relation(fields: [shiftPlanId], references: [id], onDelete: Cascade)
  Project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([shiftPlanId])
  @@index([projectId])
}

model WorkerPerformance {
  id              String   @id @default(cuid())
  workerId        String
  projectId       Int
  stationId       Int
  
  date            DateTime
  shiftId         String
  
  targetQty       Int
  actualQty       Int
  rejectedQty     Int
  
  efficiency      Float    // actualQty / targetQty * 100
  qualityRate     Float    // (actualQty - rejectedQty) / actualQty * 100
  
  completionTime  Int?     // minutes
  
  createdAt       DateTime @default(now())
  
  Worker          Worker   @relation(fields: [workerId], references: [id], onDelete: Cascade)
  Project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  Station         Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  
  @@index([workerId])
  @@index([projectId])
  @@index([date])
}
```

### API Endpoints
```
POST   /api/workers                             (add worker)
GET    /api/workers?type&providerId&skill       (list with filters)
PUT    /api/workers/:id                         (update worker)
DELETE /api/workers/:id                         (deactivate)

POST   /api/providers                           (add provider)
GET    /api/providers?sortBy=stabilityScore     (list providers)
PUT    /api/providers/:id/metrics               (recalculate stability)

POST   /api/shifts                              (define shift)
GET    /api/shifts                              (list shifts)

POST   /api/shift-plans                         (assign workers to stations/shifts)
GET    /api/shift-plans?date&stationId          (view plan)
POST   /api/shift-plans/:id/handover            (log handover)

POST   /api/performance                         (log performance record)
GET    /api/performance?workerId&dateRange      (view performance)
GET    /api/performance/leaderboard?skill       (rankings)

GET    /api/workers/suggest?stationId&shiftId&date (system-suggested workers with reasoning)
```

### UI Screens
- **Worker Directory**: list of all workers (company & 3rd party), filter by skill/provider, add/edit
- **Provider Management**: provider cards with stability score, contract details, worker count, renewal recommendations
- **Shift Management**: create/edit shifts, assign workers to stations, visual calendar view
- **Shift Handover** (mobile): outgoing worker logs progress/issues/photos → incoming worker reviews and acknowledges
- **Performance Dashboard**: worker leaderboard, provider comparison, efficiency trends, quality alerts
- **Assignment Suggester** (in Daily Planning): when adding station to plan, system lists top 3 suggested workers with reasons (high efficiency, stable provider, skill match)

---

## 2.6 DAILY PLANNING & ADAPTIVE OPTIMIZATION

### Overview
System-generated daily plans with multi-scenario optimization (fastest/cheapest/balanced), real-time shift-to-shift adaptation based on actual vs. planned output, learning from planner overrides, and cross-project coordination. Plans consider material availability, worker skills, equipment status, and external dependencies.

### Features

**System-Suggested Daily Plans:**
- Input: projects, target dates, current progress
- System generates 3 scenarios:
  1. **Fastest**: maximize output, use all resources, overtime if needed, premium workers
  2. **Cheapest**: minimize cost, use budget workers, avoid overtime, batch efficiently
  3. **Balanced**: optimize for on-time delivery within budget constraints
- Each scenario shows:
  - Station assignments per shift
  - Worker assignments with reasoning
  - Material requirements
  - Expected output
  - Cost estimate
  - Risk factors (tight timeline, material shortage, etc.)

**Station-Level Planning:**
- For each station in plan:
  - Project/SKU being worked on
  - Target qty for the day/shift
  - Assigned workers (system-suggested or manual)
  - Required materials (system checks availability)
  - Equipment status (checks for downtime)
  - Dependencies (checks if upstream stages complete)

**Real-Time Adaptive Optimization:**
- After each shift, system compares actual vs. planned output
- If behind schedule:
  - Auto-suggests reallocating workers from ahead-of-schedule projects
  - Suggests adding shifts or overtime
  - Flags material shortages proactively
  - Updates ETA for project
- If ahead of schedule:
  - Suggests reassigning workers to other projects
  - Updates capacity for new tasks
- Planner reviews and approves/modifies suggestions

**Learning from Overrides:**
- When planner overrides system suggestion, logs reason
- Tracks outcome: did override improve result?
- Adjusts future suggestions based on learned preferences
- Example: If planner always picks Worker X for Station Y, system learns to suggest Worker X first

**Cross-Project Coordination:**
- System knows all active projects across all factories
- Balances resources between projects
- Alerts on conflicts (same worker assigned to 2 projects, material shortage across projects)
- Suggests priority reordering if resources constrained

**Material Pre-Validation:**
- Before finalizing plan, system checks material stock
- Auto-reserves materials for planned stations
- Alerts if shortage detected
- Suggests material order or delay task

**Equipment Downtime Handling:**
- If equipment marked as down during plan execution:
  - System auto-suggests alternative stations
  - Reassigns workers to other tasks
  - Logs downtime in maintenance tracker
  - Delays affected tasks, updates timeline

**Approval Dependencies:**
- System checks external approvals (customer sign-off, vendor delivery)
- Highlights tasks blocked by pending approvals
- Calculates buffer remaining before cutoff
- Triggers escalation reminders if buffer < threshold

### Database Schema
```prisma
model DailyPlan {
  id              String   @id @default(cuid())
  date            DateTime
  factoryId       Int?
  
  scenario        String   // fastest, cheapest, balanced
  generatedBy     String   // system, user_id
  
  status          String   @default("draft") // draft, active, completed
  
  totalTargetQty  Int
  totalExpectedOutput Int
  estimatedCost   Float?
  
  reasoning       Json?    // { why_this_scenario, key_decisions }
  riskFactors     String[] // tight_timeline, material_shortage, etc.
  
  createdAt       DateTime @default(now())
  approvedAt      DateTime?
  approvedBy      String?
  
  Factory         Factory? @relation(fields: [factoryId], references: [id])
  stations        DailyPlanStation[]
  shiftPlans      ShiftPlan[]
  adaptations     PlanAdaptation[]
  
  @@index([date])
  @@index([factoryId])
}

model DailyPlanStation {
  id              String   @id @default(cuid())
  dailyPlanId     String
  stationId       Int
  projectId       Int
  projectSkuId    Int?
  
  targetQty       Int
  shiftId         String?
  
  assignedWorkers String[] // worker IDs
  workerAssignmentReason Json? // { workerId: reason }
  
  materialsRequired Json   // { materialId: qty }
  materialsReserved Boolean @default(false)
  
  equipmentStatus String   @default("operational") // operational, maintenance, down
  
  dependencies    String[] // upstream station IDs that must complete first
  dependenciesMet Boolean  @default(false)
  
  blockingApprovalId String?
  
  status          String   @default("pending") // pending, in_progress, completed, delayed
  
  actualQty       Int?
  completedAt     DateTime?
  
  createdAt       DateTime @default(now())
  
  DailyPlan       DailyPlan @relation(fields: [dailyPlanId], references: [id], onDelete: Cascade)
  Station         Station   @relation(fields: [stationId], references: [id])
  Project         Project   @relation(fields: [projectId], references: [id])
  Sku             ProjectSku? @relation(fields: [projectSkuId], references: [id])
  
  @@index([dailyPlanId])
  @@index([stationId])
  @@index([projectId])
}

model PlanAdaptation {
  id              String   @id @default(cuid())
  dailyPlanId     String
  
  trigger         String   // behind_schedule, ahead_schedule, material_shortage, equipment_down
  affectedStationId Int?
  
  systemSuggestion Json    // { action, details, reasoning }
  plannerDecision  String?  // approved, modified, rejected
  plannerReason    String?
  
  outcome         String?  // improved, neutral, worsened
  
  createdAt       DateTime @default(now())
  resolvedAt      DateTime?
  
  DailyPlan       DailyPlan @relation(fields: [dailyPlanId], references: [id], onDelete: Cascade)
  
  @@index([dailyPlanId])
  @@index([trigger])
}

model PlannerPreference {
  id              String   @id @default(cuid())
  plannerId       String
  
  preferenceType  String   // worker_assignment, scenario_choice, material_strategy
  context         Json     // { stationId, projectType, etc. }
  
  systemSuggestion String
  plannerChoice    String
  
  frequency       Int      @default(1)
  successRate     Float?
  
  createdAt       DateTime @default(now())
  lastUsed        DateTime @default(now())
  
  @@index([plannerId])
  @@index([preferenceType])
}
```

### API Endpoints
```
POST   /api/daily-plans/generate                (generate 3 scenarios with reasoning)
GET    /api/daily-plans?date&factoryId          (list plans)
GET    /api/daily-plans/:id                     (view detailed plan)
POST   /api/daily-plans/:id/approve             (approve and activate)

POST   /api/daily-plans/:id/stations            (add station to plan)
PUT    /api/daily-plans/:id/stations/:stationId (update station assignment)
DELETE /api/daily-plans/:id/stations/:stationId (remove station)

POST   /api/daily-plans/:id/validate-materials  (check material availability, auto-reserve)
POST   /api/daily-plans/:id/check-dependencies  (validate all dependencies met)

POST   /api/daily-plans/:id/adapt               (trigger adaptation after shift)
GET    /api/daily-plans/:id/adaptations         (view adaptation history)
POST   /api/daily-plans/:id/adaptations/:adaptId/resolve (planner decision on suggestion)

GET    /api/daily-plans/suggest-workers?stationId&shiftId (system-suggested workers with learning)
POST   /api/daily-plans/learn-preference        (log planner override for learning)
```

### UI Screens
- **Daily Planning Dashboard**: calendar view, click date → generate plan, compare 3 scenarios side-by-side
- **Scenario Comparison**: table showing fastest/cheapest/balanced with cost, time, risk, worker allocation
- **Plan Builder**: drag-and-drop stations to shifts, system suggests workers (with reasoning), auto-checks materials/dependencies
- **Material Validator**: before approval, shows material requirements vs. stock, click to auto-reserve or order
- **Real-Time Monitoring** (shift supervisor): see actual vs. target output per station, receive adaptation suggestions mid-shift
- **Adaptation Review**: list of system suggestions (reallocate workers, add shift, delay task), approve/modify/reject with reason
- **Learning Insights** (for planners): see your override patterns, success rates, system learning from your decisions

---

## 2.7 BATCH TRACKING & TRACEABILITY

### Overview
Full traceability from raw material to finished goods with standardized batch codes, handover sheets, station-to-station tracking, and printable labels/documents for quality audit and recall management.

### Features

**Batch Code Format:**
- Structure: `{PROJECT_CODE}-{PO_NUMBER}-{SKU_CODE}-{YYYYMMDD}-{SHIFT}-{SEQ}`
- Example: `PRJ001-PO5678-SKU123-20250101-A-001`
- Auto-generated when production starts at first station
- Printed on labels and handover sheets

**Batch Creation (at Molding/First Station):**
- Input: project, PO, SKU, target qty
- System generates batch code
- Records: material lot numbers used, machine ID, operator, start time
- Prints batch label (QR code + human-readable)

**Station-to-Station Handover:**
- When batch moves to next station:
  - Scan batch code or enter manually
  - Log: incoming qty, operator, timestamp, condition
  - Optional: attach photos of batch condition
  - System tracks batch location in real-time

**Handover Sheet (Printable/Digital):**
- Contains:
  - Batch code
  - Project/PO/SKU details
  - Qty at each station
  - Operators at each station
  - Timestamps
  - QC check results per station
  - Issues noted
  - Material lots used
- Generated on demand or at batch completion

**Quality & Rejection Tracking:**
- At each station, log: accepted qty, rejected qty, rejection reason
- Links to QC submissions
- Alerts if rejection rate > threshold

**Traceability Queries:**
- "Which material lot was used in batch X?"
- "Which batches used material lot Y?"
- "Where is batch Z right now?"
- "Show full history of batch A from molding to packing"
- "Which operator worked on batch B at painting station?"

**Recall Management:**
- If defect found in finished goods:
  - Lookup batch code
  - System shows all related batches (same material lot, same machine, same operator)
  - Shows current location of all related batches
  - Generates recall list with customer/warehouse locations

### Database Schema
```prisma
model Batch {
  id              String   @id @default(cuid())
  batchCode       String   @unique
  
  projectId       Int
  poNumber        String?
  projectSkuId    Int
  
  targetQty       Int
  currentQty      Int
  rejectedQty     Int      @default(0)
  
  currentStationId Int?
  status          String   @default("in_progress") // in_progress, completed, on_hold, rejected
  
  materialLots    Json     // { materialId: lotNumber }
  machineId       String?
  
  createdBy       String
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  
  Project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  Sku             ProjectSku @relation(fields: [projectSkuId], references: [id])
  CurrentStation  Station? @relation(fields: [currentStationId], references: [id])
  
  movements       BatchMovement[]
  qcRecords       QCSubmission[]
  
  @@index([batchCode])
  @@index([projectId])
  @@index([status])
  @@index([currentStationId])
}

model BatchMovement {
  id              String   @id @default(cuid())
  batchId         String
  
  fromStationId   Int?
  toStationId     Int
  
  qty             Int
  operatorId      String?
  
  condition       String?  // good, damaged, requires_rework
  photos          String[] // S3 keys
  notes           String?
  
  timestamp       DateTime @default(now())
  
  Batch           Batch    @relation(fields: [batchId], references: [id], onDelete: Cascade)
  FromStation     Station? @relation("BatchMovementFrom", fields: [fromStationId], references: [id])
  ToStation       Station  @relation("BatchMovementTo", fields: [toStationId], references: [id])
  
  @@index([batchId])
  @@index([toStationId])
  @@index([timestamp])
}

model MaterialLot {
  id              String   @id @default(cuid())
  materialId      String
  lotNumber       String   @unique
  
  supplier        String?
  receivedDate    DateTime
  expiryDate      DateTime?
  
  initialQty      Float
  currentQty      Float
  
  status          String   @default("active") // active, depleted, recalled
  
  qcStatus        String?  // passed, failed, pending
  qcNotes         String?
  
  createdAt       DateTime @default(now())
  
  Material        Material @relation(fields: [materialId], references: [id])
  usedInBatches   String[] // batch IDs for quick lookup
  
  @@index([lotNumber])
  @@index([materialId])
  @@index([status])
}
```

Note: Material model (from section 2.4) needs to add relation:
```prisma
model Material {
  // ... existing fields ...
  lots            MaterialLot[]
}
```

### API Endpoints
```
POST   /api/batches/create                      (start new batch, generate code)
GET    /api/batches?projectId&status            (list batches)
GET    /api/batches/:id                         (view batch details)
GET    /api/batches/:id/history                 (full traceability timeline)

POST   /api/batches/:id/move                    (record movement to next station)
PUT    /api/batches/:id/reject                  (log rejection with reason)

GET    /api/batches/:id/handover-sheet          (generate printable handover sheet)
GET    /api/batches/:id/label                   (generate batch label with QR code)

GET    /api/traceability/batch/:batchCode       (full trace)
GET    /api/traceability/material-lot/:lotNumber (find all batches using this lot)
GET    /api/traceability/operator/:operatorId   (find all batches touched by operator)

POST   /api/material-lots                       (receive new material, create lot)
GET    /api/material-lots?materialId&status     (list lots)
POST   /api/material-lots/:id/recall            (mark lot as recalled, find affected batches)
```

### UI Screens
- **Batch Creation** (at molding): select project/PO/SKU, input material lot, system generates batch code, print label
- **Batch Movement** (mobile-friendly): scan/enter batch code, select destination station, log qty/condition, attach photo, submit
- **Batch Tracker**: real-time view of all batches, location, status, color-coded by age/status
- **Traceability Viewer**: input batch code → see full timeline with stations, operators, QC results, materials used
- **Handover Sheet** (printable): clean layout with batch info, station checklist, operator signatures, QC results
- **Material Lot Manager**: receive material, assign lot number, link to batches, mark QC status
- **Recall Tool**: input material lot or batch code → see all affected batches, current locations, generate recall list

---

## 2.8 MATERIAL AVAILABILITY & INVENTORY INTEGRATION

### Overview
Just-in-time material availability checks before shift starts, auto-reservation when daily plan approved, shortage flagging, integration with procurement for reorder alerts, and material forecasting based on production plans.

### Features

**Pre-Shift Material Validation:**
- Before shift starts, system checks:
  - Required materials for planned stations
  - Current stock levels
  - Reserved quantities (from other plans)
  - Lead time for reorder
- If shortage detected:
  - Alert planner immediately
  - Suggest alternative materials (if applicable)
  - Recommend delaying task or reordering priority

**Auto-Reservation:**
- When daily plan approved:
  - System auto-reserves materials for all stations in plan
  - Reduces available stock (logical reservation, not physical)
  - Releases reservation if plan canceled or station removed

**Material Forecasting:**
- Based on upcoming daily plans + project timelines:
  - Forecast material needs for next 7/14/30 days
  - Calculate reorder point: `lead time consumption + safety stock`
  - Auto-generate purchase requisitions when below reorder point

**Stock Alerts:**
- Low stock warning (below min threshold)
- Out of stock alert (cannot fulfill upcoming plans)
- Expiring material alert (for materials with expiry dates)
- Slow-moving material alert (inventory sitting >X days)

**Integration with Procurement:**
- System sends material requests to procurement module
- Tracks: requisition → PO → receipt → QC → stock update
- Updates material forecasts when orders placed/received

**Consumption Tracking:**
- Log actual consumption per batch/shift
- Compare actual vs. planned consumption
- Alert on overconsumption (possible waste/theft)
- Update forecasting model based on actual usage

### Database Schema
```prisma
// Extend Material model from 2.4:
model Material {
  id              String   @id @default(cuid())
  name            String
  type            String
  unit            String
  costPerUnit     Float?
  stockQty        Float    @default(0)
  reservedQty     Float    @default(0) // NEW
  availableQty    Float    @default(0) // stockQty - reservedQty (computed)
  minStock        Float?
  reorderPoint    Float?   // NEW
  leadTimeDays    Int?     // NEW
  expiryTracking  Boolean  @default(false) // NEW
  supplier        String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  consumptions    MaterialConsumption[]
  lots            MaterialLot[]
  reservations    MaterialReservation[] // NEW
  forecasts       MaterialForecast[] // NEW
  
  @@index([type])
  @@index([stockQty])
}

model MaterialReservation {
  id              String   @id @default(cuid())
  materialId      String
  dailyPlanId     String?
  stationId       Int?
  
  reservedQty     Float
  
  reservedBy      String
  reservedAt      DateTime @default(now())
  releasedAt      DateTime?
  
  status          String   @default("active") // active, released, consumed
  
  Material        Material @relation(fields: [materialId], references: [id])
  DailyPlan       DailyPlan? @relation(fields: [dailyPlanId], references: [id], onDelete: Cascade)
  
  @@index([materialId])
  @@index([dailyPlanId])
  @@index([status])
}

model MaterialForecast {
  id              String   @id @default(cuid())
  materialId      String
  
  forecastDate    DateTime
  forecastPeriod  String   // daily, weekly, monthly
  
  plannedConsumption Float
  bufferStock     Float
  expectedStock   Float    // current + incoming - planned
  
  reorderNeeded   Boolean  @default(false)
  reorderQty      Float?
  
  generatedAt     DateTime @default(now())
  
  Material        Material @relation(fields: [materialId], references: [id])
  
  @@index([materialId])
  @@index([forecastDate])
}

model StockMovement {
  id              String   @id @default(cuid())
  materialId      String
  lotNumber       String?
  
  movementType    String   // receipt, consumption, adjustment, return
  qty             Float
  
  referenceType   String?  // PO, batch, production_entry
  referenceId     String?
  
  notes           String?
  performedBy     String
  
  timestamp       DateTime @default(now())
  
  Material        Material @relation(fields: [materialId], references: [id])
  
  @@index([materialId])
  @@index([movementType])
  @@index([timestamp])
}
```

Note: Add relation to Material model:
```prisma
model Material {
  // ... existing fields ...
  movements       StockMovement[]
}
```

### API Endpoints
```
POST   /api/materials/validate-availability     (check if materials available for plan)
POST   /api/materials/reserve                   (reserve materials for daily plan)
POST   /api/materials/release                   (release reservation)

GET    /api/materials/forecast?days=30          (forecast material needs)
POST   /api/materials/generate-forecast         (regenerate forecasts based on current plans)

GET    /api/materials/alerts                    (low stock, expiring, out of stock)
POST   /api/materials/adjust-stock              (manual adjustment with reason)

POST   /api/materials/receive                   (log material receipt, update stock)
GET    /api/materials/movements?materialId      (stock movement history)

GET    /api/materials/reorder-list              (materials needing reorder)
POST   /api/materials/create-requisition        (send to procurement)
```

### UI Screens
- **Material Dashboard**: stock levels, reserved qty, available qty, alerts (low/out/expiring)
- **Pre-Shift Validator** (in Daily Planning): before approval, shows material check results, flags shortages
- **Material Forecast**: table/chart showing predicted consumption for next 30 days, reorder recommendations
- **Stock Movements**: timeline of receipts, consumptions, adjustments with references to batches/POs
- **Reorder Management**: list of materials below reorder point, one-click requisition creation
- **Material Alerts Widget**: real-time alerts on dashboard (shortage blocking shift, expiring material, etc.)

---

## 2.9 APPROVAL TRACKING & EXTERNAL DEPENDENCIES

### Overview
Track external approvals (customer sign-offs, vendor deliveries, certifications), calculate buffer remaining before project cutoff, trigger repeated push notifications and escalations, allow override with risk logging, and link approvals to workflow stages.

### Features

**Approval Types:**
- Customer sign-off (design, sample, pre-production)
- Vendor delivery (raw material, components, tooling)
- Certifications (safety, compliance, quality)
- Internal approvals (management, finance, QC)

**Approval Request Creation:**
- Linked to workflow stage or project milestone
- Details: approval type, required from (person/org), expected date, cutoff date
- Auto-calculated buffer: `cutoff date - expected date`
- Attachments: documents awaiting approval

**Push Notifications & Reminders:**
- Reminder schedule: 3 days before, 1 day before, on expected date, daily after
- Escalation: if no response after expected date + X days, notify manager/escalation contact
- Multi-channel: email, SMS, in-app notification, WhatsApp (configurable)

**Approval Response:**
- Approved: approval granted, timestamp recorded
- Rejected: rejection reason, requested changes
- Delayed: new expected date, reason for delay

**Buffer Monitoring:**
- Real-time calculation: days remaining until cutoff
- Color-coded alerts:
  - Green: >5 days buffer
  - Yellow: 2-5 days buffer
  - Red: <2 days buffer
  - Critical: past cutoff
- Dashboard widget showing all pending approvals sorted by buffer

**Override Mechanism:**
- If approval blocked but production must start:
  - Planner can override with reason
  - Logs risk: "Started without customer sign-off, risk of rework"
  - Flags project as high-risk until approval received
  - Notification sent to stakeholders about override

**Integration with Workflow:**
- Workflow stage can have dependency: `requires_approval: true, approval_type: customer_signoff`
- Stage cannot start until approval received (unless overridden)
- System checks dependencies before allowing stage to begin

### Database Schema
```prisma
model ApprovalRequest {
  id              String   @id @default(cuid())
  projectId       Int
  workflowStageId String?
  
  approvalType    String   // customer_signoff, vendor_delivery, certification, internal
  description     String
  
  requiredFrom    String   // person/org name
  requiredFromContact String? // email/phone
  
  requestedBy     String
  requestedAt     DateTime @default(now())
  
  expectedDate    DateTime
  cutoffDate      DateTime
  bufferDays      Int      // cutoff - expected
  
  status          String   @default("pending") // pending, approved, rejected, delayed, overridden
  
  approvedAt      DateTime?
  approvedBy      String?
  
  rejectedAt      DateTime?
  rejectionReason String?
  requestedChanges String?
  
  delayedNewDate  DateTime?
  delayReason     String?
  
  overrideBy      String?
  overrideReason  String?
  overrideRisk    String?
  overrideAt      DateTime?
  
  attachments     String[] // S3 keys
  
  Project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  WorkflowStage   WorkflowStage? @relation(fields: [workflowStageId], references: [id])
  
  reminders       ApprovalReminder[]
  
  @@index([projectId])
  @@index([status])
  @@index([cutoffDate])
}

model ApprovalReminder {
  id              String   @id @default(cuid())
  approvalRequestId String
  
  reminderType    String   // scheduled, escalation
  reminderDate    DateTime
  
  sentAt          DateTime?
  sentTo          String[] // email addresses
  
  channel         String   // email, sms, whatsapp, in_app
  
  status          String   @default("pending") // pending, sent, failed
  
  ApprovalRequest ApprovalRequest @relation(fields: [approvalRequestId], references: [id], onDelete: Cascade)
  
  @@index([approvalRequestId])
  @@index([reminderDate])
  @@index([status])
}

// Extend WorkflowStage (from 2.1) to include approval dependency:
model WorkflowStage {
  // ... existing fields ...
  requiresApproval Boolean  @default(false) // NEW
  approvalType     String?  // NEW
  approvalRequests ApprovalRequest[] // NEW
}
```

### API Endpoints
```
POST   /api/approvals                           (create approval request)
GET    /api/approvals?projectId&status          (list approvals)
GET    /api/approvals/:id                       (view approval details)

PUT    /api/approvals/:id/approve               (mark as approved)
PUT    /api/approvals/:id/reject                (reject with reason)
PUT    /api/approvals/:id/delay                 (update expected date)

POST   /api/approvals/:id/override              (override with risk logging)
POST   /api/approvals/:id/send-reminder         (manual reminder push)

GET    /api/approvals/buffer-report             (approvals sorted by buffer remaining)
GET    /api/approvals/overdue                   (past expected date, no response)

POST   /api/approvals/reminders/schedule        (set up reminder schedule)
GET    /api/approvals/reminders?status=failed   (view failed reminders for retry)
```

### UI Screens
- **Approval Tracker**: table of all approvals, color-coded by buffer, filter by project/type/status
- **Approval Request Form**: create approval, select type, set dates, attach documents, configure reminders
- **Approval Dashboard Widget**: summary card showing pending approvals, overdue count, critical (red) count
- **Buffer Monitor**: visual timeline showing cutoff dates, expected dates, current date, buffer bars
- **Override Dialog**: when attempting to start blocked stage, show approval status, input override reason, acknowledge risk
- **Reminder Log**: history of sent reminders, delivery status, escalation triggers
- **Approval Detail View**: full timeline of request → reminders → escalations → response, downloadable attachments

---

## 2.10 MATERIAL REQUIREMENT PLANNING (MRP) - INTELLIGENT & SELF-LEARNING

### Overview
Calculate precise material requirements for each project based on production targets, accommodate process loss (configurable per stage or project-wide), learn from actual consumption to improve accuracy over time, and provide data-driven recommendations to reduce waste and optimize inventory.

### Features

**Material Requirement Calculation:**
- Input: Project target quantity + SKU BOM (Bill of Materials)
- Output: Exact quantities needed for:
  - Raw materials (ABS, PP, PPCP, Tritan, etc.) in KG
  - Paint (specific shades/colors) in Liters or ML
  - Ink (for pad printing, specific colors) in ML
  - Consumables (solvents, thinners, masking tape, etc.)
  - Components (screws, inserts, packaging materials)
- Stage-wise breakdown: How much material needed at each workflow stage
- Multi-SKU support: Calculate for projects with multiple product variants

**Process Loss Management:**
- **Option 1: Project-Wide Loss %**
  - User sets single process loss percentage (e.g., 5% scrap rate)
  - Applied uniformly across all stages
  
- **Option 2: Stage-Specific Loss %**
  - User defines loss per stage (e.g., Molding: 3%, Painting: 7%, Assembly: 2%)
  - More accurate for complex workflows
  
- **System Default Recommendations:**
  - System starts with industry standard defaults (e.g., Molding: 5%, Painting: 8%)
  - User can accept or override
  - System tracks actual vs estimated loss

**Self-Learning & Continuous Improvement:**
- **Data Collection:**
  - Track planned material quantity vs actual consumption (from ProductionEntry, MaterialConsumption)
  - Record loss/scrap at each stage
  - Monitor quality rejection rates (from QC submissions)
  
- **Pattern Recognition:**
  - Analyze historical data per:
    - Material type (ABS vs PP → different shrinkage rates)
    - Station (Station 3 has 2% less waste than Station 5)
    - Worker (Worker A has 15% better material efficiency)
    - Project complexity (simple parts = lower loss)
    - Time of day (night shift has 4% higher scrap)
  
- **Accuracy Improvement:**
  - Calculate prediction accuracy: `|estimated - actual| / actual × 100`
  - Adjust future MRP calculations based on rolling average of last 30 production runs
  - Display confidence score: "MRP accuracy for this material type: 95%"
  
- **Waste Reduction Recommendations:**
  - Identify high-loss stages: "Spray Painting has 12% loss, industry avg is 8%"
  - Root cause suggestions: "High loss correlated with Worker X on night shift"
  - Actionable insights: "Switching to Station 4 could reduce loss by 3% (based on 15 past jobs)"
  - Cost impact: "Reducing Molding loss from 5% to 3% saves ₹12,000/month"

**Customizable Material Library:**
- User-defined material types, units, costs
- Material categories: Raw Material, Paint, Ink, Consumable, Component
- Track material properties: density, shelf life, supplier, lead time
- Link materials to BOM items (per SKU)

**BOM (Bill of Materials) Management:**
- Define BOM per SKU: Material → Quantity per unit
- Multi-level BOM support: Sub-assemblies, kits
- Version control: BOM v1, v2, etc. (when material changes)
- Stage-specific material allocation: "Molding stage uses 15g ABS per part"

**MRP Report Generation:**
- **Project MRP Summary:**
  - Total material requirements (with process loss included)
  - Stage-wise breakdown
  - Cost estimate (material cost × quantity)
  - Availability check: "Sufficient stock" or "Order 50kg ABS"
  
- **Multi-Project MRP:**
  - Aggregate material needs across all active projects
  - Optimize bulk ordering
  - Identify shared materials for cost savings
  
- **What-If Analysis:**
  - User adjusts target quantity or loss %
  - System recalculates requirements in real-time
  - Compare scenarios: "Reducing loss by 2% saves ₹8,500"

**Integration with Material Management (2.8):**
- Auto-check current stock levels
- Flag shortfalls: "Need 120kg ABS, only 80kg available"
- Suggest reorder quantities with lead time consideration
- Auto-create purchase requisitions (optional)

**Learning Dashboard & Insights:**
- **Accuracy Metrics:**
  - Overall MRP accuracy: 92%
  - By material type: ABS (95%), Paint (88%), Ink (90%)
  - By stage: Molding (97%), Painting (85%)
  
- **Waste Analysis:**
  - Top 5 high-loss stages with % loss
  - Loss trends over time (improving or worsening)
  - Cost of waste per month
  
- **Recommendations Panel:**
  - "Switch to Station 7 for Molding to reduce ABS waste by 4%"
  - "Worker B has 20% better paint efficiency, assign to critical projects"
  - "Night shift scrap rate 6% higher, consider quality training"
  
- **Proof of Impact:**
  - Track recommendations accepted vs rejected
  - Show outcome: "Last month you accepted 3 recommendations, saved ₹25,000"
  - Build trust through verified results

### Database Schema
```prisma
model MaterialRequirement {
  id              String   @id @default(cuid())
  projectId       Int
  skuId           String
  
  targetQty       Int      // production target
  
  // Process loss settings
  lossType        String   @default("project_wide") // project_wide, stage_specific
  projectWideLoss Float?   // e.g., 0.05 = 5%
  stageSpecificLoss Json?  // { "molding": 0.03, "painting": 0.07 }
  
  // Calculated requirements
  requirements    Json     // { materialId: { qty, qtyWithLoss, stage } }
  totalCost       Float?
  
  // Learning data
  predictedQty    Json     // what MRP estimated
  actualQty       Json?    // what was actually consumed
  accuracy        Float?   // % accuracy
  
  generatedAt     DateTime @default(now())
  generatedBy     String
  
  Project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  ProjectSku      ProjectSku @relation(fields: [skuId], references: [id])
  
  @@index([projectId])
  @@index([generatedAt])
}

model BOMItem {
  id              String   @id @default(cuid())
  skuId           String
  materialId      String
  
  qtyPerUnit      Float    // quantity of material per 1 unit of SKU
  unit            String   // kg, liter, ml, pieces
  stage           String?  // which workflow stage uses this material
  
  version         Int      @default(1)
  active          Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  ProjectSku      ProjectSku @relation(fields: [skuId], references: [id], onDelete: Cascade)
  Material        Material @relation(fields: [materialId], references: [id])
  
  @@unique([skuId, materialId, version])
  @@index([skuId])
  @@index([materialId])
}

model MRPLearning {
  id              String   @id @default(cuid())
  
  materialId      String
  stationId       String?
  workerId        String?
  projectComplexity String? // simple, medium, complex
  
  estimatedQty    Float
  actualQty       Float
  lossPercent     Float    // actual loss %
  
  accuracy        Float    // how close was the estimate
  
  productionDate  DateTime
  shiftType       String?  // day, night
  
  notes           String?
  
  Material        Material @relation(fields: [materialId], references: [id])
  Station         Station? @relation(fields: [stationId], references: [id])
  Worker          Worker?  @relation(fields: [workerId], references: [id])
  
  @@index([materialId])
  @@index([productionDate])
  @@index([stationId])
}

model MRPRecommendation {
  id              String   @id @default(cuid())
  
  type            String   // station_switch, worker_assignment, loss_reduction, material_substitution
  title           String
  description     String
  
  impact          String   // estimated savings or improvement
  confidence      Float    // 0-100, based on data sample size
  
  dataPoints      Int      // how many historical records support this
  proofOfConcept  String?  // link to specific examples
  
  status          String   @default("pending") // pending, accepted, rejected, implemented
  acceptedBy      String?
  acceptedAt      DateTime?
  outcome         String?  // actual result after implementation
  
  createdAt       DateTime @default(now())
  
  @@index([status])
  @@index([createdAt])
}

// Extend Material model (from 2.8) with MRP fields:
model Material {
  // ... existing fields ...
  
  avgLossPercent  Float?   // rolling average loss % for this material
  costPerUnit     Float?   // for cost estimation
  
  bomItems        BOMItem[]
  mrpLearning     MRPLearning[]
}
```

### API Endpoints
```
POST   /api/mrp/calculate                       (calculate MRP for project/SKU)
GET    /api/mrp/:projectId                      (view MRP for project)
GET    /api/mrp/multi-project                   (aggregate MRP across projects)

POST   /api/mrp/bom                             (create/update BOM item)
GET    /api/mrp/bom/:skuId                      (view BOM for SKU)
DELETE /api/mrp/bom/:id                         (remove BOM item)

POST   /api/mrp/what-if                         (run what-if scenario)
GET    /api/mrp/availability-check              (check material availability vs requirements)

GET    /api/mrp/learning/accuracy               (MRP accuracy metrics)
GET    /api/mrp/learning/waste-analysis         (waste/loss analysis)
GET    /api/mrp/learning/recommendations        (system recommendations)

POST   /api/mrp/recommendations/:id/accept      (accept recommendation)
POST   /api/mrp/recommendations/:id/reject      (reject with reason)
PUT    /api/mrp/recommendations/:id/outcome     (log actual outcome after implementation)

POST   /api/mrp/learning/record                 (manually log learning data point)
GET    /api/mrp/learning/patterns               (view detected patterns)
```

### UI Screens
- **MRP Calculator**: Input project/SKU, target qty, select loss type, view detailed material breakdown
- **BOM Manager**: Define BOM items per SKU, stage-wise material allocation, version history
- **MRP Dashboard**: Accuracy metrics, waste analysis, top recommendations, savings tracker
- **Multi-Project MRP**: Aggregate view of material needs across all projects, bulk order suggestions
- **What-If Analyzer**: Adjust quantities/loss%, compare scenarios side-by-side
- **Learning Insights Panel**: Charts showing accuracy trends, loss patterns, recommendation impact
- **Recommendation Center**: List of system recommendations with confidence scores, accept/reject actions, outcome tracking

### Self-Learning Algorithm Flow
```
1. Initial MRP Calculation
   ↓
2. Production Execution (actual consumption tracked)
   ↓
3. Data Collection (MaterialConsumption, QC results, ProductionEntry)
   ↓
4. Pattern Analysis (group by material, station, worker, shift, complexity)
   ↓
5. Accuracy Calculation (compare estimated vs actual)
   ↓
6. Adjustment of Future Estimates (rolling average, weighted by recency)
   ↓
7. Generate Recommendations (if patterns detected with high confidence)
   ↓
8. Track Implementation & Outcome
   ↓
9. Refine Algorithm (improve confidence scores based on outcome verification)
```

### Key Performance Indicators (KPIs)
- **MRP Accuracy:** Target 95%+ (within 5% of actual consumption)
- **Waste Reduction:** Track month-over-month reduction in process loss %
- **Cost Savings:** Calculate savings from recommendations accepted and verified
- **Recommendation Acceptance Rate:** % of recommendations accepted by planners
- **Confidence Improvement:** Track algorithm confidence score over time

---

## 2.11 INTEGRATION & SUMMARY

### Cross-Module Dependencies

**Workflow → QC:**
- Each workflow stage can require QC checklist completion
- Stage cannot be marked complete until QC submitted and passed

**Workflow → Approvals:**
- Stages can have approval dependencies
- System checks approval status before allowing stage to start

**Daily Planning → Workforce:**
- System suggests workers based on performance and skills
- Learning engine tracks planner preferences

**Daily Planning → Material Availability:**
- Pre-shift validation checks material stock
- Auto-reservation when plan approved

**Daily Planning → Production Output:**
- Uses ProcessConfig to calculate target output
- Compares actual output to trigger adaptations

**Batch Tracking → QC:**
- QC submissions linked to batch codes
- Traceability includes QC results per station

**Batch Tracking → Material:**
- Batches record material lot numbers used
- Recall traces back through lot numbers

**Production Entry → Material Consumption:**
- Actual consumption logged per shift
- Variance analysis for cost control (Phase 3/4)

### Development Priority Order

1. **Station Modeling (2.2)** - Foundation for all other modules
2. **Workflow Management (2.1)** - Defines project structure
3. **QC Checklists (2.3)** - Already 80% done, complete remaining UI
4. **Production Output & Material (2.4)** - Calculation engine for planning
5. **Workforce Management (2.5)** - Required for daily planning
6. **Daily Planning (2.6)** - Core execution module, depends on 1-5
7. **Batch Tracking (2.7)** - Can be parallel with daily planning
8. **Material Availability (2.8)** - Integrates with daily planning
9. **Approval Tracking (2.9)** - Integrates with workflow
10. **Adaptive Learning & Optimization** - Ongoing refinement after initial deployment

### Testing Strategy

**Unit Tests:**
- Calculation functions (output per hour, material consumption, etc.)
- Batch code generation
- Buffer calculation
- Auto-reservation logic

**Integration Tests:**
- Workflow stage → QC → approval flow
- Daily plan → material check → auto-reserve → shift execution
- Batch movement → QC submission → handover sheet generation
- Performance tracking → worker suggestion → learning

**User Acceptance Tests:**
- Planner creates daily plan with system suggestions
- Worker logs production output, system triggers adaptation
- QC inspector submits checklist, system blocks stage if failed
- Material manager receives alert, creates requisition
- Batch traced from molding to packing with full history

### UI/UX Principles

- **Mobile-First for Operators**: Station QC, batch movement, production logging optimized for tablets/phones
- **Desktop for Planners**: Daily planning, workforce assignment, dashboards optimized for large screens
- **Real-Time Updates**: WebSocket for live status changes (batch location, material alerts, approval responses)
- **One-Click Actions**: Auto-reserve materials, generate scenarios, send reminders
- **Visual Indicators**: Color-coded buffers, status badges, progress bars
- **Contextual Help**: "Why?" buttons explaining system suggestions and calculations

---

### Phase 3: Time & Cutoff Planning (In Progress)

This phase introduces backward scheduling from project cutoff dates, proactive slip detection with alerts, and a first-cut rolling-horizon simulator for multi-project prioritization. Initial endpoints and data flows are live; refinement and UI wiring will continue.

#### ✅ Delivered (MVP)
- Backward scheduling engine that computes stage start/end dates from project cutoff and buffers
- Status endpoint to assess overdue/at-risk workflow stages
- Slip-to-Alert bridge that auto-creates project Alerts for late stages
- Rolling-horizon simulator (heuristic) to prioritize projects across a short planning window

#### 🛠️ Next Up
- Policy-driven scheduler parameters (weights for urgency, value, effort)
- Resource-aware planning (station/worker availability constraints)
- Auto reallocation suggestions when risk thresholds exceeded
- UI: Planner dashboard for time buffers, slips, and quick fixes

#### API Endpoints
```
POST   /api/time-planning/projects/:projectId/backward-schedule
  - Input: { buffers: { shippingDays, qcDays }, stageDurations?: [{stageId|name, estimatedDays}], overwrite?: boolean }
  - Behavior: Writes planned start/end into WorkflowStage if present (respects overwrite flag)

GET    /api/time-planning/projects/:projectId/status
  - Output: { summary: { overdueCount, atRiskCount }, stages: [{id, name, startDate, endDate, overdueDays, atRisk}] }

POST   /api/time-planning/alerts/check
  - Input: { projectIds?: number[], riskThresholdDays?: number }
  - Behavior: Creates Alert rows for stages overdue beyond threshold

POST   /api/time-planning/rolling-horizon/simulate
  - Input: { projectIds?: number[], windowDays?: number }
  - Output: prioritized list by urgency (cutoff proximity) and quantity (heuristic)
```

#### Data Model Leverage
- Uses existing `Project.cutoffDate`
- Schedules are written to `WorkflowStage.startDate` and `WorkflowStage.endDate`
- Alerts recorded via existing `Alert` model

#### Notes
- Also see legacy simulator: `POST /api/projects/:id/plan/simulate` (kept for comparison)
- Future iterations will add persisted schedule versions and resource constraints

---

### Phase 4: Cost & Advisory

---

## 4.1 COMPREHENSIVE PRICING MODULE

**Status:** Requirements Documented  
**Priority:** High  
**Phase:** Pricing & Costing

### Overview

The Pricing Module enables comprehensive project cost calculation and price determination. This is a critical business function where the team defines product pricing based on multiple cost components, margins, and delivery terms.

### Cost Structure Types

The system must support three primary pricing perspectives:

#### **Ex-Factory Cost**
- Raw manufacturing cost at factory
- Internal cost to produce the product
- Foundation for all other pricing calculations

#### **FOB Cost (Free on Board)**
- Ex-factory cost + shipping to nearest port
- Includes export packaging, documentation, port charges
- Used for international customers

#### **Selling Price**
- Final customer price
- Includes margins, overhead allocation
- Negotiable based on customer/market

---

### Cost Components

#### **Fixed/Predefined Costs (Customizable Templates)**
These are standard costs that apply across projects but can be customized:

- **Asset Costs**: Machinery, equipment, tools
- **Manpower Costs**: Labor rates by role/skill level
- **Machine Operating Costs**: Hourly machine rates, maintenance allocation
- **Electricity Costs**: Power consumption rates
- **Overhead Costs**: Rent, utilities, admin expenses
- **Consumables**: Standard materials, supplies

#### **Project-Specific Costs (Variable)**
These vary by project and must be calculated/entered individually:

**Mold Costs:**
- Mold fabrication cost
- Design & engineering cost
- Testing & validation cost
- Mold trials cost
- Mold modifications/revisions

**Prototyping Costs:**
- Prototype design cost
- Prototype production cost
- Testing & iteration costs
- Sample approval costs

**Capital Equipment:**
- Project-specific machinery purchases
- Specialized tools/fixtures
- Equipment installation costs
- Equipment depreciation allocation

**Material Costs:**
- Raw material costs per unit
- Material wastage/scrap allocation
- Packaging material costs
- Special finishes/treatments

**Process Costs:**
- Operation costs per station
- Quality control costs
- Rework/defect costs
- Special processes (printing, embossing, etc.)

**Logistics & Documentation:**
- Domestic transportation
- Export documentation
- Customs clearance
- Insurance

**Miscellaneous:**
- Certifications & compliance costs
- Testing & lab costs
- Samples & marketing materials
- Any other project-specific expenses

---

### Margin & Pricing Rules

The system must allow defining:

- **Base Margin %**: Standard profit margin
- **Volume Discounts**: Tiered pricing based on order quantity
- **Customer-Specific Margins**: Different margins for different customers
- **Market-Based Adjustments**: Region/country-specific pricing
- **Currency & Exchange Rates**: Multi-currency support
- **Payment Terms Impact**: Early payment discounts, credit terms

---

### Calculation Engine Requirements

#### **Cost Rollup**
- Automatically sum all applicable costs
- Apply allocation rules (per unit, per batch, one-time)
- Handle cost distribution across multiple SKUs
- Support cost versioning (quote revisions)

#### **Margin Calculation**
- Calculate margin % on different cost bases
- Support both markup and margin calculations
- Allow margin stacking (cost + margin1 + margin2)
- Show breakeven analysis

#### **Scenario Comparison**
- Compare multiple pricing scenarios
- What-if analysis (change material, change process)
- Sensitivity analysis (volume impact, cost variance)
- Historical cost comparison

---

### Database Schema

```prisma
model CostTemplate {
  id              String   @id @default(cuid())
  name            String
  category        String   // material, labor, overhead, asset
  defaultValue    Float?
  unit            String?
  customizable    Boolean  @default(true)
  active          Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([category])
}

model ProjectCosting {
  id              String   @id @default(cuid())
  projectId       Int
  version         Int      @default(1)
  status          String   @default("draft") // draft, submitted, approved, rejected
  
  exFactoryCost   Float?
  fobCost         Float?
  sellingPrice    Float?
  
  createdBy       String
  approvedBy      String?
  approvedAt      DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  Project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  components      CostComponent[]
  pricingTiers    PricingTier[]
  approvals       CostingApproval[]
  
  @@index([projectId])
  @@index([status])
}

model CostComponent {
  id              String   @id @default(cuid())
  projectCostingId String
  
  type            String   // fixed, variable, one_time
  category        String   // material, labor, overhead, mold, prototype, etc.
  name            String
  
  quantity        Float
  unit            String
  unitCost        Float
  totalCost       Float   // calculated
  
  allocationMethod String  // per_unit, per_batch, per_order
  notes           String?
  attachments     String[]
  
  createdAt       DateTime @default(now())
  
  ProjectCosting  ProjectCosting @relation(fields: [projectCostingId], references: [id], onDelete: Cascade)
  
  @@index([projectCostingId])
  @@index([category])
}

model PricingTier {
  id              String   @id @default(cuid())
  projectCostingId String
  
  tierName        String   // Standard, Volume Discount, etc.
  minQuantity     Int
  maxQuantity     Int?
  
  exFactoryCost   Float
  fobCost         Float
  sellingPrice    Float
  
  marginPercent   Float
  currency        String   @default("USD")
  
  validFrom       DateTime?
  validTo         DateTime?
  
  createdAt       DateTime @default(now())
  
  ProjectCosting  ProjectCosting @relation(fields: [projectCostingId], references: [id], onDelete: Cascade)
  
  @@index([projectCostingId])
}

model MarginRule {
  id              String   @id @default(cuid())
  name            String
  
  marginType      String   // percentage, fixed_amount
  marginValue     Float
  
  applicableToCustomer String[]
  applicableToMarket   String[]
  
  minVolume       Int?
  maxVolume       Int?
  
  priority        Int      @default(0)
  active          Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([active])
}

model CostingApproval {
  id              String   @id @default(cuid())
  projectCostingId String
  
  approverRole    String
  approverId      String?
  status          String   @default("pending") // pending, approved, rejected
  
  comments        String?
  approvedAt      DateTime?
  
  createdAt       DateTime @default(now())
  
  ProjectCosting  ProjectCosting @relation(fields: [projectCostingId], references: [id], onDelete: Cascade)
  
  @@index([projectCostingId])
  @@index([status])
}
```

---

### API Endpoints

```
POST   /api/costing/projects/:projectId          (create project costing)
GET    /api/costing/projects/:projectId          (list versions)
GET    /api/costing/:id                          (get costing details)
PUT    /api/costing/:id                          (update costing)

POST   /api/costing/:id/components               (add cost component)
PUT    /api/costing/components/:id               (update component)
DELETE /api/costing/components/:id               (remove component)

POST   /api/costing/:id/calculate                (calculate all costs)
GET    /api/costing/:id/breakdown                (cost breakdown report)

POST   /api/costing/:id/pricing-tiers            (add pricing tier)
GET    /api/costing/:id/pricing-tiers            (list tiers)

POST   /api/costing/:id/submit                   (submit for approval)
POST   /api/costing/:id/approve                  (approve costing)
POST   /api/costing/:id/reject                   (reject with comments)

GET    /api/costing/templates                    (list cost templates)
POST   /api/costing/templates                    (create template)
POST   /api/costing/:id/apply-template           (apply template to project)

GET    /api/costing/:id/compare/:otherId         (compare two versions)
GET    /api/costing/:id/scenario                 (what-if analysis)

GET    /api/margin-rules                         (list margin rules)
POST   /api/margin-rules                         (create rule)
GET    /api/costing/:id/applicable-margins       (get applicable margins)
```

---

### UI Screens

**Costing Worksheet:**
- Spreadsheet-like interface for cost entry
- Grouped by cost categories
- Real-time calculations
- Drill-down capability
- Formula transparency

**Cost Templates Library:**
- Browse/search predefined costs
- Apply templates to projects
- Customize template values
- Save custom templates

**Pricing Calculator:**
- Interactive calculator
- Adjust margins visually
- Compare pricing scenarios side-by-side
- Export pricing proposals (PDF/Excel)

**Approval Workflow:**
- Submit costing for review
- Multi-level approvals
- Comments & revision tracking
- Audit trail

**Reporting & Analytics:**
- Cost breakdown charts
- Margin analysis
- Historical cost trends
- Profitability forecasting
- Cost variance analysis (estimated vs actual)

---

### Key Features

**Version Control:**
- Multiple costing versions per project
- Compare versions
- Restore previous versions
- Track changes

**Multi-Currency Support:**
- Define costs in different currencies
- Automatic conversion
- Exchange rate management
- Currency risk buffer

**Amortization Engine:**
- Spread one-time costs over order lifecycle
- Tooling cost recovery tracking
- Breakeven volume calculation
- ROI analysis

**Scenario Planning:**
- Best case / worst case / most likely
- Volume sensitivity analysis
- Material price volatility modeling
- Competitive pricing analysis

**Collaboration:**
- Share costing with stakeholders
- Commenting & discussion threads
- Version comparison
- Approval notifications

---

### Validation Rules

- **Cost Completeness**: All mandatory cost categories filled
- **Margin Validation**: Minimum margin thresholds
- **Price Reasonability**: Alert if price too high/low vs market
- **Approval Requirements**: Costs above threshold need approval
- **Currency Consistency**: All costs in same base currency or converted

---

### Integration Points

- **Mold Module**: Pull mold costs automatically
- **Material Module**: Pull material costs from inventory
- **Production Module**: Actual cost tracking vs estimates
- **Procurement**: Purchase order costs feed back
- **Compliance Module**: Certification costs
- **Process Flow**: Operation cost calculation based on flow

---

### Implementation Notes

**This is a complex, nuanced module** that requires:
1. **Deep user involvement**: Cost structure varies significantly by project type
2. **Flexibility**: System must accommodate diverse costing approaches
3. **Accuracy**: Pricing errors directly impact profitability
4. **Simplicity**: Despite complexity, UI must remain intuitive
5. **Transparency**: Clear visibility into how prices are calculated

**Recommended Approach:**
- Start with simple cost entry and basic margin calculations
- Iterate based on real project costing exercises
- Build complexity gradually (templates → rules → automation)
- Extensive user testing before rollout

---

### Success Metrics

- Time to create project costing reduced by 60%
- Pricing accuracy improved (fewer revisions)
- Margin visibility across all projects
- Faster quote turnaround time
- Better profitability tracking (estimated vs actual)

---

## 4.2 P&L TRACKING (Standard vs Actual)

**Status:** 🔴 Not Started

### Features:
- Standard costing vs actual costing comparison
- Real-time unit P&L calculation
- Cost variance analysis (material, labor, overhead)
- Profitability tracking by project/SKU/customer
- Budget vs actual reporting

---

## 4.3 OPTIMIZATION ENGINE

**Status:** 🔴 Not Started

### Features:
- Box-parity optimization
- Gate-aware scheduling
- Multi-constraint simulation
- Resource utilization optimization
- Cost minimization algorithms

---

## 4.4 WHAT-IF SCENARIOS

**Status:** 🔴 Not Started

### Features:
- Scenario builder (change materials, processes, volumes)
- Impact analysis (cost, time, quality)
- Sensitivity analysis
- Risk assessment
- Decision support recommendations

---

### Phase 5: Reporting & Explainability (Not Started)

#### 🔴 All Pending:
- Exception-First Dashboards
- Report Builder + Export
- Explainability & Audit Layer ("Why?" buttons)
- Learning Engine (continuous improvement)

---

## 🏭 PRODUCTION MODULES (From Extended Blueprint)

### Factory Mapping (Not Started)
**Priority:** High (Foundation for production tracking)

#### Components:
- **Rooms:** Shopfloor locations
- **Station Types:** Spray Booth, Pad Print, Assembly, etc.
- **Stations:** Physical workstations with QC benchmarks
- **Machines:** Equipment/fixtures at each station
- **Documents:** SOPs, drawings, QC references

#### Database Schema (to add):
```prisma
Room { id, name, location_code, capacity_notes }
StationType { id, name, default_qc_benchmark, default_docs }
Station { id, roomId, typeId, code, name, max_parallel }
Machine { id, stationId, name, spec }
StationDoc { id, stationId, title, url, version }
StationBenchmark { id, stationId, qc_json }
```

---

### Daily Planning (Not Started)
**Priority:** High (Operations backbone)

#### Features:
- System-proposed allocation
- Human finalize + learning from overrides
- Room-wise & station-wise views
- Drag-drop assignment UI

---

### Batch Tracking (Not Started)
**Priority:** High (Traceability requirement)

#### Features:
- Shift/Day/Week cadence
- Batch codes (PRJ-PO-SKU-DATE-SHIFT-###)
- Weight-based counting (trays + part weight)
- Printable labels & bin cards
- Handover sheets

---

### Station Display Mode (Not Started)
**Priority:** Medium (Shopfloor visibility)

#### Features:
- Chromeless display at each station
- Today's plan, current job, live output
- QC checklist, "Who's on station?"
- Quick entry buttons for operators

---

## 📊 PROGRESS TRACKING

### Overall Completion by Phase:
```
Foundation (Auth, RBAC, UI):        ████████████████░░  85% ✅
Email Integration:                  ██░░░░░░░░░░░░░░░░  10% 🟡
MFA Implementation:                 ███░░░░░░░░░░░░░░░  15% 🟡
Phase 1 (Intake):                   ██░░░░░░░░░░░░░░░░  10% 🔴
Phase 2 (Execution):                ░░░░░░░░░░░░░░░░░░   0% 🔴
Phase 3 (Time & Cutoff):            ░░░░░░░░░░░░░░░░░░   0% 🔴
Phase 4 (Cost & Advisory):          ░░░░░░░░░░░░░░░░░░   0% 🔴
Phase 5 (Reporting):                ░░░░░░░░░░░░░░░░░░   0% 🔴
Production Modules:                 ░░░░░░░░░░░░░░░░░░   0% 🔴
```

---

## 🎯 IMMEDIATE NEXT STEPS (Prioritized)

### Sprint 1: Email + MFA (1-2 weeks)
1. **Email Service Setup** (2 days)
   - Install Resend SDK
   - Create abstraction layer
   - Build HTML templates
   
2. **Invitation Flow** (2 days)
   - Email invitations working
   - Email verification
   
3. **MFA Implementation** (3-5 days)
   - QR code generation
   - TOTP verification
   - Backup codes
   - Login flow update
   
4. **Security Alerts** (1 day)
   - Audit log flagged action emails
   - Device login notifications

### Sprint 2: Project Tracker Foundation (1-2 weeks)
1. **Master Project Tracker**
   - CRUD operations
   - SKU management
   - Cutoff dates
   
2. **Document Repository**
   - File upload (MinIO/S3)
   - Version control
   - Pantone reference storage

### Sprint 3: Production Foundation (2 weeks)
1. **Factory Mapping**
   - Rooms, stations, machines
   - QC benchmarks
   
2. **Batch Tracking v1**
   - Create batches
   - Basic tracking
   - Printable labels

---

## 🔧 TECHNICAL DEBT & IMPROVEMENTS

### High Priority:
- [ ] Add Redis caching for session validation (reduce DB queries)
- [ ] Implement rate limiting on login/MFA endpoints
- [ ] Add webhook support for audit log notifications
- [ ] Set up automated backups (database + files)

### Medium Priority:
- [ ] Add search functionality to admin panels
- [ ] Implement bulk operations (invite multiple users)
- [ ] Add export functionality (users, audit logs)
- [ ] Mobile responsive improvements

### Low Priority:
- [ ] Dark mode refinements
- [ ] Keyboard shortcuts
- [ ] Advanced filters on list views

---

## 📈 DEPLOYMENT ROADMAP

### Current: Development
- Local development environment
- Neon database (free tier)
- No production deployment yet

### Next: Staging
- **Timeline:** After Email + MFA complete
- **Setup:**
  - Vercel (frontend)
  - Render (backend)
  - Neon Pro (database)
  - Resend (email)

### Future: Production
- **Timeline:** After Phase 1-2 modules complete
- **Requirements:**
  - Company credit card transfer
  - Domain registration
  - SSL certificates
  - Monitoring setup (Sentry)
  - Backup automation

---

## 📚 DOCUMENTATION STATUS

### ✅ Complete:
- Billing & Services Tracker (this file's companion)
- API route documentation (inline)
- Database schema (Prisma)

### 🔴 Needed:
- User manual (for end users)
- Admin guide (for system administrators)
- API documentation (Swagger/OpenAPI)
- Deployment guide
- Troubleshooting guide

---

## 🔗 KEY LINKS

- **Repository:** github.com/Pramara-Promotions/pramara-pms
- **Database:** Neon Console (check .env for connection)
- **Email:** Resend Dashboard (when set up)
- **Hosting:** TBD (Vercel + Render recommended)

---

## 📞 STAKEHOLDERS

- **Development:** Current team
- **Operations:** (To be assigned)
- **Finance:** (For billing transfer)
- **End Users:** Factory supervisors, QC team, management

---

**Document Maintenance:**
- Update after completing each module
- Review weekly during active development
- Mark dependencies and blockers
- Track actual vs estimated timelines

**Next Review:** After Email + MFA implementation complete

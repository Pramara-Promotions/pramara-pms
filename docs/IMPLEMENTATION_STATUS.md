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

### Phase 2: Execution Control (Not Started)

#### 🔴 All Pending:
- Task Workflow (Kanban/Gantt)
- Manpower Planning & Rosters
- QC Checklists & Uploads (Pantone verification)
- Inventory & Rejection Linkage
- Daily Plan + Lead Review
- Parity Widgets (boxes, units, OTPI)

---

### Phase 3: Time & Cutoff Planning (Not Started)

#### 🔴 All Pending:
- Backward Scheduling
- Immediate Alerts on slip
- Multi-Project Resource Planning
- Rolling-Horizon Scheduler (policy-driven)
- Resource Reallocation Planner

---

### Phase 4: Cost & Advisory (Not Started)

#### 🔴 All Pending:
- Costing & P&L (std vs actual)
- Real-Time Unit P&L
- Optimization Engine (box-parity, gate-aware)
- Multi-Constraint Simulation
- What-If Scenarios

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

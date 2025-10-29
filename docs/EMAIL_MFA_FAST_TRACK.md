# 🚀 Email + MFA - Fast Track Implementation (3-5 Days)
**Last Updated:** October 23, 2025  
**Goal:** Complete MFA with email support, then expand notification system  
**Ethos:** Every notification must be CLEAR, CONTEXTUAL, and ACTIONABLE

---

## 🎯 CORE PRINCIPLE: ACTIONABLE INSIGHTS

**Bad Notification:**
```
⚠️ Process delayed
[Dismiss]
```
User thinks: "What process? Where? What do I do?"

**Good Notification:**
```
🔴 CRITICAL: Molding Stage Delayed
Project: ABC Toy Set (PO-2025-123)
Stage: Molding → 2.5 hours behind
Assigned: Ramesh Kumar (Station 3)
Impact: Cutoff in 18 hours (Red zone)

Actions:
[View Station] [Contact Ramesh] [See Alternatives] [Dismiss]
```
User knows: WHAT, WHERE, WHO, IMPACT, and WHAT TO DO.

---

## 📅 IMPLEMENTATION PLAN

### 🏃 Phase 1: MFA with Email (Day 1-2) - START NOW

#### Day 1 Morning: Email Service Foundation
**Duration:** 2-3 hours

1. **Install Dependencies**
```bash
cd api
npm install resend speakeasy qrcode
```

2. **Environment Setup**
```env
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@pramara.com
EMAIL_REPLY_TO=support@pramara.com
APP_URL=http://localhost:5173
```

3. **Email Service (Simple, Effective)**
```javascript
// api/lib/emailService.js
class EmailService {
  async send({ to, subject, html, text }) {
    // Resend integration
    // Returns { id, success, error }
  }
  
  async sendTemplate({ to, template, data }) {
    // Load template, replace variables, send
  }
}
```

4. **MFA Email Templates (Only 3 Needed)**
   - `mfa-setup.html` - QR code + instructions
   - `mfa-enabled.html` - Confirmation
   - `mfa-disabled.html` - Security alert

#### Day 1 Afternoon: MFA Implementation
**Duration:** 3-4 hours

1. **Generate Secret & QR Code**
```javascript
// api/routes/admin.js - Update PUT /users/:id/mfa
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate secret
const secret = speakeasy.generateSecret({
  name: `Pramara PMS (${user.email})`,
  issuer: 'Pramara PMS'
});

// Generate QR code
const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

// Return both to frontend
return { secret: secret.base32, qrCode: qrCodeUrl };
```

2. **Verify TOTP**
```javascript
// POST /api/auth/mfa/verify
const verified = speakeasy.totp.verify({
  secret: user.mfaSecret,
  encoding: 'base32',
  token: req.body.code,
  window: 2 // allow 60s time drift
});
```

3. **Update Login Flow**
```javascript
// api/routes/auth.js - POST /login
// After password check:
if (user.mfaSecret && user.mfaSecret !== 'PENDING_SETUP') {
  // Check if device is trusted
  if (!device.trusted || device.trustUntil < now) {
    return res.json({ 
      requiresMfa: true,
      tempToken: generateTempToken(user.id) // 5min expiry
    });
  }
}
```

4. **MFA Verification Endpoint**
```javascript
// POST /api/auth/mfa/login-verify
// Verify TOTP + temp token
// Create session + trust device if requested
```

#### Day 2 Morning: Frontend MFA Flow
**Duration:** 3-4 hours

1. **MFA Setup Modal** (when enabling)
   - Show QR code
   - Input field for verification code
   - "Trust this device" checkbox
   - Verify → Email confirmation

2. **MFA Login Screen** (after password)
   - 6-digit code input
   - "Trust this device for 30 days" checkbox
   - "Use backup code" link
   - Verify → Continue to app

3. **Backup Codes Generation**
   - Generate 10 codes on MFA setup
   - Show once, download option
   - Store hashed in DB

#### Day 2 Afternoon: Testing & Polish
**Duration:** 2-3 hours

- Test full MFA flow
- Test backup codes
- Test device trust
- Test email notifications
- Error handling

**✅ MFA COMPLETE - READY FOR PRODUCTION**

---

### 🎨 Phase 2: Core Notification System (Day 3-4)

#### Day 3: Database + Service (Foundation)
**Duration:** Full day

1. **Minimal Schema** (just what's needed now)
```prisma
Notification {
  id, userId, type, priority
  
  // CONTEXT (the key!)
  title              String
  message            String
  entityType         String?  // 'project', 'task', 'batch', 'station'
  entityId           String?  // link to entity
  entityName         String?  // "ABC Toy Set"
  entityCode         String?  // "PO-2025-123"
  
  // WHO & WHERE
  assignedTo         String?  // "Ramesh Kumar"
  location           String?  // "Station 3, Room B"
  
  // ACTIONS (the guidance!)
  primaryAction      String?  // "View Station"
  primaryActionUrl   String?  // "/stations/123"
  secondaryActions   Json[]   // [{label, url, type}]
  
  // IMPACT (the why!)
  impactLevel        String?  // "Delays cutoff by 2h"
  impactDetails      Json?
  
  // State
  read               Boolean  @default(false)
  readAt             DateTime?
  dismissed          Boolean  @default(false)
  expiresAt          DateTime?
  
  createdAt          DateTime @default(now())
}
```

2. **Notification Service** (actionable by design)
```javascript
// api/lib/notificationService.js
class NotificationService {
  async create({
    userId,
    type,              // 'cutoff_warning'
    priority,          // 'critical'
    
    // CONTEXT
    title,             // "Molding Stage Delayed"
    message,           // "2.5 hours behind schedule"
    entityType,        // 'station'
    entityId,          // 'station_123'
    entityName,        // "Molding Station 3"
    entityCode,        // "PO-2025-123"
    
    // WHO & WHERE
    assignedTo,        // "Ramesh Kumar"
    location,          // "Station 3, Room B"
    
    // ACTIONS (always provide at least one!)
    primaryAction: {
      label,           // "View Station"
      url,             // "/stations/123"
      type             // 'navigate', 'modal', 'external'
    },
    secondaryActions: [
      { label: "Contact Ramesh", url: "/messages/user_456", type: "modal" },
      { label: "See Alternatives", url: "/optimize/project_789", type: "navigate" }
    ],
    
    // IMPACT
    impactLevel,       // "Delays cutoff by 2 hours"
    impactDetails: {
      cutoffIn: "18 hours",
      ragStatus: "red",
      affectsProjects: ["PO-2025-123"]
    }
  }) {
    // Create notification
    // Deliver in-app (WebSocket)
    // Email if configured
    // Return notification
  }
}
```

3. **In-App Delivery** (WebSocket for real-time)
```javascript
// api/lib/websocket.js
function sendNotification(userId, notification) {
  const socket = getUserSocket(userId);
  if (socket) {
    socket.emit('notification', {
      ...notification,
      // Pre-formatted for display
      timestamp: formatTime(notification.createdAt),
      priorityIcon: getPriorityIcon(notification.priority),
      priorityColor: getPriorityColor(notification.priority)
    });
  }
}
```

#### Day 4: Frontend Notification UI
**Duration:** Full day

1. **Notification Component** (rich, contextual)
```tsx
<Notification>
  <Header>
    <PriorityBadge priority="critical" />
    <Title>Molding Stage Delayed</Title>
    <Time>5 minutes ago</Time>
  </Header>
  
  <Context>
    <EntityChip type="project" code="PO-2025-123" name="ABC Toy Set" />
    <Location>Station 3, Room B</Location>
    <Assignee>Ramesh Kumar</Assignee>
  </Context>
  
  <Message>
    2.5 hours behind schedule
  </Message>
  
  <Impact level="high">
    ⏰ Cutoff in 18 hours (Red zone)
  </Impact>
  
  <Actions>
    <PrimaryButton href="/stations/123">
      View Station →
    </PrimaryButton>
    <SecondaryButton href="/messages/user_456">
      Contact Ramesh
    </SecondaryButton>
    <SecondaryButton href="/optimize/project_789">
      See Alternatives
    </SecondaryButton>
  </Actions>
  
  <Footer>
    <DismissButton />
    <MarkReadButton />
  </Footer>
</Notification>
```

2. **Notification Center** (grouped, filterable)
```tsx
<NotificationCenter>
  <Filters>
    <Tab active>All (12)</Tab>
    <Tab>Critical (3)</Tab>
    <Tab>Unread (5)</Tab>
  </Filters>
  
  <Groups>
    <Group label="Right Now" count={3}>
      {/* Critical, needs attention */}
    </Group>
    
    <Group label="Today" count={5}>
      {/* Less urgent */}
    </Group>
    
    <Group label="Earlier" count={4}>
      {/* Older notifications */}
    </Group>
  </Groups>
</NotificationCenter>
```

**✅ CORE NOTIFICATION SYSTEM COMPLETE**

---

### 📧 Phase 3: Email Intake (Day 5+) - After MFA Priority

This can wait until MFA is rock-solid. When ready:

**Day 5:** IMAP integration + email polling
**Day 6:** Inbox UI + classification
**Day 7:** Entity creation shortcuts

---

## 🎨 NOTIFICATION TEMPLATES (Examples with Context)

### 1. QC Failure
```javascript
await notify({
  type: 'qc_failure',
  priority: 'high',
  title: 'QC Failure: Pantone Mismatch',
  message: 'Batch failed color verification',
  
  entityType: 'batch',
  entityId: batch.id,
  entityName: 'Batch #PRJ-2025-10-23-A-001',
  entityCode: batch.code,
  
  assignedTo: qcInspector.name,
  location: `Station ${station.code}, ${room.name}`,
  
  primaryAction: {
    label: 'View QC Report',
    url: `/qc/batch/${batch.id}`,
    type: 'navigate'
  },
  secondaryActions: [
    { label: 'View Photos', url: `/qc/batch/${batch.id}/photos`, type: 'modal' },
    { label: 'Contact Supervisor', url: `/messages/${supervisor.id}`, type: 'modal' },
    { label: 'See Similar Issues', url: `/qc/history?pantone=${batch.pantone}`, type: 'navigate' }
  ],
  
  impactLevel: 'Blocks 500 units from next stage',
  impactDetails: {
    unitsAffected: 500,
    batchSize: 1000,
    failureRate: '50%',
    pantoneTarget: 'PMS 185C',
    pantoneActual: 'PMS 186C'
  }
});
```

### 2. Cutoff Warning
```javascript
await notify({
  type: 'cutoff_warning',
  priority: 'critical',
  title: 'CRITICAL: Cutoff Risk',
  message: 'Project behind schedule, cutoff in 18 hours',
  
  entityType: 'project',
  entityId: project.id,
  entityName: project.name,
  entityCode: project.poNumber,
  
  assignedTo: projectManager.name,
  location: `Multiple stations (${delayedStations.length} delayed)`,
  
  primaryAction: {
    label: 'View Timeline',
    url: `/projects/${project.id}/timeline`,
    type: 'navigate'
  },
  secondaryActions: [
    { label: 'See Recovery Options', url: `/optimize/project/${project.id}`, type: 'navigate' },
    { label: 'Add Shift', url: `/projects/${project.id}/add-shift`, type: 'modal' },
    { label: 'Reallocate Resources', url: `/projects/${project.id}/reallocate`, type: 'modal' }
  ],
  
  impactLevel: 'Will miss cutoff by 2 hours',
  impactDetails: {
    cutoffAt: project.cutoffDate,
    hoursRemaining: 18,
    hoursNeeded: 20,
    deficit: 2,
    ragStatus: 'red',
    delayedStages: ['Molding', 'Painting']
  }
});
```

### 3. Daily Plan Ready
```javascript
await notify({
  type: 'daily_plan_ready',
  priority: 'medium',
  title: 'Daily Plan Ready for Review',
  message: 'Tomorrow\'s station allocations need approval',
  
  entityType: 'daily_plan',
  entityId: plan.id,
  entityName: `Plan for ${formatDate(plan.date)}`,
  
  assignedTo: leadSupervisor.name,
  location: `${plan.rooms.length} rooms, ${plan.stations.length} stations`,
  
  primaryAction: {
    label: 'Review Plan',
    url: `/plans/${plan.id}/review`,
    type: 'navigate'
  },
  secondaryActions: [
    { label: 'See Changes from Yesterday', url: `/plans/${plan.id}/diff`, type: 'modal' },
    { label: 'Quick Approve', url: `/plans/${plan.id}/approve`, type: 'action' }
  ],
  
  impactLevel: 'Plan must be approved by 6 PM today',
  impactDetails: {
    dueBy: '18:00',
    totalTasks: plan.tasks.length,
    newTasks: plan.newTasks.length,
    changes: plan.changes.length
  }
});
```

---

## 🎯 SUCCESS CRITERIA

### ✅ MFA Complete When:
- [ ] User can enable MFA with QR code
- [ ] User receives email confirmation
- [ ] Login requires TOTP after password
- [ ] Backup codes work
- [ ] Device trust works (skip MFA for 30 days)
- [ ] All edge cases handled (lost phone, wrong code, etc.)

### ✅ Notification System Complete When:
- [ ] Every notification has WHAT, WHERE, WHO, IMPACT
- [ ] Every notification has at least 1 action
- [ ] User can navigate directly to relevant page
- [ ] Notifications group intelligently
- [ ] Critical notifications stand out
- [ ] User never asks "what do I do with this?"

---

## ⚡ VELOCITY TARGETS

- **Day 1:** Email service + MFA backend ✅
- **Day 2:** MFA frontend + testing ✅
- **Day 3:** Notification schema + service ✅
- **Day 4:** Notification UI complete ✅
- **Day 5:** Polish + edge cases ✅

**Total: 5 days to production-ready MFA + Notification foundation**

---

## � EMAIL CONTROL & SAFETY (CRITICAL REQUIREMENT)

### Super Admin Email Controls
**Purpose:** Prevent accidental emails during training and protect confidential information

#### System-Wide Controls (Super Admin Only)
```
Email Service Settings
├─ Outbound Email: [Enabled ✓] / [Disabled - Training Mode]
├─ Inbound Email:  [Enabled ✓] / [Disabled]
└─ When Disabled: Show "📧 Dummy email sent (training mode)" notification
```

#### User-Level Controls (Super Admin Only)
```
User: John Doe
├─ Outbound Email: [Enabled] / [Disabled ✓] (Default: Disabled for new users)
├─ Inbound Email:  [Enabled] / [Disabled ✓]
└─ Override System Settings: [No] / [Yes]
```

#### Default States:
- **System-Wide:** Disabled until production (training mode)
- **New Users:** Outbound disabled by default
- **Super Admin:** Always can send (cannot be disabled for own account)

#### Training Mode Behavior:
```javascript
// When email disabled:
await emailService.send({...}) 
→ Returns success but doesn't actually send
→ Creates EmailLog with status: 'dummy_training_mode'
→ Shows notification: "📧 Dummy email sent (training mode)"
→ User sees success, no spam sent to real addresses
```

#### Database Schema Addition:
```prisma
SystemSettings {
  emailOutboundEnabled  Boolean @default(false)
  emailInboundEnabled   Boolean @default(false)
}

User {
  emailOutboundEnabled  Boolean @default(false)  // New users can't send
  emailInboundEnabled   Boolean @default(false)
  emailOverrideSystem   Boolean @default(false)  // Can override system disable
}

EmailLog {
  status  String  // 'sent' | 'dummy_training_mode' | 'failed' | 'blocked_user_disabled'
}
```

#### Implementation Priority:
**MUST BE DONE BEFORE MFA TESTING**
- Add system settings table
- Add user email permission fields
- Add email control UI (Super Admin settings)
- Update emailService to check permissions
- Add "dummy sent" notifications

---

## 📋 REVISED IMPLEMENTATION ORDER

### Day 1 Morning: Email Service + Controls (3-4 hours)
1. **Email Permission System** (NEW - CRITICAL)
   - Database schema (SystemSettings, User fields)
   - Permission check middleware
   - Training mode logic
   
2. **Email Service with Safety**
   ```javascript
   async send({ to, subject, html }) {
     // 1. Check system-wide setting
     if (!systemSettings.emailOutboundEnabled) {
       return { success: true, mode: 'training', id: 'dummy-xxx' };
     }
     
     // 2. Check user permission (if userId provided)
     if (userId && !user.emailOutboundEnabled && !user.emailOverrideSystem) {
       return { success: false, error: 'Email disabled for user' };
     }
     
     // 3. Actually send via Resend
     return await resend.send({...});
   }
   ```
   
3. **Super Admin UI** (Email Settings Page)
   - System-wide toggle (Outbound/Inbound)
   - User management (enable/disable per user)
   - Training mode indicator
   
4. **MFA Email Templates** (as planned)

### Day 1 Afternoon: MFA Implementation (with email safety)
- Generate QR, verify TOTP
- Send confirmation emails (respects training mode)
- Test with training mode ON (no real emails)
- Enable for production when ready

---

## 🚫 OUT OF SCOPE (For Now)

- Email digests (later)
- SMS notifications (later)
- Push notifications (later)
- Advanced analytics (later)

## ✅ MUST DO AFTER MFA:
1. **Inbound Email System** (high priority)
   - IMAP integration
   - Email inbox UI
   - Entity creation from emails
   
2. **Outbound Email Templates** (expand)
   - All notification types
   - Customizable templates
   - Brand customization

---

## 🎨 DESIGN PRINCIPLE CHECKLIST

Before creating ANY notification, ask:
1. ✅ **WHAT** is the issue? (Clear, specific title)
2. ✅ **WHERE** is it? (Entity, location, station)
3. ✅ **WHO** is responsible? (Assignee, role)
4. ✅ **WHY** does it matter? (Impact, consequence)
5. ✅ **WHAT** can user do? (Primary action + alternatives)

If any answer is missing → redesign the notification.

---

**READY TO START? Let's build MFA + Email foundation NOW.** 🚀

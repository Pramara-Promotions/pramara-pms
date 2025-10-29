# 📧 Unified Notification & Email Architecture
**Purpose:** Flexible, user-configurable notification system supporting both in-app and email delivery  
**Last Updated:** October 23, 2025  
**Status:** Design Phase - Ready for Implementation

---

## 🎯 CORE PRINCIPLE

**User Choice:** Every notification type can be delivered via:
- ✅ In-app notification (bell icon, toast)
- ✅ Email
- ✅ Both
- ✅ Neither (disabled)

**Customizable per:**
- User preference (global settings)
- Notification type/category
- Project-specific overrides
- Role-based defaults

---

## 📨 DUAL FLOW: INCOMING + OUTGOING

### 1️⃣ INCOMING EMAILS (From Blueprint - Email Intake)

**Purpose:** Turn incoming emails into actionable items in PMS

#### Sources:
- **Client emails** → Auto-create projects, change requests
- **Vendor emails** → Compliance documents, test reports
- **Internal emails** → Approvals, escalations

#### Flow:
```
Incoming Email → Email Parser → AI Classification → Create Entity
                                                    ↓
                        Link source email to: PO / Document / Change / Compliance / Variance
```

#### Implementation (from your blueprint):
- **M1:** Email Account Integration (IMAP/OAuth)
- **M2:** Email Ingestion Service (poll every 5-30 min)
- **M3:** Email Inbox UI (categorized, actionable)
- **M4:** Entity Creation Shortcuts (from email → PO/Document/etc.)

#### Database Schema (from blueprint):
```prisma
EmailAccount {
  id, email, provider, imapConfig, oauthToken
  lastSync, isActive
}

IncomingEmail {
  id, accountId, messageId, from, to, subject
  body, attachments[], receivedAt, processed
  category (client|vendor|internal|spam)
  sentiment?, priority?
}

// Links
Project.sourceEmailId → IncomingEmail
Document.sourceEmailId → IncomingEmail
ComplianceDoc.sourceEmailId → IncomingEmail
ChangeRequest.sourceEmailId → IncomingEmail
```

---

### 2️⃣ OUTGOING NOTIFICATIONS (User-Configurable)

**Purpose:** Deliver alerts/updates to users via their preferred channel(s)

#### Architecture:
```
Event Trigger → Notification Service → User Preferences Check
                                       ↓
                        ┌──────────────┴──────────────┐
                        ↓                             ↓
                   In-App Queue                   Email Queue
                   (via WebSocket)                (via Resend)
```

---

## 🏗️ SYSTEM ARCHITECTURE

### Notification Service (Central Hub)

```javascript
class NotificationService {
  async notify({
    userId,          // or userIds[]
    type,            // 'qc_failure', 'cutoff_warning', etc.
    category,        // 'execution', 'compliance', 'cost', etc.
    priority,        // 'low', 'medium', 'high', 'critical'
    title,
    message,
    data,            // structured payload
    actionUrl,       // deep link
    channels         // override: ['inapp', 'email'] or null (use prefs)
  }) {
    // 1. Get user preferences
    const prefs = await getUserNotificationPrefs(userId, type, category);
    
    // 2. Determine delivery channels
    const deliveryChannels = channels || prefs.channels;
    
    // 3. Create notification record
    const notification = await createNotification({...});
    
    // 4. Deliver based on channels
    if (deliveryChannels.includes('inapp')) {
      await deliverInApp(notification);
    }
    if (deliveryChannels.includes('email')) {
      await deliverEmail(notification);
    }
    
    // 5. Log delivery
    await logDelivery(notification);
  }
}
```

---

## 📋 DATABASE SCHEMA

### Core Tables

```prisma
// ============================================
// NOTIFICATION SYSTEM
// ============================================

NotificationCategory {
  id              String   @id
  name            String   // Execution, Compliance, Cost, Timeline, etc.
  description     String?
  icon            String?
  color           String?
  defaultChannels String[] // ['inapp', 'email']
  createdAt       DateTime @default(now())
}

NotificationType {
  id              String   @id
  categoryId      String
  name            String   // qc_failure, cutoff_warning, etc.
  displayName     String   // "QC Failure Alert"
  description     String?
  template        String   // Template name for email
  defaultChannels String[] // ['inapp', 'email']
  priority        String   // low, medium, high, critical
  
  category        NotificationCategory @relation(fields: [categoryId], references: [id])
}

UserNotificationPreference {
  id              String   @id
  userId          String
  typeId          String?  // null = global default
  categoryId      String?  // null = all categories
  
  // Delivery channels
  enableInApp     Boolean  @default(true)
  enableEmail     Boolean  @default(true)
  enableSMS       Boolean  @default(false) // future
  
  // Email preferences
  emailImmediate  Boolean  @default(false) // send immediately
  emailDigest     String?  // 'hourly', 'daily', 'weekly', null
  quietHoursStart Int?     // 22 (10 PM)
  quietHoursEnd   Int?     // 8 (8 AM)
  
  user            User     @relation(fields: [userId], references: [id])
  type            NotificationType? @relation(fields: [typeId], references: [id])
  category        NotificationCategory? @relation(fields: [categoryId], references: [id])
  
  @@unique([userId, typeId])
  @@index([userId])
}

Notification {
  id              String   @id @default(cuid())
  userId          String
  typeId          String
  
  // Content
  title           String
  message         String
  data            Json?    // structured payload
  actionUrl       String?  // deep link to relevant page
  
  // Metadata
  priority        String   // low, medium, high, critical
  category        String   // for filtering
  relatedEntity   String?  // 'project', 'batch', 'task', etc.
  relatedId       String?  // entity ID
  
  // Delivery tracking
  channels        String[] // ['inapp', 'email']
  inAppDelivered  Boolean  @default(false)
  emailDelivered  Boolean  @default(false)
  inAppReadAt     DateTime?
  emailOpenedAt   DateTime?
  
  // State
  dismissed       Boolean  @default(false)
  dismissedAt     DateTime?
  expiresAt       DateTime?
  
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id])
  type            NotificationType @relation(fields: [typeId], references: [id])
  
  @@index([userId, createdAt])
  @@index([userId, dismissed])
}

NotificationDeliveryLog {
  id              String   @id @default(cuid())
  notificationId  String
  channel         String   // 'inapp', 'email', 'sms'
  status          String   // 'pending', 'sent', 'failed', 'bounced'
  error           String?
  metadata        Json?    // provider response, tracking info
  attemptedAt     DateTime @default(now())
  
  notification    Notification @relation(fields: [notificationId], references: [id])
  
  @@index([notificationId])
}

// ============================================
// EMAIL SYSTEM
// ============================================

EmailTemplate {
  id              String   @id
  name            String   @unique
  subject         String
  htmlBody        String   // with {{variables}}
  textBody        String?
  variables       String[] // ['userName', 'projectName', etc.]
  category        String
  version         Int      @default(1)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

OutgoingEmail {
  id              String   @id @default(cuid())
  notificationId  String?  // link to notification if triggered by one
  
  // Recipients
  to              String[] // can be multiple
  cc              String[]
  bcc             String[]
  from            String   // override default sender
  replyTo         String?
  
  // Content
  subject         String
  htmlBody        String
  textBody        String?
  attachments     Json[]   // [{filename, url, contentType}]
  
  // Template
  templateId      String?
  templateData    Json?
  
  // Delivery
  status          String   // 'pending', 'sent', 'failed', 'bounced', 'opened'
  provider        String   @default('resend') // 'resend', 'ses', 'sendgrid'
  providerMsgId   String?  // external tracking ID
  sentAt          DateTime?
  openedAt        DateTime?
  clickedAt       DateTime?
  error           String?
  
  // Metadata
  priority        String   @default('normal')
  scheduledFor    DateTime? // for delayed send
  expiresAt       DateTime? // don't send if not sent by this time
  
  createdAt       DateTime @default(now())
  
  notification    Notification? @relation(fields: [notificationId], references: [id])
  
  @@index([status, scheduledFor])
  @@index([createdAt])
}

// ============================================
// INCOMING EMAIL (From Blueprint)
// ============================================

EmailAccount {
  id              String   @id @default(cuid())
  email           String   @unique
  provider        String   // 'gmail', 'outlook', 'imap'
  imapConfig      Json?    // {host, port, username, password}
  oauthToken      Json?    // encrypted OAuth token
  lastSyncAt      DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
}

IncomingEmail {
  id              String   @id @default(cuid())
  accountId       String
  messageId       String   @unique // email message-id header
  
  // Headers
  from            String
  to              String[]
  cc              String[]
  subject         String
  
  // Content
  body            String   @db.Text
  htmlBody        String?  @db.Text
  attachments     Json[]   // [{filename, url, size, contentType}]
  
  // Classification (AI/rules-based)
  category        String?  // 'client', 'vendor', 'internal', 'spam'
  sentiment       String?  // 'positive', 'neutral', 'negative', 'urgent'
  priority        String?  // 'low', 'normal', 'high'
  detectedIntent  String[] // ['new_po', 'change_request', 'complaint', etc.]
  
  // Processing
  processed       Boolean  @default(false)
  processedAt     DateTime?
  assignedTo      String?  // userId who should handle
  
  // Metadata
  receivedAt      DateTime
  inReplyTo       String?  // for threading
  references      String[] // for threading
  
  createdAt       DateTime @default(now())
  
  account         EmailAccount @relation(fields: [accountId], references: [id])
  assignedUser    User? @relation(fields: [assignedTo], references: [id])
  
  // Links to created entities
  projects        Project[] @relation("EmailToProject")
  documents       Document[] @relation("EmailToDocument")
  changeRequests  ChangeRequest[] @relation("EmailToChange")
  
  @@index([accountId, receivedAt])
  @@index([processed])
}
```

---

## 🎨 USER INTERFACE

### 1. Notification Preferences Page

```
┌─────────────────────────────────────────┐
│ Notification Settings                   │
├─────────────────────────────────────────┤
│                                         │
│ Global Settings                         │
│ ☑ Enable in-app notifications          │
│ ☑ Enable email notifications           │
│ ☐ Group emails into digest             │
│   └─ Frequency: [Daily ▼]              │
│                                         │
│ Quiet Hours (no emails)                 │
│ From: [22:00] To: [08:00]              │
│                                         │
├─────────────────────────────────────────┤
│ By Category                             │
├─────────────────────────────────────────┤
│                                         │
│ Execution & Operations                  │
│ ☑ In-App  ☑ Email  [Immediate ▼]      │
│                                         │
│ Timeline & Cutoffs                      │
│ ☑ In-App  ☑ Email  [Immediate ▼]      │
│                                         │
│ QC & Compliance                         │
│ ☑ In-App  ☐ Email  [Digest    ▼]      │
│                                         │
│ Cost & Advisory                         │
│ ☑ In-App  ☐ Email  [Disabled  ▼]      │
│                                         │
│ [+ Customize Specific Types]            │
│                                         │
└─────────────────────────────────────────┘
```

### 2. In-App Notification Center

```
┌─────────────────────────────────────────┐
│ 🔔 Notifications         [Mark all read]│
├─────────────────────────────────────────┤
│ Filter: [All ▼] [Unread ▼] [Critical ▼]│
├─────────────────────────────────────────┤
│                                         │
│ 🔴 CRITICAL                             │
│ Cutoff Alert: Project XYZ               │
│ 2 hours behind schedule                 │
│ [View Details →]                2m ago  │
│                                         │
│ ⚠️  HIGH                                │
│ QC Failure: Pantone Mismatch            │
│ Batch #PRJ-123 needs review             │
│ [View Photos →]                 15m ago │
│                                         │
│ 📊 MEDIUM                               │
│ Daily Plan Ready for Review             │
│ Station allocations updated             │
│ [Approve Plan →]                1h ago  │
│                                         │
│ ℹ️  LOW                                 │
│ Document Uploaded                       │
│ Compliance cert for Project ABC         │
│ [View Document →]               3h ago  │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Email Inbox (Incoming)

```
┌─────────────────────────────────────────┐
│ 📧 Email Inbox         [Sync Now]       │
├─────────────────────────────────────────┤
│ Filter: [All ▼] [Client ▼] [Unread ▼]  │
├─────────────────────────────────────────┤
│                                         │
│ 🟢 CLIENT - High Priority               │
│ From: client@acme.com                   │
│ Subject: Change Request - Project XYZ   │
│ Detected: New change request, urgent    │
│ [Create Change Request] [Assign] [Archive]│
│                              2h ago     │
│                                         │
│ 🟡 VENDOR                               │
│ From: lab@testcorp.com                  │
│ Subject: BIS Test Results - SKU-123     │
│ Detected: Compliance document, pass     │
│ Attachments: report.pdf (2.3 MB)        │
│ [Create Document] [Link to Project]     │
│                              Yesterday  │
│                                         │
│ ⚪ INTERNAL                             │
│ From: ops@pramara.com                   │
│ Subject: Re: Shipment schedule          │
│ [View Thread] [Reply]        2 days ago │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 NOTIFICATION TYPES (Examples - User Can Add More)

### Category: Execution & Operations
- `shift_report_ready` - Daily shift report available
- `qc_failure_high` - QC failure rate exceeds threshold
- `qc_pantone_mismatch` - Pantone color mismatch detected
- `manpower_shortage` - Not enough operators assigned
- `station_downtime` - Station/machine down for > X minutes
- `batch_ready_qc` - Batch ready for QC inspection
- `daily_plan_review` - Daily plan needs lead approval

### Category: Timeline & Cutoffs
- `cutoff_critical` - < 24h to cutoff, behind schedule
- `cutoff_warning` - < 48h to cutoff, amber zone
- `cutoff_approaching` - < 72h to cutoff, heads up
- `schedule_slip` - Task delayed, immediate reforecast
- `buffer_depleted` - Time buffer consumed
- `rag_change` - Status changed (Green→Amber, Amber→Red)
- `multi_project_conflict` - Resource conflict detected

### Category: Pre-Production & Compliance
- `approval_required` - Awaiting your approval
- `approval_granted` - Your request approved
- `approval_rejected` - Your request rejected
- `compliance_uploaded` - New compliance doc uploaded
- `compliance_expiring` - Certificate expires in X days
- `lab_test_complete` - Test results available
- `mold_trial_scheduled` - Trial scheduled for date/time

### Category: Cost & Advisory
- `pl_threshold_breach` - P&L exceeds variance threshold
- `cost_variance_high` - Actual cost > X% over standard
- `optimization_ready` - New recommendations available
- `scenario_complete` - What-if simulation results ready
- `budget_warning` - Project approaching budget limit

### Category: Audit & Security
- `audit_flagged` - Action flagged for review
- `security_alert` - Suspicious activity detected
- `version_change` - Scope/qty/artwork changed
- `permission_granted` - New permission assigned
- `device_login` - New device login detected
- `session_revoked` - Session terminated by admin

---

## 🔄 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
- ✅ Database schema (NotificationCategory, Type, UserPref, Notification)
- ✅ Notification Service (core logic)
- ✅ Email Service abstraction (Resend integration)
- ✅ Basic templates (invitation, password reset)
- ✅ In-app notification UI (bell icon, dropdown)

### Phase 2: User Configuration (Week 2-3)
- ✅ Notification preferences page
- ✅ Category-level controls
- ✅ Type-level overrides
- ✅ Quiet hours
- ✅ Digest mode

### Phase 3: Email Intake (Week 3-4)
- ✅ Email account integration (IMAP/OAuth)
- ✅ Email ingestion service (polling)
- ✅ Email inbox UI
- ✅ AI classification (basic rules → ML later)
- ✅ Entity creation shortcuts (email → PO/Document/etc.)

### Phase 4: Integration (Week 4-5)
- ✅ Hook notification triggers into existing features
- ✅ QC failure → notification
- ✅ Cutoff warning → notification
- ✅ Audit flagged → notification
- ✅ Email templates for all types

### Phase 5: Advanced (Week 5-6)
- ✅ Email threading (replies)
- ✅ Sentiment analysis (AI)
- ✅ Smart categorization
- ✅ Notification analytics dashboard
- ✅ Email performance tracking (open rates, click rates)

---

## 🎯 CONFIGURATION FLEXIBILITY

### Admin Controls (System-Wide Defaults)

```
┌─────────────────────────────────────────┐
│ System Notification Settings (Admin)   │
├─────────────────────────────────────────┤
│                                         │
│ Default Delivery Channels               │
│ [x] In-app  [x] Email  [ ] SMS         │
│                                         │
│ Critical Notifications                  │
│ Always send via: [All Channels ▼]      │
│ Override user preferences: [Yes ▼]      │
│                                         │
│ Email Settings                          │
│ From Name: [Pramara PMS]               │
│ From Email: [noreply@pramara.com]      │
│ Reply-To: [support@pramara.com]        │
│                                         │
│ Branding                                │
│ Logo: [Upload]                          │
│ Primary Color: [#4F46E5]               │
│ Footer Text: [...]                      │
│                                         │
│ [+ Add Custom Notification Type]       │
│                                         │
└─────────────────────────────────────────┘
```

### Project-Level Overrides

```
Project XYZ → Settings → Notifications
├─ Cutoff warnings: Email to client + PM
├─ QC failures: In-app only (no email spam)
├─ Cost alerts: Email to finance team
└─ Daily reports: Auto-send at 08:00 to stakeholders
```

---

## 📊 ANALYTICS & INSIGHTS

### Notification Dashboard (Admin)

```
┌─────────────────────────────────────────┐
│ Notification Analytics (Last 30 Days)  │
├─────────────────────────────────────────┤
│                                         │
│ Total Sent: 12,450                      │
│ ├─ In-App: 12,450 (100%)               │
│ ├─ Email:   3,200 (26%)                │
│ └─ SMS:         0 (0%)                  │
│                                         │
│ Delivery Success Rate: 99.2%            │
│ Email Open Rate: 62%                    │
│ Avg. Time to Read: 15 minutes           │
│                                         │
│ Top Notification Types                  │
│ 1. QC Failures          2,340           │
│ 2. Daily Plans          1,890           │
│ 3. Cutoff Warnings        980           │
│                                         │
│ User Engagement                          │
│ High:  120 users (read within 1h)      │
│ Medium: 45 users (read within 24h)     │
│ Low:    12 users (read after 24h)      │
│ None:    3 users (never read)          │
│                                         │
└─────────────────────────────────────────┘
```

---

## � EMAIL SAFETY & TRAINING MODE (CRITICAL)

### Super Admin Controls - Prevent Accidental Emails

**Problem:** During training, users might accidentally spam real email addresses or leak confidential info.

**Solution:** System-wide and user-level email controls

```prisma
SystemSettings {
  emailOutboundEnabled  Boolean @default(false)  // Training mode by default
  emailInboundEnabled   Boolean @default(false)
  emailTestMode         Boolean @default(true)   // Show dummy notifications
}

User {
  emailOutboundEnabled  Boolean @default(false)  // New users blocked
  emailInboundEnabled   Boolean @default(false)
  emailOverrideSystem   Boolean @default(false)  // Can override system-wide disable
}
```

### Training Mode Flow:
```
User triggers email → Email Service checks permissions
                      ↓
    ┌─────────────────┴─────────────────┐
    ↓                                   ↓
System Disabled?                  User Disabled?
    ↓                                   ↓
Show "Dummy Email Sent" 🎓        Block + Show Error
No actual email sent              "Email disabled for account"
Log as 'training_mode'
```

### Super Admin UI:
```
┌──────────────────────────────────────┐
│ Email Service Controls               │
├──────────────────────────────────────┤
│ System-Wide                          │
│ 🎓 Training Mode: [ON ✓] [OFF]      │
│    └─ All emails are dummy           │
│                                      │
│ Outbound Email: [Enabled] [Disabled]│
│ Inbound Email:  [Enabled] [Disabled]│
│                                      │
│ ⚠️  Currently in Training Mode       │
│    0 real emails sent today          │
│    47 dummy emails simulated         │
│                                      │
├──────────────────────────────────────┤
│ User Permissions                     │
├──────────────────────────────────────┤
│ Search: [_____________] 🔍           │
│                                      │
│ John Doe (john@example.com)         │
│   Outbound: [🔴 Disabled]           │
│   Inbound:  [🔴 Disabled]           │
│   [Enable Emails]                    │
│                                      │
│ Jane Smith (jane@example.com)       │
│   Outbound: [🟢 Enabled]            │
│   Inbound:  [🟢 Enabled]            │
│   Override System: [✓]              │
│   [Disable Emails]                   │
│                                      │
└──────────────────────────────────────┘
```

### Default States:
- **New Installation:** Training mode ON
- **New Users:** Email disabled
- **Super Admin:** Always enabled (cannot be disabled for own account)
- **Production Ready:** Super Admin enables system-wide, then per-user

---

## �🚀 NEXT STEPS

1. **Email Safety System** (BEFORE anything else)
   - SystemSettings table
   - User email permission fields
   - Permission check middleware
   - Training mode logic
   - Super Admin UI
   
2. **Implement Core Schema** (Notification tables)
3. **Build Notification Service** (central logic)
4. **Resend Integration** (email delivery with safety checks)
5. **In-App UI** (bell icon, notification center)
6. **User Preferences** (settings page)
7. **Email Intake** (IMAP polling, inbox UI) - AFTER MFA complete
8. **Hook into Existing Features** (trigger notifications)
9. **Templates & Branding** (email design)

---

**Key Principles:** 
1. Everything is configurable. Users decide what, when, and how they get notified.
2. **SAFETY FIRST:** Training mode prevents accidental emails during setup/training.
3. System provides smart defaults but never forces.

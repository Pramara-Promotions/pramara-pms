# 🎯 COMPLETE IMPLEMENTATION CHECKLIST - OPTION C
## All Pre-Phase 4 Work + Phase 3/4/6/7 Notification System

**Date:** October 29, 2025  
**Total Items:** 28 tasks  
**Estimated Time:** 25-30 hours  
**Exclusions:** Document Intelligence, Inbound Email (Phase 5)

---

## 📋 MASTER TASK LIST

### 🔒 TIER 1: CRITICAL SECURITY FEATURES (3 tasks - 2.5 hours)

#### ✅ Task 1: MFA Login 2FA Verification Screen
**Status:** ⬜ Not Started  
**Files to Modify:**
- `web/src/pages/Login.tsx`

**Requirements:**
- Two-step login flow:
  1. Enter email + password → validate credentials
  2. If user.mfaEnabled → show TOTP code input (6 digits)
  3. Submit with code parameter → complete login
- Backend already supports `code` param in `/api/auth/login`
- Show "Enter 6-digit code from authenticator app" message
- Add error handling for invalid TOTP codes

**Acceptance Criteria:**
- [ ] Login page shows password step first
- [ ] After password validation, if MFA enabled, show code input
- [ ] Code input accepts 6 digits
- [ ] Successful code verification completes login
- [ ] Invalid code shows error message
- [ ] Can navigate back to password step

---

#### ✅ Task 2: User Invitation Accept Page
**Status:** ⬜ Not Started  
**Files to Create:**
- `web/src/pages/AcceptInvite.tsx` (NEW)

**Files to Modify:**
- `web/src/app-router.tsx` (add route)

**Requirements:**
- Create `/invite/:token` route
- Page components:
  - Company logo
  - Welcome message with user email (from token validation)
  - Password input (min 8 chars)
  - Confirm password input
  - "Accept Invitation" button
  - Token expiry notice (7 days from sent)
- Backend endpoints already exist:
  - GET `/api/invite/:token` - Validate token, return user email
  - POST `/api/invite/:token/accept` - Set password, activate user

**Acceptance Criteria:**
- [ ] Page loads at /invite/:token
- [ ] Shows user email from token validation
- [ ] Password requirements enforced (min 8 chars)
- [ ] Passwords must match
- [ ] Expired tokens show error message
- [ ] Invalid tokens show error message
- [ ] Successful acceptance redirects to login
- [ ] Shows token expiry warning if < 24 hours remaining

---

#### ✅ Task 3: Audit Log 15-Day Policy UI Banner
**Status:** ⬜ Not Started  
**Files to Modify:**
- Find audit log page (likely `web/src/pages/admin/AuditLogs.tsx` or similar)

**Requirements:**
- Add informational banner at top of audit log page
- Explain immutability policy:
  - "All audit logs are immutable and cannot be edited or deleted"
  - "Minimum 15-day retention enforced system-wide"
  - "You can view logs within your retention period (X days)"
  - "Super Admins have perpetual access to all logs"
- Blue info styling (not warning/error)
- Icon: info circle or lock
- Dismissible (store preference in localStorage)

**Acceptance Criteria:**
- [ ] Banner shows at top of audit log page
- [ ] Displays user's retention period
- [ ] Shows Super Admin perpetual access message (if Super Admin)
- [ ] Can be dismissed
- [ ] Stays dismissed across sessions (localStorage)
- [ ] Responsive on mobile

---

### 📧 TIER 2: NOTIFICATION SYSTEM - PHASE 3 COMPLETION (2 tasks - 2.5 hours)

#### ✅ Task 4: NotificationBell Component (Basic)
**Status:** ⬜ Not Started  
**Files to Create:**
- `web/src/components/notifications/NotificationBell.tsx` (NEW)

**Files to Modify:**
- `web/src/components/layout/AppLayout.tsx` (import and render)

**Requirements:**
- Bell icon component (lucide-react: Bell, BellDot)
- Unread count badge (red circle with number)
- Click handler to open NotificationCenter
- Fetch unread count from `/api/notifications?unreadOnly=true`
- Poll every 30 seconds OR integrate with WebSocket later
- Basic version (will be enhanced in Task 8)

**Acceptance Criteria:**
- [ ] Bell icon appears in header (top-right)
- [ ] Shows unread count badge if > 0
- [ ] Badge turns red when unread > 0
- [ ] Click opens notification center
- [ ] Unread count updates automatically
- [ ] Responsive positioning

---

#### ✅ Task 5: NotificationCenter Component (Basic)
**Status:** ⬜ Not Started  
**Files to Create:**
- `web/src/components/notifications/NotificationCenter.tsx` (NEW)

**Requirements:**
- Sliding panel from right side
- Backdrop overlay (semi-transparent black)
- Header: "Notifications" title + close button
- Filter tabs: All / Unread
- Notification list:
  - Type icon (based on notification.type)
  - Title + message
  - Timestamp (relative: "5 minutes ago")
  - Read/unread indicator (bold if unread)
- Actions:
  - Mark as read button (per notification)
  - Mark all as read button (top)
  - Delete button (per notification)
- Empty state: "No notifications"
- Basic version (will be enhanced in Task 8)

**Acceptance Criteria:**
- [ ] Panel slides in from right when opened
- [ ] Backdrop closes panel when clicked
- [ ] Filter tabs work (All/Unread)
- [ ] Notifications display correctly
- [ ] Mark as read updates UI immediately
- [ ] Mark all as read updates badge
- [ ] Delete removes notification
- [ ] Empty state shows when no notifications
- [ ] Scrollable list if > 10 notifications

---

### 🚀 TIER 3: NOTIFICATION SYSTEM - PHASE 4 ADVANCED (6 tasks - 7 hours)

#### ✅ Task 6: Enhanced Notification Model (Prisma Migration)
**Status:** ⬜ Not Started  
**Files to Modify:**
- `prisma/schema.prisma`

**Requirements:**
- Add new fields to Notification model:
  ```prisma
  // Context (WHO/WHAT/WHERE)
  entityType     String?  // 'project', 'batch', 'document', 'qc', etc.
  entityId       String?  // ID of linked entity
  entityName     String?  // Display name
  entityCode     String?  // Project code, batch code, etc.
  assignedTo     String?  // userId who should handle
  location       String?  // Room, station, factory
  
  // Actions (guidance)
  primaryAction     String?  // "Approve", "Review", "Acknowledge"
  primaryActionUrl  String?  // URL to navigate to
  primaryActionType String?  // "navigate", "approve", "dismiss"
  secondaryActions  Json?    // Array of {label, url, type}
  
  // Impact (consequences)
  priority      String   @default("medium") // low/medium/high/critical
  impactLevel   String?  // "Delay", "Cost", "Quality", "Safety"
  impactDetails String?  // Description of consequences
  
  // State
  readAt        DateTime?
  dismissed     Boolean  @default(false)
  dismissedAt   DateTime?
  expiresAt     DateTime?
  ```
- Add indexes for performance:
  ```prisma
  @@index([entityType, entityId])
  @@index([priority])
  @@index([dismissed])
  @@index([expiresAt])
  ```
- Run migration: `npx prisma migrate dev --name enhance_notifications_phase4`

**Acceptance Criteria:**
- [ ] Schema updated with all new fields
- [ ] Migration file created
- [ ] Migration runs successfully
- [ ] Database schema updated
- [ ] Prisma client regenerated
- [ ] Existing notifications remain intact

---

#### ✅ Task 7: notificationService.js (Context-Rich Notifications)
**Status:** ⬜ Not Started  
**Files to Create:**
- `api/lib/notificationService.js` (NEW)

**Requirements:**
- Service class with helper methods:
  ```javascript
  class NotificationService {
    // Generic creation
    async createNotification({ userId, type, title, message, options })
    
    // Specialized templates
    async notifyCutoffWarning({ userId, project, hoursRemaining, hoursNeeded, delayedStages })
    async notifyQCFailure({ userId, batch, station, room, qcInspector, supervisor, failureDetails })
    async notifyDailyPlanReady({ userId, plan, leadSupervisor })
    async notifyDocumentApproval({ userId, document, uploadedBy, requiresAction })
    async notifyPasswordReset({ userId, resetBy, method })
    async notifyMFAStatusChanged({ userId, enabled, changedBy })
    async notifyRoleChanged({ userId, action, roleName, changedBy })
    
    // Real-time emit (uses global.io)
    _emitRealtime(notification)
    
    // Email integration (critical notifications)
    async _sendEmailIfCritical(notification)
  }
  ```
- Import emailService for critical notifications
- Use global.io for WebSocket emit (when available)
- Gracefully degrade if WebSocket not connected

**Acceptance Criteria:**
- [ ] Service exports singleton instance
- [ ] All helper methods create notifications correctly
- [ ] Context fields populated (entityType, entityId, etc.)
- [ ] Actions defined (primaryAction, secondaryActions)
- [ ] Impact levels set appropriately
- [ ] Priority levels assigned correctly
- [ ] Real-time emit works when WebSocket available
- [ ] Critical notifications trigger emails
- [ ] Expires at set for time-sensitive notifications

---

#### ✅ Task 8: WebSocket Server (Socket.IO in server.js)
**Status:** ⬜ Not Started  
**Files to Modify:**
- `server.js`
- `api/package.json` (add socket.io dependency)

**Requirements:**
- Install `socket.io` package: `npm install socket.io`
- Initialize Socket.IO server:
  ```javascript
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });
  ```
- JWT authentication middleware:
  ```javascript
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // Verify JWT, attach user to socket
  });
  ```
- Connection handler:
  ```javascript
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    console.log(`WebSocket: User ${userId} connected`);
    
    socket.on('disconnect', () => {
      console.log(`WebSocket: User ${userId} disconnected`);
    });
  });
  ```
- Expose globally: `global.io = io;`
- Start server AFTER Express setup
- Log: "🔌 WebSocket server ready for real-time notifications"

**Acceptance Criteria:**
- [ ] socket.io package installed
- [ ] Socket.IO server initialized
- [ ] CORS configured for frontend
- [ ] JWT authentication working
- [ ] User rooms created on connect (`user:{userId}`)
- [ ] global.io accessible from services
- [ ] Connection/disconnection logged
- [ ] Multiple clients can connect simultaneously
- [ ] Reconnection handling works

---

#### ✅ Task 9: useNotifications Hook (Frontend WebSocket)
**Status:** ⬜ Not Started  
**Files to Create:**
- `web/src/hooks/useNotifications.ts` (NEW)

**Files to Modify:**
- `web/package.json` (add socket.io-client dependency)

**Requirements:**
- Install `socket.io-client`: `npm install socket.io-client`
- Custom hook managing WebSocket connection:
  ```typescript
  export function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [connected, setConnected] = useState(false);
    
    useEffect(() => {
      const token = getAuthToken();
      const socket = io(BACKEND_URL, { auth: { token } });
      
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('notification', (notif) => {
        // Add to list, update unread count
        // Show browser notification if permission granted
      });
      
      return () => socket.disconnect();
    }, []);
    
    const markAsRead = async (id) => { ... };
    const markAllAsRead = async () => { ... };
    const deleteNotification = async (id) => { ... };
    const fetchNotifications = async (filter) => { ... };
    
    return { notifications, unreadCount, connected, ... };
  }
  ```
- Request browser notification permission on first connect
- Handle reconnection gracefully
- Shared state for NotificationBell + NotificationCenter

**Acceptance Criteria:**
- [ ] socket.io-client package installed
- [ ] Hook connects to WebSocket server
- [ ] JWT token sent on connect
- [ ] Connection state tracked
- [ ] Real-time notifications received
- [ ] Notifications added to state immediately
- [ ] Unread count updates automatically
- [ ] Browser notifications show (if permitted)
- [ ] Reconnection works after disconnect
- [ ] Cleanup on unmount

---

#### ✅ Task 10: Enhanced NotificationBell (with WebSocket)
**Status:** ⬜ Not Started  
**Files to Modify:**
- `web/src/components/notifications/NotificationBell.tsx` (update from Task 4)

**Requirements:**
- Use `useNotifications()` hook instead of polling
- Real-time unread count updates
- Show connection status (dot indicator):
  - Green dot: Connected
  - Gray dot: Disconnected
  - Pulsing: Reconnecting
- Add tooltip: "X unread notifications"
- Animate badge when new notification arrives

**Acceptance Criteria:**
- [ ] Uses useNotifications hook
- [ ] Unread count updates in real-time
- [ ] Connection status indicator visible
- [ ] Tooltip shows count on hover
- [ ] Badge animates on new notification
- [ ] No polling (WebSocket only)

---

#### ✅ Task 11: Enhanced NotificationCenter (with WebSocket)
**Status:** ⬜ Not Started  
**Files to Modify:**
- `web/src/components/notifications/NotificationCenter.tsx` (update from Task 5)

**Requirements:**
- Use `useNotifications()` hook
- Add "Critical" filter tab (priority === 'critical')
- Priority badges:
  - 🔴 Critical
  - 🔶 High
  - ⚠️ Medium
  - ℹ️ Low
- Entity context boxes:
  - Show entityType icon + entityName
  - Show location if present
  - Show assigned user if present
- Impact warnings (if impactLevel present):
  - Red box with impact details
  - Icons: ⏰ Delay, 💰 Cost, 🏭 Quality, ⚠️ Safety
- Action buttons:
  - Primary action button (prominent)
  - Secondary actions (smaller buttons)
  - Navigate on click (use router)
- Mark as dismissed (instead of delete)
- Auto-dismiss expired notifications
- Real-time updates (new notifications appear instantly)

**Acceptance Criteria:**
- [ ] Uses useNotifications hook
- [ ] Critical filter tab shows only critical notifications
- [ ] Priority badges display correctly
- [ ] Entity context shows for linked notifications
- [ ] Impact warnings visible when present
- [ ] Primary action button prominent
- [ ] Secondary actions displayed
- [ ] Navigation works on action button click
- [ ] Dismiss instead of delete
- [ ] Expired notifications hidden automatically
- [ ] New notifications appear without refresh
- [ ] Smooth animations for new items

---

### 📨 TIER 4: EMAIL DIGESTS - PHASE 6 (1 task - 2.5 hours)

#### ✅ Task 12: emailDigestService.js (Cron Scheduler)
**Status:** ⬜ Not Started  
**Files to Create:**
- `api/lib/emailDigestService.js` (NEW)

**Files to Modify:**
- `server.js` (auto-start service)
- `api/package.json` (add node-cron dependency)

**Requirements:**
- Install `node-cron`: `npm install node-cron`
- Service with cron jobs:
  ```javascript
  class EmailDigestService {
    start() {
      // Daily digest: 8 AM every day
      cron.schedule('0 8 * * *', () => this.sendDailyDigests());
      
      // Weekly digest: Monday 8 AM
      cron.schedule('0 8 * * 1', () => this.sendWeeklyDigests());
    }
    
    async sendDailyDigests() {
      // Find users with daily preference
      // Get unread notifications from last 24h
      // Get recent activity summary
      // Send email with emailService
    }
    
    async sendWeeklyDigests() {
      // Find users with weekly preference
      // Get unread notifications from last 7 days
      // Get weekly activity summary
      // Send email with emailService
    }
  }
  ```
- Add user preference model (optional - default to weekly):
  ```prisma
  model UserPreferences {
    userId        String @id
    emailDigest   String @default("weekly") // "none", "daily", "weekly"
  }
  ```
- Email template with:
  - Unread notification count
  - Top 5 recent notifications
  - Quick action links
  - Unsubscribe option
- Auto-start in `server.js`: `emailDigestService.start();`
- Log: "📧 Email digest service started (Daily: 8 AM, Weekly: Mon 8 AM)"

**Acceptance Criteria:**
- [ ] node-cron package installed
- [ ] Service class created
- [ ] Daily cron job configured (8 AM)
- [ ] Weekly cron job configured (Monday 8 AM)
- [ ] User preferences model added (optional)
- [ ] Daily digest email template created
- [ ] Weekly digest email template created
- [ ] Unread notifications included
- [ ] Recent activity summarized
- [ ] Quick action links work
- [ ] Service auto-starts in server.js
- [ ] Logs confirm service running
- [ ] Can manually trigger for testing
- [ ] Respects user preferences (if implemented)

---

### 📊 TIER 5: EMAIL ANALYTICS - PHASE 7 (2 tasks - 4.5 hours)

#### ✅ Task 13: emailAnalyticsService.js (Tracking Backend)
**Status:** ⬜ Not Started  
**Files to Create:**
- `api/lib/emailAnalyticsService.js` (NEW)
- `api/routes/email-analytics.js` (NEW)

**Files to Modify:**
- `api/index.js` (register routes)
- `prisma/schema.prisma` (add EmailLog model if not exists)

**Requirements:**
- EmailLog model (if not exists):
  ```prisma
  model EmailLog {
    id          String   @id @default(cuid())
    recipient   String
    subject     String
    template    String?
    sentAt      DateTime @default(now())
    opened      Boolean  @default(false)
    openedAt    DateTime?
    clicked     Boolean  @default(false)
    clickedAt   DateTime?
    bounced     Boolean  @default(false)
    delivered   Boolean  @default(true)
  }
  ```
- Service methods:
  ```javascript
  class EmailAnalyticsService {
    async logEmail({ recipient, subject, template })
    async trackOpen(emailId) // Called by tracking pixel
    async trackClick(emailId, url) // Called by redirect
    async getDashboardMetrics({ timeRange }) // 24h, 7d, 30d
    async getTemplatePerformance()
  }
  ```
- Tracking endpoints:
  - GET `/api/email/track/open/:id` - Returns 1x1 transparent pixel
  - GET `/api/email/track/click/:id?url=...` - Redirects to URL, logs click
  - GET `/api/email-analytics/dashboard` - Returns metrics
- Dashboard metrics:
  ```javascript
  {
    totalSent: 1234,
    openRate: 45.2,
    clickRate: 12.8,
    bounceRate: 2.1,
    deliveryRate: 97.9,
    chartData: [...],
    templatePerformance: [...]
  }
  ```
- Modify emailService to embed tracking:
  - Add tracking pixel to HTML emails: `<img src="/api/email/track/open/:id" />`
  - Replace links with tracking URLs

**Acceptance Criteria:**
- [ ] EmailLog model added (if not exists)
- [ ] Service class created
- [ ] Email logging works on send
- [ ] Tracking pixel endpoint returns 1x1 image
- [ ] Click tracking redirects correctly
- [ ] Dashboard metrics calculated correctly
- [ ] Template performance aggregated
- [ ] Routes registered in api/index.js
- [ ] Tracking URLs embedded in emails
- [ ] Open tracking works (pixel loads)
- [ ] Click tracking works (redirects + logs)
- [ ] Metrics API returns correct data

---

#### ✅ Task 14: EmailAnalyticsDashboard.tsx (Metrics UI)
**Status:** ⬜ Not Started  
**Files to Create:**
- `web/src/pages/admin/EmailAnalyticsDashboard.tsx` (NEW)

**Files to Modify:**
- `web/src/app-router.tsx` (add route)
- `web/src/components/layout/AppLayout.tsx` (add nav link if needed)

**Requirements:**
- Dashboard layout:
  - **Summary Cards (top row):**
    - Emails Sent (with time filter: 24h, 7d, 30d)
    - Open Rate % (with trend indicator)
    - Click Rate % (with trend indicator)
    - Bounce Rate % (with trend indicator)
  - **Charts (middle section):**
    - Line chart: Email volume over time (last 30 days)
    - Pie chart: Template usage distribution
  - **Table (bottom section):**
    - Template performance table:
      - Template name
      - Sent count
      - Open rate %
      - Click rate %
      - Last sent (relative time)
    - Sortable columns
    - Pagination (10 per page)
- Time range selector: 24h / 7d / 30d (default: 7d)
- Refresh button
- Export to CSV button (optional)
- Use chart library: `recharts` or `chart.js`

**Acceptance Criteria:**
- [ ] Page renders at /analytics/email
- [ ] Summary cards display with correct metrics
- [ ] Time filter works (24h/7d/30d)
- [ ] Trend indicators show (up/down arrows)
- [ ] Line chart displays email volume
- [ ] Pie chart displays template distribution
- [ ] Template performance table populates
- [ ] Table columns sortable
- [ ] Pagination works
- [ ] Refresh button updates data
- [ ] Route added to router
- [ ] Navigation link added (if needed)
- [ ] Responsive on mobile
- [ ] Loading states shown
- [ ] Error handling implemented

---

### 🎨 TIER 6: SESSION MANAGEMENT ENHANCEMENTS (3 tasks - 2 hours)

#### ✅ Task 15: Trust Device Duration Input (EditUserModal)
**Status:** ⬜ Not Started  
**Files to Modify:**
- `web/src/features/admin/EditUserModal.tsx`
- `api/routes/admin.js` (if backend needs update)
- `prisma/schema.prisma` (add trustDeviceDuration to User model if not exists)

**Requirements:**
- Add field to User model (if not exists):
  ```prisma
  model User {
    trustDeviceDuration Int @default(30) // Days
  }
  ```
- Add input to EditUserModal (Security Actions section):
  - Label: "Trust Device Duration (Days)"
  - Input: number, min 1, max 365
  - Default: 30 days
  - Help text: "How long devices should remain trusted before re-verification"
- Update user on save
- Use this value when creating/updating Device records

**Acceptance Criteria:**
- [ ] User model has trustDeviceDuration field
- [ ] EditUserModal shows duration input
- [ ] Min/max validation works (1-365)
- [ ] Default value is 30
- [ ] Value saves correctly
- [ ] Help text explains purpose
- [ ] Backend uses this value for device trust expiry

---

#### ✅ Task 16: Active Sessions List (Account Page)
**Status:** ⬜ Not Started  
**Files to Modify:**
- `web/src/pages/Account.tsx` (add Sessions tab, separate from Devices)

**Files to Create:**
- `api/routes/auth.js` (add session endpoints if not exist)

**Requirements:**
- Add new tab: "Sessions" (separate from "Devices")
- Backend: Session model or JWT tracking:
  ```prisma
  model Session {
    id         String   @id @default(cuid())
    userId     String
    token      String   @unique
    ipAddress  String
    userAgent  String
    createdAt  DateTime @default(now())
    expiresAt  DateTime
    lastUsedAt DateTime @default(now())
    revoked    Boolean  @default(false)
  }
  ```
- Or: Track active JWTs in Redis/memory (simpler approach)
- Sessions tab shows:
  - Session ID (first 8 chars)
  - IP address
  - Browser info (from user-agent)
  - Created at (relative)
  - Last active (relative)
  - Expires at (relative)
  - "Current" badge (this session)
  - Revoke button (for other sessions)
- Endpoints:
  - GET `/api/auth/sessions` - List user sessions
  - DELETE `/api/auth/sessions/:id` - Revoke session

**Acceptance Criteria:**
- [ ] Sessions tab added to Account page
- [ ] Session model or tracking implemented
- [ ] Sessions list displays correctly
- [ ] Current session marked clearly
- [ ] IP and browser info shown
- [ ] Timestamps relative and accurate
- [ ] Revoke button works (other sessions only)
- [ ] Revoking session invalidates JWT
- [ ] Revoked user gets logged out
- [ ] Empty state shown if no other sessions

---

#### ✅ Task 17: Revoke Session Button
**Status:** ⬜ Not Started  
**Files to Modify:**
- `web/src/pages/Account.tsx` (UI button)
- `api/routes/auth.js` (revoke endpoint)

**Requirements:**
- "Revoke" button on each session (except current)
- Confirmation dialog: "Are you sure you want to revoke this session? The device will be logged out immediately."
- Backend revoke logic:
  - Mark session as revoked (if using Session model)
  - Add token to blacklist (if using JWT blacklist)
  - Send notification to affected user (optional)
- UI updates immediately after revoke
- Show success message
- If WebSocket connected, push logout to affected session

**Acceptance Criteria:**
- [ ] Revoke button visible on non-current sessions
- [ ] Confirmation dialog shows
- [ ] Backend revokes session correctly
- [ ] JWT invalidated (blacklist or Session.revoked)
- [ ] UI updates immediately
- [ ] Success message shown
- [ ] Affected user logged out on next request
- [ ] WebSocket push logout (if connected)
- [ ] Error handling for failed revokes

---

### 🧪 TIER 7: END-TO-END TESTING (1 task - 3 hours)

#### ✅ Task 18: Comprehensive E2E Testing
**Status:** ⬜ Not Started  

**Test Scenarios:**

1. **User Invitation Flow:**
   - [ ] Admin creates user with "Send Invitation"
   - [ ] Email received at user inbox
   - [ ] Click invitation link
   - [ ] AcceptInvite page loads with email
   - [ ] Set password (validation works)
   - [ ] Successful activation redirects to login
   - [ ] Login with new credentials

2. **Password Reset Flow (Email Method):**
   - [ ] Admin resets user password (email method)
   - [ ] Email received with temporary password
   - [ ] Login with temp password
   - [ ] Redirected to /change-password
   - [ ] SecurityAlertBanner shows
   - [ ] Change password succeeds
   - [ ] Banner visible for 7 days
   - [ ] Banner dismissible

3. **MFA Setup & 2FA Login:**
   - [ ] User enables MFA in Account page
   - [ ] QR code displayed
   - [ ] Scan with authenticator app
   - [ ] Enter 6-digit code to verify
   - [ ] MFA enabled, backup codes shown
   - [ ] Confirmation email received
   - [ ] Logout
   - [ ] Login with email + password
   - [ ] MFA screen shows
   - [ ] Enter TOTP code
   - [ ] Login successful

4. **Device Management:**
   - [ ] Login from new device
   - [ ] Device created automatically
   - [ ] View devices in Account page
   - [ ] Device shows browser, OS, IP
   - [ ] Revoke device
   - [ ] Device removed from list

5. **Session Management:**
   - [ ] Login from multiple browsers
   - [ ] View sessions in Account page
   - [ ] Current session marked
   - [ ] Other sessions listed
   - [ ] Revoke other session
   - [ ] Other browser logged out

6. **Audit Log Retention:**
   - [ ] Perform security action (password change)
   - [ ] Audit log created
   - [ ] View audit logs
   - [ ] 15-day policy banner shows
   - [ ] User sees own logs within retention
   - [ ] Super Admin sees all logs perpetually

7. **Notification System:**
   - [ ] WebSocket connects on login
   - [ ] Bell icon shows in header
   - [ ] Trigger notification (backend)
   - [ ] Bell badge updates in real-time
   - [ ] Click bell → NotificationCenter opens
   - [ ] Notification displays with context
   - [ ] Priority badge correct
   - [ ] Action buttons work
   - [ ] Mark as read updates badge
   - [ ] Browser notification shows (if permitted)

8. **Email Analytics:**
   - [ ] Navigate to /analytics/email
   - [ ] Dashboard loads with metrics
   - [ ] Summary cards show data
   - [ ] Charts render correctly
   - [ ] Template performance table populates
   - [ ] Time filter works (24h/7d/30d)
   - [ ] Send test email with tracking
   - [ ] Open email → open tracked
   - [ ] Click link → click tracked
   - [ ] Metrics update in dashboard

9. **Email Digests:**
   - [ ] Set time to trigger digest (or manually trigger)
   - [ ] Digest email received
   - [ ] Contains unread notification count
   - [ ] Contains recent notifications
   - [ ] Action links work
   - [ ] Unsubscribe option present

10. **Role-Based Access:**
    - [ ] Admin assigns role to user
    - [ ] Audit log created (ROLE_ASSIGNED)
    - [ ] User receives notification
    - [ ] User permissions updated
    - [ ] Admin removes role
    - [ ] Audit log created (ROLE_REMOVED)
    - [ ] User notified

---

## 📦 DEPENDENCIES TO INSTALL

### Backend (api/package.json):
```json
{
  "socket.io": "^4.7.2",
  "node-cron": "^3.0.3"
}
```

### Frontend (web/package.json):
```json
{
  "socket.io-client": "^4.7.2",
  "recharts": "^2.10.3"  // or chart.js
}
```

**Installation Commands:**
```bash
# Backend
cd api
npm install socket.io node-cron

# Frontend
cd web
npm install socket.io-client recharts
```

---

## 🗂️ FILES SUMMARY

### New Files to Create (11 files):
1. `web/src/pages/AcceptInvite.tsx`
2. `web/src/components/notifications/NotificationBell.tsx`
3. `web/src/components/notifications/NotificationCenter.tsx`
4. `web/src/hooks/useNotifications.ts`
5. `api/lib/notificationService.js`
6. `api/lib/emailDigestService.js`
7. `api/lib/emailAnalyticsService.js`
8. `api/routes/email-analytics.js`
9. `web/src/pages/admin/EmailAnalyticsDashboard.tsx`
10. `prisma/migrations/XXX_enhance_notifications_phase4.sql` (auto-generated)
11. `prisma/migrations/XXX_add_email_logs.sql` (if needed, auto-generated)

### Files to Modify (10 files):
1. `web/src/pages/Login.tsx` (MFA 2FA screen)
2. `web/src/pages/Account.tsx` (Sessions tab)
3. `web/src/features/admin/EditUserModal.tsx` (Trust duration input)
4. `web/src/components/layout/AppLayout.tsx` (NotificationBell integration)
5. `web/src/app-router.tsx` (Add routes)
6. `prisma/schema.prisma` (Notification model, EmailLog model, User.trustDeviceDuration, Session model)
7. `server.js` (Socket.IO server, auto-start services)
8. `api/index.js` (Register routes)
9. `api/routes/auth.js` (Session endpoints)
10. `api/package.json` (Dependencies)
11. `web/package.json` (Dependencies)
12. Find audit log page (add banner)

---

## ⏱️ TIME ESTIMATES BY TIER

| Tier | Tasks | Hours | Description |
|------|-------|-------|-------------|
| **Tier 1** | 3 | 2.5h | Critical security (MFA login, Accept invite, Audit banner) |
| **Tier 2** | 2 | 2.5h | Phase 3 completion (Basic NotificationBell + Center) |
| **Tier 3** | 6 | 7h | Phase 4 advanced (Model, Service, WebSocket, Enhanced UI) |
| **Tier 4** | 1 | 2.5h | Phase 6 email digests |
| **Tier 5** | 2 | 4.5h | Phase 7 email analytics |
| **Tier 6** | 3 | 2h | Session management enhancements |
| **Tier 7** | 1 | 3h | E2E testing all flows |
| **TOTAL** | **18** | **24h** | **Complete implementation** |

---

## ✅ SUCCESS CRITERIA

**Complete when ALL of these are true:**

- [ ] All 18 tasks marked complete
- [ ] All files created/modified
- [ ] All dependencies installed
- [ ] All migrations run successfully
- [ ] All E2E tests passing
- [ ] No TypeScript/ESLint errors
- [ ] No console errors in browser
- [ ] WebSocket connects and works
- [ ] Real-time notifications push correctly
- [ ] Email tracking works (open + click)
- [ ] Email digests send on schedule
- [ ] Analytics dashboard shows accurate metrics
- [ ] MFA 2FA login works
- [ ] User invitation flow works
- [ ] Session management works
- [ ] Audit logs visible with policy banner
- [ ] All UI responsive on mobile
- [ ] Documentation updated

---

## 🚫 EXPLICITLY EXCLUDED

**DO NOT IMPLEMENT:**
- ❌ Document Intelligence (all components)
- ❌ Phase 5: Inbound Email (IMAP, InboxPage, emailInboundService)

---

## 📝 IMPLEMENTATION ORDER

**Recommended sequence (dependency-aware):**

1. **Day 1 (8 hours):**
   - Task 6: Enhanced Notification Model (migration)
   - Task 7: notificationService.js
   - Task 8: WebSocket Server
   - Task 9: useNotifications Hook
   - Task 4: NotificationBell (basic)
   - Task 5: NotificationCenter (basic)

2. **Day 2 (8 hours):**
   - Task 10: Enhanced NotificationBell
   - Task 11: Enhanced NotificationCenter
   - Task 1: MFA Login 2FA Screen
   - Task 2: User Invitation Accept Page
   - Task 3: Audit Log Policy Banner

3. **Day 3 (8 hours):**
   - Task 12: emailDigestService.js
   - Task 13: emailAnalyticsService.js
   - Task 14: EmailAnalyticsDashboard.tsx
   - Task 15: Trust Device Duration
   - Task 16: Active Sessions List
   - Task 17: Revoke Session Button
   - Task 18: E2E Testing

---

**Ready to begin Option C implementation! 🚀**

*This checklist will be the single source of truth for tracking progress.*

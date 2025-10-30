# UI/UX Implementation - Detailed Action Plan
**Date:** October 30, 2025  
**Status:** Ready for Implementation  
**Based On:** UI_UX_COMPLETE_DESIGN_SYSTEM.md

---

## 🎯 EXECUTIVE SUMMARY

### Current Problem
- Sidebar has 30+ navigation items creating massive clutter
- Home page shows generic dashboard, not actionable intelligence
- Notifications lack context - just "what happened" without "why it matters" or "what to do"
- All project stages visible in main sidebar instead of being contextual
- No user customization - everyone sees same cluttered interface

### Design Goal
Transform to **Asana-inspired clean interface**:
- **Sidebar:** Only 3 default items (Home, Projects, Admin) + user-pinned favorites
- **Home Page:** Role-based actionable intelligence - what needs attention NOW
- **Notifications:** Three-part structure (What/Where, Impact Analysis, Suggested Solutions)
- **Projects:** Contextual tabs inside projects, not in main navigation
- **Intelligence:** Show relevant information based on user role and context

---

## 📊 CURRENT STATE ANALYSIS

### Existing Sidebar (AppLayout.tsx)
**Current Structure:**
```
✅ Dashboard
✅ Projects
✅ Tasks
✅ QC
✅ Alerts
✅ Reports

📦 PRE-PRODUCTION (Section)
  - Molds
  - Trials
  - Packaging
  - PPS
  - Policies
  - Process Flows

✅ COMPLIANCE (Section)
  - Dashboard
  - Certifications
  - Projects
  - Materials
  - Lab Tests

⚙️ EXECUTION (Section)
  - Stations
  - Workflow
  - Workflow Builder
  - QC Management
  - Production Entry
  - Batch Tracking
  - Process Config
  - Shift Entries
  - WIP Ledger

📅 PLANNING (Section)
  - Daily Planning
  - Workforce
  - Materials
  - MRP Calculator
  - Approvals

⚙️ ADMIN (Section)
  - Admin
```

**Total Items:** 30+ navigation items in main sidebar

### Required Sidebar (Per Design Doc)
**New Structure:**
```
🏠 Home
📁 Projects
⚙️ Admin (role-based)

--- Pinned Items (User-Customizable) ---
(User adds their own favorites here)
```

**Total Items:** 3 default + user-pinned

### What Happens to All Those Sections?

**PRE-PRODUCTION, COMPLIANCE, EXECUTION, PLANNING items:**
- **NOT deleted** - they move INSIDE individual projects
- When user opens a project → see these as tabs/views
- **Context-specific:** Only show relevant stages for that project
- **Reduces clutter:** Main sidebar stays clean

---

## 🔧 IMPLEMENTATION PHASES

### PHASE 1: BACKEND FOUNDATION
**Goal:** Create API endpoints needed for new UI

#### Task 1.1: Dashboard Action Items API
**File:** `api/routes/dashboard.js` (NEW)

**Endpoint:** `GET /api/dashboard/action-items`

**Query Parameters:**
- `userId` - Current user ID (from auth)
- `role` - User role (from auth)
- `projectId` (optional) - Filter to specific project

**Response Structure:**
```json
{
  "actionItems": [
    {
      "id": "ai_001",
      "type": "approval",
      "priority": "critical",
      "title": "Sample Approval Pending",
      "description": "Sample approval pending for Project Alpha - Spray Painting Stage",
      "project": {
        "id": "proj_001",
        "name": "Project Alpha",
        "code": "PRJ-001"
      },
      "stage": "Spray Painting",
      "dueDate": "2025-10-31T10:00:00Z",
      "bufferRemaining": "2 hours",
      "metadata": {
        "blockedTasks": 8,
        "affectedUsers": 3,
        "estimatedDelay": "2 days"
      },
      "link": "/projects/proj_001/approvals/approval_001"
    },
    {
      "id": "ai_002",
      "type": "overdue",
      "priority": "high",
      "title": "QC Inspection Overdue",
      "description": "Batch QC-2025-10-30-001 inspection overdue by 4 hours",
      "project": {
        "id": "proj_002",
        "name": "Project Beta"
      },
      "dueDate": "2025-10-30T14:00:00Z",
      "link": "/execution/qc/batch/qc-2025-10-30-001"
    }
  ],
  "summary": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  }
}
```

**Logic:**
1. Query user's role from auth
2. Based on role, query relevant items:
   - **Project Manager:** Approvals, budget alerts, timeline issues, team blockers
   - **Production Worker:** Assigned tasks, station assignments, material availability
   - **QC Inspector:** Pending inspections, failed QC reviews, compliance deadlines
   - **Admin:** System issues, user problems, security alerts
3. Priority calculation:
   - **Critical:** Overdue + blocking others
   - **High:** Due today or blocking work
   - **Medium:** Due within 3 days
   - **Low:** Upcoming, informational
4. Include metadata for context
5. Return sorted by priority, then due date

**Database Queries:**
```javascript
// Approvals overdue or due soon
const approvals = await prisma.approval.findMany({
  where: {
    status: 'PENDING',
    OR: [
      { dueDate: { lt: new Date() } }, // Overdue
      { dueDate: { lt: addDays(new Date(), 3) } } // Due within 3 days
    ],
    // Role-based filtering
    ...(role === 'PROJECT_MANAGER' && {
      project: { managerId: userId }
    })
  },
  include: {
    project: true,
    dependencies: true // To count blocked tasks
  }
})

// Tasks assigned to user
const myTasks = await prisma.task.findMany({
  where: {
    assigneeId: userId,
    status: { in: ['TODO', 'IN_PROGRESS'] },
    OR: [
      { dueDate: { lt: new Date() } },
      { dueDate: { lt: addDays(new Date(), 3) } }
    ]
  }
})

// QC items pending (for QC role)
const qcPending = await prisma.qcInspection.findMany({
  where: {
    status: 'PENDING',
    inspectorId: userId
  }
})

// Merge and prioritize
```

**Dependencies:**
- Existing Prisma models (Task, Approval, Project, QcInspection, etc.)
- Auth middleware to get user context
- Date utilities (date-fns)

#### Task 1.2: Notification Metadata Enhancement
**Files to Modify:**
- `api/routes/notifications.js`
- `api/lib/notificationService.js`

**Current Notification Schema:**
```javascript
{
  id: string,
  userId: string,
  type: string,
  title: string,
  message: string,
  read: boolean,
  createdAt: Date
}
```

**Enhanced Schema (add to Prisma):**
```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  type        String   // "approval", "overdue", "blocked", "info"
  priority    String   // "critical", "high", "medium", "low"
  title       String
  message     String
  read        Boolean  @default(false)
  
  // New fields for intelligence
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  
  // Impact analysis
  metadata    Json?    // Store impact and suggested actions
  
  link        String?  // Direct link to relevant page
  expiresAt   DateTime? // When notification is no longer relevant
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Metadata Structure:**
```json
{
  "impact": {
    "blockedTasks": 8,
    "affectedUsers": 3,
    "estimatedDelay": "2 days",
    "costImplication": "$5000",
    "capacityIdle": "30%"
  },
  "suggestedActions": [
    {
      "id": "action_1",
      "icon": "check",
      "label": "Approve Sample",
      "action": "approve",
      "endpoint": "/api/approvals/123/approve",
      "requiresPermission": "approve_samples"
    },
    {
      "id": "action_2",
      "icon": "reassign",
      "label": "Reassign to Station 13",
      "action": "reassign",
      "endpoint": "/api/tasks/456/reassign",
      "params": { "stationId": "station_13" }
    }
  ],
  "context": {
    "stage": "Spray Painting",
    "batchCode": "PRJ-001-SKU-20251030-A-001",
    "responsible": "John Doe"
  }
}
```

**Update Notification Creation:**
```javascript
async function createIntelligentNotification({
  userId,
  type,
  priority,
  title,
  message,
  projectId,
  impact,
  suggestedActions,
  link
}) {
  // Calculate impact if not provided
  if (!impact && projectId) {
    impact = await calculateImpact({ projectId, type })
  }
  
  // Generate suggested actions if not provided
  if (!suggestedActions) {
    suggestedActions = await generateSuggestedActions({ type, projectId })
  }
  
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      priority,
      title,
      message,
      projectId,
      metadata: {
        impact,
        suggestedActions
      },
      link,
      expiresAt: calculateExpiration(type, priority)
    }
  })
  
  // Send via WebSocket if user is online
  sendWebSocketNotification(userId, notification)
  
  return notification
}
```

**Impact Calculation Logic:**
```javascript
async function calculateImpact({ projectId, type }) {
  switch (type) {
    case 'approval_pending':
      // Find downstream tasks blocked by this approval
      const blockedTasks = await findBlockedTasks(approvalId)
      const affectedUsers = await findAffectedUsers(blockedTasks)
      const estimatedDelay = calculateDelay(blockedTasks)
      
      return {
        blockedTasks: blockedTasks.length,
        affectedUsers: affectedUsers.length,
        estimatedDelay,
        capacityIdle: calculateIdleCapacity(blockedTasks)
      }
    
    case 'material_shortage':
      // Calculate production impact
      const affectedProduction = await calculateProductionImpact(materialId)
      return {
        affectedTasks: affectedProduction.tasks,
        productionLoss: affectedProduction.units,
        estimatedDelay: affectedProduction.delay
      }
    
    // ... other types
  }
}
```

#### Task 1.3: User Preferences API
**File:** `api/routes/user-preferences.js` (NEW)

**Purpose:** Store user's pinned sidebar items, custom views, layout preferences

**Endpoints:**

**GET /api/user/preferences**
```json
{
  "pinnedItems": [
    {
      "id": "pin_1",
      "type": "search",
      "label": "Production Status",
      "icon": "factory",
      "query": { "stage": "production", "status": "active" },
      "link": "/search?stage=production&status=active"
    },
    {
      "id": "pin_2",
      "type": "project",
      "label": "Project Alpha",
      "icon": "project",
      "projectId": "proj_001",
      "link": "/projects/proj_001"
    }
  ],
  "homePageLayout": {
    "widgets": ["action-items", "my-tasks", "projects", "quick-insights"]
  },
  "theme": "dark",
  "notificationPreferences": {
    "inApp": true,
    "email": false,
    "quietHours": { "start": "22:00", "end": "08:00" }
  }
}
```

**POST /api/user/preferences/pin**
- Add item to pinned items

**DELETE /api/user/preferences/pin/:pinId**
- Remove pinned item

**PUT /api/user/preferences/reorder**
- Reorder pinned items

**Schema:**
```prisma
model UserPreferences {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  
  pinnedItems Json     @default("[]")
  homeLayout  Json?
  theme       String   @default("light")
  notifications Json?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

### PHASE 2: SIDEBAR RESTRUCTURE
**Goal:** Transform sidebar from 30+ items to 3 clean defaults

#### Task 2.1: Create New Sidebar Component
**File:** `web/src/components/layout/AppLayout.tsx`

**Changes Required:**

**Step 1: Remove Existing Navigation Sections**
Delete these sections entirely:
- PRE-PRODUCTION section (lines 77-85)
- COMPLIANCE section (lines 86-93)
- EXECUTION section (lines 94-105)
- PLANNING section (lines 106-113)

**Keep only:**
- Dashboard (becomes "Home")
- Projects
- Admin (move to bottom, add role check)

**Step 2: Add Pinned Items Section**

**New Sidebar Structure:**
```tsx
<nav className="p-3 space-y-1 flex-1 overflow-y-auto">
  {/* Default Items */}
  <div className="space-y-1">
    <NavItem to="/" icon={Home} label="Home" />
    <NavItem to="/projects" icon={Folder} label="Projects" />
    
    {/* Admin - Only for admin role */}
    {user?.role === 'ADMIN' && (
      <NavItem to="/admin" icon={Settings} label="Admin" />
    )}
  </div>
  
  {/* Pinned Items */}
  {pinnedItems.length > 0 && (
    <>
      <div className="border-t my-3" />
      <div className="text-xs font-semibold text-gray-500 px-3 mb-2 flex items-center justify-between">
        <span>PINNED</span>
        <button className="text-blue-600 hover:text-blue-700" onClick={() => setManagePinsOpen(true)}>
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1">
        {pinnedItems.map(item => (
          <PinnedNavItem key={item.id} item={item} onUnpin={handleUnpin} />
        ))}
      </div>
    </>
  )}
  
  {/* Empty state for pinned items */}
  {pinnedItems.length === 0 && (
    <div className="mt-4 px-3 py-4 bg-gray-50 rounded-lg text-xs text-gray-600 text-center">
      <p className="mb-2">Pin frequently accessed items here</p>
      <button 
        className="text-blue-600 hover:text-blue-700 font-medium"
        onClick={() => setManagePinsOpen(true)}
      >
        Add pinned item
      </button>
    </div>
  )}
</nav>
```

#### Task 2.2: Create PinnedNavItem Component
**File:** `web/src/components/layout/PinnedNavItem.tsx` (NEW)

```tsx
import { Link, useRouterState } from '@tanstack/react-router'
import { X, GripVertical } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

interface PinnedItem {
  id: string
  type: 'search' | 'project' | 'custom'
  label: string
  icon: string
  link: string
}

interface PinnedNavItemProps {
  item: PinnedItem
  onUnpin: (id: string) => void
}

export default function PinnedNavItem({ item, onUnpin }: PinnedNavItemProps) {
  const [hovering, setHovering] = useState(false)
  const pathname = useRouterState({ select: s => s.location.pathname })
  const active = pathname === item.link || pathname.startsWith(item.link)
  
  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Link 
        to={item.link as any}
        className={clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
          active ? "bg-accent/10 text-accent" : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-50 cursor-move" />
        <span className="truncate flex-1">{item.label}</span>
      </Link>
      
      {hovering && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onUnpin(item.id)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200"
          title="Unpin"
        >
          <X className="h-3 w-3 text-gray-500" />
        </button>
      )}
    </div>
  )
}
```

#### Task 2.3: Fetch and Manage Pinned Items
**Add to AppLayout.tsx:**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Inside AppLayout component
const queryClient = useQueryClient()

// Fetch pinned items
const { data: preferences } = useQuery({
  queryKey: ['user-preferences', user?.id],
  queryFn: async () => {
    const res = await fetch('/api/user/preferences', {
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to fetch preferences')
    return res.json()
  },
  enabled: !!user
})

const pinnedItems = preferences?.pinnedItems || []

// Unpin mutation
const unpinMutation = useMutation({
  mutationFn: async (pinId: string) => {
    const res = await fetch(`/api/user/preferences/pin/${pinId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to unpin')
    return res.json()
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
  }
})

const handleUnpin = (pinId: string) => {
  unpinMutation.mutate(pinId)
}
```

---

### PHASE 3: HOME PAGE INTELLIGENCE
**Goal:** Transform home page from generic dashboard to actionable intelligence

#### Task 3.1: Update Home.tsx Component
**File:** `web/src/pages/home/Home.tsx`

**Current Issues:**
- Shows static cards
- No backend integration
- Not role-based
- Generic information

**New Implementation:**

```tsx
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../features/common/AuthProvider'
import { 
  AlertTriangle, Clock, CheckCircle, TrendingUp,
  Users, Package, Calendar, ArrowRight
} from 'lucide-react'
import clsx from 'clsx'

export default function Home() {
  const { user } = useAuth()
  
  // Fetch action items
  const { data: actionItems, isLoading } = useQuery({
    queryKey: ['dashboard-action-items', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/action-items', {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch action items')
      return res.json()
    },
    enabled: !!user,
    refetchInterval: 30000 // Refresh every 30 seconds
  })
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }
  
  const items = actionItems?.actionItems || []
  const summary = actionItems?.summary || {}
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold">
          Good {getTimeOfDay()}, {user?.name || user?.email}
        </h1>
        <p className="text-gray-600 mt-1">
          You have {summary.critical + summary.high} items that need attention
        </p>
      </div>
      
      {/* Critical Items */}
      {(summary.critical > 0 || summary.high > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Needs Attention Now
          </h2>
          
          <div className="space-y-2">
            {items
              .filter(item => item.priority === 'critical' || item.priority === 'high')
              .map(item => (
                <ActionItemCard key={item.id} item={item} />
              ))}
          </div>
        </div>
      )}
      
      {/* Upcoming Items */}
      {summary.medium > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Upcoming (Next 3 Days)
          </h2>
          
          <div className="grid gap-2 md:grid-cols-2">
            {items
              .filter(item => item.priority === 'medium')
              .slice(0, 4)
              .map(item => (
                <ActionItemCard key={item.id} item={item} compact />
              ))}
          </div>
          
          {summary.medium > 4 && (
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View all {summary.medium} upcoming items →
            </button>
          )}
        </div>
      )}
      
      {/* All Clear State */}
      {items.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-green-900 mb-1">
            All caught up!
          </h3>
          <p className="text-green-700">
            No items need your attention right now.
          </p>
        </div>
      )}
      
      {/* Quick Insights - Role Based */}
      <div className="grid gap-4 md:grid-cols-3">
        {user?.role === 'PROJECT_MANAGER' && (
          <>
            <InsightCard
              icon={Users}
              label="Active Projects"
              value="8"
              trend="+2 this week"
              color="blue"
            />
            <InsightCard
              icon={TrendingUp}
              label="On Track"
              value="85%"
              trend="↑ 5% from last week"
              color="green"
            />
            <InsightCard
              icon={AlertTriangle}
              label="At Risk"
              value="2"
              trend="Projects need attention"
              color="yellow"
            />
          </>
        )}
        
        {user?.role === 'PRODUCTION_WORKER' && (
          <>
            <InsightCard
              icon={Package}
              label="Today's Output"
              value="450"
              trend="Target: 500 units"
              color="blue"
            />
            <InsightCard
              icon={CheckCircle}
              label="Quality Rate"
              value="98%"
              trend="Above target"
              color="green"
            />
            <InsightCard
              icon={Calendar}
              label="Next Task"
              value="2:30 PM"
              trend="Station 12 - Painting"
              color="blue"
            />
          </>
        )}
      </div>
    </div>
  )
}

// Action Item Card Component
function ActionItemCard({ item, compact = false }) {
  const priorityConfig = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-900' },
    high: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', text: 'text-orange-900' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', text: 'text-yellow-900' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-900' }
  }
  
  const config = priorityConfig[item.priority]
  
  return (
    <a
      href={item.link}
      className={clsx(
        "block rounded-lg border p-4 hover:shadow-md transition-shadow",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={clsx("h-5 w-5 mt-0.5", config.icon)} />
        <div className="flex-1 min-w-0">
          <h3 className={clsx("font-medium", config.text)}>{item.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          
          {!compact && item.metadata && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
              {item.metadata.blockedTasks && (
                <span>🚫 {item.metadata.blockedTasks} tasks blocked</span>
              )}
              {item.metadata.affectedUsers && (
                <span>👥 {item.metadata.affectedUsers} users affected</span>
              )}
              {item.metadata.estimatedDelay && (
                <span>⏰ {item.metadata.estimatedDelay} delay</span>
              )}
            </div>
          )}
          
          {item.project && (
            <div className="mt-2 text-xs text-gray-500">
              {item.project.name} {item.stage && `• ${item.stage}`}
            </div>
          )}
          
          {item.bufferRemaining && (
            <div className="mt-2 text-xs font-medium text-red-600">
              ⏱️ {item.bufferRemaining} remaining
            </div>
          )}
        </div>
        
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </a>
  )
}

// Insight Card Component
function InsightCard({ icon: Icon, label, value, trend, color }) {
  const colorConfig = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    red: 'bg-red-50 border-red-200 text-red-900'
  }
  
  return (
    <div className={clsx("rounded-lg border p-4", colorConfig[color])}>
      <Icon className="h-5 w-5 mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      <div className="text-xs mt-1 opacity-75">{trend}</div>
    </div>
  )
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
```

---

### PHASE 4: NOTIFICATION SYSTEM ENHANCEMENT
**Goal:** Show three-part structure when metadata available

#### Task 4.1: Update NotificationCenter Component
**File:** `web/src/components/notifications/NotificationCenter.tsx`

**Enhancement:** The component already has the structure, just needs to properly handle metadata display.

**Verify these sections exist and work:**
1. Filter tabs (All, Unread, Priority) ✓
2. Three-part display when metadata exists ✓
3. Quick action buttons ✓

**Add Inline Actions:**
```tsx
// Add to NotificationCenter.tsx

function QuickActionButton({ action, notificationId, onComplete }) {
  const [loading, setLoading] = useState(false)
  
  const handleAction = async () => {
    setLoading(true)
    try {
      const res = await fetch(action.endpoint, {
        method: action.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(action.params || {})
      })
      
      if (!res.ok) throw new Error('Action failed')
      
      // Mark notification as acted upon
      await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: 'PATCH',
        credentials: 'include'
      })
      
      onComplete?.()
      toast.success(action.successMessage || 'Action completed')
    } catch (error) {
      toast.error('Failed to perform action')
    } finally {
      setLoading(false)
    }
  }
  
  const Icon = getIconComponent(action.icon)
  
  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? (
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {action.label}
    </button>
  )
}
```

---

### PHASE 5: PROJECT-SPECIFIC NAVIGATION
**Goal:** Move sections INSIDE projects as tabs

#### Task 5.1: Create Project Detail Page with Tabs
**File:** `web/src/pages/projects/ProjectDetail.tsx` (MODIFY)

**Add Tab Navigation:**
```tsx
import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { 
  LayoutGrid, Calendar, BarChart3, Package, 
  CheckSquare, FlaskConical, Settings, Boxes 
} from 'lucide-react'

export default function ProjectDetail() {
  const { projectId } = useParams({ from: '/projects/$projectId' })
  const [activeTab, setActiveTab] = useState('overview')
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'board', label: 'Board & Timeline', icon: Calendar },
    { id: 'execution', label: 'Execution', icon: BarChart3 },
    { id: 'preprod', label: 'Pre-Production', icon: Package },
    { id: 'compliance', label: 'Compliance', icon: CheckSquare },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]
  
  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Project Alpha</h1>
            <p className="text-gray-600">PRJ-001 • 5000 units • Product Launch</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add Task
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:bg-gray-100"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <ProjectOverview projectId={projectId} />}
        {activeTab === 'board' && <ProjectBoard projectId={projectId} />}
        {activeTab === 'execution' && <ProjectExecution projectId={projectId} />}
        {activeTab === 'preprod' && <ProjectPreProduction projectId={projectId} />}
        {activeTab === 'compliance' && <ProjectCompliance projectId={projectId} />}
        {activeTab === 'planning' && <ProjectPlanning projectId={projectId} />}
        {activeTab === 'settings' && <ProjectSettings projectId={projectId} />}
      </div>
    </div>
  )
}
```

#### Task 5.2: Create Tab Content Components
**Files to Create:**

**`web/src/pages/projects/tabs/ProjectExecution.tsx`**
- Shows execution section (stations, workflow, QC, production, batches)
- Grid of cards linking to detailed pages
- Quick overview of execution status

**`web/src/pages/projects/tabs/ProjectPreProduction.tsx`**
- Shows preprod section (molds, trials, packaging, PPS, policies, process flows)
- Status of each preprod item for THIS project
- Quick links to manage each

**`web/src/pages/projects/tabs/ProjectCompliance.tsx`**
- Shows compliance section (certifications, materials, lab tests)
- Compliance status for THIS project
- Upcoming deadlines, expired certifications

**`web/src/pages/projects/tabs/ProjectPlanning.tsx`**
- Shows planning section (daily plans, workforce, materials, MRP, approvals)
- Planning specific to THIS project
- Resource allocation, schedules

---

## 🎯 IMPLEMENTATION ORDER

### Day 1: Backend Foundation
1. ✅ Create `/api/routes/dashboard.js` with action items endpoint
2. ✅ Add Notification metadata fields to Prisma schema
3. ✅ Migrate database
4. ✅ Update notification creation to include metadata
5. ✅ Create `/api/routes/user-preferences.js` for pinned items
6. ✅ Test all endpoints with Postman/Thunder Client

### Day 2: Sidebar Restructure  
1. ✅ Remove PRE-PRODUCTION, COMPLIANCE, EXECUTION, PLANNING sections from AppLayout.tsx
2. ✅ Keep only Home, Projects, Admin
3. ✅ Create PinnedNavItem component
4. ✅ Add pinned items section to sidebar
5. ✅ Integrate user preferences API
6. ✅ Test sidebar with sample pinned items

### Day 3: Home Page Intelligence
1. ✅ Replace Home.tsx with new intelligent version
2. ✅ Integrate dashboard action items API
3. ✅ Add role-based views
4. ✅ Add insight cards
5. ✅ Test with different user roles

### Day 4: Notifications Enhancement
1. ✅ Verify NotificationCenter displays metadata correctly
2. ✅ Add inline quick action buttons
3. ✅ Test action execution
4. ✅ Add loading and error states

### Day 5: Project Tabs
1. ✅ Update ProjectDetail.tsx with tab navigation
2. ✅ Create ProjectExecution.tsx tab
3. ✅ Create ProjectPreProduction.tsx tab
4. ✅ Create ProjectCompliance.tsx tab
5. ✅ Create ProjectPlanning.tsx tab
6. ✅ Update routing to handle /projects/:id route

### Day 6: Testing & Polish
1. ✅ Test all features end-to-end
2. ✅ Verify no broken routes
3. ✅ Check dark mode compatibility
4. ✅ Mobile responsiveness
5. ✅ Performance optimization
6. ✅ Fix any bugs found

---

## ✅ COMPLETION CRITERIA

### Backend Complete When:
- [  ] Dashboard action items API returns correct data for all roles
- [  ] Notification metadata structure working
- [  ] User preferences API saves and retrieves pinned items
- [  ] All endpoints tested and documented

### Sidebar Complete When:
- [  ] Only 3 default items visible (Home, Projects, Admin)
- [  ] Pinned items section functional
- [  ] Users can add/remove pinned items
- [  ] No PRE-PRODUCTION, COMPLIANCE, EXECUTION, PLANNING sections in main sidebar

### Home Page Complete When:
- [  ] Shows role-based action items
- [  ] Displays critical items prominently
- [  ] Shows "all clear" state when no items
- [  ] Quick insights relevant to user role
- [  ] Links work to relevant pages

### Notifications Complete When:
- [  ] Three-part structure displays when metadata present
- [  ] Impact analysis visible
- [  ] Suggested actions shown as buttons
- [  ] Inline actions work correctly
- [  ] Notifications marked as read after action

### Project Tabs Complete When:
- [  ] Project detail page has tab navigation
- [  ] All tabs functional (Overview, Board, Execution, PreProd, Compliance, Planning)
- [  ] Content shows project-specific information
- [  ] Navigation works correctly
- [  ] Users can access all features from within project context

### Overall Success:
- [  ] Build passes with no errors
- [  ] All routes accessible
- [  ] Visual design matches Asana-inspired clean aesthetic
- [  ] Dark mode works throughout
- [  ] Mobile responsive
- [  ] User can complete all workflows
- [  ] Intelligence features provide value
- [  ] **Most importantly:** User sees clean sidebar with 3 items, not 30!

---

## 📝 NOTES & DECISIONS

### Design Decisions Made:
1. **Sidebar:** Only 3 defaults + user-customizable pins (per design doc)
2. **Home:** Role-based intelligence, not data dump (per design doc)
3. **Notifications:** Three-part structure (What/Where, Impact, Solutions) (per design doc)
4. **Projects:** Tabs inside projects, not in sidebar (per design doc)

### Technical Decisions:
1. Use TanStack Query for data fetching
2. Use Prisma for database operations
3. Store user preferences in database (not localStorage)
4. Notification metadata in JSON field (flexible structure)

### Future Enhancements (Not in This Phase):
- Drag-and-drop reordering of pinned items
- Custom saved searches with complex filters
- Notification grouping by project
- Cross-project views from search
- Capacity optimization UI
- Visual floor plans
- Process workflow builder

---

**Last Updated:** October 30, 2025  
**Status:** Ready for Implementation  
**Estimated Time:** 6 days (with buffer)  
**Priority:** CRITICAL - User's main frustration point

---

*"Slow is smooth, smooth is fast" - Now we understand fully, let's implement correctly.*

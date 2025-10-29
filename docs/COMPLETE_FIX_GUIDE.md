# Complete Fix Guide - All Issues

## Summary of User Questions:

### 1. ❌ Audit Log Retention - MISUNDERSTOOD
**Current (Wrong):** 15-day write-only period blocks ALL users from seeing logs <15 days old  
**Correct:** 
- Each user has their own retention period (e.g., 30 days, 90 days)
- User can see logs from last N days (their retention period)
- Logs older than their retention → Only Super Admin can see
- 15-day write-only period → Even Super Admin can't see logs <15 days old

**Example:**
- User A has 30-day retention
  - Can see logs: 15-45 days old
  - Cannot see: <15 days (write-only) or >45 days (beyond retention)
- Super Admin:
  - Can see logs: 15+ days old (ALL history)
  - Cannot see: <15 days (write-only period)

### 2. ⏳ "Flagged Only" Button - EXPLAINED
**What it means:** Shows only security-critical actions that require Super Admin review:
- USER_DELETE
- MFA_RESET  
- FORCE_LOGOUT
- Bulk operations
- Security policy changes

### 3. 📱 Device Not Showing - NEED TO RE-LOGIN
**Why:** Device fingerprinting happens during login
**Solution:** Logout and login again to create device record

### 4. ⏳ MFA Status - NEEDS BETTER DISPLAY
**Current:** Shows "❌ Disabled" even after clicking Enable
**Should show:**
- "❌ Disabled" - MFA not enabled
- "⏳ Pending Setup" - MFA enabled but user hasn't completed setup
- "✅ Enabled" - MFA fully activated by user

### 5. 🕐 Session Settings - "Coming Soon" REMOVED
**Fixed:** Made fields functional, removed placeholder text

---

## Critical Bugs Found (From Console):

### Bug 1: `logAudit` Parameter Mismatch
```
Argument `action` is missing
```
**Issue:** Using old function signature with positional parameters, but function expects object parameter

### Bug 2: Notification Schema Error
```
Unknown argument `priority`. Unknown argument `expiresAt`
```
**Issue:** Notification model doesn't have these fields

### Bug 3: Audit Log Foreign Key Error
```
Foreign key constraint violated: `AuditLog_actorId_fkey`
```
**Issue:** Actor ID is undefined or invalid

---

## Files That Need Fixing:

### 1. api/routes/admin.js (Multiple Issues)

**Issue A: logAudit function calls use wrong signature**
Lines 460 and 518 use positional parameters:
```javascript
// WRONG ❌
await logAudit(
  req.user?.id,
  'MFA_ENABLED',
  'USER',
  id,
  { ... }
);
```

Should be object parameter:
```javascript
// CORRECT ✅
await logAudit({
  actorId: req.user?.id,
  action: 'MFA_ENABLED',
  entity: 'USER',
  entityId: id,
  changes: { ... },
  meta: { ... },
  ip: req.ip,
  userAgent: req.get('user-agent')
});
```

**Issue B: Notification creation has invalid fields**
Line 331 - Remove `priority` and `expiresAt`:
```javascript
// WRONG ❌
await prisma.notification.create({
  data: {
    userId: user.id,
    type: "SECURITY_ALERT",
    title: "Password Reset Without MFA",
    message: "...",
    priority: "HIGH",  // ← NOT IN SCHEMA
    expiresAt: new Date(...)  // ← NOT IN SCHEMA
  }
});

// CORRECT ✅
await prisma.notification.create({
  data: {
    userId: user.id,
    type: "SECURITY_ALERT",
    title: "Password Reset Without MFA",
    message: "...",
    // Remove priority and expiresAt
  }
});
```

**Issue C: Actor ID validation**
All logAudit calls need to ensure actorId is valid:
```javascript
const actorId = req.user?.id;
if (!actorId) {
  console.error('[admin] No actor ID for audit log');
  // Either return error or use system ID
}
```

### 2. prisma/schema.prisma

**Issue: Missing auditRetentionDays field**
Already fixed in your file, but needs migration:
```prisma
model User {
  // ... existing fields ...
  auditRetentionDays Int @default(90) // days - minimum 15
}
```

**Run migration:**
```bash
cd "d:\Pramara PMS"
npx prisma migrate dev --name add_audit_retention_days
```

### 3. api/middleware/auditLogger.js

**Issue: Function signature changed but callers not updated**

Current function expects object:
```javascript
async function logAudit({
  actorId,
  action,
  entity,
  entityId = null,
  changes = null,
  meta = null,
  ip = null,
  userAgent = null,
  deviceId = null,
  result = 'SUCCESS'
})
```

All callers must use object parameter!

### 4. api/routes/admin.js - UPDATE endpoint

**Issue: Doesn't save trustDeviceDuration and auditRetentionDays**

Line ~235-295, add to the update:
```javascript
router.put("/admin/users/:id", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  // ... existing code ...
  
  const updateData = {
    name: body.name || null,
    status: body.status,
    isActive: body.isActive,
    departmentId: body.departmentId || null,
    // ADD THESE:
    trustDeviceDuration: body.trustDeviceDuration ? parseInt(body.trustDeviceDuration) : undefined,
    auditRetentionDays: body.auditRetentionDays ? Math.max(15, parseInt(body.auditRetentionDays)) : undefined,
  };
  
  // Remove undefined values
  Object.keys(updateData).forEach(key => 
    updateData[key] === undefined && delete updateData[key]
  );
  
  await prisma.user.update({
    where: { id },
    data: updateData
  });
});
```

---

## Step-by-Step Fix Instructions:

### Step 1: Run Database Migration
```bash
cd "d:\Pramara PMS"
npx prisma migrate dev --name add_audit_retention_days
npx prisma generate
```

### Step 2: Fix logAudit Calls in admin.js

Search for all `await logAudit(` calls and convert to object syntax.

**Lines to fix:** ~368, ~460, ~518

### Step 3: Fix Notification Creation

Line ~331 in admin.js, remove `priority` and `expiresAt`

### Step 4: Add Actor ID Validation

Before every `logAudit` call:
```javascript
const actorId = req.user?.id;
if (!actorId) {
  console.error('[admin] Cannot create audit log: No actor ID');
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Step 5: Update PUT /admin/users/:id

Add saving of `trustDeviceDuration` and `auditRetentionDays` fields

### Step 6: Test Everything

1. Logout and login again (to create device)
2. Enable MFA → should show "⏳ Pending Setup"
3. Force logout → should work
4. Save session settings → should persist
5. Check audit logs → should log all actions

---

## Quick Verification Checklist:

- [ ] Database migration run successfully
- [ ] All `logAudit()` calls use object parameter
- [ ] No `priority` or `expiresAt` in notification creation
- [ ] Actor ID validated before audit logging
- [ ] trustDeviceDuration and auditRetentionDays saved on user update
- [ ] Device created after re-login
- [ ] MFA shows correct status ("Pending Setup" after enable)
- [ ] Force logout works
- [ ] Audit logs capture all actions

---

## Priority Order:

1. **CRITICAL:** Fix logAudit parameter mismatch (breaks MFA/Force Logout)
2. **HIGH:** Remove invalid notification fields (breaks password reset)
3. **HIGH:** Add actor ID validation (breaks audit logging)
4. **MEDIUM:** Run database migration (new fields)
5. **MEDIUM:** Update PUT endpoint to save new fields
6. **LOW:** Re-login to create device

---

This is a comprehensive list of ALL issues found. Would you like me to fix them one by one, or create a single batch fix?

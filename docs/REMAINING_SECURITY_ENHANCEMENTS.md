# Remaining Security Enhancements

## Issues Identified

### 1. Device Management Not Working
**Problem:** No devices showing in Devices tab despite users being logged in

**Root Cause:** Login endpoint doesn't create device fingerprints

**Solution Required:**
- Add device fingerprinting to `/api/auth/login`
- Create Device record on successful login with:
  - Browser info (from user-agent)
  - OS info (from user-agent)
  - IP address
  - Device fingerprint (hash of user-agent + other identifying info)
  - Initial trust status (false by default)

**Files to modify:**
- `api/routes/auth.js` - Add device creation in login endpoint
- `api/lib/deviceFingerprint.js` - Use existing fingerprinting logic

### 2. MFA Settings Missing from User Profile
**Problem:** MFA settings not visible in Edit User modal or Account page

**Required MFA Features:**
- View MFA status (enabled/disabled)
- Enable MFA (generate QR code, show backup codes)
- Disable MFA (Super Admin only, with confirmation)
- Regenerate backup codes
- View last MFA enforcement date

**UI Locations:**
1. **Edit User Modal** (Admin view):
   - MFA status indicator
   - Force MFA button (for Super Admin)
   - Reset MFA button (if user loses device)

2. **Account Page** (User self-service):
   - Enable/disable MFA toggle
   - QR code generation
   - Backup codes display
   - MFA device management

**Files to create/modify:**
- `web/src/features/admin/EditUserModal.tsx` - Add MFA section
- `web/src/pages/Account.tsx` - Add MFA self-service UI
- `api/routes/auth.js` - Add MFA setup/reset endpoints

### 3. Session/Logging Rules Missing
**Problem:** Trust device duration and session timeout settings not visible

**Required Session Settings:**
- Trust device duration (days) - per user configurable
- Session timeout (minutes)
- Force logout on password change
- Multi-device session limit

**UI Locations:**
1. **Edit User Modal** (Admin view):
   - Trust device duration input (default: 30 days)
   - Session timeout input
   - Force logout button

2. **Account Page** (User self-service):
   - View trusted devices
   - Revoke device trust
   - View active sessions

**Files to modify:**
- `web/src/features/admin/EditUserModal.tsx` - Add session settings section
- `web/src/pages/Account.tsx` - Add session management UI

### 4. Audit Log Security Hardening
**Problem:** Audit logs can potentially be disabled or deleted

**Security Requirements (CRITICAL):**
1. ✅ **Logs can NEVER be disabled** - Even Super Admin cannot disable
2. ✅ **Minimum retention: 15 days** - Hardcoded, non-negotiable
3. ✅ **Write-only during retention** - Cannot be viewed/modified during active period
4. ✅ **Super Admin read access only** - After retention period expires
5. ✅ **Tamper-proof** - No delete operations, only archive

**Implementation Plan:**

#### A. Database Level Protection
```sql
-- Prevent direct deletion of audit logs
CREATE OR REPLACE RULE audit_log_no_delete AS 
ON DELETE TO "AuditLog" 
DO INSTEAD NOTHING;

-- Prevent update of audit logs (immutable)
CREATE OR REPLACE RULE audit_log_no_update AS 
ON UPDATE TO "AuditLog" 
DO INSTEAD NOTHING;
```

#### B. Application Level Protection
**File: `api/middleware/auditLogger.js`**
```javascript
// CRITICAL: These settings cannot be changed without system restart
const AUDIT_CONFIG = Object.freeze({
  MINIMUM_RETENTION_DAYS: 15,  // Hardcoded minimum
  MAXIMUM_RETENTION_DAYS: 365, // Configurable by Super Admin
  WRITE_ONLY_PERIOD_DAYS: 15,  // Cannot view logs less than 15 days old
  ALLOW_DELETE: false,          // NEVER allow deletion
  ALLOW_UPDATE: false,          // Logs are immutable
});

// Validation function - throws error if settings violate rules
function validateAuditSettings(settings) {
  if (settings.retentionDays < AUDIT_CONFIG.MINIMUM_RETENTION_DAYS) {
    throw new Error(`Audit retention cannot be less than ${AUDIT_CONFIG.MINIMUM_RETENTION_DAYS} days`);
  }
  // ... more validations
}
```

**File: `api/routes/audit.js`**
```javascript
// MODIFIED: Only return logs older than 15 days
router.get('/audit-logs', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  const writeOnlyPeriod = new Date();
  writeOnlyPeriod.setDate(writeOnlyPeriod.getDate() - 15);
  
  const result = await getAuditLogs({
    ...req.query,
    endDate: writeOnlyPeriod.toISOString(), // Only show logs older than 15 days
  });
  
  res.json({
    ...result,
    warning: 'Logs from the last 15 days are not visible for security reasons',
    writeOnlyPeriod: writeOnlyPeriod.toISOString()
  });
});

// NEVER implement these endpoints:
// router.delete('/audit-logs/:id') - FORBIDDEN
// router.put('/audit-logs/:id') - FORBIDDEN
```

#### C. System Settings Protection
**File: `api/routes/admin.js` or `api/routes/system.js`**
```javascript
// System settings endpoint with audit log protection
router.put('/admin/settings', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  const { auditRetentionDays } = req.body;
  
  // Validate audit settings
  if (auditRetentionDays !== undefined) {
    if (auditRetentionDays < 15) {
      return res.status(400).json({
        error: 'Audit retention cannot be less than 15 days (security policy)',
        minimumAllowed: 15,
        requested: auditRetentionDays
      });
    }
    
    // Log this critical change
    await logAudit({
      actorId: req.user.id,
      action: 'AUDIT_RETENTION_CHANGED',
      entity: 'SYSTEM_SETTINGS',
      changes: {
        oldValue: currentRetention,
        newValue: auditRetentionDays
      },
      flagged: true, // Always flag audit setting changes
      result: 'SUCCESS'
    });
  }
  
  // ... save settings
});
```

#### D. Frontend Warnings
**File: `web/src/pages/Admin.tsx` or System Settings page**
```tsx
<div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
  <div className="flex">
    <div className="flex-shrink-0">
      <AlertTriangle className="h-5 w-5 text-yellow-400" />
    </div>
    <div className="ml-3">
      <h3 className="text-sm font-medium text-yellow-800">
        Audit Log Security Policy
      </h3>
      <div className="mt-2 text-sm text-yellow-700">
        <ul className="list-disc list-inside space-y-1">
          <li>Audit logs cannot be disabled (system-enforced)</li>
          <li>Minimum retention period: 15 days (non-negotiable)</li>
          <li>Logs are write-only for first 15 days (tamper-proof)</li>
          <li>Only Super Admins can view logs after 15-day period</li>
          <li>Logs cannot be deleted or modified (immutable)</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<div className="mt-4">
  <label className="block text-sm font-medium text-gray-700">
    Audit Log Retention Period (days)
  </label>
  <input
    type="number"
    min={15}
    max={365}
    value={auditRetentionDays}
    onChange={(e) => {
      const value = parseInt(e.target.value);
      if (value < 15) {
        alert('Minimum retention period is 15 days (security policy)');
        return;
      }
      setAuditRetentionDays(value);
    }}
    className="mt-1 block w-full rounded-md border-gray-300"
  />
  <p className="mt-1 text-xs text-gray-500">
    Minimum: 15 days (enforced) | Maximum: 365 days
  </p>
</div>
```

### 5. Additional Audit Actions to Log

Currently only LOGIN is being logged. Add these critical actions:

**User Management:**
- USER_CREATE
- USER_UPDATE
- USER_DELETE
- USER_STATUS_CHANGE
- PASSWORD_RESET_ADMIN (already implemented)
- PASSWORD_CHANGED
- MFA_ENABLED
- MFA_DISABLED
- MFA_RESET

**Role & Permission Management:**
- ROLE_CREATE
- ROLE_UPDATE
- ROLE_DELETE
- ROLE_ASSIGN
- ROLE_REVOKE
- PERMISSION_GRANT
- PERMISSION_REVOKE
- TEMP_PERMISSION_GRANT
- TEMP_PERMISSION_EXPIRE

**Department Management:**
- DEPARTMENT_CREATE
- DEPARTMENT_UPDATE
- DEPARTMENT_DELETE

**Device & Session Management:**
- DEVICE_TRUST
- DEVICE_REVOKE
- SESSION_CREATE
- SESSION_TERMINATE
- FORCE_LOGOUT

**System Settings:**
- SETTING_CHANGE
- AUDIT_RETENTION_CHANGED (always flagged)
- SECURITY_POLICY_CHANGED

**Files to modify:**
- `api/routes/admin.js` - Add audit logging to all user/role/department operations
- `api/routes/auth.js` - Add audit logging to login, logout, password change
- `api/routes/permissions.js` - Add audit logging to permission operations

## Implementation Priority

### Phase 1: Critical Security (Immediate)
1. ✅ Audit log hardening (15-day minimum, write-only, immutable)
2. ✅ Add audit logging to all sensitive operations
3. ✅ Device fingerprinting on login

### Phase 2: User Experience (Next)
4. ⏳ MFA settings UI in Edit User modal
5. ⏳ MFA self-service in Account page
6. ⏳ Session settings in Edit User modal
7. ⏳ Trusted devices in Account page

### Phase 3: Enhanced Features (Future)
8. ⏳ MFA backup codes
9. ⏳ Device geolocation tracking
10. ⏳ Anomaly detection (unusual login locations/times)
11. ⏳ Audit log export (encrypted, for compliance)

## Testing Checklist

### Audit Log Security Tests
- [ ] Try to set audit retention < 15 days (should fail)
- [ ] Try to delete an audit log (should be impossible)
- [ ] Try to update an audit log (should be impossible)
- [ ] View audit logs as Super Admin (only see logs > 15 days old)
- [ ] View audit logs as regular user (should be denied)
- [ ] Verify critical actions are being logged
- [ ] Verify flagged actions appear in "Flagged Only" view

### Device Management Tests
- [ ] Log in and verify device appears in Devices tab
- [ ] Verify browser, OS, IP address captured correctly
- [ ] Trust a device and verify trust status
- [ ] Revoke device trust and verify
- [ ] Force logout a device and verify

### MFA Tests (when implemented)
- [ ] Enable MFA and scan QR code
- [ ] Log in with MFA code
- [ ] Use backup code
- [ ] Reset MFA (Super Admin)
- [ ] Disable MFA (Super Admin only)

## Security Considerations

### Why 15-Day Write-Only Period?
1. **Prevents tampering:** Attackers cannot hide their tracks immediately
2. **Allows investigation:** Security team has time to detect and investigate incidents
3. **Compliance:** Many regulations require audit logs to be immutable
4. **Balance:** Long enough for security, short enough for operations

### Why Super Admin Only After 15 Days?
1. **Need-to-know principle:** Regular users don't need to see all system activity
2. **Privacy:** User actions are sensitive
3. **Investigation:** Only security team needs historical access
4. **Prevents abuse:** Limits who can use logs for monitoring

### Database-Level Protection
Using PostgreSQL rules prevents even database administrators from deleting logs without:
1. Stopping the database
2. Dropping the rules
3. Manual SQL commands
4. All of which are logged at the PostgreSQL level

This provides defense-in-depth security.

## Configuration Example

**Environment Variables (`.env`):**
```env
# Audit Log Configuration
AUDIT_MINIMUM_RETENTION_DAYS=15  # Cannot be changed via API
AUDIT_DEFAULT_RETENTION_DAYS=90  # Can be changed by Super Admin
AUDIT_WRITE_ONLY_PERIOD_DAYS=15  # Cannot be changed via API

# Session Configuration
SESSION_TIMEOUT_MINUTES=60
DEFAULT_TRUST_DEVICE_DAYS=30
MAX_CONCURRENT_SESSIONS=5

# MFA Configuration
MFA_ISSUER_NAME=Pramara PMS
MFA_BACKUP_CODES_COUNT=10
```

## Compliance Notes

These security measures help meet requirements for:
- **SOC 2 Type II:** Audit logging, immutability, retention
- **ISO 27001:** Access control, audit trails, security monitoring
- **GDPR:** Data access logs, security incident detection
- **HIPAA:** Audit controls, access logs, security management

The 15-day write-only period specifically addresses:
- **Non-repudiation:** Users cannot deny actions
- **Tamper evidence:** Modifications are prevented
- **Incident response:** Time to detect and investigate
- **Forensic readiness:** Evidence preservation


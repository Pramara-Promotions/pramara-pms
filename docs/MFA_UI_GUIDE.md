# Edit User Modal - MFA Section UI

## Before (What you saw):
```
🔐 Multi-Factor Authentication (MFA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MFA Status: ❌ Disabled

[Nothing else - no way to enable!]
```

## After (What you'll see now):

### When MFA is Disabled:
```
🔐 Multi-Factor Authentication (MFA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MFA Status: ❌ Disabled                    [Enable MFA]
                                            (Green)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚪 [Force Logout from All Devices]
   (Red button, full width)

This will immediately invalidate all active
sessions and trusted devices for this user.
```

### When MFA is Enabled:
```
🔐 Multi-Factor Authentication (MFA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MFA Status: ✅ Enabled                     [Reset MFA]
Enforced: 10/23/2025                         (Orange)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚪 [Force Logout from All Devices]
   (Red button, full width)

This will immediately invalidate all active
sessions and trusted devices for this user.
```

## Features Added:

### 1. Enable MFA Button (Green)
- **Appears when:** MFA is currently disabled
- **Action:** Sets mfaSecret to 'PENDING_SETUP'
- **Confirmation:** "Enable MFA for this user? They will be required to set it up on next login."
- **Result:** User prompted for MFA setup on next login
- **Audit:** Logs MFA_ENABLED action

### 2. Reset MFA Button (Orange)
- **Appears when:** MFA is currently enabled
- **Action:** Clears mfaSecret and mfaEnforcedAt
- **Confirmation:** "Reset MFA for this user? They will need to set it up again on next login."
- **Result:** User must set up MFA again
- **Audit:** Logs MFA_RESET action (flagged for review)

### 3. Force Logout Button (Red)
- **Always visible:** Below MFA section
- **Action:** Revokes trust on ALL user devices
- **Confirmation:** Shows user name/email
- **Result:** User logged out everywhere, must re-authenticate
- **Audit:** Logs FORCE_LOGOUT action (flagged as security-critical)

## How It Works:

### Enable MFA Flow:
```
1. Admin clicks "Enable MFA" (green button)
2. Confirmation dialog appears
3. API call: PUT /api/admin/users/:id/mfa { enabled: true }
4. Database updated: mfaSecret = 'PENDING_SETUP'
5. Audit log created: MFA_ENABLED
6. Success message shown
7. Modal refreshes → button changes to "Reset MFA"
8. User logs in → sees MFA setup screen
```

### Force Logout Flow:
```
1. Admin clicks "Force Logout from All Devices" (red button)
2. Confirmation with user name
3. API call: POST /api/admin/users/:id/force-logout
4. Database: All user devices → isTrusted = false
5. Audit log: FORCE_LOGOUT (flagged)
6. Success message with device count
7. User's next request → authentication fails
8. User must re-login and re-establish trust
```

## Backend Endpoints:

### PUT /api/admin/users/:id/mfa
```javascript
Request:
{
  "enabled": true  // or false to reset
}

Response:
{
  "success": true,
  "message": "MFA enabled. User will be prompted...",
  "user": {
    "id": "...",
    "email": "...",
    "mfaSecret": "PENDING_SETUP",
    "mfaEnforcedAt": "2025-10-23T..."
  }
}
```

### POST /api/admin/users/:id/force-logout
```javascript
Response:
{
  "success": true,
  "message": "User user@example.com has been logged out from all devices.",
  "devicesRevoked": 3
}
```

## Security Features:

✅ **Requires USER_EDIT permission**
✅ **Full audit trail**
✅ **MFA resets flagged for security review**
✅ **Force logout flagged as security-critical**
✅ **Double confirmation required**
✅ **Shows user details in confirmations**
✅ **Immediate effect (no grace period)**

## Testing Instructions:

### Test MFA Enable:
1. Open Edit User modal for user with no MFA
2. You should see "❌ Disabled" and green "Enable MFA" button
3. Click "Enable MFA"
4. Confirm the dialog
5. Success message should appear
6. Check Audit Logs → MFA_ENABLED action

### Test Force Logout:
1. Log in as the target user in another browser
2. Admin opens Edit User modal
3. Scroll to MFA section
4. Red "Force Logout" button at bottom
5. Click it, confirm with user name
6. Success message with device count
7. Target user's session should be invalid
8. Check Audit Logs → FORCE_LOGOUT action (flagged)

## Visual Layout:

```
┌─────────────────────────────────────────────┐
│ 🔐 Multi-Factor Authentication (MFA)       │
├─────────────────────────────────────────────┤
│                                             │
│ MFA Status: ❌ Disabled    [Enable MFA]    │
│                              (Green)        │
│ ─────────────────────────────────────────── │
│                                             │
│ 🚪 [Force Logout from All Devices]         │
│         (Red, full width)                   │
│                                             │
│ This will immediately invalidate all        │
│ active sessions and trusted devices.        │
└─────────────────────────────────────────────┘
```

All ready to test! 🚀

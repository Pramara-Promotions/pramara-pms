# Bug Fixes: MFA & Force Logout

## Issues Found:

### 1. MFA Enable/Disable - 500 Error
**Error:**
```
ReferenceError: logAudit is not defined
at D:\Pramara PMS\api\routes\admin.js:457:5
```

**Root Cause:**
- `logAudit` was not imported at the top of the file
- Other functions had local imports, but the new MFA endpoint didn't have access

**Fix:**
Added global import at the top of `admin.js`:
```javascript
// Import audit logger
const { logAudit } = require("../middleware/auditLogger");
```

---

### 2. Force Logout - 500 Error
**Error:**
```
PrismaClientValidationError: Unknown argument `isTrusted`. 
Did you mean `trusted`?
```

**Root Cause:**
- Device model field is named `trusted`, not `isTrusted`
- Code was using the wrong field name

**Fix:**
Changed from:
```javascript
// WRONG ❌
const revokedDevices = await prisma.device.updateMany({
  where: { userId: id, isTrusted: true },
  data: { 
    isTrusted: false,
    lastUsedAt: new Date()
  }
});
```

To:
```javascript
// CORRECT ✅
const revokedDevices = await prisma.device.updateMany({
  where: { userId: id, trusted: true },
  data: { 
    trusted: false,
    lastUsedAt: new Date()
  }
});
```

---

## Device Model Schema Reference:
```prisma
model Device {
  id          String    @id @default(cuid())
  userId      String
  fingerprint String
  name        String?
  ip          String?
  userAgent   String?
  trusted     Boolean   @default(false)      ← Correct field name
  trustUntil  DateTime?
  lastUsedAt  DateTime  @default(now())      ← Correct timestamp field
  createdAt   DateTime  @default(now())
}
```

---

## Files Modified:

### api/routes/admin.js
1. **Line 27-28** (added):
   ```javascript
   // Import audit logger
   const { logAudit } = require("../middleware/auditLogger");
   ```

2. **Line 508** (fixed field name):
   ```javascript
   where: { userId: id, trusted: true },  // was: isTrusted
   ```

3. **Line 510** (fixed field name):
   ```javascript
   trusted: false,  // was: isTrusted
   ```

---

## Testing Instructions:

### Test MFA Enable/Disable:
1. Refresh the Edit User modal
2. Click "Enable MFA" button
3. Should see success message: "MFA enabled. User will be prompted to set it up on next login."
4. Button should change to "Reset MFA" (orange)
5. Check Audit Logs for `MFA_ENABLED` action

### Test Force Logout:
1. Log in as target user in another browser
2. Admin clicks "Force Logout from All Devices"
3. Should see success message with device count
4. Check Audit Logs for `FORCE_LOGOUT` action (flagged)
5. Target user's session should be invalid
6. Devices tab should show devices as untrusted

---

## Status:
✅ Both issues fixed
✅ No compilation errors
✅ Ready for testing

The nodemon server should have auto-restarted with the fixes. Try the features again!

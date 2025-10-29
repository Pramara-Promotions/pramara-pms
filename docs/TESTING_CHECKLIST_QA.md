# ✅ Email + MFA Testing Checklist (Q&A Format)

**Testing Date:** _________________  
**Tester:** _________________  
**Environment:** ☐ Development  ☐ Staging  ☐ Production

---

## 🚀 SETUP: Email Configuration

### Q1: Is Resend API key configured?
- [y ] **YES** - API key added to `.env` file
- [ ] **NO** - Follow setup below

**Setup Steps:**
1. Go to https://resend.com and sign up
2. Create API key
3. Add to `.env`:
   ```env
   RESEND_API_KEY="re_xxxxxxxxxxxx"
   EMAIL_FROM="Pramara PMS <noreply@yourdomain.com>"
   EMAIL_REPLY_TO="support@yourdomain.com"
   ```
4. Restart backend server

**Test:** Run `echo $env:RESEND_API_KEY` (PowerShell) - should show key

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q2: Are email templates initialized?
- [ ] **YES** - All 4 templates exist in database
- [ ] **NO** - Run initialization

**Command:**
```bash
cd "d:\Pramara PMS\api"
node scripts/initEmailSystem.js
```

**Expected Output:**
```
✅ Template 'user-invitation' created/updated
✅ Template 'mfa-setup' created/updated
✅ Template 'mfa-enabled' created/updated
✅ Template 'mfa-disabled' created/updated
```

**Verify in Database:**
```sql
SELECT name, category, "isActive" FROM "EmailTemplate";
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q3: Is training mode disabled?
- [ ] **YES** - Real emails will be sent
- [ ] **NO** - Go to Admin Panel and disable

**Steps:**
1. Login as Super Admin
2. Navigate to Admin Panel → Email Settings
3. Toggle "Training Mode" to OFF
4. Toggle "Outbound Email Sending" to ON
5. Click "Save Settings"

**Verify:**
- Warning banner should disappear
- Blue note: "⚠️ Real emails will be sent to recipients!"

**Database Check:**
```sql
SELECT key, value FROM "SystemSetting" 
WHERE key IN ('emailTrainingMode', 'emailOutboundEnabled');
-- emailTrainingMode should be false
-- emailOutboundEnabled should be true
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

## 📧 TEST SUITE 1: User Invitation

### Q4: Can admin create user with invitation?

**Steps:**
1. Login as Super Admin
2. Admin Panel → Users → Create User
3. Fill: Email, Name, Role
4. ✅ Check "Send invitation email"
5. Click "Create User"

**Expected:**
- User created successfully
- Status shows "PENDING"
- User appears in list

✅ **Result:** ______________ (Pass/Fail)  
📝 **User Email Created:** ______________

---

### Q5: Did user receive invitation email?

**Check:**
- [ ] Email arrived in inbox (check spam folder too)
- [ ] Subject: "You've been invited to Pramara PMS"
- [ ] From: Pramara PMS <noreply@yourdomain.com>
- [ ] Inviter name displayed correctly
- [ ] Invitation link present
- [ ] Expiration date shown

**Email Log:**
```sql
SELECT 
  to, 
  subject, 
  status, 
  "sentAt", 
  "providerMsgId"
FROM "EmailLog" 
WHERE to::text LIKE '%[user-email]%'
ORDER BY "createdAt" DESC LIMIT 1;
```

Expected status: `sent` (not `dummy_training_mode`)

✅ **Result:** ______________ (Pass/Fail)  
📝 **Provider Message ID:** ______________

---

### Q6: Can user accept invitation?

**Steps:**
1. Click invitation link from email
2. Page loads at `/invite/[token]`
3. Account details shown correctly
4. Create password:
   - Min 8 chars
   - Uppercase, lowercase, number, special
5. Confirm password (must match)
6. Click "Accept Invitation"

**Expected:**
- Success message shown
- Redirected to login page
- Can log in with new password

**Database Check:**
```sql
SELECT status, inviteToken, "isActive" 
FROM "User" WHERE email = '[user-email]';
-- status: ACTIVE
-- inviteToken: NULL
-- isActive: true
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q7: Does expired invitation fail correctly?

**Manual Test:**
```sql
-- Create test user with expired invite
UPDATE "User" 
SET "inviteExpires" = NOW() - INTERVAL '1 day'
WHERE email = '[test-email]';
```

**Steps:**
1. Try to accept expired invitation
2. Should see error: "Invitation has expired"
3. User status remains PENDING

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

## 🔐 TEST SUITE 2: MFA Setup

### Q8: Can user enable MFA?

**Steps:**
1. Login as regular user
2. Account Settings page
3. Click "Enable MFA"
4. Modal opens with QR code

**Expected:**
- QR code displays
- Manual entry key shown
- Backup codes visible
- Download/Print buttons work

**Database Check:**
```sql
SELECT 
  mfaSecret IS NOT NULL as has_secret,
  mfaEnforcedAt
FROM "User" WHERE id = [user-id];
-- has_secret: true
-- mfaEnforcedAt: NULL (not enforced yet)
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q9: Does MFA setup email arrive?

**Check:**
- [ ] Email received
- [ ] Subject: "Multi-Factor Authentication Setup - Pramara PMS"
- [ ] QR code image embedded
- [ ] Manual entry key visible
- [ ] Setup instructions clear

**Email Log:**
```sql
SELECT subject, status, "sentAt"
FROM "EmailLog"
WHERE "templateId" IN (
  SELECT id FROM "EmailTemplate" WHERE name = 'mfa-setup'
)
ORDER BY "createdAt" DESC LIMIT 1;
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q10: Can user verify and complete MFA setup?

**Steps:**
1. Scan QR code with authenticator app (Google Authenticator/Authy)
2. Enter 6-digit code from app
3. Click "Verify & Enable MFA"

**Expected:**
- Success message: "MFA Enabled Successfully!"
- Modal closes
- Account page shows "MFA Status: ✅ Enabled"

**Database Check:**
```sql
SELECT 
  mfaEnforcedAt IS NOT NULL as enforced,
  array_length(mfaBackupCodes, 1) as backup_count
FROM "User" WHERE id = [user-id];
-- enforced: true
-- backup_count: 8
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q11: Does MFA enabled email arrive?

**Check:**
- [ ] Email received
- [ ] Subject: "MFA Successfully Enabled - Pramara PMS"
- [ ] Backup codes listed
- [ ] Security instructions clear
- [ ] Timestamp correct

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

## 🔑 TEST SUITE 3: MFA Login

### Q12: Does login require MFA?

**Steps:**
1. Logout
2. Enter email and password
3. Click "Sign in"

**Expected:**
- Password accepted
- Screen changes to "Two-Factor Authentication"
- 6-digit code input shown
- "Use a backup code" link visible

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q13: Does TOTP code work?

**Steps:**
1. Open authenticator app
2. Get current 6-digit code
3. Enter in MFA screen
4. Click "Verify"

**Expected:**
- Code accepted
- Logged in successfully
- Redirected to dashboard

**Audit Log:**
```sql
SELECT action, outcome FROM "AuditLog"
WHERE action = 'MFA_LOGIN_SUCCESS'
ORDER BY "createdAt" DESC LIMIT 1;
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q14: Does backup code work?

**Steps:**
1. Logout
2. Login with email/password
3. Click "Use a backup code →"
4. Enter one backup code (e.g., ABC12345)
5. Click "Verify"

**Expected:**
- Backup code accepted
- Logged in successfully
- Backup code removed from database

**Database Check:**
```sql
SELECT array_length(mfaBackupCodes, 1) as remaining_codes
FROM "User" WHERE id = [user-id];
-- Should be 7 (was 8, used 1)
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Remaining Codes:** ______________

---

### Q15: Does invalid code fail correctly?

**Steps:**
1. Logout
2. Login with email/password
3. Enter wrong code: `000000`
4. Click "Verify"

**Expected:**
- Error: "Invalid MFA code"
- Code input cleared
- Can try again
- Not logged in

**Audit Log:**
```sql
SELECT action, outcome FROM "AuditLog"
WHERE action = 'MFA_LOGIN_FAILED'
ORDER BY "createdAt" DESC LIMIT 1;
-- outcome: failure
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q16: Does "Trust this device" work?

**Steps:**
1. Logout
2. Login with email/password
3. Enter MFA code
4. ✅ Check "Trust this device for 30 days"
5. Click "Verify"

**Expected:**
- Logged in successfully
- Device marked as trusted in database

**Database Check:**
```sql
SELECT trusted, "trustedUntil"
FROM "Device"
WHERE "userId" = [user-id]
ORDER BY "lastUsedAt" DESC LIMIT 1;
-- trusted: true
-- trustedUntil: ~30 days from now
```

⚠️ **Note:** Feature may not skip MFA yet (planned enhancement)

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

## 🔓 TEST SUITE 4: Disable MFA

### Q17: Can user disable MFA?

**Steps:**
1. Login (with MFA)
2. Account Settings page
3. Click "Disable MFA"
4. Modal opens requesting password
5. Enter password
6. Click "Disable MFA"

**Expected:**
- Password validated
- Success message
- MFA Status: "❌ Disabled"

**Database Check:**
```sql
SELECT 
  mfaSecret IS NULL as secret_cleared,
  mfaEnforcedAt IS NULL as not_enforced,
  mfaBackupCodes IS NULL as codes_cleared
FROM "User" WHERE id = [user-id];
-- All should be true (NULL)
```

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q18: Does MFA disabled email arrive?

**Check:**
- [ ] Email received
- [ ] Subject: "Security Alert: MFA Disabled - Pramara PMS"
- [ ] Warning about reduced security
- [ ] Timestamp shown
- [ ] "Disabled by" shows user name

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q19: Can login without MFA after disabling?

**Steps:**
1. Logout
2. Login with email and password only

**Expected:**
- No MFA screen shown
- Direct login to dashboard
- No TOTP code required

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

## 👤 TEST SUITE 5: Admin MFA Management

### Q20: Can admin see MFA status for all users?

**Steps:**
1. Login as Super Admin
2. Admin Panel → Users tab
3. Look at MFA column

**Expected:**
- Column header: "MFA"
- Users with MFA: Green badge "✅ Enabled"
- Users without MFA: Gray badge "Disabled"
- Users with pending setup: Yellow badge "Pending"

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

## 🎯 TEST SUITE 6: Email Training Mode Toggle

### Q21: Can training mode be toggled per user?

**Feature:** User-level training mode override

**Steps:**
1. Admin Panel → Users → Edit User
2. Find "Email Settings" section
3. Toggle "Training Mode for this user"
4. Save

**Expected:**
- User-specific emails go to training mode
- System emails still sent normally
- User can test without affecting production

**Database Check:**
```sql
SELECT 
  emailOutboundEnabled,
  emailOverrideSystem,
  emailTrainingMode
FROM "User" WHERE id = [user-id];
```

⚠️ **Status:** Feature needs implementation

✅ **Result:** ______________ (N/A - Not Implemented)  
📝 **Notes:** ______________

---

## 📊 FINAL VALIDATION

### Q22: Are all email logs correct?

**Query:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status LIKE 'failed%') as failed,
  COUNT(*) FILTER (WHERE status LIKE 'blocked%') as blocked
FROM "EmailLog"
WHERE "createdAt" > NOW() - INTERVAL '1 hour';
```

**Expected:**
- All test emails have status 'sent'
- No failed or blocked emails
- All emails have valid providerMsgId

✅ **Result:** ______________ (Pass/Fail)  
📝 **Sent:** _____ **Failed:** _____ **Blocked:** _____

---

### Q23: Are all audit logs recorded?

**Query:**
```sql
SELECT 
  action,
  COUNT(*) as count
FROM "AuditLog"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY action
ORDER BY count DESC;
```

**Expected Actions:**
- `USER_CREATED`
- `INVITE_ACCEPTED`
- `MFA_SETUP_STARTED`
- `MFA_ENABLED`
- `MFA_LOGIN_SUCCESS`
- `MFA_DISABLED`

✅ **Result:** ______________ (Pass/Fail)  
📝 **Notes:** ______________

---

### Q24: Can you access email logs in admin panel?

**Steps:**
1. Admin Panel → System Settings (if exists)
2. Look for "Email Logs" or "Email Activity"

**Expected:**
- List of recent emails
- Filter by status, date, recipient
- View email content
- See delivery status

⚠️ **Status:** Feature may need implementation

✅ **Result:** ______________ (N/A - Check if implemented)  
📝 **Notes:** ______________

---

## 🏁 COMPLETION SUMMARY

**Total Tests:** 24  
**Passed:** _____ / 24  
**Failed:** _____ / 24  
**N/A:** _____ / 24  

**Critical Issues Found:**
1. ______________________________
2. ______________________________
3. ______________________________

**Minor Issues Found:**
1. ______________________________
2. ______________________________
3. ______________________________

**Recommendations:**
- [ ] All features working - ready for production
- [ ] Minor fixes needed before production
- [ ] Major issues - requires development work

**Sign-Off:**

Tester: _____________________ Date: __________

Tech Lead: __________________ Date: __________

---

## 📝 Quick Reference Queries

### Check All Email Templates
```sql
SELECT name, category, "isActive", "updatedAt" 
FROM "EmailTemplate" ORDER BY name;
```

### View Recent Emails
```sql
SELECT 
  id,
  to,
  subject,
  status,
  "sentAt",
  "createdAt"
FROM "EmailLog"
ORDER BY "createdAt" DESC
LIMIT 20;
```

### Check User MFA Status
```sql
SELECT 
  email,
  CASE 
    WHEN mfaSecret IS NOT NULL AND mfaEnforcedAt IS NOT NULL THEN 'Enabled'
    WHEN mfaSecret IS NOT NULL THEN 'Pending'
    ELSE 'Disabled'
  END as mfa_status
FROM "User"
ORDER BY email;
```

### View Audit Trail
```sql
SELECT 
  action,
  "User".email as user,
  details,
  outcome,
  "createdAt"
FROM "AuditLog"
LEFT JOIN "User" ON "AuditLog"."userId" = "User".id
WHERE "createdAt" > NOW() - INTERVAL '1 day'
ORDER BY "createdAt" DESC
LIMIT 50;
```

### Email System Settings
```sql
SELECT key, value, "updatedBy", "updatedAt"
FROM "SystemSetting"
WHERE key LIKE 'email%'
ORDER BY key;
```

---

**End of Testing Checklist** ✅

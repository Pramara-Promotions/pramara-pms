# Password Reset Security System Documentation

## Overview
Comprehensive enterprise-grade password reset system with multi-tier security, force password change enforcement, and audit tracking.

## Features Implemented

### 1. Multi-Tier Password Reset Options

#### Option A: Email-Based Reset (Recommended)
- **How it works:**
  - Admin clicks "Email New Password" button
  - System generates secure 12-character random password
  - Password is sent to user's email address
  - User forced to change password on first login
  
- **Security Features:**
  - System-generated cryptographically secure password
  - Email contains security warnings
  - User must change password immediately
  - 7-day security alert banner
  - Admin notification sent to Super Admins
  
- **User Experience:**
  - ✅ Convenient - user receives email
  - ✅ Secure - no manual password sharing
  - ✅ Audited - full trail of reset action

#### Option B: Manual Password Generation
- **How it works:**
  - Admin clicks "Generate Temporary Password" button
  - System generates secure 12-character random password
  - Password displayed ONCE to admin with copy button
  - Admin shares password securely with user
  - User forced to change password on first login
  
- **Security Features:**
  - For users without email access
  - Password shown only once
  - Copy-to-clipboard functionality
  - User must change password immediately
  - 7-day security alert banner
  - Admin notification sent to Super Admins
  
- **User Experience:**
  - ⚠️ Manual sharing required
  - ⚠️ Higher security risk
  - ✅ Works without email
  - ✅ Audited - full trail of reset action

#### Option C: MFA Self-Service Reset (Future)
- **Planned for when MFA is fully implemented:**
  - User resets own password using MFA device
  - No admin intervention needed
  - Highest security level
  - No 7-day alert banner (trusted method)

### 2. Force Password Change on Login

- **Database Field:** `User.mustChangePassword` (Boolean)
- **Trigger:** Set to `true` when admin resets password
- **Enforcement:** Login endpoint checks flag and redirects to `/change-password`
- **Clear:** Flag set to `false` after successful password change

**Login Flow:**
```
User enters credentials
    ↓
Backend validates credentials
    ↓
Backend checks mustChangePassword flag
    ↓
If true → Return { ok: true, mustChangePassword: true }
    ↓
Frontend redirects to /change-password
    ↓
User changes password
    ↓
Backend clears mustChangePassword flag
    ↓
User redirected to dashboard
```

### 3. 7-Day Security Alert Banner

- **Notification Type:** `SECURITY_ALERT`
- **Duration:** 7 days from password reset
- **Display:** Yellow banner at top of all pages
- **Purpose:** Warn user of non-MFA password recovery
- **Dismissible:** Yes (temporarily - shows again on page reload)

**Banner Content:**
```
🔒 Security Alert
Your account was recovered without MFA verification on [date]. 
If you didn't request this, contact admin immediately.
This alert will be shown for X more days.
```

### 4. Admin Notification System

When password is reset via email or manual method:
- **Notification Type:** `ADMIN_ALERT`
- **Recipients:** All users with Super Admin role
- **Content:** Details of password reset including method and timestamp
- **Purpose:** Security team awareness of account recovery

### 5. Comprehensive Audit Logging

Every password reset action is logged with:
- Action: `PASSWORD_RESET`
- User ID and email
- Reset method: `email` or `manual`
- Admin who performed reset
- Timestamp
- IP address

Password change actions are also logged:
- Action: `PASSWORD_CHANGED`
- User ID and email
- Timestamp
- IP address

## Technical Implementation

### Backend Changes

#### 1. Database Schema (`prisma/schema.prisma`)
```prisma
model User {
  // ... existing fields ...
  
  // Password Reset Security Fields
  mustChangePassword Boolean @default(false)  // Force password change on next login
  passwordResetAt    DateTime?                // When password was last reset by admin
  passwordResetMethod String?                 // 'email' or 'manual' for audit trail
}
```

#### 2. Password Reset Endpoint (`api/routes/admin.js`)
```
POST /api/admin/users/:id/reset-password
Body: { method: 'email' | 'manual' }

Process:
1. Validate request and permissions
2. Generate secure 12-character password (crypto.randomBytes)
3. Hash password with argon2
4. Update user: passwordHash, mustChangePassword=true, passwordResetAt, passwordResetMethod
5. Create SECURITY_ALERT notification (expires in 7 days)
6. Notify Super Admins (ADMIN_ALERT)
7. If email method: Send password via email
8. If manual method: Return temporaryPassword in response
9. Log audit event
```

#### 3. Login Endpoint Enhancement (`api/routes/auth.js`)
```
POST /api/auth/login
Body: { email, password, code? }

Returns:
{
  ok: true,
  mustChangePassword: boolean  // NEW: Signals frontend to redirect
}
```

#### 4. Change Password Endpoint (`api/routes/auth.js`)
```
POST /api/auth/change-password
Body: { currentPassword, newPassword }

Process:
1. Validate current password
2. Validate new password (min 8 chars, different from current)
3. Hash new password
4. Update user: passwordHash, mustChangePassword=false
5. Log audit event
```

#### 5. Email Service (`api/lib/emailService.js`)
```javascript
async function sendPasswordResetEmail(email, userName, temporaryPassword) {
  // Current: Mock implementation (console.log)
  // Production: Use nodemailer with SMTP configuration
}
```

### Frontend Changes

#### 1. Edit User Modal (`web/src/features/admin/EditUserModal.tsx`)
**New State:**
- `passwordResetMethod`: 'email' | 'manual' | null
- `generatedPassword`: string (for manual method)

**UI Sections:**
1. **Security Notice** - Warns about password reset options
2. **Method Selection** - Two buttons (green for email, orange for manual)
3. **Email Confirmation** - Shows warning and details before sending
4. **Manual Confirmation** - Shows high-security warning before generating
5. **Generated Password Display** - Shows password once with copy button

**User Flow:**
```
Click "Reset Password" button
    ↓
Expand password reset section
    ↓
Choose reset method (email or manual)
    ↓
Review security warnings and confirm
    ↓
System generates password and executes reset
    ↓
If email: Show success message
If manual: Display password with copy button
    ↓
Close reset section
```

#### 2. Login Page (`web/src/pages/Login.tsx`)
**Enhancement:**
- Parse login response for `mustChangePassword` flag
- If true, redirect to `/change-password` instead of dashboard
- User cannot bypass - backend enforces this

#### 3. Change Password Page (`web/src/pages/ChangePassword.tsx`)
**Features:**
- Standalone page (not in AppLayout)
- Required fields: currentPassword, newPassword, confirmPassword
- Client-side validation (8+ chars, passwords match, different from current)
- Server-side validation (verify current password, enforce rules)
- Success message with auto-redirect to home

**Security Requirements Displayed:**
- At least 8 characters long
- Must be different from current password
- Avoid common passwords

#### 4. Security Alert Banner (`web/src/components/layout/SecurityAlertBanner.tsx`)
**Features:**
- Fetches SECURITY_ALERT notifications on mount
- Filters expired alerts (expiresAt > now)
- Shows yellow banner with warning icon
- Displays remaining days
- Dismissible (but shows again on page reload)
- Responsive design

#### 5. App Layout Integration (`web/src/components/layout/AppLayout.tsx`)
- SecurityAlertBanner added between header and main content
- Shows on all authenticated pages
- No layout shift when alert appears/disappears

#### 6. Routing (`web/src/app-router.tsx`)
- Added `/change-password` route outside AppLayout
- Accessible when authenticated
- Redirects to home after successful password change

## Security Benefits

### 1. Defense in Depth
- Multiple password reset methods for different scenarios
- Each method has appropriate security measures
- Force password change prevents temporary password reuse

### 2. Audit Trail
- Complete logging of all password reset actions
- Method tracking (email vs manual)
- Timestamp tracking for compliance
- Admin accountability (who performed reset)

### 3. User Awareness
- 7-day security alert banner ensures user is aware of account activity
- Email notifications provide immediate awareness
- Clear instructions on what to do if reset wasn't requested

### 4. Admin Oversight
- Super Admins notified of all password resets
- Security team can monitor for suspicious activity
- Audit logs available for investigation

### 5. Temporary Password Prevention
- Force password change prevents sharing/reuse of temporary passwords
- User must choose their own password
- Temporary password expires after first use

## Testing Checklist

### Email Method Testing
- [ ] Click "Email New Password" in Edit User Modal
- [ ] Confirm action in dialog
- [ ] Verify success message displayed
- [ ] Check console for email log (mock service)
- [ ] Verify user has mustChangePassword=true in database
- [ ] Log in as user with temporary password
- [ ] Verify redirect to /change-password
- [ ] Change password successfully
- [ ] Verify redirect to dashboard
- [ ] Verify security alert banner appears
- [ ] Verify banner shows correct days remaining
- [ ] Verify Super Admins receive notification
- [ ] Verify audit log contains PASSWORD_RESET event

### Manual Method Testing
- [ ] Click "Generate Temporary Password" in Edit User Modal
- [ ] Confirm action in high-security dialog
- [ ] Verify temporary password displayed once
- [ ] Copy password to clipboard
- [ ] Verify "Done" closes section (password no longer visible)
- [ ] Check database: mustChangePassword=true, passwordResetAt set
- [ ] Log in as user with temporary password
- [ ] Verify redirect to /change-password
- [ ] Try entering same password as new password (should fail)
- [ ] Try entering password < 8 chars (should fail)
- [ ] Change password successfully
- [ ] Verify redirect to dashboard
- [ ] Verify security alert banner appears
- [ ] Verify Super Admins receive notification
- [ ] Verify audit log contains PASSWORD_RESET and PASSWORD_CHANGED events

### Security Alert Banner Testing
- [ ] Banner appears after password reset
- [ ] Banner shows correct message
- [ ] Banner shows correct days remaining
- [ ] Banner is dismissible
- [ ] Banner reappears on page reload
- [ ] Banner disappears after 7 days
- [ ] Banner doesn't appear for users without security alerts

### Password Change Flow Testing
- [ ] /change-password page loads correctly
- [ ] Current password validation works
- [ ] New password length validation works (8+ chars)
- [ ] Passwords must match validation works
- [ ] New password must differ from current validation works
- [ ] Invalid current password shows error
- [ ] Valid password change succeeds
- [ ] mustChangePassword flag cleared in database
- [ ] User redirected to dashboard
- [ ] Audit log contains PASSWORD_CHANGED event

### Edge Cases
- [ ] User tries to access /change-password when not required (should work)
- [ ] User tries to bypass force password change (backend prevents)
- [ ] Multiple password resets in short time (all logged)
- [ ] Password reset while user is logged in (works)
- [ ] Expired security alerts don't show
- [ ] Users without notifications see no banner

## Production Checklist

### Email Service Configuration
1. Install nodemailer: `npm install nodemailer`
2. Configure SMTP settings in `.env`:
   ```
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=true
   SMTP_USER=noreply@example.com
   SMTP_PASS=your-password
   EMAIL_FROM="Pramara PMS <noreply@example.com>"
   ```
3. Update `api/lib/emailService.js` to use real SMTP
4. Test email delivery in staging environment

### Database Migration
- Migration already created and applied: `add_password_reset_security_fields`
- Verify migration on staging before production deployment

### Security Review
- [ ] Review password generation algorithm (currently crypto.randomBytes)
- [ ] Review password hashing (currently argon2 with default settings)
- [ ] Review audit logging completeness
- [ ] Review notification system security
- [ ] Review force password change enforcement

### Monitoring
- Set up alerts for unusual password reset patterns
- Monitor audit logs for suspicious activity
- Track password reset success/failure rates
- Monitor security alert banner dismissal rates

## Future Enhancements

### Phase 1 (Current) - Complete ✅
- Multi-tier password reset (email + manual)
- Force password change on login
- 7-day security alert banner
- Admin notifications
- Comprehensive audit logging

### Phase 2 (Future) - Pending MFA Implementation
- MFA-based self-service password reset
- No security alert for MFA-verified resets
- User can reset own password without admin

### Phase 3 (Future Enhancements)
- Password complexity requirements (uppercase, lowercase, numbers, symbols)
- Password history (prevent reusing last N passwords)
- Password expiration policies
- Account lockout after failed password changes
- Geographic/IP-based anomaly detection
- Two-person approval for high-privilege account resets

## Files Changed

### Backend
1. `api/routes/admin.js` - Password reset endpoint
2. `api/routes/auth.js` - Login and change password endpoints
3. `api/lib/emailService.js` - Email functions
4. `prisma/schema.prisma` - User model schema
5. `prisma/migrations/[timestamp]_add_password_reset_security_fields` - Database migration

### Frontend
1. `web/src/features/admin/EditUserModal.tsx` - Password reset UI
2. `web/src/pages/Login.tsx` - Login flow with force password change check
3. `web/src/pages/ChangePassword.tsx` - New change password page
4. `web/src/components/layout/SecurityAlertBanner.tsx` - New security alert banner
5. `web/src/components/layout/AppLayout.tsx` - Integrated security alert banner
6. `web/src/app-router.tsx` - Added change-password route

## Support & Troubleshooting

### Issue: User can't log in after password reset
**Solution:** 
- Check that user is being redirected to `/change-password`
- Verify mustChangePassword flag in database
- Check audit logs for PASSWORD_RESET event

### Issue: Security alert banner not showing
**Solution:**
- Check notifications table for SECURITY_ALERT type
- Verify notification not expired (expiresAt > now)
- Check browser console for fetch errors
- Verify user is authenticated

### Issue: Email not being sent
**Solution:**
- Check console logs (currently mock implementation)
- For production: verify SMTP configuration
- Check email service error logs
- Verify email address is valid in user profile

### Issue: Password change fails
**Solution:**
- Verify current password is correct
- Check new password meets requirements (8+ chars)
- Verify passwords match
- Check backend logs for validation errors
- Verify user is authenticated

## Conclusion

This comprehensive password reset security system provides enterprise-grade security with:
- ✅ Multiple reset methods for different scenarios
- ✅ Force password change enforcement
- ✅ User awareness through 7-day alerts
- ✅ Admin oversight and notifications
- ✅ Complete audit trail for compliance
- ✅ Defense in depth security approach

The system is production-ready pending SMTP configuration for real email delivery.

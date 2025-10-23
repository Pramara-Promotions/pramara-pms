# 📧 User Invitation System - Implementation Summary

## Overview

The **user invitation system** allows Super Admins to create new user accounts and automatically send invitation emails to new users. Users receive a secure invitation link that allows them to set their password and activate their account.

---

## 🎯 What Was Implemented

### 1. **Email Template** (Database)

**Template Name:** `user-invitation`

**Features:**
- Beautiful, responsive HTML email design
- Shows inviter name
- Displays account email
- Secure invitation link with expiration date
- Mobile-friendly layout
- Professional branding

**Variables:**
- `{{userName}}` - New user's name
- `{{inviterName}}` - Admin who sent the invitation
- `{{inviteUrl}}` - Unique invitation link
- `{{expiresAt}}` - Formatted expiration date

**Location:** Created via `api/scripts/initEmailSystem.js`

---

### 2. **Backend API Routes** (`api/routes/invite.js`)

#### **GET /api/invite/:token**
- Validates invitation token
- Returns invitation details (email, name, inviter, expiration)
- Checks if invitation is expired
- Returns 404 if token invalid

**Response:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "inviterName": "Admin Name",
  "expiresAt": "2025-10-30T12:00:00.000Z",
  "isExpired": false
}
```

#### **POST /api/invite/:token/accept**
- Validates password strength (8+ chars, uppercase, lowercase, number, special)
- Checks invitation not expired
- Updates user: sets password, activates account, clears invite token
- Creates authenticated session
- Sets auth cookie
- Logs audit event
- Returns user data

**Request:**
```json
{
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Account created successfully",
  "user": {
    "id": 123,
    "email": "newuser@example.com",
    "name": "New User",
    "status": "ACTIVE",
    "permissions": ["PROJECT_VIEW", "TASK_CREATE", ...]
  }
}
```

---

### 3. **Updated Admin User Creation** (`api/routes/admin.js`)

**Changes:**
- When creating user, generates `inviteToken` (64-char hex)
- Sets `inviteExpires` to 7 days from creation
- User status set to `PENDING` (not `ACTIVE`)
- Sends invitation email using `user-invitation` template
- Email includes formatted expiration date
- Email sending doesn't block user creation (fails gracefully)

**User Creation Request:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "departmentId": 5,
  "roleIds": ["role-uuid-1", "role-uuid-2"],
  "sendInvite": true  // Default true
}
```

---

### 4. **Frontend Invite Acceptance Page** (`web/src/pages/AcceptInvite.tsx`)

**Features:**
- **Token Validation**: Fetches invite details from API
- **Expired Check**: Shows friendly error if invitation expired
- **Invalid Token**: Shows error for invalid/used tokens
- **Account Display**: Shows email and inviter name
- **Password Creation**: 
  - Real-time validation
  - Minimum 8 characters
  - Must have uppercase, lowercase, number, special character
  - Password confirmation (must match)
- **Secure Submission**: Creates account and logs user in
- **Redirect**: Sends user to login page after success
- **Mobile Responsive**: Works on all device sizes

**Password Validation:**
```typescript
✅ Minimum 8 characters
✅ At least 1 uppercase letter (A-Z)
✅ At least 1 lowercase letter (a-z)
✅ At least 1 number (0-9)
✅ At least 1 special character (!@#$%^&*(),.?":{}|<>)
```

---

### 5. **Router Integration** (`web/src/app-router.tsx`)

**New Route:**
```tsx
const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "invite/$token",
  component: AcceptInvite,
});
```

**URL Format:** `http://localhost:5173/invite/abc123...xyz`

---

## 📊 Database Schema Changes

**No schema changes required** - uses existing `User` table fields:

```prisma
model User {
  // ... existing fields ...
  inviteToken    String?   // 64-char hex token (nullable)
  inviteExpires  DateTime? // 7 days from creation
  status         String    // "PENDING" → "ACTIVE" on acceptance
  createdBy      User?     // Reference to admin who created user
}
```

---

## 🔄 Complete Flow

### **Admin Creates User**

1. Admin fills out "Create User" form
2. Checks "Send invitation email" (default)
3. Clicks "Create User"
4. Backend:
   - Creates user with status `PENDING`
   - Generates unique `inviteToken`
   - Sets `inviteExpires` = 7 days from now
   - Sends email using `user-invitation` template
   - (Training mode: logs email to EmailLog)

### **User Receives Email**

5. User receives email at their inbox
6. Email contains:
   - Inviter name
   - Account email
   - Invitation link (`/invite/abc123...`)
   - Expiration date (human-readable)
   - Instructions

### **User Accepts Invitation**

7. User clicks invitation link
8. Frontend loads `/invite/:token`
9. Page fetches invitation details:
   - Validates token
   - Shows account email
   - Shows inviter name
   - Checks expiration
10. User creates password:
    - Enters password (validated)
    - Confirms password (must match)
11. Clicks "Accept Invitation"
12. Backend:
    - Validates password strength
    - Hashes password with Argon2
    - Updates user: `status='ACTIVE'`, clears token
    - Creates session
    - Logs audit event
13. Frontend:
    - Redirects to login page
    - Shows success message

### **User Logs In**

14. User logs in with email + new password
15. (Optional) Sets up MFA if required
16. Accesses system with assigned roles/permissions

---

## 🎨 Email Template Preview

**Subject:** You've been invited to Pramara PMS

**Content:**
```
┌─────────────────────────────────────────┐
│      🎉 Welcome to Pramara PMS!         │
│         (Blue header bar)               │
└─────────────────────────────────────────┘

Hello [User Name],

You've been invited by [Inviter Name] to join 
Pramara Project Management System.

┌─────────────────────────────────────────┐
│ Account: newuser@example.com            │
│ Name: New User                          │
└─────────────────────────────────────────┘

🚀 Get Started

1. Click the invitation link
2. Create a secure password
3. Set up Multi-Factor Authentication (MFA)
4. Start using Pramara PMS!

[Accept Invitation & Set Up Account] (Button)

⏰ This invitation expires on October 30, 2025

---
This is an automated invitation from Pramara PMS
If you didn't expect this, you can safely ignore it.
```

---

## 🔒 Security Features

### **Token Security**
- ✅ 64-character hex tokens (256-bit entropy)
- ✅ Cryptographically random generation
- ✅ Single-use only (cleared after acceptance)
- ✅ 7-day expiration
- ✅ Cannot be reused after expiration

### **Password Security**
- ✅ Minimum 8 characters
- ✅ Complexity requirements enforced
- ✅ Argon2 hashing (industry standard)
- ✅ Frontend and backend validation

### **Status Management**
- ✅ Users start as `PENDING` (cannot log in)
- ✅ Only activated after invitation acceptance
- ✅ Old invitations cannot override active accounts

### **Audit Trail**
- ✅ User creation logged
- ✅ Invitation acceptance logged
- ✅ Failed attempts logged
- ✅ IP address and user agent captured

---

## 📝 Training Mode Behavior

**When Training Mode is ON** (default):
- ✅ Invitation emails logged to `EmailLog` table
- ✅ Status: `dummy_training_mode`
- ✅ No real emails sent to users
- ✅ Console shows: `[EMAIL] Training mode - Dummy email sent`
- ✅ Safe for development and testing

**Query to view logged invitations:**
```sql
SELECT 
  id,
  to,
  subject,
  status,
  "createdAt",
  "providerMsgId"
FROM "EmailLog"
WHERE "templateId" IN (
  SELECT id FROM "EmailTemplate" WHERE name = 'user-invitation'
)
ORDER BY "createdAt" DESC;
```

---

## 🧪 Testing Guide

### **Test 1: Create User with Invitation**

```bash
# Admin creates user
POST /api/admin/users
{
  "email": "testuser@example.com",
  "name": "Test User",
  "roleIds": ["role-id-1"],
  "sendInvite": true
}

# Check EmailLog
SELECT * FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 1;
# Should see dummy_training_mode status

# Check User
SELECT status, inviteToken, inviteExpires 
FROM "User" WHERE email = 'testuser@example.com';
# status: PENDING, token: 64 chars, expires: 7 days
```

### **Test 2: Accept Invitation**

```bash
# Get token from database
SELECT inviteToken FROM "User" 
WHERE email = 'testuser@example.com';

# Navigate to:
http://localhost:5173/invite/[token]

# Create password and submit

# Check User updated
SELECT status, inviteToken, inviteExpires, isActive
FROM "User" WHERE email = 'testuser@example.com';
# status: ACTIVE, token: NULL, expires: NULL, isActive: true
```

### **Test 3: Expired Invitation**

```sql
-- Manually expire invitation
UPDATE "User" 
SET "inviteExpires" = NOW() - INTERVAL '1 day'
WHERE email = 'testuser@example.com';

-- Try to accept → should show "Invitation expired"
```

### **Test 4: Invalid Token**

```bash
# Navigate to:
http://localhost:5173/invite/invalid-token-12345

# Should show: "Invalid or expired invitation"
```

---

## 🚀 Production Deployment

### **Enable Real Email Sending**

1. **Get Resend API Key:**
   - Sign up at https://resend.com
   - Create API key
   - Add to `.env`: `RESEND_API_KEY=re_xxxxx`

2. **Configure Super Admin:**
   - Login as Super Admin
   - Navigate to Admin Panel → Email Settings
   - Toggle "Training Mode" to OFF
   - Toggle "Outbound Email Sending" to ON
   - Click "Save Settings"

3. **Test Real Email:**
   - Create test user with your real email
   - Check inbox for invitation email
   - Accept invitation

4. **Verify EmailLog:**
```sql
SELECT status, sentAt, providerMsgId 
FROM "EmailLog" 
ORDER BY "createdAt" DESC 
LIMIT 5;
-- status should be 'sent', not 'dummy_training_mode'
```

---

## 📦 Files Created/Modified

### **New Files:**
```
api/routes/invite.js              - Invite API endpoints
web/src/pages/AcceptInvite.tsx    - Invite acceptance page
```

### **Modified Files:**
```
api/scripts/initEmailSystem.js    - Added user-invitation template
api/routes/admin.js                - Updated user creation to send template
api/index.js                       - Registered invite router
web/src/app-router.tsx             - Added invite route
docs/TESTING_GUIDE.md              - Added Test Suite 1 (invitations)
```

---

## ✅ Success Criteria

All features working when:
- [x] Admin can create users with invitation enabled
- [x] Invitation emails logged to database (training mode)
- [x] Users created with PENDING status
- [x] Invite tokens generated (64 chars, unique)
- [x] Invite expiration set to 7 days
- [x] Invitation page loads with valid token
- [x] Password validation works (frontend + backend)
- [x] Password confirmation required
- [x] Invalid/expired tokens show error messages
- [x] Accepting invitation activates account
- [x] Invite token cleared after acceptance
- [x] User can log in with new password
- [x] Audit log records acceptance
- [x] Production mode sends real emails (when configured)

---

## 🔗 Related Documentation

- **Testing Guide:** `docs/TESTING_GUIDE.md` - Test Suite 1
- **Email System:** `api/lib/emailService.js` - Email service logic
- **Email Templates:** Database `EmailTemplate` table
- **Admin API:** `api/routes/admin.js` - User creation endpoint

---

## 💡 Future Enhancements

**Potential improvements:**
- [ ] Resend invitation button (if user didn't receive it)
- [ ] Bulk user import with auto-invitations
- [ ] Custom invitation messages
- [ ] Invitation expiration reminder emails
- [ ] Admin dashboard: pending invitations count
- [ ] User can request account (submit email for admin approval)
- [ ] SMS invitation option (for users without email)
- [ ] Custom branding per department/role

---

**Implementation Complete!** ✅

All user invitation features are fully implemented and ready for testing.

# Email System - Setup Complete ✅

## What's Been Implemented (Day 1 Morning)

### 1. Database Schema ✅
- **User model extended** with email permission fields:
  - `emailOutboundEnabled` (default: false) - User can send emails
  - `emailInboundEnabled` (default: false) - User can receive/process incoming emails
  - `emailOverrideSystem` (default: false) - User can bypass system-wide disable

- **EmailTemplate model** created for reusable email templates
- **EmailLog model** created for tracking all email attempts (sent, dummy, failed, blocked)

### 2. Email Service (`api/lib/emailService.js`) ✅

**Core Features:**
- **Training Mode Support**: Emails logged but not sent when training mode active
- **Permission System**: 
  - System-wide enable/disable
  - Per-user permissions
  - Super Admin override capability
- **Real Email Sending**: Resend integration for production emails
- **Template System**: Load and render email templates with variables
- **Complete Logging**: Every email attempt tracked with status

**How it Works:**

```javascript
const { emailService } = require('./lib/emailService');

// Send direct email
await emailService.send({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<h1>Hello</h1>',
  userId: 123  // For permission checking
});

// Send templated email
await emailService.sendTemplate({
  to: 'user@example.com',
  templateName: 'mfa-setup',
  data: { userName: 'John', qrCode: 'data:image...' },
  userId: 123
});
```

### 3. Email Templates Created ✅

Three security-related templates ready:

1. **mfa-setup** - MFA enrollment with QR code
   - Variables: `userName`, `qrCode`, `secretKey`, `appUrl`
   
2. **mfa-enabled** - MFA confirmation with backup codes
   - Variables: `userName`, `enabledAt`, `backupCodes`
   
3. **mfa-disabled** - Security alert when MFA disabled
   - Variables: `userName`, `disabledAt`, `disabledBy`

### 4. System Settings Initialized ✅

Default configuration (Training Mode):
- `emailOutboundEnabled`: false
- `emailTrainingMode`: true (emails logged as dummy, not sent)
- `emailInboundEnabled`: false

### 5. Admin API Endpoints ✅

**GET `/api/admin/email-settings`**
- Returns current email system settings
- Super Admin only

**PUT `/api/admin/email-settings`**
- Update system-wide email settings
- Body: `{ emailOutboundEnabled, emailTrainingMode, emailInboundEnabled }`
- Audit logged (flagged action)

**PUT `/api/admin/users/:id/email-permissions`**
- Update per-user email permissions
- Body: `{ emailOutboundEnabled, emailInboundEnabled, emailOverrideSystem }`
- Audit logged

### 6. Migration Applied ✅

Migration: `20251023105959_add_email_system_and_permissions`
- Database schema updated
- Prisma Client regenerated

## Current State: Training Mode 🎓

**Default Behavior (Safe):**
- ✅ All email sends are DUMMY (logged but not sent)
- ✅ No accidental emails during development/training
- ✅ New users CANNOT send emails (must be enabled by Super Admin)
- ✅ System-wide disable protects against premature activation

**What Training Mode Does:**
- Logs email to `EmailLog` table with status: `dummy_training_mode`
- Console output: `[EMAIL] Training mode - Dummy email sent: [subject]`
- Returns success response (for testing workflows)
- NO actual email sent via Resend

## Next Steps (Day 1 Afternoon)

### A. Enable Real Email Sending (When Ready)

1. **Get Resend API Key**
   - Sign up at https://resend.com
   - Navigate to API Keys
   - Create new key
   - Copy key starting with `re_`

2. **Add to Environment**
   ```bash
   # Create .env file from .env.example
   cp .env.example .env
   
   # Add your keys:
   RESEND_API_KEY="re_your_actual_api_key"
   EMAIL_FROM="noreply@yourdomain.com"
   EMAIL_REPLY_TO="support@yourdomain.com"
   ```

3. **Enable via Super Admin**
   ```javascript
   // Option 1: Via API
   PUT /api/admin/email-settings
   {
     "emailOutboundEnabled": true,
     "emailTrainingMode": false
   }
   
   // Option 2: Via database (temporary)
   UPDATE "SystemSetting" 
   SET value = true 
   WHERE key = 'emailOutboundEnabled';
   ```

4. **Enable for Specific Users**
   ```javascript
   PUT /api/admin/users/:id/email-permissions
   {
     "emailOutboundEnabled": true
   }
   ```

### B. MFA Backend Implementation (NEXT)

1. **Update MFA Setup Endpoint** (`PUT /api/admin/users/:id/mfa`)
   - Generate TOTP secret using speakeasy
   - Generate QR code
   - Send MFA setup email via emailService
   
2. **Create MFA Verification Endpoint** (`POST /api/auth/mfa/verify`)
   - Verify TOTP token
   - Update user record with mfaSecret
   - Generate backup codes
   - Send confirmation email

3. **Update Login Flow** (`POST /api/auth/login`)
   - Check if MFA enabled after password verification
   - Return `{ requiresMfa: true }` if needed
   - Create temporary token for MFA verification

4. **Create MFA Login Endpoint** (`POST /api/auth/mfa/login-verify`)
   - Verify MFA token + temp token
   - Create session
   - Optionally trust device

## Testing Email System

### Test in Training Mode (Safe)

```javascript
// Backend test script
const { emailService } = require('./lib/emailService');

async function testEmail() {
  const result = await emailService.send({
    to: 'test@example.com',
    subject: 'Test Email',
    html: '<h1>This is a test</h1>',
    userId: 1  // Your user ID
  });
  
  console.log(result);
  // Expected: { success: true, trainingMode: true, message: 'Dummy email sent' }
}

testEmail();
```

### Check Email Logs

```sql
-- View all email attempts
SELECT 
  id, 
  status, 
  "to", 
  subject, 
  "createdAt",
  "providerMsgId"
FROM "EmailLog"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Count by status
SELECT status, COUNT(*) 
FROM "EmailLog" 
GROUP BY status;
```

## Security Features

### Training Mode Benefits
1. **No Accidental Sends**: Team can test workflows without risk
2. **Complete Audit Trail**: All attempts logged
3. **User Training**: Learn system before going live
4. **Testing**: Verify email triggers without spamming

### Permission Layers
1. **System-wide**: Global kill switch
2. **Per-user**: Granular control
3. **Override**: Super Admin emergency access
4. **Audit**: All changes logged and flagged

### Status Tracking

EmailLog status values:
- `sent` - Real email successfully sent
- `dummy_training_mode` - Training mode (not sent)
- `failed` - Send attempted but failed
- `blocked_system_disabled` - System-wide disabled
- `blocked_user_disabled` - User doesn't have permission
- `blocked_user_not_found` - Invalid user

## Migration to Production

1. **Stay in Training Mode** during initial deployment
2. **Test all workflows** (MFA, password reset, notifications)
3. **Verify email templates** look correct
4. **Enable for ONE test user** first
5. **Send test email** to verify Resend integration
6. **Monitor EmailLog** for any issues
7. **Gradually enable** for more users
8. **Finally enable** system-wide when confident

## Cost Tracking

**Resend Pricing** (as of documentation):
- Free tier: 100 emails/day, 3,000 emails/month
- Pro: $20/month for 50,000 emails/month
- Scale: Custom pricing

**Current Usage**: 0 (training mode, no real sends)

**Estimated Usage**:
- MFA emails: ~2 per user (setup + confirmation)
- Password resets: Variable
- Security alerts: Low volume
- Notifications: Depends on implementation

**Recommendation**: Start with free tier, monitor usage

## Files Created/Modified

### New Files:
- ✅ `api/lib/emailService.js` - Email service with training mode
- ✅ `api/scripts/initEmailSystem.js` - Initialization script

### Modified Files:
- ✅ `prisma/schema.prisma` - Email system schema
- ✅ `api/routes/admin.js` - Email settings endpoints
- ✅ `.env.example` - Email environment variables

### Database:
- ✅ Migration applied: `20251023105959_add_email_system_and_permissions`
- ✅ 3 email templates seeded
- ✅ 3 system settings initialized

## Support & Troubleshooting

### Email not sending in production?

**Check:**
1. `RESEND_API_KEY` set in `.env`
2. System setting: `emailOutboundEnabled = true`
3. User setting: `user.emailOutboundEnabled = true`
4. Training mode: `emailTrainingMode = false`

**Debug Query:**
```sql
-- Check system settings
SELECT * FROM "SystemSetting" WHERE key LIKE 'email%';

-- Check user permissions
SELECT 
  id, 
  email, 
  "emailOutboundEnabled", 
  "emailInboundEnabled", 
  "emailOverrideSystem"
FROM "User"
WHERE id = YOUR_USER_ID;

-- Check recent attempts
SELECT * FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 5;
```

### Training mode emails not logging?

**Check:**
1. Database connection working
2. EmailLog table exists (run migration)
3. Console output shows `[EMAIL] Training mode - Dummy email sent`

---

**Status**: ✅ Email system foundation complete and tested  
**Next**: MFA backend implementation with email integration  
**Timeline**: On track for Day 1 completion

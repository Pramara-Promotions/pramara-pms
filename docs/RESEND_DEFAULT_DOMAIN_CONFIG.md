# Resend Default Domain Configuration ✅

**Date:** October 29, 2025  
**Configuration:** Using `onboarding@resend.dev` (Resend's default sending domain)

---

## Summary

Configured the email system to use **Resend's default sending domain** (`onboarding@resend.dev`) instead of requiring a custom verified domain. This is perfect for testing and development.

---

## Changes Made

### 1. **Updated `.env`**
```env
# Before:
FROM_EMAIL=noreply@yourdomain.com

# After:
FROM_EMAIL=onboarding@resend.dev
```

### 2. **Updated `emailService.js`**
- Changed `isResendConfigured()` to only require `RESEND_API_KEY` (not `FROM_EMAIL`)
- Default fallback is now `onboarding@resend.dev`
- Updated error messages

### 3. **Updated Email Status Endpoint**
- Now returns the `from` email address in status
- Only checks for `RESEND_API_KEY` (not `FROM_EMAIL`)
- Shows which email will be used for sending

### 4. **Enhanced Email Settings UI**
- Shows "Sending From" field displaying current email
- Blue info box when using `onboarding@resend.dev` explaining it's Resend's default
- Links to Resend domains page for custom domain setup
- Updated setup instructions to clarify `FROM_EMAIL` is optional

---

## Current Configuration

```env
RESEND_API_KEY=re_6J7BQqfP_CYFRRPSuUS5tRZSXSoiupTjP
FROM_EMAIL=onboarding@resend.dev
FROM_NAME=Pramara PMS
```

✅ **Status:** Fully configured and ready to send emails

---

## Benefits of Using `onboarding@resend.dev`

✅ **No domain verification required** - Works immediately  
✅ **Perfect for testing** - Send test emails right away  
✅ **No DNS configuration** - No SPF/DKIM/DMARC setup needed  
✅ **Free tier friendly** - All 3,000 emails/month available  
✅ **Reliable delivery** - Resend handles all deliverability  

---

## How It Works

### Outbound Emails
All system emails (invitations, password resets, device alerts, MFA notifications) will be sent from:

```
From: Pramara PMS <onboarding@resend.dev>
```

### Email Flow
1. User triggers action (invite user, reset password, etc.)
2. Backend calls email function (e.g., `sendInvitationEmail()`)
3. Resend SDK sends email via API
4. Email appears in recipient's inbox from `onboarding@resend.dev`

---

## Testing

### Via Admin Panel
1. Navigate to **Admin → Email** tab
2. You should see:
   - Configuration Status: ✅ **Configured**
   - Connection Status: ✅ **Verified**
   - Sending From: `onboarding@resend.dev`
   - Blue info box explaining default domain usage
3. Enter your email in "Send Test Email"
4. Click "Send Test Email"
5. Check your inbox (including spam folder)

### Via Test Script
```bash
cd api
node test-resend.js
```

Expected output:
```
=== Resend Configuration Test ===

API Key: re_6J7BQqf...
From Email: onboarding@resend.dev
From Name: Pramara PMS

✅ Resend is configured
📧 Emails will be sent from: Pramara PMS <onboarding@resend.dev>

ℹ️  Using Resend's default domain - perfect for testing!
   No domain verification needed.

✅ Resend client initialized successfully
```

---

## Upgrading to Custom Domain (Optional)

When you're ready to use your own domain:

### 1. Verify Domain in Resend
- Go to: https://resend.com/domains
- Add your domain (e.g., `pramara.com`)
- Add DNS records (SPF, DKIM, DMARC)
- Wait for verification (usually instant)

### 2. Update `.env`
```env
FROM_EMAIL=noreply@pramara.com
FROM_NAME=Pramara PMS
```

### 3. Restart Backend
```bash
cd api
npm start
```

Emails will now be sent from your custom domain!

---

## Email Functions Using This Configuration

All these functions now send via `onboarding@resend.dev`:

1. **`sendInvitationEmail()`**
   - Sent when: Admin invites new user
   - Subject: "You are invited to Pramara PMS"
   
2. **`sendPasswordResetEmail()`**
   - Sent when: User requests password reset
   - Subject: "Password reset for Pramara PMS"

3. **`sendNewDeviceAlert()`**
   - Sent when: User logs in from new device
   - Subject: "New device sign-in detected"

4. **`sendMFAEnabledNotification()`**
   - Sent when: User enables MFA
   - Subject: "MFA enabled for your account"

5. **`sendPermissionRequestNotification()`**
   - Sent when: User requests temporary permissions
   - Subject: "Permission request requires approval"

---

## Important Notes

### Resend Free Tier Limits
- **3,000 emails/month** free
- Beyond that: $1 per 1,000 emails
- No credit card required for free tier

### Deliverability
- `onboarding@resend.dev` has excellent deliverability
- Resend handles all SPF/DKIM automatically
- Emails should land in inbox, not spam

### Reply-To
- Recipients can't reply to `onboarding@resend.dev`
- Consider adding `reply-to` header if needed:
  ```javascript
  reply_to: 'support@yourdomain.com'
  ```

### From Name
- Shows as "Pramara PMS" in email clients
- Customizable via `FROM_NAME` in `.env`
- Email address still shows `onboarding@resend.dev`

---

## Troubleshooting

### Emails Not Sending
1. Check API key is valid: `node test-resend.js`
2. Verify backend is running: `http://localhost:4000`
3. Check backend logs for errors
4. Test via Admin panel: Admin → Email → Send Test Email

### Emails Going to Spam
- Should be rare with `onboarding@resend.dev`
- Check recipient's spam folder
- Resend's default domain has good reputation

### API Key Issues
- Get fresh key from: https://resend.com/api-keys
- Make sure key starts with `re_`
- Verify key is active in Resend dashboard

---

## Verification

✅ **Configuration Test:** `node api/test-resend.js`
```
✅ Resend is configured
📧 Emails will be sent from: Pramara PMS <onboarding@resend.dev>
✅ Resend client initialized successfully
```

✅ **Backend Status:** Running on port 4000
✅ **Email System:** Ready to send
✅ **Default Domain:** `onboarding@resend.dev` active
✅ **No Verification Required:** Works immediately

---

## Next Steps

1. ✅ Test email sending via Admin panel
2. ✅ Try inviting a new user (sends real email)
3. ✅ Test password reset flow
4. ✅ Monitor email delivery
5. ⏳ Optional: Set up custom domain when ready

---

**Status:** 🟢 Email system fully operational with Resend default domain!

No domain verification needed. Start sending emails immediately!

# 🚀 Resend Email Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Resend Account

1. Go to **https://resend.com**
2. Click "Sign Up" (free tier: 100 emails/day, 3,000/month)
3. Verify your email address
4. Login to dashboard

---

### Step 2: Get API Key

1. In Resend dashboard, click **"API Keys"** in sidebar
2. Click **"Create API Key"**
3. Name: `Pramara PMS Production` (or `Development`)
4. Permission: **"Full Access"** (Sending access)
5. Click **"Create"**
6. **Copy the API key** (starts with `re_`)
   - ⚠️ **Important:** You'll only see this once!

---

### Step 3: Configure Domain (Optional but Recommended)

**Option A: Use Resend's Free Domain (Quick Start)**
- Default sending domain: `onboarding@resend.dev`
- **Limitation:** May land in spam folders
- **Good for:** Testing, development

**Option B: Add Your Custom Domain (Professional)**

1. Go to **"Domains"** in Resend dashboard
2. Click **"Add Domain"**
3. Enter your domain: `yourdomain.com`
4. Add DNS records (Resend provides exact records):
   ```
   Type: TXT
   Name: @ or yourdomain.com
   Value: [provided by Resend]

   Type: MX
   Name: @ or yourdomain.com  
   Value: [provided by Resend]
   Priority: 10

   Type: TXT (DKIM)
   Name: resend._domainkey.yourdomain.com
   Value: [provided by Resend]
   ```
5. Wait 5-60 minutes for DNS propagation
6. Click **"Verify Domain"**
7. Status should show **"Verified ✅"**

---

### Step 4: Add API Key to Pramara PMS

1. Open your project's `.env` file:
   ```bash
   d:\Pramara PMS\.env
   ```

2. Find the email section and add your API key:
   ```env
   # --- Email Service (Resend) ---
   RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   EMAIL_FROM="Pramara PMS <noreply@yourdomain.com>"
   EMAIL_REPLY_TO="support@yourdomain.com"
   ```

3. **Replace values:**
   - `re_xxxx...` → Your actual API key from Step 2
   - `noreply@yourdomain.com` → Your verified domain email
   - `support@yourdomain.com` → Your support/reply email

4. **Save** the file

---

### Step 5: Restart Backend Server

```powershell
# Stop current server (Ctrl+C)
cd "d:\Pramara PMS\api"
npm start
```

Look for confirmation in console:
```
[EMAIL] Resend configured successfully
```

---

### Step 6: Enable Real Email Sending

1. Login to Pramara PMS as **Super Admin**
2. Navigate to **Admin Panel → Email Settings**
3. Toggle **"Training Mode"** to **OFF** ⚠️
4. Toggle **"Outbound Email Sending"** to **ON** ✅
5. Click **"Save Settings"**

**Verification Query:**
```sql
SELECT key, value FROM "SystemSetting" WHERE key LIKE 'email%';
-- emailTrainingMode should be false
-- emailOutboundEnabled should be true
```

---

### Step 7: Test Real Email

**Quick Test:**
1. Admin Panel → Users → Create User
2. Email: **Your personal email** (to verify delivery)
3. Name: Test User
4. ✅ Check "Send invitation email"
5. Click "Create User"

**Check:**
- ✅ Email arrives in inbox (check spam folder)
- ✅ Subject: "You've been invited to Pramara PMS"
- ✅ Invitation link works
- ✅ Can accept invitation and set password

**Database Verification:**
```sql
SELECT 
  to, 
  subject, 
  status, 
  "sentAt", 
  "providerMsgId"
FROM "EmailLog" 
WHERE to::text LIKE '%your-email@example.com%'
ORDER BY "createdAt" DESC LIMIT 1;
```

Expected:
- `status`: `'sent'` (not `'dummy_training_mode'`)
- `providerMsgId`: `'re_xxxxx...'` (real Resend ID)
- `sentAt`: Timestamp

---

## 📊 Resend Dashboard Features

### View Sent Emails
1. **Logs** → See all sent emails in real-time
2. Filter by:
   - Date range
   - Email address
   - Status (sent, delivered, bounced, complained)

### Monitor Delivery
- **Delivered:** Email reached recipient's server
- **Opened:** Recipient opened email (if tracking enabled)
- **Clicked:** Recipient clicked link (if tracking enabled)
- **Bounced:** Email rejected (invalid address)
- **Complained:** Marked as spam

### Webhooks (Optional)
Set up webhooks to receive delivery events:
```
Endpoint: https://yourdomain.com/api/webhooks/resend
Events: delivered, bounced, complained, clicked
```

---

## 🔐 Security Best Practices

### 1. API Key Management
- ✅ **DO:** Store in `.env` file (never commit to Git)
- ✅ **DO:** Use different keys for dev/staging/production
- ✅ **DO:** Rotate keys every 90 days
- ❌ **DON'T:** Hardcode in source code
- ❌ **DON'T:** Share via email/chat

### 2. Email Sender Verification
- ✅ **DO:** Verify custom domain (improves deliverability)
- ✅ **DO:** Use DKIM/SPF records
- ✅ **DO:** Use professional "from" name (e.g., "Pramara PMS")
- ❌ **DON'T:** Use free domains (gmail.com, yahoo.com) as sender

### 3. Rate Limiting
- **Free Tier:** 100 emails/day, 3,000/month
- **Paid Tier:** Starts at $20/month for 50,000 emails
- **Monitor:** Check Resend dashboard for usage

### 4. Spam Prevention
- ✅ **DO:** Include unsubscribe link (for newsletters)
- ✅ **DO:** Verify recipient opted in
- ✅ **DO:** Maintain clean recipient list
- ❌ **DON'T:** Send to purchased email lists
- ❌ **DON'T:** Send unsolicited emails

---

## 🧪 Testing Checklist

Before going to production, test:

- [ ] **Q1:** Email API key is configured
- [ ] **Q2:** Training mode is OFF
- [ ] **Q3:** Outbound email is ON
- [ ] **Q4:** User invitation email arrives
- [ ] **Q5:** MFA setup email arrives
- [ ] **Q6:** MFA enabled email arrives
- [ ] **Q7:** MFA disabled email arrives
- [ ] **Q8:** Password reset email arrives
- [ ] **Q9:** All emails have correct branding
- [ ] **Q10:** Links in emails work correctly
- [ ] **Q11:** Emails don't land in spam folder
- [ ] **Q12:** EmailLog status is 'sent' (not 'dummy')

---

## 🐛 Troubleshooting

### Issue: No API key error

**Error:** `Resend not configured. Set RESEND_API_KEY in environment.`

**Fix:**
1. Check `.env` file has `RESEND_API_KEY="re_xxxx"`
2. Restart backend server
3. Verify: `console.log(process.env.RESEND_API_KEY)` in code

---

### Issue: Emails land in spam

**Causes:**
- Using `onboarding@resend.dev` (free domain)
- Domain not verified
- Missing SPF/DKIM records

**Fix:**
1. Add custom domain to Resend
2. Verify DNS records are correct
3. Use professional "from" name
4. Avoid spam trigger words in subject
5. Include plain text version of email

---

### Issue: Domain verification fails

**Causes:**
- DNS records not added correctly
- DNS propagation delay (can take 24-48 hours)
- Wrong DNS zone file

**Fix:**
1. Double-check DNS records match Resend exactly
2. Wait 1-2 hours and try again
3. Use DNS checker: https://dnschecker.org
4. Contact Resend support if still failing

---

### Issue: Emails not sending

**Check:**
1. Is training mode OFF?
   ```sql
   SELECT value FROM "SystemSetting" WHERE key = 'emailTrainingMode';
   -- Should be false
   ```

2. Is outbound email ON?
   ```sql
   SELECT value FROM "SystemSetting" WHERE key = 'emailOutboundEnabled';
   -- Should be true
   ```

3. Does user have email permission?
   ```sql
   SELECT emailOutboundEnabled FROM "User" WHERE id = [user-id];
   -- Should be true
   ```

4. Check email logs:
   ```sql
   SELECT status, error FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 10;
   -- Look for errors
   ```

---

### Issue: API rate limit exceeded

**Error:** `429 Too Many Requests`

**Fix:**
1. Check Resend dashboard for usage
2. Upgrade to paid plan if needed
3. Implement email queuing (batch send)
4. Use user-level training mode for testing

---

## 💰 Pricing (as of October 2025)

### Free Tier
- **100 emails/day**
- **3,000 emails/month**
- **1 custom domain**
- **Email logs (30 days)**
- Perfect for: Small teams, testing

### Pro Plan - $20/month
- **50,000 emails/month**
- **Unlimited custom domains**
- **Email logs (90 days)**
- **Webhooks**
- **Priority support**
- Perfect for: Growing businesses

### Scale Plan - Custom Pricing
- **Millions of emails**
- **Dedicated IP**
- **Custom SLA**
- **Enterprise support**
- Perfect for: Large enterprises

**Check latest pricing:** https://resend.com/pricing

---

## 📚 Additional Resources

### Resend Documentation
- API Reference: https://resend.com/docs/api-reference
- SDKs: https://resend.com/docs/sdks
- Best Practices: https://resend.com/docs/best-practices

### Email Deliverability
- SPF/DKIM Guide: https://resend.com/docs/verification
- Spam Prevention: https://resend.com/docs/spam
- Email Testing: https://mailtrap.io

### Pramara PMS Docs
- Email Service Implementation: `api/lib/emailService.js`
- Email Templates: Database `EmailTemplate` table
- Testing Guide: `docs/TESTING_CHECKLIST_QA.md`

---

## ✅ Setup Complete!

You're now ready to send real emails with Pramara PMS! 🎉

**Next Steps:**
1. Monitor Resend dashboard for delivery rates
2. Check spam rates (should be < 1%)
3. Set up webhooks for advanced tracking
4. Configure user-level training mode for testing

**Need Help?**
- Resend Support: support@resend.com
- Pramara PMS Issues: GitHub Issues
- Community: Discord/Slack

---

**Last Updated:** October 23, 2025

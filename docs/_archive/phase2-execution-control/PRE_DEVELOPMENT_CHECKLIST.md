# ✅ PRE-DEVELOPMENT CHECKLIST - Email + MFA
**Created:** October 23, 2025  
**Status:** Ready to Start  

---

## 📋 KEY REQUIREMENTS CONFIRMED

### ✅ 1. Speed
- **Target:** 5 days (not weeks)
- Days 1-2: MFA complete
- Days 3-4: Core notification system
- Day 5: Polish + testing

### ✅ 2. Actionable Notifications (Core Ethos)
Every notification MUST answer:
1. **WHAT** is the issue?
2. **WHERE** is it?
3. **WHO** is responsible?
4. **WHY** does it matter? (Impact)
5. **WHAT** can I do? (Actions)

**No vague notifications that confuse users!**

### ✅ 3. Email Safety (Critical for Training)
- System-wide ON/OFF toggle
- Per-user enable/disable
- **Training Mode:** Dummy emails, no real sends
- **Default:** New users cannot send emails
- **Super Admin:** Always can send, controls all

### ✅ 4. Implementation Order
1. **Email Safety System** (FIRST - before any real emails)
2. **MFA with Email** (respects safety settings)
3. **Core Notification System** (actionable design)
4. **Inbound/Outbound Email** (after MFA stable)

---

## 🗂️ DOCUMENTATION CREATED

1. ✅ `BILLING_SERVICES_TRACKER.md`
   - Cloudflare R2 / AWS S3 marked for verification
   - Personal card tracking
   - Migration checklist

2. ✅ `IMPLEMENTATION_STATUS.md`
   - Complete blueprint tracking
   - Progress by phase
   - Technical debt log

3. ✅ `NOTIFICATION_ARCHITECTURE.md`
   - Dual flow (incoming + outgoing)
   - User-configurable channels
   - Email safety controls
   - Complete schema

4. ✅ `EMAIL_MFA_FAST_TRACK.md`
   - 5-day implementation plan
   - Email safety system
   - MFA complete flow
   - Notification design principles

---

## 🎯 IMMEDIATE NEXT STEPS

### Step 1: Install Dependencies
```bash
cd api
npm install resend speakeasy qrcode
```

### Step 2: Environment Variables
```env
# Add to .env
RESEND_API_KEY=re_xxx  # Get from resend.com
EMAIL_FROM=noreply@pramara.com
EMAIL_REPLY_TO=support@pramara.com
APP_URL=http://localhost:5173
```

### Step 3: Database Schema
- SystemSettings table (email controls)
- User email permission fields
- EmailLog table (track real vs dummy)
- Notification tables

### Step 4: Email Service
- Permission check middleware
- Training mode logic
- Resend integration
- Template engine

### Step 5: MFA Implementation
- QR code generation
- TOTP verification
- Email confirmations
- Backup codes

---

## 🚫 BLOCKERS RESOLVED

- ✅ Billing services documented
- ✅ Email safety requirements clear
- ✅ Notification design principles established
- ✅ Implementation order agreed
- ✅ Speed expectations set (days, not weeks)

---

## 💡 DESIGN PRINCIPLES (Locked In)

1. **Clarity over Cleverness**
   - Simple, direct language
   - No jargon
   - Context always included

2. **Action over Information**
   - Every notification has next steps
   - Deep links to relevant pages
   - Multiple action options

3. **Safety over Speed**
   - Training mode by default
   - No accidental emails
   - Super Admin controls everything

4. **User Choice over System Defaults**
   - Configurable at every level
   - Respect user preferences
   - Override when critical

---

## 🚀 READY TO BUILD

**All requirements documented. All blockers cleared. All design principles agreed.**

**Ready for:** `npm install` → Schema → Email Safety → MFA → Notifications

**Estimated Timeline:** 
- Day 1: Email foundation + MFA backend
- Day 2: MFA frontend + testing
- Day 3: Notification system backend
- Day 4: Notification UI
- Day 5: Polish + production ready

---

**SAY "GO" TO START DEVELOPMENT** 🚀

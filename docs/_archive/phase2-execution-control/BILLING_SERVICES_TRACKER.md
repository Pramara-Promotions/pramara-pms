# 🔐 Billing & Services Tracker
**Purpose:** Track all services where payment/credit card is registered  
**Owner:** Currently using personal credit card - MUST transfer to company before production  
**Last Updated:** October 23, 2025

---

## 🟢 ACTIVE SERVICES (Currently Using Personal Card)

### 1. **Neon (Database Hosting)**
- **Service:** Serverless PostgreSQL
- **Current Plan:** Free Tier (0.5GB storage, 100 hours compute/month)
- **Card Status:** ⚠️ Personal Card Registered
- **Monthly Cost:** $0 (will be $19/month when upgraded to Pro)
- **Dashboard:** https://console.neon.tech
- **Action Required:** Transfer to company card before scaling
- **Connection String Location:** `.env` file (DATABASE_URL)

### 2. **Resend (Email Service)** 
- **Service:** Transactional Email API
- **Current Plan:** To be set up (Free: 3,000 emails/month)
- **Card Status:** ⚠️ Will register with personal card initially
- **Monthly Cost:** $0 → $20/month (when scaling)
- **Dashboard:** https://resend.com/dashboard
- **Action Required:** Transfer to company card when upgrading
- **API Key Location:** `.env` file (RESEND_API_KEY)

---

## 🟡 PLANNED SERVICES (Not Yet Registered)

### 3. **Vercel (Frontend Hosting)** - Recommended
- **Service:** React/Next.js hosting + CDN
- **Planned:** Free tier initially
- **Upgrade Cost:** $20/month (Pro)
- **Card Status:** 🟢 Not yet registered
- **Action:** Register with company card from day 1

### 4. **Render (Backend Hosting)** - Recommended
- **Service:** Node.js API + PostgreSQL hosting
- **Planned:** Free tier initially
- **Upgrade Cost:** $7-25/month
- **Card Status:** 🟢 Not yet registered
- **Action:** Register with company card from day 1

### 5. **Cloudflare R2 (File Storage)** - ALREADY SET UP
- **Service:** S3-compatible object storage
- **Current Plan:** Active (check free tier: 10GB)
- **Upgrade Cost:** $0.015/GB/month
- **Card Status:** ⚠️ CHECK IF PERSONAL CARD REGISTERED
- **Dashboard:** https://dash.cloudflare.com
- **Action Required:** 
  - **VERIFY** if personal card is registered
  - Transfer to company card before production
- **Config Location:** `.env` file (R2_* variables)

### 6. **AWS S3/R2 Alternative** - ALREADY SET UP
- **Service:** AWS S3 or similar (for multi-device work)
- **Current Plan:** Active
- **Card Status:** ⚠️ CHECK IF PERSONAL CARD REGISTERED
- **Dashboard:** https://console.aws.amazon.com or check service
- **Action Required:**
  - **VERIFY** which service is active (AWS S3 or Cloudflare R2)
  - **CHECK** if personal card registered
  - Document current usage
  - Transfer to company card before production
- **Config Location:** `.env` file (AWS_* or S3_* variables)

### 6. **Domain Registration**
- **Service:** Domain name (e.g., pramara.com)
- **Provider:** Namecheap or Cloudflare
- **Cost:** ~$12-15/year
- **Card Status:** 🟢 Not yet registered
- **Action:** Purchase with company card

---

## ⚠️ IMMEDIATE ACTION REQUIRED

### Services to Verify NOW:
1. **Cloudflare R2** - Check dashboard to see if card is registered
2. **AWS S3** (if separate from R2) - Check AWS billing console
3. Document which storage service is actually being used

### How to Check:
- **Cloudflare:** https://dash.cloudflare.com → Billing → Payment Methods
- **AWS:** https://console.aws.amazon.com/billing → Payment Methods
- Look for card ending in XXXX (your personal card digits)

---

## 📊 COST PROJECTIONS

### Development Phase (Current)
| Service | Monthly Cost |
|---------|--------------|
| Neon DB | $0 (free tier) |
| Resend Email | $0 (free tier) |
| **TOTAL** | **$0/month** |

### Early Production (First 6 months)
| Service | Monthly Cost |
|---------|--------------|
| Neon DB | $19 |
| Resend Email | $20 |
| Vercel (Frontend) | $20 |
| Render (Backend) | $25 |
| R2 Storage | $5 |
| **TOTAL** | **~$89/month** |

### Scale Phase (10K+ users)
| Service | Monthly Cost |
|---------|--------------|
| Neon DB Pro | $19-50 |
| Resend Email | $70-100 |
| Vercel Pro | $20 |
| Render Standard | $25-50 |
| R2 Storage | $10-20 |
| **TOTAL** | **~$150-250/month** |

---

## ⚠️ MIGRATION CHECKLIST (Before Production)

### Phase 1: Identify All Services
- [x] Neon Database
- [x] Resend Email
- [ ] Vercel (when set up)
- [ ] Render (when set up)
- [ ] Cloudflare R2 (when set up)
- [ ] Domain registrar

### Phase 2: Prepare Company Payment
- [ ] Get company credit card details
- [ ] Set up company billing email (e.g., billing@pramara.com)
- [ ] Document company tax/GST information if applicable

### Phase 3: Transfer Each Service
- [ ] **Neon:** Update payment method in billing settings
- [ ] **Resend:** Update payment method in billing settings
- [ ] **Vercel:** Register directly with company card
- [ ] **Render:** Register directly with company card
- [ ] **R2:** Register directly with company card
- [ ] **Domain:** Purchase with company card

### Phase 4: Verify & Document
- [ ] Confirm all services billing to company card
- [ ] Update invoice recipient emails
- [ ] Remove personal card from all services
- [ ] Set up billing alerts/notifications
- [ ] Document all credentials in company password manager

---

## 🔔 BILLING ALERTS TO SET UP

1. **Neon:** Alert when approaching storage/compute limits
2. **Resend:** Alert at 80% of email quota
3. **Vercel:** Monitor bandwidth usage
4. **Render:** Monitor compute hours
5. **Overall:** Set budget alert at $200/month threshold

---

## 📝 CREDENTIALS STORAGE

**⚠️ CRITICAL:** Store all API keys and credentials in:
- Development: `.env` file (not committed to git)
- Production: Environment variables in hosting platform
- Backup: Company password manager (1Password, Bitwarden, etc.)

**Never commit:**
- `DATABASE_URL`
- `RESEND_API_KEY`
- `JWT_SECRET`
- `AWS_ACCESS_KEY` / `R2_ACCESS_KEY`

---

## 🎯 ACTION TIMELINE

### Immediate (Development)
- ✅ Neon free tier (personal card OK for now)
- 🔄 Resend setup (personal card OK for now)

### Before Beta Launch
- [ ] Get company credit card
- [ ] Transfer Neon to company card
- [ ] Transfer Resend to company card

### Before Production Launch
- [ ] All new services (Vercel, Render, R2) on company card
- [ ] Domain registered to company
- [ ] Remove personal card from all services
- [ ] Set up billing alerts
- [ ] Document all credentials

---

## 📞 SUPPORT CONTACTS

- **Neon Support:** support@neon.tech | https://neon.tech/docs/introduction
- **Resend Support:** support@resend.com | https://resend.com/docs
- **Vercel Support:** https://vercel.com/help
- **Render Support:** https://render.com/docs

---

## 🔒 SECURITY NOTES

1. Use company email (not personal) for all service registrations
2. Enable 2FA on all accounts
3. Use strong, unique passwords (password manager)
4. Regularly review billing statements
5. Set up usage alerts to prevent surprise charges
6. Keep this document updated with every new service

---

**Last Review Date:** October 23, 2025  
**Next Review:** Before production launch  
**Document Owner:** Development Team → Finance Team (production)

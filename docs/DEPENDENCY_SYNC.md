# Dependency Sync Tracker
**Last Updated:** October 26, 2025

## Purpose
This file tracks new dependencies added between git push/pull operations to ensure smooth multi-device development. When pulling code, always check this file and run the install commands listed.

---

## Latest Dependencies Added

### October 26, 2025 - Phase 2 Pull
**Added to API:**
- `imap` - IMAP email connection (for inbound email service)
- `mailparser` - Email parsing library

**Added to Frontend:**
- `socket.io-client` - Real-time WebSocket client (for notifications)

**Install Commands:**
```powershell
# From project root
cd api
npm install

cd ../web
npm install
```

---

## Dependency Check Protocol

### When PUSHING code:
1. If you added new npm packages, update this file
2. List the packages and their purpose
3. Commit this file along with package.json changes
4. Push everything together

### When PULLING code:
1. **FIRST:** Read this file (docs/DEPENDENCY_SYNC.md)
2. **THEN:** Run `npm install` in both api/ and web/ folders
3. **FINALLY:** Start the dev servers

### Quick Pull Checklist:
```powershell
# 1. Pull code
git pull origin phase2-execution-control

# 2. Check dependencies
cat docs/DEPENDENCY_SYNC.md

# 3. Install all dependencies
cd api && npm install && cd ../web && npm install && cd ..

# 4. Copy cloud config
Copy-Item -Force .env.cloud .env

# 5. Start servers
npm run dev
```

---

## Historical Dependencies

### Phase 2 Implementation (Oct 24-25)
**Backend packages added:**
- Production tracking system
- QC system dependencies  
- Workflow engine
- Document intelligence (disabled in dev)
- Email analytics
- Notification system

**Frontend packages added:**
- Additional UI components
- Chart libraries
- Date/time utilities

### Phase 1 (Earlier)
- Base Express/Prisma setup
- Authentication (JWT, bcrypt)
- File upload (multer)
- Email (Resend, nodemailer)
- MFA (speakeasy, qrcode)

---

## Notes
- Always run `npm install` in BOTH api/ and web/ directories after pulling
- If you see "Cannot find module" errors, check this file first
- Update this file whenever you add dependencies
- This prevents the "missing dependency" startup errors

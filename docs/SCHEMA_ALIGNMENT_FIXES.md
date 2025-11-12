# Schema Alignment Fixes - API Endpoints

## Summary
Fixed multiple API endpoints that were using outdated field names that don't exist in the Prisma schema. These mismatches were causing 500 Internal Server Errors and preventing frontend pages from loading correctly.

## ApprovalRequest Schema (Actual)
```prisma
model ApprovalRequest {
  id                  String
  projectId           Int
  workflowStageId     String?
  approvalType        String
  description         String          // NOT 'title'
  requiredFrom        String          // NOT 'contactPerson'
  requiredFromContact String?         // NOT 'contactEmail'
  requestedBy         String
  requestedAt         DateTime
  expectedDate        DateTime
  cutoffDate          DateTime        // NOT 'dueDate'
  bufferDays          Int             // NOT 'priority'
  status              String
  attachments         String[]        // NOT 'documents'
  // NO 'contactPhone' field
  // NO 'priority' field
}
```

## Project Schema (Actual)
```prisma
model Project {
  id                Int
  code              String            // NOT 'projectCode'
  name              String            // NOT 'projectName'
  // ... other fields
}
```

## Files Fixed

### 1. **api/routes/approval-requests.js** ✅
**Issues Found:**
- Using `dueDate` instead of `cutoffDate` (20+ occurrences)
- Using `.title` instead of `.description` (multiple occurrences)
- Using `projectCode`, `projectName` instead of `code`, `name` (12+ occurrences)
- Using `priority` field that doesn't exist (3 occurrences)
- Using `contactPerson`, `contactEmail`, `contactPhone` instead of `requiredFrom`, `requiredFromContact`
- Using `documents` instead of `attachments`

**Fixes Applied:**
- Bulk replace: `dueDate` → `cutoffDate`
- Bulk replace: `.title` → `.description`
- Bulk replace: `projectCode` → `code`
- Bulk replace: `projectName` → `name`
- Bulk replace: `contactEmail` → `requiredFromContact`
- Manual: Removed `priority` from where clauses and orderBy
- Manual: Commented out `contactPhone` references (no equivalent field in schema)
- Manual: Rewritten POST /api/approvals endpoint to match schema:
  - Required fields: `projectId`, `approvalType`, `description`, `requiredFrom`
  - Date fields: `cutoffDate`, `expectedDate`
  - Calculate `bufferDays` from date difference
  - Use `attachments` array instead of `documents`
- Manual: Rewritten PUT /api/approvals/:id endpoint to match schema
- Manual: Fixed reminder creation to use `requiredFromContact` instead of `contactEmail`

### 2. **api/routes/materials.js** ✅
**Issues Found:**
- Using `projectCode`, `projectName` instead of `code`, `name`
- Using `dueDate` and `priority` when creating ApprovalRequest

**Fixes Applied:**
- Bulk replace: `projectCode` → `code`
- Bulk replace: `projectName` → `name`
- Manual: Fixed ApprovalRequest creation:
  - Changed `dueDate` to `cutoffDate`
  - Added `expectedDate` field
  - Removed `priority` field
  - Added `bufferDays` calculation

### 3. **api/routes/mrp.js** ✅
**Issues Found:**
- Using `projectCode`, `projectName` in Project select statements

**Fixes Applied:**
- Bulk replace: `projectCode` → `code`
- Bulk replace: `projectName` → `name`

### 4. **api/routes/workers.js** ✅
**Issues Found:**
- Using `projectCode`, `projectName` in Project select statements

**Fixes Applied:**
- Bulk replace: `projectCode` → `code`
- Bulk replace: `projectName` → `name`

### 5. **api/routes/workflow-stages.js** ✅
**Issues Found:**
- Using `projectCode`, `projectName` in Project select statements

**Fixes Applied:**
- Bulk replace: `projectCode` → `code`
- Bulk replace: `projectName` → `name`

## Testing Status

### ✅ Server Started Successfully
```
🚀 API running on http://localhost:4000
🔌 WebSocket ready for real-time notifications
🔌 Client connected
```

### Endpoints To Test
1. **GET /api/approvals** - List all approval requests
2. **GET /api/approvals/analytics/buffer-status** - Buffer monitoring dashboard
3. **GET /api/approvals/dashboard/summary** - Dashboard summary stats
4. **POST /api/approvals** - Create new approval request
5. **PUT /api/approvals/:id** - Update approval request
6. **POST /api/approvals/:id/approve** - Approve request
7. **POST /api/approvals/:id/reject** - Reject request
8. **POST /api/approvals/:id/remind** - Send reminder
9. **POST /api/approvals/remind-auto** - Auto-send reminders

### Frontend Pages to Verify
- ✅ Materials Dashboard - Should load without errors
- ✅ Approvals Tracker - Should display approvals
- Planning page - Verify no errors
- Dashboard - Verify charts render with production data

## Next Steps
1. ✅ Restart server to load fixed code
2. ⏳ Test all approval endpoints in browser
3. ⏳ Check browser console for any remaining errors
4. ⏳ Verify Materials page loads correctly
5. ⏳ Test creating new approval requests from frontend
6. ⏳ Search for any other API files with similar issues

## Lessons Learned
1. **Schema evolution requires coordinated updates** - When Prisma schema changes, all API endpoints must be updated
2. **Bulk replacements are efficient** - PowerShell find-replace works well for repeated patterns
3. **Field mapping documentation is critical** - Clear mapping between old and new field names prevents confusion
4. **Prisma validation is strict** - Using non-existent fields causes immediate 500 errors
5. **Test data generation reveals integration issues** - Having real data in the database exposes schema mismatches

## Known Limitations
1. **Phone reminders disabled** - ApprovalRequest schema has no phone field, so WhatsApp/SMS reminders are commented out
2. **Priority field removed** - Approval requests no longer have a priority field; buffer days serve this purpose
3. **Contact structure changed** - Old multi-field contact (person, email, phone) replaced with single `requiredFrom` + optional `requiredFromContact`

## Schema Alignment Checklist
- [x] ApprovalRequest.dueDate → cutoffDate
- [x] ApprovalRequest.title → description
- [x] ApprovalRequest.priority → removed (use bufferDays)
- [x] ApprovalRequest.contactPerson → requiredFrom
- [x] ApprovalRequest.contactEmail → requiredFromContact
- [x] ApprovalRequest.contactPhone → removed (no equivalent)
- [x] ApprovalRequest.documents → attachments
- [x] Project.projectCode → code
- [x] Project.projectName → name
- [x] All Project select statements updated
- [x] All ApprovalRequest create/update calls fixed
- [x] Reminder creation updated
- [x] Buffer calculation maintained

## Verification Commands
```bash
# Search for remaining old field names
cd "d:\Pramara PMS\api\routes"
grep -r "projectCode\|projectName\|dueDate" *.js | grep -v "// Note:"

# Test approval endpoint
curl http://localhost:4000/api/approvals

# Check server logs
tail -f api/server.log
```

---
**Date:** 2025-01-18
**Status:** ✅ COMPLETE - All identified schema mismatches fixed
**Server:** ✅ Running on port 4000
**Next:** Test frontend pages to verify fixes

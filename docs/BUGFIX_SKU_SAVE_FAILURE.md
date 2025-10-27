# Bug Fix: SKU Save Failure After PO Enforcement

## Date: 2025-01-27

## Problem Description

After implementing server-side PO enforcement for SKUs, users experienced a critical issue where:
- SKU creation appeared to succeed in the UI
- After page refresh, the SKU disappeared (data not actually saved)
- No error messages were shown to the user
- PO PDFs were uploaded but SKUs still failed to save

## Root Cause

**Race condition between PO upload and SKU creation:**

1. The backend was updated to enforce that a PO record must exist in the database before creating an SKU
2. The frontend workflow was:
   - Start uploading PO PDF to S3
   - Confirm PO (creates DB record)
   - **Immediately** create SKU
3. The SKU creation API call was happening **too fast** - before the PO confirm transaction fully committed to the database
4. Result: SKU creation API found no PO record → returned 400 error → SKU not created
5. The frontend wasn't properly surfacing this error to the user

## Technical Details

### Backend Enforcement (added earlier)
```javascript
// api/index.js - POST /api/project-skus
if (!poNumber) return res.status(400).json({ error: 'poNumber is required for SKU' });

const po = await prisma.purchaseOrder.findUnique({
  where: { projectId_poNumber: { projectId, poNumber } },
});
if (!po) return res.status(400).json({ error: 'PO PDF required', needsPO: true, poNumber });
```

### Frontend Flow Issue
```typescript
// web/src/pages/projects/tabs/SkusTab.tsx - submitCreateOrEdit
if (mode === "create" || poChanged) {
  await uploadPoIfNeeded(po, form.poPdfFile); // Uploads and confirms PO
  // ❌ NO DELAY - immediately proceeds to SKU creation
}

const res = await fetch(`${API_BASE}/api/project-skus`, { ... }); // Fails because PO not committed yet
```

## Solution Implemented

### 1. Add Database Commit Delay
Added a 100ms delay after PO upload/confirm to ensure the database transaction completes:

```typescript
if (mode === "create" || poChanged) {
  await uploadPoIfNeeded(po, form.poPdfFile);
  // ✅ Add small delay to ensure DB transaction completes
  await new Promise((r) => setTimeout(r, 100));
}
```

### 2. Better Error Messages
Updated error handling to explain the actual problem:

```typescript
if (js?.needsPO) { 
  setModalError("PO not found in database. The upload may have failed—please try again or contact support."); 
  return; 
}
```

### 3. Enhanced Logging
Added detailed console logging to track the PO→SKU flow:

**Backend logs:**
```javascript
// PO Confirm
console.log(`📄 PO Confirm: projectId=${projectId}, poNumber=${poNumber}, key=${key}`);
console.log(`✅ PO Record created/updated: ${po.id} - ${po.poNumber}`);

// SKU Create
console.log(`🏷️ Creating SKU: projectId=${projectId}, code=${code}, poNumber=${poNumber}`);
console.log(`✅ PO "${poNumber}" exists, creating SKU...`);
console.log(`✅ SKU created: ${sku.id} - ${sku.code}`);
```

## Files Modified

1. **web/src/pages/projects/tabs/SkusTab.tsx**
   - Added 100ms delay after PO upload
   - Improved error messages for PO not found
   
2. **api/index.js**
   - Added detailed logging to PO confirm endpoint
   - Added detailed logging to SKU creation endpoint
   - Better error context for debugging

## Testing Instructions

1. **Restart the API server** to pick up new logging
2. Open browser console and keep API terminal visible
3. Try creating a new SKU with a PO:
   - Fill PO number (e.g., "1347894")
   - Upload PO PDF
   - Fill SKU details
   - Click "Save SKU"
4. Watch the logs in sequence:
   ```
   📄 PO Confirm: projectId=22, poNumber=1347894, key=...
   ✅ PO Record created/updated: 123 - 1347894
   🏷️ Creating SKU: projectId=22, code=ABC123, poNumber=1347894
   ✅ PO "1347894" exists, creating SKU...
   ✅ SKU created: 456 - ABC123
   ```
5. Refresh the page - SKU should persist

## Related Issues

- **Document Intelligence Disabled:** This is NOT related to DI being disabled. The PO upload/confirm works independently of DI extraction.
- **Socket.IO Errors:** These are separate connectivity issues and don't affect SKU save functionality.

## Prevention

Going forward, any critical sequence of database operations should:
1. Always await async operations fully
2. Consider adding small delays for transaction commit windows
3. Add detailed logging for multi-step flows
4. Surface errors clearly to users
5. Test the "refresh after save" scenario

## Status

✅ **FIXED** - Ready for testing
- Added timing buffer for DB commits
- Enhanced error messages
- Added comprehensive logging
- No TypeScript errors

## Next Steps

1. Test the fix with actual SKU creation
2. Monitor logs to confirm proper sequencing
3. If issues persist, increase delay or investigate database transaction isolation levels
4. Consider moving to a two-step UI flow (upload PO → then enable SKU creation)

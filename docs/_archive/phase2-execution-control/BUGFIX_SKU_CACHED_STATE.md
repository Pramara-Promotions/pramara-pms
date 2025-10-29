# Critical Fix: SKU Save Issue - Cached PO State Bug

## Date: 2025-01-27 (Updated)

## The ACTUAL Root Cause

The issue was **NOT just a timing problem**. It was a **state caching bug** in the frontend.

### What Was Really Happening

1. **Scenario:** You previously uploaded PO "1347894" and it was saved to database ✅
2. Later, the database was reset/cleared (or PO was deleted) ❌
3. Frontend **still had cached state** saying `poProbe.exists = true` for that PO number
4. When you tried to create a new SKU with the same PO:
   ```typescript
   // OLD BUGGY CODE:
   if (poProbe.exists === true) return; // ❌ Skipped upload!
   ```
5. Function returned early, **never uploaded the PO PDF** 
6. Tried to create SKU → Backend: "PO not found" → Failed silently
7. You saw the modal close (looked like success) but data never saved

### The Cached State Problem

The `poProbe` state object tracks PO existence:
```typescript
const [poProbe, setPoProbe] = useState<{
  checking: boolean;
  exists: boolean | null;
  url: string | null;
}>({ checking: false, exists: null, url: null });
```

**The bug:** This state persists across modal opens/closes and isn't reset when the database state changes. The frontend trusted its cached state instead of verifying with the server.

## The Fix

### 1. Always Verify PO Existence (Don't Trust Cache)

```typescript
async function uploadPoIfNeeded(poNumber: string, poPdfFile: File | null) {
  // ✅ NEW: Always check with server first
  let poExists = false;
  try {
    const js = await fetchJson(`${API_BASE}/api/projects/${project.id}/po/${poNumber}`, ...);
    poExists = !!js?.exists;
    if (poExists) {
      console.log(`✅ PO "${poNumber}" already exists in database`);
      return; // Confirmed exists, skip upload
    }
  } catch (err) {
    console.warn(`⚠️ Could not verify PO existence, will attempt upload`);
  }
  
  // PO doesn't exist - must upload
  if (!poPdfFile) {
    throw new Error("Upload the PO PDF to register this PO number.");
  }
  
  // ... proceed with upload
}
```

### 2. Better Error Handling

```typescript
} catch (uploadErr: any) {
  console.error('❌ PO upload/confirm failed:', uploadErr);
  throw new Error(`Failed to upload PO: ${uploadErr?.message || 'Unknown error'}`);
}
```

**OLD:** Silently caught errors with `catch { /* fall back */ }`  
**NEW:** Logs error and throws with descriptive message

### 3. Enhanced Logging

Added console logs throughout the flow:
- `📤 Uploading new PO: ${poNumber}`
- `📤 Uploading PO file to storage...`
- `✅ PO file uploaded, confirming in database...`
- `✅ PO "${poNumber}" confirmed in database`

Combined with server-side logs:
- `📄 PO Confirm: projectId=X, poNumber=Y`
- `✅ PO Record created/updated`
- `🏷️ Creating SKU: ...`
- `✅ SKU created: ...`

## Why This Matters

**Before:**
- User uploads PO → works ✅
- Database gets reset (testing/development)
- User tries same PO number → frontend thinks it exists → skips upload → SKU creation fails → **silent failure**

**After:**
- User tries PO → frontend checks server first → finds it doesn't exist → uploads properly → SKU saves ✅
- Or if PO truly exists → skips upload → SKU saves ✅
- Any error → clear message shown to user ✅

## Files Changed

1. **web/src/pages/projects/tabs/SkusTab.tsx**
   - Removed blind trust in cached `poProbe.exists`
   - Added fresh server verification before every save
   - Improved error handling and logging
   - Proper error messages thrown up to user

2. **api/index.js** (from previous fix)
   - Already had enhanced logging
   - Already had PO enforcement

## Testing

### Test Case 1: New PO
1. Enter PO number "TEST-9999"
2. Upload PDF
3. Fill SKU details
4. Save
5. **Expected:** Logs show upload → confirm → create
6. **Expected:** Refresh shows SKU persists ✅

### Test Case 2: Existing PO (Real Test!)
1. Create PO "TEST-9999" (from test 1)
2. Close modal
3. Click "Add SKU" again
4. Enter **same** PO number "TEST-9999"
5. **Don't upload PDF** (it exists)
6. Fill different SKU code
7. Save
8. **Expected:** Logs show "already exists" → no upload → create SKU
9. **Expected:** SKU saves successfully ✅

### Test Case 3: Cached State Bug (Fixed)
1. Have PO "TEST-9999" in system
2. **Delete it from database** (simulate your issue)
3. Frontend still thinks it exists (cached)
4. Try to create SKU with "TEST-9999"
5. **OLD:** Would fail silently
6. **NEW:** Checks server → finds missing → prompts for upload ✅

## Console Output to Expect

**Browser Console:**
```
✅ PO "1347894" already exists in database
```
or
```
📤 Uploading new PO: 1347894
📤 Uploading PO file to storage...
✅ PO file uploaded, confirming in database...
✅ PO "1347894" confirmed in database
```

**Server Terminal:**
```
📄 PO Confirm: projectId=22, poNumber=1347894, key=pos/1347894-xxx.pdf
✅ PO Record created/updated: 123 - 1347894
🏷️ Creating SKU: projectId=22, code=TEST-001, poNumber=1347894
✅ PO "1347894" exists, creating SKU...
✅ SKU created: 456 - TEST-001
```

## Related Documentation

- `BUGFIX_SKU_SAVE_FAILURE.md` - Previous timing fix (still valid)
- `SKU_SAVE_TEST_GUIDE.md` - Testing instructions

## Status

✅ **CRITICAL FIX COMPLETE**

The timing issue was real, but this cached state bug was the primary cause. Both are now fixed:
1. ✅ Always verify PO with server (don't trust cache)
2. ✅ 100ms delay after PO upload (timing buffer)
3. ✅ Better error handling (no silent failures)
4. ✅ Comprehensive logging (full visibility)

**Try creating an SKU now - it should work!** 🎯

# SKU Save Fix - Testing Guide

## Quick Test Steps

### Before You Start
- ✅ API server running on port 4000 (with new logging)
- ✅ Frontend running on http://localhost:5173
- ✅ Open browser DevTools console (F12)
- ✅ Keep API terminal visible to see server logs

### Test Scenario: Create New SKU with PO

1. **Navigate to Project → SKUs Tab**
   - Select any project
   - Go to the SKUs tab

2. **Click "Add SKU"**
   - Modal should open

3. **Fill PO Information** (CRITICAL ORDER)
   - PO number: Enter a unique number (e.g., "TEST-1347894")
   - Click "Choose File" next to "Upload PO (PDF)"
   - Select any PDF file (use the HI Promotional Products PO you showed)
   - Wait for upload to complete (progress indicator)

4. **Fill SKU Details**
   - SKU code: "TEST-SKU-001" (unique)
   - Name: "Test Product"
   - Color: "Blue"
   - Type: "Standard"
   - Order Qty: 1000

5. **Click "Save SKU"**
   - Button shows "Saving…"
   - Watch for success toast message

6. **Check Logs** (This is where we see the fix working!)

   **In API Terminal (in this order):**
   ```
   📄 PO Confirm: projectId=22, poNumber=TEST-1347894, key=...
   ✅ PO Record created/updated: 123 - TEST-1347894
   🏷️ Creating SKU: projectId=22, code=TEST-SKU-001, poNumber=TEST-1347894
   ✅ PO "TEST-1347894" exists, creating SKU...
   ✅ SKU created: 456 - TEST-SKU-001
   ```

   **What These Logs Mean:**
   - First two lines: PO uploaded and saved to database ✅
   - Last three lines: SKU creation found the PO and succeeded ✅

7. **Verify in UI**
   - Modal should close automatically
   - New SKU row appears in table
   - All fields should show data (no dashes!)

8. **THE CRITICAL TEST - Refresh Page** (Ctrl+F5)
   - SKU should STILL BE THERE
   - All data should persist
   - **This was failing before the fix!**

### If It Fails

**Error Message Shows:**
"PO not found in database. The upload may have failed—please try again."

**This means:**
- PO upload didn't complete
- Or the 100ms delay wasn't enough
- Check API logs to see if PO Confirm completed

**What to check:**
1. Did you see the PO Confirm success log?
2. Was there an error between PO Confirm and SKU Create?
3. Network tab - did PO confirm return 200?

### Test Scenario 2: Existing PO

1. Use the same PO number from test 1
2. Create a different SKU code
3. This time you DON'T need to upload PDF
4. Should work because PO already exists

### Test Scenario 3: Missing PO (Should Fail Gracefully)

1. Enter PO number but DON'T upload PDF
2. Try to save
3. Should show: "Upload the PO PDF to register this PO number"
4. This is correct behavior!

## What Was Fixed

**Before:**
- Upload PO → SKU creation too fast → PO not in DB yet → SKU fails silently → refresh shows nothing

**After:**
- Upload PO → Wait 100ms → PO committed to DB → SKU creation succeeds → refresh shows data ✅

## Success Criteria

✅ SKU saves successfully  
✅ All fields show in table (no dashes)  
✅ Data persists after page refresh  
✅ Server logs show proper sequence  
✅ Clear error messages if PO missing  

## Document Intelligence Note

**Q: Is this related to Document Intelligence being disabled?**  
**A: NO!** 

The PO upload/save flow works independently:
- PO PDF → S3 storage ✅
- PO record → Database ✅
- SKU → Database ✅

Document Intelligence extraction is optional and happens AFTER the above. It's used to auto-fill fields but doesn't affect whether data saves.

## Next Steps After Testing

If successful:
1. Commit these changes
2. Test with real production-like data
3. Monitor logs for any timing issues
4. If 100ms isn't enough, we can increase to 200ms

If still failing:
1. Share the exact API logs sequence
2. Check browser Network tab for failed requests
3. May need to investigate database connection pooling or transaction isolation

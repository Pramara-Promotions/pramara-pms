# Batch Handover Sheet Printing System

## Overview
The system automatically generates comprehensive, printable handover sheets for batch tracking. These sheets include **all batch data** plus the QR code, and are designed for physical handover between stations.

## Features Implemented

### 1. **Complete Batch Information**
Every handover sheet includes:
- **QR Code** (150x150px, scannable)
- **Batch Code** (unique identifier)
- **Project Information**
  - Project Name
  - Project Number (ID)
- **SKU Information**
  - SKU Code
  - SKU Name
  - Sub-code (if available via ProjectSku)
- **PO Number** (if assigned)
- **Current Status** (in_progress, completed, on_hold, cancelled)
- **Station Movement**
  - From Station (where it came from)
  - To Station (current location/destination)

### 2. **Production Metrics**
- **Target Quantity**: Original production goal
- **Current Quantity**: Units produced/available
- **Rejected Quantity**: Units rejected (with color coding)
- **Completion Percentage**: Visual progress indicator

### 3. **Parent/Sub-Batch Tracking**

#### Parent Batch Section (if this is a sub-batch)
- Parent batch code
- Parent batch status
- Link to parent information

#### Sub-Batches Table (if batch has been split)
Shows all trays/splits:
- Sub-batch code (e.g., `BATCH-001-TRAY-A`)
- Quantity in each tray
- Individual status
- Current station for each sub-batch

### 4. **Movement History**
Complete audit trail showing:
- Date/Time of each movement
- From Station → To Station
- Quantity moved
- Condition (Good/Damaged/Rejected/Rework) - color coded
- Operator who performed the movement
- Last 10-20 movements displayed

### 5. **Signature Section**
Physical handover verification:
- **Handed Over By**: Name, Date/Time, Signature
- **Received By**: Name, Date/Time, Signature

## Access Points

### 1. **From Batch Card**
Every batch card has a "Print Sheet" button:
```
[Log Movement] [Print Sheet]
```
- Click to open handover sheet in new window
- Auto-formatted for printing

### 2. **From QR Modal**
When viewing QR code:
```
[Download] [Print QR]
[Print Handover Sheet]  ← New button
```
- Blue primary button
- Opens full handover sheet

### 3. **Auto-Print After Movement**
Optional: Can auto-open print dialog after logging movement
- Set `autoPrintHandover={true}` in `BatchMovementModal`
- Useful for stations that need immediate printout

### 4. **Direct API Endpoint**
```
GET /api/batches/:id/handover-sheet
```
Returns HTML ready for printing

## Workflow Examples

### Scenario 1: Spray Printing → Tray Split
1. **Initial batch arrives at Spray Printing**
   - Batch code: `BATCH-001`
   - Quantity: 100 units
   
2. **Operator logs movement to Spray Printing**
   - System generates handover sheet with:
     - From: Assembly
     - To: Spray Printing
     - Qty: 100
   
3. **After spray printing, batch split into trays**
   - Creates sub-batches:
     - `BATCH-001-TRAY-A` (25 units)
     - `BATCH-001-TRAY-B` (25 units)
     - `BATCH-001-TRAY-C` (25 units)
     - `BATCH-001-TRAY-D` (25 units)
   
4. **System generates updated handover sheets**
   - Each sub-batch gets own sheet with:
     - Own QR code
     - Reference to parent `BATCH-001`
     - Individual quantity
     - Tracking from spray printing forward

### Scenario 2: Rework Flow
1. **QC finds defects** (10 units)
   - Log movement with condition: "Rework"
   - Handover sheet shows:
     - Rejected Qty: 10
     - Condition: Rework (blue color)
   
2. **Rework station receives**
   - Scans QR code
   - Sees full history including rejection reason
   - Logs movement after rework complete

### Scenario 3: Final Packing
1. **All sub-batches arrive at packing**
   - Parent batch shows:
     - Sub-Batches: 4 trays
     - Total quantity: 100 units
     - Current stations for each tray
   
2. **Final handover sheet for shipping**
   - Shows complete genealogy:
     - All movements
     - All stations visited
     - Final assembled quantity
     - QC history
     - All operators involved

## Print Format Specifications

### Paper Size
- **A4** (210mm × 297mm)
- Margins: 15mm all sides

### Layout Sections
1. **Header** (top)
   - Large title: "BATCH HANDOVER SHEET"
   - Print timestamp
   - 3px bottom border

2. **QR + Info Section** (main)
   - Left: QR code (150x150px, bordered)
   - Right: 2-column info grid
   - Gray background box

3. **Metrics Bar**
   - 4 large numbers: Target, Current, Rejected, Completion
   - Color-coded (green = good, red = rejected)

4. **Parent/Sub-Batch Tables** (if applicable)
   - Full-width tables
   - Black header row (white text)
   - Zebra striping for readability

5. **Movement History Table**
   - Last 20 movements
   - Condition column with color backgrounds:
     - Good: Green (#d4edda)
     - Damaged: Yellow (#fff3cd)
     - Rejected: Red (#f8d7da)
     - Rework: Blue (#d1ecf1)

6. **Signature Section** (bottom)
   - 2-column grid
   - Dotted signature lines
   - Space for manual signatures

7. **Footer**
   - System branding
   - "Auto-generated" notice

### Print Styling
```css
@media print {
  - Exact colors preserved
  - Page breaks avoided in tables
  - No extra margins/headers
  - Black borders for clarity
}
```

## Implementation Files

### Backend
- **`api/lib/batchUtils.js`**
  - `generateHandoverSheet(batch, movements, qrCodeDataURL)`
  - Returns complete HTML document
  - ~400 lines of HTML/CSS

- **`api/routes/batches.js`**
  - `GET /api/batches/:id/handover-sheet`
  - Fetches batch + movements + sub-batches
  - Generates QR code
  - Returns HTML response

### Frontend
- **`QRCodeDisplay.tsx`**
  - Added "Print Handover Sheet" button
  - `handlePrintHandoverSheet()` opens API endpoint

- **`BatchMovementModal.tsx`**
  - `autoPrintHandover` prop
  - Auto-opens print window after movement

- **`BatchTrackingPage.tsx`**
  - "Print Sheet" button on each batch card
  - `handlePrintHandover()` function

## Usage Instructions

### For Floor Workers (Mobile)
1. Scan QR code on batch
2. Log movement to your station
3. System shows success message
4. **Optional**: Tap "Print Handover Sheet" if printer available
5. Sign handover section manually

### For Station Managers (Desktop)
1. View batch list
2. Click "Print Sheet" button on any batch
3. New window opens with formatted sheet
4. Use browser print (Ctrl+P / Cmd+P)
5. Print to network printer or PDF

### For Split Operations
1. After splitting batch into trays
2. System auto-generates sheets for each sub-batch
3. Print all sheets (one per tray)
4. Attach to physical trays
5. Each tray has own QR code for independent tracking

## Future Enhancements (Not Yet Implemented)

### Potential Additions
- [ ] PDF generation (currently HTML only)
- [ ] Bulk print (multiple batches at once)
- [ ] Custom templates per station
- [ ] Barcode in addition to QR
- [ ] Multi-language support
- [ ] Email handover sheet
- [ ] Digital signature capture
- [ ] Photo attachments in printout
- [ ] Material lot traceability section
- [ ] QC checklist integration

## Configuration Options

### Enable Auto-Print
In `BatchMovementModal`:
```tsx
<BatchMovementModal
  batchId={batch.id}
  batchCode={batch.batchCode}
  currentStationId={batch.currentStationId}
  currentQty={batch.currentQty}
  stations={stations}
  autoPrintHandover={true}  // ← Enable auto-print
/>
```

### Customize Print Endpoint
Can add query parameters:
```
/api/batches/:id/handover-sheet?format=pdf&includePhotos=true
```
(Not yet implemented - future enhancement)

## Troubleshooting

### Print Window Blocked
**Issue**: Browser blocks popup window
**Solution**: Allow popups for your domain in browser settings

### QR Code Not Showing
**Issue**: QR code appears as broken image
**Solution**: Ensure QR code generated before handover sheet (backend handles this automatically)

### Table Breaks Across Pages
**Issue**: Movement history splits awkwardly
**Solution**: CSS uses `page-break-inside: avoid` but some browsers ignore - adjust history limit if needed

### Colors Not Printing
**Issue**: Backgrounds appear gray
**Solution**: Enable "Background graphics" in browser print settings

## API Response Example

```html
GET /api/batches/B-1234/handover-sheet

Returns:
<!DOCTYPE html>
<html>
<head>
  <title>Batch Handover Sheet - BATCH-001</title>
  <style>
    /* ~200 lines of print-optimized CSS */
  </style>
</head>
<body>
  <div class="header">...</div>
  <div class="qr-section">
    <img src="data:image/png;base64,..." />
    <div class="batch-info">...</div>
  </div>
  <div class="status-box">...</div>
  <div class="section"><!-- Movement History --></div>
  <div class="signature-section">...</div>
  <div class="footer">...</div>
</body>
</html>
```

## Summary

✅ **Complete batch data in every printout**
✅ **QR code + all tracking information**
✅ **Parent/sub-batch relationships**
✅ **Full movement history**
✅ **Rework and rejection tracking**
✅ **From/To station information**
✅ **Auto-generated after movements and splits**
✅ **Professional A4 format with signatures**
✅ **Multiple access points (card, QR modal, auto-print)**

The system now provides complete traceability documentation for every batch at every stage of production!

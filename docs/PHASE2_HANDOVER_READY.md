# Phase 2 Implementation Handover - Ready to Build

**Date:** October 30, 2025  
**Status:** Phase 1 Complete ✅ | Phase 2 Ready to Start 🚀  
**Migration Applied:** `20251029213809_batch_tracking_and_asset_management`  
**Database:** Fully synced and ready

---

## 🎯 Current Status

### ✅ COMPLETED: Phase 1 - Database Schema Updates

**Migration Successfully Applied:**
- All schema changes are in production database
- Prisma Client regenerated with new types
- 3 new models created: Lot, Asset, WorkstationAsset
- 4 models enhanced: Batch, Project, Station, ProcessConfig
- 12 new indexes created
- 11 new relations established

**Key Models Ready for API Development:**

1. **Batch Model** - Enhanced with:
   - Sub-batching: `parentBatchId`, `subBatchIdentifier`, `SubBatches[]` relation
   - Weight calculation: `totalWeight`, `containerWeight`, `calculatedQty`, `quantityMethod`
   - Rejection tracking: `isRejection`, `rejectionReason`, `rejectionStationId`, `reworkRequired`, `reworkCompleted`
   - Assembly: `assembledFrom[]`, `assembledInto`, `assemblyStation`, `assemblyOperator`, `assemblyDate`
   - Lot grouping: `lotId`, `Lot` relation

2. **Lot Model** - For shipping/packing:
   - Fields: `lotCode`, `projectId`, `poNumber`, `totalQty`, `cartonCount`, `palletCount`
   - Packing: `packingStation`, `packingOperators[]`, `packingDate`
   - Shipping: `shippingDestination`, `customerPO`, `shippingDate`, `status`
   - Relations: `Project`, `Batches[]`

3. **Asset Model** - Complete asset management:
   - Identification: `assetCode`, `assetName`, `assetType`, `category`
   - Mobility: `mobility`, `currentLocation`, `assignedToStation`
   - Status: `status`, `condition`
   - Maintenance: Full tracking with history
   - Performance: `totalRunHours`, `totalCycles`, `utilizationRate`

4. **WorkstationAsset Model** - Junction table:
   - Links Station to Asset (many-to-many)
   - Tracks assignment history, performance impact

5. **Station Model** - Enhanced workstation:
   - Type: `workstationType`, `isMultiAsset`
   - Capacity: `baseCycleTime`, `actualCycleTime`, cycle time units
   - Cross-SKU: `currentSKU`, `skuCycleTimeMap` (JSON)
   - Asset management: `requiresAssets`, `requiredAssetTypes[]`

6. **ProcessConfig Model** - Optimization ready:
   - Cycle times: `baseCycleTime`, `actualCycleTime`, `cycleTimeVariance`
   - Cross-SKU: `skuCode`, `isMultiSKUWorkstation`, `cycleTimeRatio`
   - Learning: `historicalPerformance` (JSON), `optimizationSuggestions` (JSON)
   - Assets: `requiredAssetIds[]`, `optionalAssetIds[]`

**See:** `docs/PHASE1_COMPLETION_SUMMARY.md` for complete technical details

---

## 🚀 NEXT: Phase 2 - Batch Tracking API Implementation

### Critical Path - Build These Endpoints in Order:

### 1. Utilities (Build First)

**File:** `api/lib/batchUtils.js`

```javascript
// Batch code generator
function generateBatchCode(projectCode, skuCode, sequenceNumber)
// Format: PRJ-{code}-SKU-{code}-{YYYYMMDD}-{seq}
// Example: PRJ-TOY001-SKU-RED-20251030-001

// Weight-based quantity calculator
function calculateQuantityFromWeight(totalWeight, containerWeight, unitWeight)
// Returns: { calculatedQty, method: 'weighed' }

// Handover sheet generator
function generateHandoverSheet(batch, station)
// Returns: URL to printable handover sheet
```

### 2. Batch Creation Endpoint

**POST /api/batches**

**Request Body:**
```json
{
  "projectId": 1,
  "projectSkuId": 5,
  "stationId": 10,
  "quantity": 1000,
  "operatorId": "user-123",
  "materialLots": ["MAT-001", "MAT-002"],
  
  // Optional: Weight-based calculation
  "totalWeight": 25.5,
  "containerWeight": 2.0,
  "unitWeight": 0.023,
  "quantityMethod": "weighed",
  
  // Optional: Sub-SKU for variants
  "subSkuIdentifier": "RED-LARGE"
}
```

**Response:**
```json
{
  "success": true,
  "batch": {
    "id": "batch-cuid",
    "batchCode": "PRJ-TOY001-SKU-RED-20251030-001",
    "projectId": 1,
    "quantity": 1000,
    "calculatedQty": 1022,
    "quantityMethod": "weighed",
    "currentStationId": 10,
    "status": "in_production",
    "handoverSheetUrl": "/api/batches/batch-cuid/handover-sheet"
  }
}
```

**Implementation Notes:**
- Auto-generate unique batch code with daily sequence
- If weight provided, calculate quantity: `(totalWeight - containerWeight) / unitWeight`
- Create initial BatchMovement record (arrival at first station)
- Link material lots for traceability
- Generate QR code for batch tracking
- Return handover sheet URL

### 3. Batch Retrieval Endpoints

**GET /api/batches**

**Query Params:**
- `projectId` - Filter by project
- `status` - Filter by status (in_production, completed, rejected, etc.)
- `stationId` - Filter by current station
- `startDate`, `endDate` - Date range filter
- `includeSubBatches` - Include child batches (default: false)
- `includeAssembly` - Include assembly info (default: false)

**Response:**
```json
{
  "batches": [
    {
      "id": "batch-cuid",
      "batchCode": "PRJ-TOY001-SKU-RED-20251030-001",
      "projectId": 1,
      "projectSkuId": 5,
      "quantity": 1000,
      "currentStationId": 10,
      "status": "in_production",
      "createdAt": "2025-10-30T10:00:00Z",
      "project": { "code": "TOY001", "name": "Toy Set 1" },
      "station": { "name": "Molding Station 1" },
      "subBatchCount": 5,
      "hasRejections": false
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

**GET /api/batches/:id**

**Response:**
```json
{
  "batch": {
    "id": "batch-cuid",
    "batchCode": "PRJ-TOY001-SKU-RED-20251030-001",
    "projectId": 1,
    "projectSkuId": 5,
    "quantity": 1000,
    "currentStationId": 10,
    "status": "in_production",
    "createdAt": "2025-10-30T10:00:00Z",
    
    // Relations
    "project": { /* full project */ },
    "station": { /* current station */ },
    "projectSku": { /* SKU details */ },
    
    // Movement history
    "movements": [
      {
        "id": "move-cuid",
        "fromStationId": null,
        "toStationId": 10,
        "quantity": 1000,
        "operatorId": "user-123",
        "movedAt": "2025-10-30T10:00:00Z",
        "condition": "good",
        "photos": []
      }
    ],
    
    // Sub-batches
    "subBatches": [
      {
        "id": "sub-batch-cuid",
        "batchCode": "PRJ-TOY001-SKU-RED-20251030-001-TRAY01",
        "subBatchIdentifier": "TRAY-01",
        "quantity": 200,
        "status": "in_production"
      }
    ],
    
    // Assembly info (if assembled)
    "assembledFrom": ["batch-id-1", "batch-id-2"],
    "assembledInto": null,
    
    // Rejection info (if rejected)
    "isRejection": false,
    "rejectionReason": null
  }
}
```

### 4. Batch Movement Endpoint

**POST /api/batches/:id/move**

**Request Body:**
```json
{
  "toStationId": 15,
  "operatorId": "user-123",
  "quantity": 1000,
  "condition": "good",
  "notes": "All items inspected",
  "photos": ["url1.jpg", "url2.jpg"],
  
  // Optional: Partial move (creates sub-batch)
  "isPartialMove": false,
  "remainingQuantity": 800
}
```

**Response:**
```json
{
  "success": true,
  "movement": {
    "id": "move-cuid",
    "batchId": "batch-cuid",
    "fromStationId": 10,
    "toStationId": 15,
    "quantity": 1000,
    "movedAt": "2025-10-30T14:00:00Z"
  },
  "batch": {
    "id": "batch-cuid",
    "currentStationId": 15,
    "status": "in_production"
  },
  "subBatch": null
}
```

**Implementation Notes:**
- Create BatchMovement record
- Update batch.currentStationId
- If partial move, create sub-batch with remaining quantity
- Support photo upload to cloud storage
- Log operator activity

### 5. Sub-Batch Creation (Split) Endpoint

**POST /api/batches/:id/split**

**Request Body:**
```json
{
  "operatorId": "user-123",
  "containers": [
    {
      "identifier": "TRAY-01",
      "quantity": 200,
      "weight": 4.6,
      "containerWeight": 0.4
    },
    {
      "identifier": "TRAY-02",
      "quantity": 200,
      "weight": 4.7,
      "containerWeight": 0.4
    },
    {
      "identifier": "BOX-A",
      "quantity": 600,
      "weight": 14.0,
      "containerWeight": 1.2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "parentBatch": {
    "id": "batch-cuid",
    "batchCode": "PRJ-TOY001-SKU-RED-20251030-001",
    "quantity": 1000,
    "status": "split"
  },
  "subBatches": [
    {
      "id": "sub-1",
      "batchCode": "PRJ-TOY001-SKU-RED-20251030-001-TRAY01",
      "subBatchIdentifier": "TRAY-01",
      "parentBatchId": "batch-cuid",
      "quantity": 200,
      "qrCodeUrl": "/api/batches/sub-1/qr-code"
    },
    {
      "id": "sub-2",
      "batchCode": "PRJ-TOY001-SKU-RED-20251030-001-TRAY02",
      "subBatchIdentifier": "TRAY-02",
      "parentBatchId": "batch-cuid",
      "quantity": 200,
      "qrCodeUrl": "/api/batches/sub-2/qr-code"
    },
    {
      "id": "sub-3",
      "batchCode": "PRJ-TOY001-SKU-RED-20251030-001-BOXA",
      "subBatchIdentifier": "BOX-A",
      "parentBatchId": "batch-cuid",
      "quantity": 600,
      "qrCodeUrl": "/api/batches/sub-3/qr-code"
    }
  ]
}
```

**Implementation Notes:**
- Create child batches with parent linkage
- Generate unique sub-batch codes: `{parentCode}-{identifier}`
- Each sub-batch inherits: projectId, projectSkuId, materialLots
- Generate QR code labels for each sub-batch
- Update parent batch status to "split"

### 6. Rejection & Rework Endpoints

**POST /api/batches/:id/reject**

**Request Body:**
```json
{
  "operatorId": "user-123",
  "stationId": 15,
  "reason": "Paint defects - uneven coverage",
  "quantity": 50,
  "reworkRequired": true,
  "photos": ["defect1.jpg", "defect2.jpg"],
  "notes": "Needs stripping and repainting"
}
```

**Response:**
```json
{
  "success": true,
  "rejectionBatch": {
    "id": "rej-batch-cuid",
    "batchCode": "PRJ-TOY001-SKU-RED-20251030-001-REJ001",
    "parentBatchId": "batch-cuid",
    "quantity": 50,
    "isRejection": true,
    "rejectionReason": "Paint defects - uneven coverage",
    "reworkRequired": true,
    "status": "rejected"
  }
}
```

**POST /api/batches/:id/rework-complete**

**Request Body:**
```json
{
  "operatorId": "user-123",
  "stationId": 20,
  "notes": "Rework completed successfully",
  "photos": ["after1.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "batch": {
    "id": "rej-batch-cuid",
    "reworkCompleted": true,
    "status": "reworked"
  }
}
```

### 7. Assembly Endpoint

**POST /api/batches/assemble**

**Request Body:**
```json
{
  "projectId": 1,
  "assemblyStationId": 25,
  "operatorId": "user-123",
  "sourceBatches": [
    {
      "batchId": "batch-red-cuid",
      "skuCode": "RED-TOY",
      "quantityUsed": 100
    },
    {
      "batchId": "batch-blue-cuid",
      "skuCode": "BLUE-TOY",
      "quantityUsed": 100
    },
    {
      "batchId": "batch-green-cuid",
      "skuCode": "GREEN-TOY",
      "quantityUsed": 100
    }
  ],
  "outputQuantity": 100,
  "outputSkuId": 10,
  "notes": "Multi-color toy set assembly"
}
```

**Response:**
```json
{
  "success": true,
  "assemblyBatch": {
    "id": "asm-batch-cuid",
    "batchCode": "PRJ-TOY001-SKU-SET-20251030-001",
    "quantity": 100,
    "assembledFrom": ["batch-red-cuid", "batch-blue-cuid", "batch-green-cuid"],
    "assemblyStation": "Assembly Line 1",
    "assemblyOperator": "user-123",
    "assemblyDate": "2025-10-30T16:00:00Z",
    "status": "assembled"
  },
  "sourceBatchesUpdated": [
    {
      "batchId": "batch-red-cuid",
      "assembledInto": "asm-batch-cuid",
      "quantityUsed": 100
    }
  ]
}
```

**Implementation Notes:**
- Validate all source batches exist and have sufficient quantity
- Create new assembly batch with `assembledFrom` array
- Update source batches with `assembledInto` reference
- Full traceability: can trace assembled batch back to all component batches
- Validate BOM if available (future enhancement)

### 8. Lot Management Endpoints

**POST /api/lots**

**Request Body:**
```json
{
  "projectId": 1,
  "poNumber": "PO-2025-001",
  "packingStationId": 30,
  "packingOperators": ["user-123", "user-456"],
  "batchIds": ["batch-1", "batch-2", "batch-3"],
  "cartonCount": 10,
  "palletCount": 1,
  "shippingDestination": "Customer Warehouse A",
  "customerPO": "CUST-PO-12345"
}
```

**Response:**
```json
{
  "success": true,
  "lot": {
    "id": "lot-cuid",
    "lotCode": "LOT-TOY001-20251030-001",
    "projectId": 1,
    "poNumber": "PO-2025-001",
    "totalQty": 3000,
    "cartonCount": 10,
    "palletCount": 1,
    "packingDate": "2025-10-30T18:00:00Z",
    "status": "packed",
    "batches": [
      { "id": "batch-1", "batchCode": "...", "quantity": 1000 },
      { "id": "batch-2", "batchCode": "...", "quantity": 1000 },
      { "id": "batch-3", "batchCode": "...", "quantity": 1000 }
    ]
  }
}
```

**GET /api/lots/:id**

Returns complete lot details with all batches, packing info, shipping info.

**POST /api/lots/:id/add-batch**

Add additional batch to existing lot.

**POST /api/lots/:id/ship**

Mark lot as shipped with shipping date and tracking info.

### 9. Traceability Query Endpoints

**GET /api/batches/:id/trace-forward**

Trace where this batch went (movements, sub-batches, assembly).

**Response:**
```json
{
  "batch": { /* batch details */ },
  "trace": {
    "movements": [ /* all movements */ ],
    "subBatches": [ /* all child batches */ ],
    "assembledInto": { /* assembly batch if used */ },
    "lot": { /* shipping lot if packed */ }
  }
}
```

**GET /api/batches/:id/trace-backward**

Trace where this batch came from (parent, source batches for assembly).

**GET /api/batches/material-recall**

**Query Params:** `materialLotCode`

Find all batches that used specific material lot (for recalls).

**GET /api/batches/operator-tracking**

**Query Params:** `operatorId`, `startDate`, `endDate`

Track all batches handled by specific operator.

### 10. Printable Documents

**GET /api/batches/:id/handover-sheet**

Generate printable handover sheet with batch details, QR code, checklist.

**GET /api/batches/:id/qr-code**

Generate QR code image for batch tracking.

**GET /api/lots/:id/packing-list**

Generate packing list PDF with all batches in lot.

---

## 📁 File Structure to Create

```
api/
├── lib/
│   └── batchUtils.js          ← CREATE: Batch utilities
├── routes/
│   ├── batches.js             ← CREATE: All batch endpoints
│   └── lots.js                ← CREATE: All lot endpoints
└── index.js                   ← UPDATE: Register new routes
```

---

## 🔧 Implementation Order (Do in Sequence)

1. **Create `api/lib/batchUtils.js`** - All utility functions
2. **Create `api/routes/batches.js`** - All batch endpoints
3. **Create `api/routes/lots.js`** - All lot endpoints
4. **Update `api/index.js`** - Register routes
5. **Test each endpoint** as you build it

---

## 📚 Key References

- **Schema Details:** `docs/PHASE1_COMPLETION_SUMMARY.md`
- **Master Blueprint:** `docs/MASTER_BLUEPRINT.md` (Section 2.2B - Complete Batch Tracking)
- **Original Spec:** `docs/PHASE2_HANDOVER.md` (from previous conversation)
- **Full Checklist:** `docs/BACKEND_DEVELOPMENT_CHECKLIST.md`

---

## 🎯 User Requirements Reminder

1. **ASK when unclear** - Never assume
2. **Batch tracking starts at first production point** (molding/first process)
3. **Weight-based calculation** - Support calculating quantity from weight
4. **Sub-batching** - For containers/trays with full parent linkage
5. **Assembly** - Multi-SKU batches with complete traceability
6. **Lot grouping** - For packing and shipping
7. **Full traceability** - Forward, backward, material recall, operator tracking

---

## ✅ Ready to Build

All database schema is ready. Prisma Client has all types. You can start building the API endpoints immediately.

**Start with:** Creating `api/lib/batchUtils.js` with the batch code generator function.

**User said:** "go ahead build it please, no need for updates in middle do it all at once"

**Approach:** Build all endpoints completely, then test together.

---

**Next Chat Session:** Start with creating batch utilities and building all endpoints in sequence. 🚀

---

## 🎨 IMPORTANT: After Phase 2 Complete → UI/UX Implementation

**CRITICAL REMINDER:** Once ALL backend development is complete (Phases 1-8), we will move to UI/UX implementation.

**UI/UX Specification Ready:**
- **Document:** `docs/UI_UX_COMPLETE_DESIGN_SYSTEM.md` (101 pages)
- **Design System:** Complete Asana-inspired redesign
- **Reference Images:** `docs/ui-ux-reference/` folder
- **Scope:** Complete frontend rebuild (sidebar, home page, notifications, projects, Kanban, search, capacity optimization)

**Implementation Order:**
1. ✅ Phase 1: Database Schema Updates - **COMPLETE**
2. 🚀 Phase 2: Batch Tracking API - **NEXT** (current handover)
3. ⏳ Phase 3: Workstation & Asset API
4. ⏳ Phase 4: Capacity Optimization Engine
5. ⏳ Phase 5: Learning Engine Enhancements
6. ⏳ Phase 6: Worker Management API
7. ⏳ Phase 7: Complete Existing Endpoints
8. ⏳ Phase 8: Integration & Testing
9. 🎨 **THEN: Complete UI/UX Implementation** (Asana-inspired design system)

**User's Words:** "Complete ALL backend development before touching UI/UX"

**No UI work until backend Phases 1-8 are fully complete and tested.** ✋

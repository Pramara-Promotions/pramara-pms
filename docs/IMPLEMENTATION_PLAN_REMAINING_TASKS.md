# Implementation Plan for Remaining Tasks - Groups 1, 2, 4

**Generated**: November 10, 2025  
**Status**: Ready for Implementation  
**Priority**: Complete before rollout

---

## ✅ COMPLETED TASKS (5/13)

1. ✅ **Dark/Light Mode Toggle** - Already implemented in AppLayout
2. ✅ **Admin Menu in Avatar** - Already implemented with Super Admin check
3. ✅ **AppLayout Preferences 401 Error** - Fixed with proper error handling and retry logic
4. ✅ **Compliance API Endpoint** - `GET /api/compliance?projectId=X` already exists
5. ✅ **MRP Calculator API** - `POST /api/mrp/calculate` fully implemented with BOM calculation

---

## 🔄 REMAINING TASKS (8/13)

### GROUP 4 - TASK 6: Complete Project Context Improvements
**Status**: In Progress  
**Estimated Time**: 2-3 hours  
**Priority**: High

#### Files to Update:
1. `web/src/pages/execution/QCManagementPage.tsx`
2. `web/src/pages/admin/StationsPage.tsx`
3. `web/src/pages/projects/tabs/ProcessFlowTab.tsx`
4. `web/src/pages/planning/DailyPlanningPage.tsx`

#### Implementation Steps:

**Step 1: QC Management Page**
```tsx
// File: web/src/pages/execution/QCManagementPage.tsx
import { useProjectContext } from '../../contexts/ProjectContext';

export default function QCManagementPage() {
  const { projectId } = useProjectContext();
  
  // Remove project dropdown
  // Use projectId from context directly
  
  // Update API calls to use context projectId
  const { data: submissions } = useQuery({
    queryKey: ['qc-submissions', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/qc-submissions?projectId=${projectId}`);
      return res.json();
    },
    enabled: !!projectId
  });
  
  // Rest of component...
}
```

**Step 2: Stations Page**
```tsx
// File: web/src/pages/admin/StationsPage.tsx
import { useProjectContext } from '../../contexts/ProjectContext';

export default function StationsPage() {
  const { projectId } = useProjectContext();
  
  // If accessed from project context, filter by project
  // If accessed from admin directly, show all stations
  
  const queryParams = projectId ? `?projectId=${projectId}` : '';
  
  // Update API calls
  const { data: stations } = useQuery({
    queryKey: ['stations', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/stations${queryParams}`);
      return res.json();
    }
  });
}
```

**Step 3: Process Flow Tab**
```tsx
// File: web/src/pages/projects/tabs/ProcessFlowTab.tsx
import { useProjectContext } from '../../../contexts/ProjectContext';

export default function ProcessFlowTab() {
  const { projectId, project } = useProjectContext();
  
  // Remove project selector
  // Use projectId from context
  
  const { data: operations } = useQuery({
    queryKey: ['operations', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/operations?projectId=${projectId}`);
      return res.json();
    },
    enabled: !!projectId
  });
}
```

**Step 4: Daily Planning Page**
```tsx
// File: web/src/pages/planning/DailyPlanningPage.tsx
import { useProjectContext } from '../../contexts/ProjectContext';

export default function DailyPlanningPage() {
  const { projectId, project } = useProjectContext();
  
  // Auto-fill project dropdown if in project context
  const [selectedProject, setSelectedProject] = useState(projectId || null);
  
  // If projectId exists, make dropdown read-only or hide it
  {projectId ? (
    <div className="text-sm text-gray-600">
      Project: <span className="font-semibold">{project?.name}</span>
    </div>
  ) : (
    <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
      {/* Project options */}
    </select>
  )}
}
```

---

### GROUP 4 - TASK 7: Process Flow Add Operation Button
**Status**: Not Started  
**Estimated Time**: 1-2 hours  
**Priority**: Medium

#### Implementation:

```tsx
// File: web/src/pages/projects/tabs/ProcessFlowTab.tsx

const [showAddModal, setShowAddModal] = useState(false);
const [newOperation, setNewOperation] = useState({
  name: '',
  sequence: 1,
  station: '',
  estimatedDuration: 0
});

// Add Operation Modal
<Dialog open={showAddModal} onOpenChange={setShowAddModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Operation</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <label>Operation Name</label>
        <input 
          value={newOperation.name}
          onChange={(e) => setNewOperation({...newOperation, name: e.target.value})}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label>Station</label>
        <select 
          value={newOperation.station}
          onChange={(e) => setNewOperation({...newOperation, station: e.target.value})}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select Station</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label>Estimated Duration (minutes)</label>
        <input 
          type="number"
          value={newOperation.estimatedDuration}
          onChange={(e) => setNewOperation({...newOperation, estimatedDuration: parseInt(e.target.value)})}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
      <Button onClick={handleAddOperation}>Add Operation</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Add Operation Handler
async function handleAddOperation() {
  try {
    const res = await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        ...newOperation
      })
    });
    if (!res.ok) throw new Error('Failed to add operation');
    await queryClient.invalidateQueries(['operations', projectId]);
    setShowAddModal(false);
    toast.success('Operation added successfully');
  } catch (error) {
    toast.error('Failed to add operation');
  }
}

// Wire the "Add First Operation" button
<button onClick={() => setShowAddModal(true)} className="btn-primary">
  <Plus size={16} />
  Add First Operation
</button>
```

---

### GROUP 4 - TASK 8 & 9: Materials Dashboard & MRP Calculator UX
**Status**: Not Started  
**Estimated Time**: 3-4 hours  
**Priority**: Medium

#### Materials Dashboard UX Improvements

```tsx
// File: web/src/pages/materials/MaterialsDashboardPage.tsx

// Add tooltip component
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

// Add help tooltips throughout
<div className="flex items-center gap-2">
  <span>Current Stock</span>
  <Tooltip>
    <TooltipTrigger>
      <HelpCircle size={16} className="text-gray-400" />
    </TooltipTrigger>
    <TooltipContent>
      <p>Current available quantity in warehouse</p>
    </TooltipContent>
  </Tooltip>
</div>

// Add workflow guidance banner
{materials.length === 0 && (
  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <HelpCircle className="text-blue-600 mt-0.5" size={20} />
      <div>
        <h4 className="font-semibold text-blue-900 dark:text-blue-100">Getting Started with Materials</h4>
        <ol className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside">
          <li>Click "Add Material" to register a new material</li>
          <li>Set reorder points to get low stock alerts</li>
          <li>Use "Receive Stock" to log incoming deliveries</li>
          <li>Track consumption through production entries</li>
        </ol>
      </div>
    </div>
  </div>
)}

// Add contextual help for each section
<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
  <h5 className="font-semibold mb-2">Understanding Stock Alerts</h5>
  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
    <li>🔴 Critical: Stock below minimum level</li>
    <li>🟡 Low: Stock approaching reorder point</li>
    <li>🟢 Good: Stock level is healthy</li>
  </ul>
</div>
```

#### MRP Calculator UX Improvements

```tsx
// File: web/src/pages/mrp/MRPCalculatorPage.tsx

// Add explanation panel
<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4 mb-6">
  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
    <HelpCircle size={18} />
    How MRP Calculation Works
  </h3>
  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
    <p><strong>1. Base Quantity:</strong> Material needed × Target quantity</p>
    <p><strong>2. Loss Factor:</strong> Additional % added for wastage/defects</p>
    <p><strong>3. Historical Learning:</strong> System adjusts loss factor based on past data</p>
    <p><strong>4. Total Requirement:</strong> Base quantity + Loss percentage</p>
  </div>
</div>

// Add inline tooltips for each field
<div>
  <label className="flex items-center gap-2">
    Target Quantity
    <Tooltip>
      <TooltipTrigger>
        <HelpCircle size={14} className="text-gray-400" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Number of final products you want to manufacture</p>
      </TooltipContent>
    </Tooltip>
  </label>
  <input type="number" />
</div>

<div>
  <label className="flex items-center gap-2">
    Loss Percentage
    <Tooltip>
      <TooltipTrigger>
        <HelpCircle size={14} className="text-gray-400" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Expected wastage during production (e.g., cutting loss, defects)</p>
        <p className="text-xs mt-1">System will suggest optimized value based on history</p>
      </TooltipContent>
    </Tooltip>
  </label>
  <input type="number" />
</div>

// Show calculation breakdown
{results && (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
    <h4 className="font-semibold mb-3">Calculation Breakdown</h4>
    {results.requirements.map(req => (
      <div key={req.materialId} className="border-b pb-2 mb-2">
        <div className="font-medium">{req.materialName}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>Base: {req.baseQty} {req.unit}</div>
          <div>Loss: {req.lossPercent}% ({(req.qtyWithLoss - req.baseQty).toFixed(2)} {req.unit})</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            Total: {req.qtyWithLoss} {req.unit}
          </div>
        </div>
      </div>
    ))}
  </div>
)}
```

---

### GROUP 4 - TASK 10: Station Analytics Endpoint
**Status**: Not Started  
**Estimated Time**: 2 hours  
**Priority**: Medium

#### Backend Implementation:

```javascript
// File: api/routes/stations.js

/**
 * GET /api/stations/:id/analytics
 * Get analytics for a station
 */
router.get('/:id/analytics', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    const station = await prisma.station.findUnique({ where: { id } });
    if (!station) return res.status(404).json({ error: 'Station not found' });
    
    // Date range for analytics
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get shift entries for this station
    const shiftEntries = await prisma.shiftEntry.findMany({
      where: {
        stationId: id,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        worker: true,
        project: true
      }
    });
    
    // Calculate utilization
    const totalShifts = shiftEntries.length;
    const activeShifts = shiftEntries.filter(s => s.status === 'completed').length;
    const utilizationRate = totalShifts > 0 ? (activeShifts / totalShifts) * 100 : 0;
    
    // Calculate output
    const totalOutput = await prisma.productionEntry.aggregate({
      where: {
        stationId: id,
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _sum: {
        producedQty: true,
        approvedQty: true,
        rejectedQty: true
      }
    });
    
    // Calculate downtime
    const downtimeRecords = await prisma.downtime.findMany({
      where: {
        stationId: id,
        startTime: {
          gte: start,
          lte: end
        }
      }
    });
    
    const totalDowntimeMinutes = downtimeRecords.reduce((sum, d) => {
      const start = new Date(d.startTime);
      const end = d.endTime ? new Date(d.endTime) : new Date();
      return sum + ((end - start) / 1000 / 60);
    }, 0);
    
    // Group downtime by reason
    const downtimeByReason = {};
    downtimeRecords.forEach(d => {
      const reason = d.reason || 'Unknown';
      downtimeByReason[reason] = (downtimeByReason[reason] || 0) + 1;
    });
    
    // Calculate quality metrics
    const qualityRate = totalOutput._sum.producedQty > 0
      ? ((totalOutput._sum.approvedQty || 0) / totalOutput._sum.producedQty) * 100
      : 0;
    
    // Output trend (daily)
    const dailyOutput = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(produced_qty) as output
      FROM production_entries
      WHERE station_id = ${id}
        AND created_at >= ${start}
        AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    res.json({
      stationId: id,
      stationName: station.name,
      period: { start, end },
      utilization: {
        rate: utilizationRate.toFixed(2),
        totalShifts,
        activeShifts
      },
      output: {
        total: totalOutput._sum.producedQty || 0,
        approved: totalOutput._sum.approvedQty || 0,
        rejected: totalOutput._sum.rejectedQty || 0,
        qualityRate: qualityRate.toFixed(2)
      },
      downtime: {
        totalMinutes: totalDowntimeMinutes.toFixed(2),
        totalHours: (totalDowntimeMinutes / 60).toFixed(2),
        incidents: downtimeRecords.length,
        byReason: downtimeByReason
      },
      trend: {
        daily: dailyOutput
      }
    });
  } catch (error) {
    console.error('[stations] Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch station analytics' });
  }
});
```

---

### GROUP 2 - TASK 11: Complete Approval Workflow
**Status**: Not Started  
**Estimated Time**: 6-8 hours  
**Priority**: High

#### Implementation Areas:

**1. Stage Gate Approvals (PreProd → Production)**

```tsx
// File: web/src/pages/projects/tabs/PreProdTab.tsx

// Add "Request Production Approval" button
<button 
  onClick={handleRequestProductionApproval}
  disabled={!allPreProdTasksComplete}
  className="btn-primary"
>
  Request Production Approval
</button>

async function handleRequestProductionApproval() {
  try {
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        approvalType: 'stage_gate',
        category: 'production_readiness',
        title: `Production Approval for ${project.name}`,
        description: 'All pre-production tasks completed, requesting approval to begin production',
        priority: 'high',
        requestedBy: user.id,
        approvers: productionApprovers, // List of users who can approve
        blocksNextStage: true
      })
    });
    if (!res.ok) throw new Error('Failed to request approval');
    toast.success('Production approval requested');
  } catch (error) {
    toast.error('Failed to request approval');
  }
}

// Add enforcement check in ExecutionTab
useEffect(() => {
  // Check if production approval exists and is approved
  async function checkProductionApproval() {
    const res = await fetch(`/api/approvals?projectId=${projectId}&approvalType=stage_gate&status=approved`);
    const approvals = await res.json();
    setProductionApproved(approvals.length > 0);
  }
  checkProductionApproval();
}, [projectId]);

{!productionApproved && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
    <AlertTriangle className="text-yellow-600" size={20} />
    <p className="font-semibold">Production Not Approved</p>
    <p className="text-sm">Production cannot begin until stage gate approval is received</p>
  </div>
)}
```

**2. Budget Approvals**

```tsx
// File: web/src/pages/materials/MaterialRequestPage.tsx

// Check if material request exceeds budget threshold
async function handleMaterialRequest() {
  const totalCost = materialRequest.quantity * material.costPerUnit;
  
  if (totalCost > BUDGET_APPROVAL_THRESHOLD) {
    // Require budget approval
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        approvalType: 'budget',
        category: 'material_purchase',
        title: `Material Purchase Approval - ${material.name}`,
        description: `Requesting approval for ${materialRequest.quantity} ${material.unit} at ${totalCost.toFixed(2)}`,
        amount: totalCost,
        priority: totalCost > CRITICAL_THRESHOLD ? 'high' : 'medium',
        requestedBy: user.id
      })
    });
    
    toast.info('Budget approval required - request submitted');
  } else {
    // Process directly
    await processMaterialRequest();
  }
}
```

**3. QC Approvals (Batch Release)**

```tsx
// File: web/src/pages/execution/QCSubmissionPage.tsx

// After QC inspection, if passed, enable batch release approval
{qcResult.result === 'pass' && (
  <button 
    onClick={handleRequestBatchRelease}
    className="btn-primary"
  >
    Request Batch Release Approval
  </button>
)}

async function handleRequestBatchRelease() {
  const res = await fetch('/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      approvalType: 'qc_release',
      category: 'batch_release',
      title: `Batch Release - ${batch.code}`,
      description: `QC passed, requesting approval to release batch for shipment`,
      relatedEntity: 'batch',
      relatedEntityId: batch.id,
      priority: 'high',
      requestedBy: user.id
    })
  });
  
  toast.success('Batch release approval requested');
}

// In batch shipping page, check for approval
const canShip = batch.qcApprovalStatus === 'approved';
```

---

### GROUP 2 - TASK 12: Complete Files Tab Aggregation
**Status**: Not Started  
**Estimated Time**: 4-5 hours  
**Priority**: Medium

#### Implementation:

```tsx
// File: web/src/pages/projects/tabs/FilesTab.tsx

// Add origin filter
const [originFilter, setOriginFilter] = useState('all');
const origins = ['all', 'compliance', 'preprod', 'planning', 'board', 'manual'];

// Aggregate files from all modules
const { data: allFiles, isLoading } = useQuery({
  queryKey: ['project-files', projectId, originFilter],
  queryFn: async () => {
    const files = [];
    
    // 1. Compliance documents
    if (originFilter === 'all' || originFilter === 'compliance') {
      const complianceDocs = await fetch(`/api/compliance/documents/by-project?projectId=${projectId}`).then(r => r.json());
      files.push(...complianceDocs.map(d => ({
        ...d,
        origin: 'compliance',
        viewInContextUrl: `/projects/${projectId}/compliance`,
        icon: 'FileCheck'
      })));
    }
    
    // 2. PreProd documents
    if (originFilter === 'all' || originFilter === 'preprod') {
      const preprodDocs = await fetch(`/api/preprod/documents?projectId=${projectId}`).then(r => r.json());
      files.push(...preprodDocs.map(d => ({
        ...d,
        origin: 'preprod',
        viewInContextUrl: `/projects/${projectId}/preprod`,
        icon: 'TestTube'
      })));
    }
    
    // 3. Planning documents
    if (originFilter === 'all' || originFilter === 'planning') {
      const planningDocs = await fetch(`/api/planning/documents?projectId=${projectId}`).then(r => r.json());
      files.push(...planningDocs.map(d => ({
        ...d,
        origin: 'planning',
        viewInContextUrl: `/projects/${projectId}/planning`,
        icon: 'Calendar'
      })));
    }
    
    // 4. Board task attachments
    if (originFilter === 'all' || originFilter === 'board') {
      const boardDocs = await fetch(`/api/board/documents?projectId=${projectId}`).then(r => r.json());
      files.push(...boardDocs.map(d => ({
        ...d,
        origin: 'board',
        viewInContextUrl: `/projects/${projectId}/board`,
        icon: 'Trello'
      })));
    }
    
    // 5. Manual uploads
    if (originFilter === 'all' || originFilter === 'manual') {
      const manualDocs = await fetch(`/api/documents?projectId=${projectId}&type=manual`).then(r => r.json());
      files.push(...manualDocs.map(d => ({
        ...d,
        origin: 'manual',
        icon: 'FileUp'
      })));
    }
    
    return files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  },
  enabled: !!projectId
});

// Render with origin badges and "View in Context" links
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {allFiles?.map(file => (
    <div key={file.id} className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name={file.icon} size={20} />
          <span className="font-medium">{file.documentName}</span>
        </div>
        <Badge variant={getOriginVariant(file.origin)}>
          {file.origin}
        </Badge>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        Uploaded: {formatDate(file.uploadedAt)}
      </div>
      
      <div className="flex gap-2">
        <button onClick={() => downloadFile(file)} className="btn-sm">
          Download
        </button>
        {file.viewInContextUrl && (
          <Link to={file.viewInContextUrl} className="btn-sm btn-outline">
            View in Context →
          </Link>
        )}
      </div>
    </div>
  ))}
</div>
```

#### Backend: Add document endpoints for each module

```javascript
// api/routes/preprod.js
router.get('/documents', requireAuth, async (req, res) => {
  const { projectId } = req.query;
  const documents = await prisma.preProdDocument.findMany({
    where: { projectId: parseInt(projectId) },
    include: { uploader: true }
  });
  res.json(documents);
});

// api/routes/planning.js
router.get('/documents', requireAuth, async (req, res) => {
  const { projectId } = req.query;
  const documents = await prisma.planningDocument.findMany({
    where: { projectId: parseInt(projectId) },
    include: { uploader: true }
  });
  res.json(documents);
});

// api/routes/board.js
router.get('/documents', requireAuth, async (req, res) => {
  const { projectId } = req.query;
  const documents = await prisma.taskAttachment.findMany({
    where: { task: { columnConfig: { boardConfig: { projectId: parseInt(projectId) } } } },
    include: { uploader: true, task: true }
  });
  res.json(documents);
});
```

---

### GROUP 4 - TASK 13: Home Page Performance Dashboard
**Status**: Not Started  
**Estimated Time**: 10-15 hours  
**Priority**: Critical for Rollout

#### This is a MAJOR feature - Full implementation guide:

**Backend: Dashboard Analytics API**

```javascript
// File: api/routes/dashboard.js

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/auth').authenticate;

router.use(requireAuth);

/**
 * GET /api/dashboard/overview
 * Comprehensive dashboard analytics
 */
router.get('/overview', async (req, res) => {
  try {
    const { timeRange = '7' } = req.query; // days
    const days = parseInt(timeRange);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    // 1. PRODUCTION METRICS
    const productionEntries = await prisma.productionEntry.findMany({
      where: { createdAt: { gte: dateFrom } },
      include: { project: true, station: true }
    });
    
    const totalOutput = productionEntries.reduce((sum, e) => sum + (e.producedQty || 0), 0);
    const totalApproved = productionEntries.reduce((sum, e) => sum + (e.approvedQty || 0), 0);
    const totalRejected = productionEntries.reduce((sum, e) => sum + (e.rejectedQty || 0), 0);
    
    // Get daily plans for target comparison
    const dailyPlans = await prisma.dailyPlan.findMany({
      where: { date: { gte: dateFrom } }
    });
    
    const targetOutput = dailyPlans.reduce((sum, p) => sum + (p.targetQuantity || 0), 0);
    const variance = totalOutput - targetOutput;
    const variancePercent = targetOutput > 0 ? (variance / targetOutput) * 100 : 0;
    
    // Production trend (daily)
    const productionTrend = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(produced_qty) as actual,
        (SELECT SUM(target_quantity) FROM daily_plans WHERE DATE(date) = DATE(pe.created_at)) as target
      FROM production_entries pe
      WHERE created_at >= ${dateFrom}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    // 2. QUALITY METRICS
    const qcSubmissions = await prisma.qCSubmission.findMany({
      where: { createdAt: { gte: dateFrom } }
    });
    
    const totalInspections = qcSubmissions.length;
    const passedInspections = qcSubmissions.filter(q => q.result === 'pass').length;
    const qcPassRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
    const rejectionRate = 100 - qcPassRate;
    
    // Defect analysis
    const defects = qcSubmissions
      .filter(q => q.result === 'fail')
      .flatMap(q => q.defects || []);
    
    const defectCounts = {};
    defects.forEach(d => {
      defectCounts[d.type] = (defectCounts[d.type] || 0) + 1;
    });
    
    const topDefects = Object.entries(defectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
    
    // Quality trend
    const qualityTrend = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed
      FROM qc_submissions
      WHERE created_at >= ${dateFrom}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    // 3. WORKFORCE METRICS
    const shiftEntries = await prisma.shiftEntry.findMany({
      where: { date: { gte: dateFrom } },
      include: { worker: true }
    });
    
    const uniqueWorkers = new Set(shiftEntries.map(s => s.workerId)).size;
    const totalShifts = shiftEntries.length;
    
    // Calculate attendance rate
    const expectedShifts = uniqueWorkers * days * 2; // Assuming 2 shifts per day
    const attendanceRate = expectedShifts > 0 ? (totalShifts / expectedShifts) * 100 : 0;
    
    // Worker productivity (output per worker)
    const productivity = uniqueWorkers > 0 ? totalOutput / uniqueWorkers : 0;
    
    // 4. PROJECT HEALTH
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: {
            tasks: true,
            milestones: true
          }
        }
      }
    });
    
    const totalProjects = projects.length;
    const onTrack = projects.filter(p => p.status === 'on_track').length;
    const atRisk = projects.filter(p => p.status === 'at_risk').length;
    const critical = projects.filter(p => p.status === 'critical').length;
    
    // 5. FACTORY PERFORMANCE (if multi-factory)
    const factories = await prisma.factory.findMany({
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                stations: true
              }
            }
          }
        }
      }
    });
    
    const factoryMetrics = factories.map(factory => {
      const stationIds = factory.floors
        .flatMap(f => f.rooms)
        .flatMap(r => r.stations)
        .map(s => s.id);
      
      const factoryOutput = productionEntries
        .filter(e => stationIds.includes(e.stationId))
        .reduce((sum, e) => sum + (e.producedQty || 0), 0);
      
      const factoryShifts = shiftEntries.filter(s => stationIds.includes(s.stationId));
      const utilization = factoryShifts.length > 0 ? 
        (factoryShifts.filter(s => s.status === 'completed').length / factoryShifts.length) * 100 : 0;
      
      return {
        factoryId: factory.id,
        name: factory.name,
        status: factory.status || 'operational',
        outputToday: factoryOutput,
        utilization: utilization.toFixed(2),
        efficiency: 85, // TODO: Calculate from actual data
        stationCount: stationIds.length
      };
    });
    
    res.json({
      period: { from: dateFrom, to: new Date(), days },
      production: {
        totalOutput,
        targetOutput,
        variance,
        variancePercent: variancePercent.toFixed(2),
        approved: totalApproved,
        rejected: totalRejected,
        trend: productionTrend,
        topPerformingProjects: [], // TODO: Calculate
        underperformingProjects: [] // TODO: Calculate
      },
      quality: {
        qcPassRate: qcPassRate.toFixed(2),
        rejectionRate: rejectionRate.toFixed(2),
        defectRate: ((totalRejected / totalOutput) * 100).toFixed(2),
        totalInspections,
        topDefects,
        trend: qualityTrend
      },
      workforce: {
        activeWorkers: uniqueWorkers,
        totalShifts,
        attendanceRate: attendanceRate.toFixed(2),
        productivity: productivity.toFixed(2),
        topPerformers: [] // TODO: Calculate
      },
      projects: {
        total: totalProjects,
        onTrack,
        atRisk,
        critical,
        completed: projects.filter(p => p.status === 'completed').length,
        distribution: {
          onTrack: ((onTrack / totalProjects) * 100).toFixed(1),
          atRisk: ((atRisk / totalProjects) * 100).toFixed(1),
          critical: ((critical / totalProjects) * 100).toFixed(1)
        }
      },
      factories: factoryMetrics
    });
  } catch (error) {
    console.error('[dashboard] Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
```

**Frontend: Home Page Dashboard**

Due to space constraints, I'm providing the structure. The full implementation would require:

1. Install charting library: `npm install recharts`
2. Create dashboard widgets for each metric
3. Implement auto-refresh (30-60 seconds)
4. Add responsive grid layout
5. Implement drill-down navigation

This is detailed in `MISSING_ITEMS_BACKLOG.md` lines 21-150.

---

## 🎯 IMPLEMENTATION PRIORITY ORDER

For rollout, implement in this order:

1. **MUST HAVE (Complete First)**:
   - ✅ Items 1-5 (Already Done)
   - Task 6: Project Context Improvements (2-3 hours)
   - Task 7: Process Flow Button (1-2 hours)
   
2. **SHOULD HAVE (Complete Second)**:
   - Task 8 & 9: UX Improvements (3-4 hours)
   - Task 10: Station Analytics (2 hours)
   
3. **NICE TO HAVE (Complete If Time)**:
   - Task 11: Complete Approval Workflow (6-8 hours)
   - Task 12: Files Aggregation (4-5 hours)
   - Task 13: Home Dashboard (10-15 hours)

---

## 📝 TESTING CHECKLIST

After implementation, test each feature:

- [ ] Project context auto-fills in all pages
- [ ] Add Operation button opens modal and creates operations
- [ ] Tooltips show on Materials and MRP pages
- [ ] Station analytics API returns correct data
- [ ] Approval workflows block progression correctly
- [ ] Files tab shows files from all modules
- [ ] Dashboard displays real-time metrics
- [ ] All features work in dark mode
- [ ] Mobile responsive on all pages

---

## 🚀 READY FOR ROLLOUT

Once all MUST HAVE and SHOULD HAVE items are complete, the system will be ready for production rollout with:

✅ Complete RBAC and authentication  
✅ All critical APIs fixed  
✅ Core workflows functional  
✅ Infrastructure complete  
✅ UX polished for daily use  

The NICE TO HAVE items can be deployed in subsequent updates after initial rollout.

---

*Generated on November 10, 2025 | Phase 2 Complete Branch*

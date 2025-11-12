# Contextual Task & Reminder System - Usage Guide

## Overview
The new contextual task/reminder system allows users to create tasks and reminders **directly from any workflow context** with automatic linking back to the exact location.

## Key Features

### ✅ Context Preservation
- Every task/reminder stores its origin (process, operation, workflow, etc.)
- Automatically includes navigation URL
- Shows context in the central Tasks & Reminders hub
- One-click navigation back to exact location

### ✅ Universal Integration
Can be added to ANY module:
- Production Processes & Operations
- Workflow Steps
- Compliance Items
- Pre-Production Tasks
- Planning Items
- Materials & MRP
- Quality Control Checks
- And more...

## Implementation Examples

### 1. In Production Process Operations

```tsx
// web/src/pages/projects/tabs/SomeProcessTab.tsx
import ContextualTaskReminder from '../../../components/ContextualTaskReminder';

// Inside your operation/step component:
<div className="operation-card">
  <h3>Cover Cutting</h3>
  <p>Assembly Workstation 6</p>
  
  {/* Add Task/Reminder Button */}
  <ContextualTaskReminder
    context={{
      module: 'process-operation',
      projectId: project.id,
      processId: 'notebook-production',
      operationId: 'OP-CUT-NOTE-001',
      contextUrl: `/projects/${project.id}/process/${processId}/operation/${operationId}`,
      contextTitle: 'Cover Cutting - Assembly Workstation 6',
      contextDescription: 'Corporate Notebook Production Process',
    }}
    trigger="icon"  // or "button"
    size="sm"       // or "md" or "lg"
  />
</div>
```

### 2. In Workflow Steps

```tsx
// web/src/pages/projects/tabs/WorkflowTab.tsx
import ContextualTaskReminder from '../../../components/ContextualTaskReminder';

<div className="workflow-step">
  <h4>Material Inspection</h4>
  
  <ContextualTaskReminder
    context={{
      module: 'workflow-step',
      projectId: project.id,
      flowId: flow.id,
      stageId: stage.id,
      contextUrl: `/projects/${project.id}/workflow/${flow.id}/stage/${stage.id}`,
      contextTitle: `${flow.name} - ${stage.name}`,
      contextDescription: 'Material inspection and quality check',
    }}
    trigger="button"
    size="md"
  />
</div>
```

### 3. In Compliance Documents

```tsx
// web/src/pages/projects/tabs/ComplianceTab.tsx
import ContextualTaskReminder from '../../../components/ContextualTaskReminder';

<div className="compliance-item">
  <h4>Safety Certificate</h4>
  <p>Status: Pending Review</p>
  
  <ContextualTaskReminder
    context={{
      module: 'compliance',
      projectId: project.id,
      contextUrl: `/projects/${project.id}/compliance/${complianceId}`,
      contextTitle: 'Safety Certificate - Pending Review',
      contextDescription: 'ISO 9001 compliance documentation',
    }}
    trigger="button"
  />
</div>
```

### 4. In Planning Items

```tsx
// web/src/pages/projects/tabs/PlanningTab.tsx
import ContextualTaskReminder from '../../../components/ContextualTaskReminder';

<div className="planning-item">
  <h4>Material Procurement</h4>
  <p>Due: 2025-12-01</p>
  
  <ContextualTaskReminder
    context={{
      module: 'planning',
      projectId: project.id,
      contextUrl: `/projects/${project.id}/planning/${planId}`,
      contextTitle: 'Material Procurement Plan',
      contextDescription: 'Q4 2025 notebook materials',
    }}
    trigger="icon"
    size="sm"
  />
</div>
```

## User Experience Flow

### Creating a Contextual Task/Reminder:

1. **User navigates** to specific process/operation/workflow
2. **Sees issue** or needs to track something
3. **Clicks "Task/Reminder"** button
4. **Modal shows** context automatically filled in
5. **Fills** task/reminder details
6. **Submits** and continues working

### Viewing from Central Hub:

1. **User opens** Tasks & Reminders page
2. **Sees** all tasks/reminders with context displayed
3. **Context shows:**
   - "📍 Context: Cover Cutting - Assembly Workstation 6"
   - "🔗 Go to context" link
4. **Clicks link** → Navigates directly to exact location

## Benefits

### For Users:
- ✅ No need to remember where task/reminder is for
- ✅ One-click navigation to exact location
- ✅ Full context visible in central hub
- ✅ Can create tasks/reminders without leaving workflow

### For Managers:
- ✅ See which processes have issues/tasks
- ✅ Track task/reminder density per process
- ✅ Better visibility into bottlenecks
- ✅ Audit trail of concerns raised

### For System:
- ✅ Consistent UX across all modules
- ✅ Reusable component
- ✅ Automatic context preservation
- ✅ Works like notifications (familiar pattern)

## Next Steps to Complete Implementation

### Priority 1: Add to Main Process Views
1. ✅ Created `ContextualTaskReminder` component
2. ✅ Updated Tasks & Reminders hub to show context
3. ⏳ Add to Workflow Operations (Board tab)
4. ⏳ Add to Process Flow view
5. ⏳ Add to Pre-Production tasks

### Priority 2: Add to Supporting Modules
6. ⏳ Add to Compliance items
7. ⏳ Add to Planning items
8. ⏳ Add to Materials/MRP
9. ⏳ Add to Quality Control

### Priority 3: Enhancement
10. ⏳ Add task/reminder count badges on process cards
11. ⏳ Add filtering by process/operation in central hub
12. ⏳ Add bulk operations (complete all tasks for a process)
13. ⏳ Add analytics (most tasks per process)

## Example: Full Integration in Process View

```tsx
// Complete example for a production process operations view
import React from 'react';
import ContextualTaskReminder from '../../../components/ContextualTaskReminder';
import { useProjectContext } from '../ProjectContext';

export default function ProcessOperationsView({ process }) {
  const project = useProjectContext();
  
  return (
    <div className="process-operations">
      <div className="process-header">
        <h2>{process.name}</h2>
        <p>{process.description}</p>
      </div>
      
      <div className="operations-list">
        {process.operations.map((operation) => (
          <div key={operation.id} className="operation-card">
            <div className="operation-header">
              <div>
                <h3>{operation.name}</h3>
                <span className="badge">{operation.status}</span>
              </div>
              
              {/* Contextual Task/Reminder for this specific operation */}
              <ContextualTaskReminder
                context={{
                  module: 'process-operation',
                  projectId: project.id,
                  processId: process.id,
                  operationId: operation.id,
                  contextUrl: `/projects/${project.id}/process/${process.id}/operation/${operation.id}`,
                  contextTitle: `${operation.name} - ${operation.station}`,
                  contextDescription: `${process.name} - ${project.name}`,
                }}
                trigger="button"
                size="sm"
              />
            </div>
            
            <div className="operation-details">
              <p>Station: {operation.station}</p>
              <p>Time: {operation.time}</p>
              <p>Output: {operation.output}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Technical Details

### Context Object Structure
```typescript
{
  module: string;           // Module identifier
  projectId?: number;       // Project ID if applicable
  processId?: string;       // Process ID if applicable
  operationId?: string;     // Operation ID if applicable
  flowId?: string;          // Workflow ID if applicable
  stageId?: string;         // Stage ID if applicable
  contextUrl: string;       // REQUIRED: Full URL to navigate back
  contextTitle: string;     // REQUIRED: Human-readable title
  contextDescription?: string; // Optional additional context
}
```

### Storage
- **Tasks**: Context stored in `tags` array as strings
- **Reminders**: Context embedded in `description` with special formatting
- Both preserve the `contextUrl` for navigation

### Navigation
- Uses standard `<a href>` for navigation (works with TanStack Router)
- Can be enhanced with router navigation if needed
- Opens in same tab by default

// api/services/workflowStatusService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get or create workflow status for a project
 */
async function getWorkflowStatus(projectId) {
  let workflow = await prisma.projectWorkflowStatus.findUnique({
    where: { projectId },
    include: {
      Project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true
        }
      }
    }
  });

  if (!workflow) {
    workflow = await prisma.projectWorkflowStatus.create({
      data: { projectId },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true
          }
        }
      }
    });
  }

  return workflow;
}

/**
 * Auto-calculate and update workflow completion status
 */
async function updateWorkflowStatus(projectId) {
  // Get all required data
  const [processFlows, bomComponents, costing, project, molds, trials] = await Promise.all([
    // Process Flow check
    prisma.processFlow.findMany({
      where: { projectId, status: 'active' },
      include: { operations: true }
    }),
    
    // BOM check
    prisma.productComponent.count({
      where: { projectId, isActive: true }
    }),
    
    // Costing check
    prisma.projectCosting.findFirst({
      where: { projectId, status: 'approved' }
    }),
    
    // Project details (for PO info)
    prisma.project.findUnique({
      where: { id: projectId }
    }),

    // Molds check
    prisma.moldMaster.count({
      where: { projectId }
    }),

    // Trials check
    prisma.trial.count({
      where: { 
        projectId,
        status: 'approved'
      }
    })
  ]);

  // Calculate completion status
  const processFlowComplete = processFlows.length > 0 && 
    processFlows.some(pf => pf.operations.length > 0);
  const processFlowOperationCount = processFlows.reduce(
    (sum, pf) => sum + pf.operations.length, 
    0
  );

  const bomComplete = bomComponents > 0;
  
  const moldsAssigned = molds > 0;
  
  const trialsComplete = trials > 0;

  const costingComplete = !!costing;
  const finalCostPerUnit = costing?.finalCostPerUnit || null;
  const marginPercent = costing?.marginPercent || null;
  
  const poReceived = !!project?.poNumber;
  const poNumber = project?.poNumber || null;
  const poQuantity = project?.poQuantity || null;
  const poCutoffDate = project?.poCutoffDate || null;

  // Can plan only if ALL required prerequisites met
  const canPlan = processFlowComplete && bomComplete && costingComplete && poReceived;

  // Update workflow status
  const updated = await prisma.projectWorkflowStatus.upsert({
    where: { projectId },
    update: {
      processFlowComplete,
      processFlowCompletedAt: processFlowComplete ? new Date() : null,
      processFlowOperationCount,
      
      bomComplete,
      bomCompletedAt: bomComplete ? new Date() : null,
      bomComponentCount: bomComponents,
      
      moldsAssigned,
      moldsAssignedAt: moldsAssigned ? new Date() : null,
      moldCount: molds,
      
      trialsComplete,
      trialsCompletedAt: trialsComplete ? new Date() : null,
      approvedTrialCount: trials,
      
      costingComplete,
      costingCompletedAt: costingComplete ? new Date() : null,
      finalCostPerUnit,
      marginPercent,
      
      poReceived,
      poReceivedAt: poReceived ? new Date() : null,
      poNumber,
      poQuantity,
      poCutoffDate,
      
      canPlan,
      updatedAt: new Date()
    },
    create: {
      projectId,
      processFlowComplete,
      processFlowCompletedAt: processFlowComplete ? new Date() : null,
      processFlowOperationCount,
      
      bomComplete,
      bomCompletedAt: bomComplete ? new Date() : null,
      bomComponentCount: bomComponents,
      
      moldsAssigned,
      moldsAssignedAt: moldsAssigned ? new Date() : null,
      moldCount: molds,
      
      trialsComplete,
      trialsCompletedAt: trialsComplete ? new Date() : null,
      approvedTrialCount: trials,
      
      costingComplete,
      costingCompletedAt: costingComplete ? new Date() : null,
      finalCostPerUnit,
      marginPercent,
      
      poReceived,
      poReceivedAt: poReceived ? new Date() : null,
      poNumber,
      poQuantity,
      poCutoffDate,
      
      canPlan
    },
    include: {
      Project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true
        }
      }
    }
  });

  return updated;
}

/**
 * Get workflow progress summary
 */
function getWorkflowProgress(workflow) {
  const steps = [
    {
      id: 'process-flow',
      name: 'Process Flow',
      complete: workflow.processFlowComplete,
      completedAt: workflow.processFlowCompletedAt,
      count: workflow.processFlowOperationCount,
      required: true
    },
    {
      id: 'bom',
      name: 'Bill of Materials',
      complete: workflow.bomComplete,
      completedAt: workflow.bomCompletedAt,
      count: workflow.bomComponentCount,
      required: true
    },
    {
      id: 'molds',
      name: 'Mold Assignment',
      complete: workflow.moldsAssigned,
      completedAt: workflow.moldsAssignedAt,
      count: workflow.moldCount,
      required: false // Optional
    },
    {
      id: 'trials',
      name: 'Mold Trials',
      complete: workflow.trialsComplete,
      completedAt: workflow.trialsCompletedAt,
      count: workflow.approvedTrialCount,
      required: false // Optional
    },
    {
      id: 'costing',
      name: 'Costing & Pricing',
      complete: workflow.costingComplete,
      completedAt: workflow.costingCompletedAt,
      details: workflow.costingComplete ? {
        costPerUnit: workflow.finalCostPerUnit,
        margin: workflow.marginPercent
      } : null,
      required: true
    },
    {
      id: 'po',
      name: 'Purchase Order',
      complete: workflow.poReceived,
      completedAt: workflow.poReceivedAt,
      details: workflow.poReceived ? {
        poNumber: workflow.poNumber,
        quantity: workflow.poQuantity,
        cutoffDate: workflow.poCutoffDate
      } : null,
      required: true
    }
  ];

  const totalSteps = steps.filter(s => s.required).length;
  const completedSteps = steps.filter(s => s.required && s.complete).length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return {
    steps,
    totalSteps,
    completedSteps,
    progress,
    canPlan: workflow.canPlan,
    nextStep: steps.find(s => s.required && !s.complete)
  };
}

module.exports = {
  getWorkflowStatus,
  updateWorkflowStatus,
  getWorkflowProgress
};

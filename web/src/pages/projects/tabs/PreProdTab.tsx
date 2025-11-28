// web/src/pages/projects/tabs/PreProdTab.tsx
// Pre-Production section - accessed INSIDE project as a tab
import { Box, FlaskConical, Package, FileText, Shield, GitBranch, CheckCircle, AlertTriangle, Send, Circle, Lock, ArrowRight, DollarSign, FileCheck } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectContext } from '../ProjectContext';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: any;
  isComplete: boolean;
  isLocked: boolean;
  count?: number;
  details?: any;
  required: boolean;
  completedAt?: Date | null;
}

export default function PreProdTab() {
  const project = useProjectContext();
  const [productionApproval, setProductionApproval] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;

  const projectId = project.id;

  // Fetch workflow status
  const { data: workflowData, isLoading: workflowLoading, refetch: refetchWorkflow } = useQuery({
    queryKey: ['workflow-status', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/workflow-status`);
      if (!res.ok) throw new Error('Failed to fetch workflow status');
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Check for existing production approval
  useEffect(() => {
    async function checkApproval() {
      try {
        const res = await fetch(`/api/approvals?projectId=${projectId}&approvalType=stage_gate`);
        if (!res.ok) return;
        const approvals = await res.json();
        const prodApproval = approvals.find((a: any) => a.category === 'production_readiness');
        setProductionApproval(prodApproval || null);
      } catch (error) {
        console.error('Error checking approval:', error);
      }
    }
    checkApproval();
  }, [projectId]);

  async function handleRequestProductionApproval() {
    setIsRequesting(true);
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
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
      });
      if (!res.ok) throw new Error('Failed to request approval');
      const newApproval = await res.json();
      setProductionApproval(newApproval);
      alert('Production approval requested successfully!');
    } catch (error) {
      console.error('Error requesting approval:', error);
      alert('Failed to request approval');
    } finally {
      setIsRequesting(false);
    }
  }

  // Build workflow steps from API data
  const workflow = workflowData?.workflow;
  const progress = workflowData?.progress;

  const workflowSteps: WorkflowStep[] = progress ? [
    {
      id: 'process-flow',
      name: 'Process Flow',
      description: 'Define production operations and sequence',
      route: `/preprod/process-flows?projectId=${projectId}`,
      icon: GitBranch,
      isComplete: workflow.processFlowComplete,
      isLocked: false, // Always accessible
      count: workflow.processFlowOperationCount,
      required: true,
      completedAt: workflow.processFlowCompletedAt,
    },
    {
      id: 'bom',
      name: 'Bill of Materials',
      description: 'Define product components and materials',
      route: `/preprod/bom?projectId=${projectId}`,
      icon: FileCheck,
      isComplete: workflow.bomComplete,
      isLocked: !workflow.processFlowComplete, // Requires process flow
      count: workflow.bomComponentCount,
      required: true,
      completedAt: workflow.bomCompletedAt,
    },
    {
      id: 'molds',
      name: 'Mold Assignment',
      description: 'Assign molds to this project',
      route: `/preprod/molds?projectId=${projectId}`,
      icon: Box,
      isComplete: workflow.moldsAssigned,
      isLocked: false, // Optional, can be done anytime
      count: workflow.moldCount,
      required: false,
      completedAt: workflow.moldsAssignedAt,
    },
    {
      id: 'trials',
      name: 'Mold Trials',
      description: 'Run and approve production trials',
      route: `/preprod/trials?projectId=${projectId}`,
      icon: FlaskConical,
      isComplete: workflow.trialsComplete,
      isLocked: !workflow.moldsAssigned, // Requires molds
      count: workflow.approvedTrialCount,
      required: false,
      completedAt: workflow.trialsCompletedAt,
    },
    {
      id: 'costing',
      name: 'Costing & Pricing',
      description: 'Calculate costs and set margins',
      route: `/preprod/costing?projectId=${projectId}`,
      icon: DollarSign,
      isComplete: workflow.costingComplete,
      isLocked: !workflow.processFlowComplete || !workflow.bomComplete,
      details: workflow.costingComplete ? {
        costPerUnit: workflow.finalCostPerUnit,
        margin: workflow.marginPercent
      } : null,
      required: true,
      completedAt: workflow.costingCompletedAt,
    },
    {
      id: 'po',
      name: 'Purchase Order',
      description: 'Confirm customer order',
      route: `/preprod/po?projectId=${projectId}`,
      icon: FileText,
      isComplete: workflow.poReceived,
      isLocked: !workflow.costingComplete,
      details: workflow.poReceived ? {
        poNumber: workflow.poNumber,
        quantity: workflow.poQuantity,
        cutoffDate: workflow.poCutoffDate
      } : null,
      required: true,
      completedAt: workflow.poReceivedAt,
    },
  ] : [];

  if (workflowLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading workflow status...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pre-Production Workflow
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Complete these steps in sequence before production planning
        </p>
      </div>

      {/* Progress Summary */}
      {progress && (
        <div className="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Workflow Progress
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress.completedSteps} of {progress.totalSteps} required steps completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {progress.progress}%
              </div>
              {workflow.canPlan ? (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Ready to Plan
                </div>
              ) : (
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  {progress.nextStep && `Next: ${progress.nextStep.name}`}
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Workflow Steps */}
      <div className="space-y-4">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === workflowSteps.length - 1;
          
          return (
            <div key={step.id}>
              <WorkflowStepCard
                step={step}
                sequence={index + 1}
                onClick={() => {
                  if (!step.isLocked) {
                    window.location.href = step.route;
                  }
                }}
              />
              
              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Production Readiness Section */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Production Readiness</h3>

        {workflow?.canPlan ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="text-green-600 dark:text-green-400 w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
                  ✓ Ready for Production Planning
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  All required pre-production steps are complete. You can now proceed to the Planning tab to create production schedules.
                </p>
                <Link
                  to={`/projects/${projectId}?tab=planning`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Go to Planning Tab
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2">
                  Complete Required Steps First
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                  Production planning is disabled until all required pre-production steps are completed:
                </p>
                <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                  {!workflow?.processFlowComplete && <li>• Define Process Flow</li>}
                  {!workflow?.bomComplete && <li>• Create Bill of Materials</li>}
                  {!workflow?.costingComplete && <li>• Complete Costing & Pricing</li>}
                  {!workflow?.poReceived && <li>• Add Purchase Order</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Workflow Step Card Component
function WorkflowStepCard({ 
  step, 
  sequence, 
  onClick 
}: { 
  step: WorkflowStep; 
  sequence: number; 
  onClick: () => void;
}) {
  const Icon = step.icon;
  
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg border p-6 transition-all
        ${step.isLocked 
          ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-60' 
          : 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700'
        }
        ${step.isComplete && 'border-green-300 dark:border-green-700'}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Sequence Number */}
        <div className={`
          flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold
          ${step.isComplete 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
            : step.isLocked
            ? 'bg-gray-200 dark:bg-gray-800 text-gray-400'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          }
        `}>
          {step.isComplete ? '✓' : sequence}
        </div>

        {/* Icon */}
        <div className={`
          flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg
          ${step.isComplete 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
            : step.isLocked
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          }
        `}>
          {step.isLocked ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {step.name}
                {step.required && (
                  <span className="text-xs font-normal text-red-600 dark:text-red-400">
                    (Required)
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {step.description}
              </p>

              {/* Status Info */}
              <div className="mt-3 flex items-center gap-4 text-sm">
                {step.isComplete ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </span>
                ) : step.isLocked ? (
                  <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <Lock className="h-4 w-4" />
                    Locked (complete prerequisites first)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Circle className="h-4 w-4" />
                    Pending
                  </span>
                )}

                {step.count !== undefined && step.count > 0 && (
                  <span className="text-gray-600 dark:text-gray-400">
                    {step.count} item{step.count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Additional Details */}
              {step.details && (
                <div className="mt-2 rounded bg-gray-50 dark:bg-gray-900/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                  {Object.entries(step.details).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Arrow */}
            {!step.isLocked && (
              <div className="text-blue-600 dark:text-blue-400">
                <ArrowRight className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

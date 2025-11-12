// web/src/pages/projects/tabs/ExecutionTab.tsx
// Execution section - accessed INSIDE project as a tab
import { Factory, Activity, CheckSquare, Package, BarChart3, Box, AlertTriangle, Lock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectContext } from '../ProjectContext';
import { useState, useEffect } from 'react';

export default function ExecutionTab() {
  const project = useProjectContext();
  const [productionApproved, setProductionApproved] = useState<boolean | null>(null);

  const projectId = project.id;

  // Check if production is approved
  useEffect(() => {
    async function checkProductionApproval() {
      try {
        const res = await fetch(`/api/approvals?projectId=${projectId}&approvalType=stage_gate&status=approved`);
        if (!res.ok) {
          setProductionApproved(false);
          return;
        }
        const approvals = await res.json();
        const hasApproval = approvals.some((a: any) => a.category === 'production_readiness');
        setProductionApproved(hasApproval);
      } catch (error) {
        console.error('Error checking approval:', error);
        setProductionApproved(false);
      }
    }
    checkProductionApproval();
  }, [projectId]);

  const executionCards = [
    {
      title: 'Shift Entries',
      description: 'Daily shift production entries',
      icon: Factory,
      link: `/execution/shift-entries?projectId=${projectId}`,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
    },
    {
      title: 'Workflow & Stages',
      description: 'Production workflow configuration',
      icon: Activity,
      link: `/execution/workflow?projectId=${projectId}`,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    },
    {
      title: 'QC Inspections',
      description: 'Quality control and inspections',
      icon: CheckSquare,
      link: `/execution/qc?projectId=${projectId}`,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    },
    {
      title: 'Production Entry',
      description: 'Log production outputs',
      icon: Package,
      link: `/execution/production?projectId=${projectId}`,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    },
    {
      title: 'Batch Tracking',
      description: 'Track batches and lots',
      icon: Box,
      link: `/execution/batches?projectId=${projectId}`,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
    },
    {
      title: 'Stations',
      description: 'Workstation management',
      icon: BarChart3,
      link: `/execution/stations?projectId=${projectId}`,
      color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Execution
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Production execution and workflow management for {project.name}
        </p>
      </div>

      {/* Production Approval Enforcement Banner */}
      {productionApproved === false && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Production Access Blocked
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                This project requires production approval before execution activities can begin.
                Production readiness must be verified and approved by authorized personnel.
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                → Go to the <strong>Pre-Prod</strong> tab to request production approval
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          </div>
        </div>
      )}

      {productionApproved === null && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Checking Production Approval Status...
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Verifying if this project has been approved for production execution.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {executionCards.map((card) => {
          const Icon = card.icon;
          const isBlocked = productionApproved === false;

          if (isBlocked) {
            // Disabled card when not approved
            return (
              <div
                key={card.link}
                className="block p-6 bg-gray-100 dark:bg-neutral-800/50 rounded-lg border border-gray-300 dark:border-neutral-700 opacity-60 cursor-not-allowed relative"
              >
                <Lock className="absolute top-4 right-4 h-5 w-5 text-red-500 dark:text-red-400" />
                <div className={`inline-flex p-3 rounded-lg ${card.color} mb-4 opacity-50`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {card.description}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-2">
                  Approval required
                </p>
              </div>
            );
          }

          return (
            <Link
              key={card.link}
              to={card.link as any}
              className="block p-6 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex p-3 rounded-lg ${card.color} mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

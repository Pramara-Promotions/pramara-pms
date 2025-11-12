// web/src/pages/projects/tabs/PreProdTab.tsx
// Pre-Production section - accessed INSIDE project as a tab
import { Box, FlaskConical, Package, FileText, Shield, GitBranch, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectContext } from '../ProjectContext';
import { useState, useEffect } from 'react';

export default function PreProdTab() {
  const project = useProjectContext();
  const [productionApproval, setProductionApproval] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;

  const projectId = project.id;

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

  const preprodCards = [
    {
      title: 'Molds',
      description: 'Mold inventory and management',
      icon: Box,
      link: `/preprod/molds?projectId=${projectId}`,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
    },
    {
      title: 'Trials',
      description: 'Production trials and testing',
      icon: FlaskConical,
      link: `/preprod/trials?projectId=${projectId}`,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    },
    {
      title: 'Packaging',
      description: 'Packaging specifications',
      icon: Package,
      link: `/preprod/packaging?projectId=${projectId}`,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    },
    {
      title: 'PPS (Pre-Production Sample)',
      description: 'Sample approvals and tracking',
      icon: Shield,
      link: `/preprod/pps?projectId=${projectId}`,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    },
    {
      title: 'Project Policies',
      description: 'Project-specific policies',
      icon: FileText,
      link: `/preprod/policies?projectId=${projectId}`,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
    },
    {
      title: 'Process Flows',
      description: 'Production process flows',
      icon: GitBranch,
      link: `/preprod/process-flows?projectId=${projectId}`,
      color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pre-Production
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Pre-production setup and preparation for {project.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {preprodCards.map((card) => {
          const Icon = card.icon;
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

      {/* Production Readiness Section */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Production Readiness</h3>

        {productionApproval ? (
          <div className={`p-4 rounded-lg border ${productionApproval.status === 'approved'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : productionApproval.status === 'rejected'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
            <div className="flex items-start gap-3">
              {productionApproval.status === 'approved' ? (
                <CheckCircle className="text-green-600 dark:text-green-400 w-6 h-6 flex-shrink-0 mt-0.5" />
              ) : productionApproval.status === 'rejected' ? (
                <AlertTriangle className="text-red-600 dark:text-red-400 w-6 h-6 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="text-yellow-600 dark:text-yellow-400 w-6 h-6 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {productionApproval.status === 'approved' && 'Production Approved'}
                  {productionApproval.status === 'rejected' && 'Production Approval Rejected'}
                  {productionApproval.status === 'pending' && 'Awaiting Production Approval'}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{productionApproval.description}</p>
                {productionApproval.status === 'approved' && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    ✓ You can now proceed to production execution
                  </p>
                )}
                {productionApproval.status === 'pending' && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                    ⏳ Approval request is under review
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Send className="text-blue-600 dark:text-blue-400 w-8 h-8 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Ready to Start Production?</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                  Once all pre-production activities are complete (molds, trials, PPS approval, packaging),
                  request production approval to move this project into the execution phase.
                </p>
                <button
                  onClick={handleRequestProductionApproval}
                  disabled={isRequesting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  {isRequesting ? 'Requesting...' : (
                    <>
                      <Send className="w-4 h-4" />
                      Request Production Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

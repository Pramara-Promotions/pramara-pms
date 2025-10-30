// web/src/pages/projects/tabs/PreProdTab.tsx
// Pre-Production section - accessed INSIDE project as a tab
import { Box, FlaskConical, Package, FileText, Shield, GitBranch } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectContext } from '../ProjectContext';

export default function PreProdTab() {
  const project = useProjectContext() as any;
  
  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;
  
  const projectId = project.id;
  
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
    </div>
  );
}

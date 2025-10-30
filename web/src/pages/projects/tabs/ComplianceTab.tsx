// web/src/pages/projects/tabs/ComplianceTab.tsx
// Compliance section - accessed INSIDE project as a tab
import { Shield, Award, Box, FlaskConical } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useProjectContext } from '../ProjectContext';

export default function ComplianceTab() {
  const project = useProjectContext() as any;
  
  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;
  
  const projectId = project.id;
  
  const complianceCards = [
    {
      title: 'Project Compliance',
      description: 'Compliance status for this project',
      icon: Shield,
      link: `/compliance/projects?projectId=${projectId}`,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
    },
    {
      title: 'Certifications',
      description: 'Required certifications and documents',
      icon: Award,
      link: `/compliance/certifications?projectId=${projectId}`,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    },
    {
      title: 'Material Compliance',
      description: 'Material certifications and safety',
      icon: Box,
      link: `/compliance/materials?projectId=${projectId}`,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    },
    {
      title: 'Lab Tests',
      description: 'Laboratory testing and results',
      icon: FlaskConical,
      link: `/compliance/lab-tests?projectId=${projectId}`,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    },
  ];
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Compliance
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Compliance requirements and certifications for {project.name}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {complianceCards.map((card) => {
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

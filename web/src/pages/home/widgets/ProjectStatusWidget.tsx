// Project Status Widget
import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type ProjectStatus = {
  id: number;
  name: string;
  code: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  health: 'good' | 'warning' | 'critical';
  progress: number;
  dueDate?: string;
  tasksCompleted: number;
  tasksTotal: number;
};

const ProjectStatusWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [projects, setProjects] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/projects?status=active');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getHealthStyle = (health: string) => {
    switch (health) {
      case 'good':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-300',
          icon: CheckCircle2,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: Clock,
        };
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: AlertCircle,
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          icon: TrendingUp,
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'planning':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'on-hold':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchProjects}
      onRemove={onRemove}
      allowRefresh
      allowRemove
    >
      {loading ? (
        <WidgetLoading message="Loading projects..." />
      ) : error ? (
        <WidgetError message={error} onRetry={fetchProjects} />
      ) : projects.length === 0 ? (
        <WidgetEmpty
          icon={TrendingUp}
          title="No active projects"
          message="Projects will appear here once they are created."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 max-h-96 overflow-y-auto">
          {projects.slice(0, 6).map((project) => {
            const healthStyle = getHealthStyle(project.health);
            const HealthIcon = healthStyle.icon;
            return (
              <div
                key={project.id}
                className={`p-3 rounded-lg border ${healthStyle.bg} ${healthStyle.border} hover:shadow-md transition-all cursor-pointer`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {project.code}
                    </p>
                  </div>
                  <HealthIcon className={`h-4 w-4 flex-shrink-0 ml-2 ${healthStyle.text}`} />
                </div>

                {/* Status Badge */}
                <div className="mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>
                    {project.tasksCompleted} / {project.tasksTotal} tasks
                  </span>
                  {project.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(project.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetWrapper>
  );
};

export default ProjectStatusWidget;

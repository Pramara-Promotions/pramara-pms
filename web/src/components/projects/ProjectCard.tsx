import { useState } from 'react';
import { MoreVertical, Calendar, DollarSign, Package, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';

interface ProjectHealth {
  score: number;
  status: 'healthy' | 'at-risk' | 'critical';
  attentionItemCount: number;
}

interface Project {
  id: number;
  code: string;
  name: string;
  description?: string;
  cutoffDate?: string;
  quantity?: number;
  budget?: number;
  budgetSpent?: number;
  health?: ProjectHealth;
}

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Status indicator based on health
  const getStatusConfig = () => {
    if (!project.health) {
      return { color: 'bg-gray-400', emoji: '⚪', label: 'Unknown' };
    }
    switch (project.health.status) {
      case 'healthy':
        return { color: 'bg-green-500', emoji: '🟢', label: 'Healthy' };
      case 'at-risk':
        return { color: 'bg-yellow-500', emoji: '🟡', label: 'At Risk' };
      case 'critical':
        return { color: 'bg-red-500', emoji: '🔴', label: 'Critical' };
      default:
        return { color: 'bg-gray-400', emoji: '⚪', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig();

  // Calculate progress percentages
  const timelineProgress = project.cutoffDate ? calculateTimelineProgress(project.cutoffDate) : null;
  const budgetProgress = project.budget && project.budgetSpent 
    ? (project.budgetSpent / project.budget) * 100 
    : null;

  return (
    <div
      onClick={onClick}
      className="relative bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 cursor-pointer group border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700"
    >
      {/* Gradient border effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary-500/20 via-purple-500/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusConfig.color} ring-4 ring-${statusConfig.color}/20`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </button>

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-0 top-10 z-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 min-w-[160px]">
            <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 text-sm">
              View Details
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 text-sm">
              Edit Project
            </button>
            <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 text-sm text-red-600">
              Archive
            </button>
          </div>
        )}
      </div>

      {/* Project Name & Code */}
      <div className="mb-3">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
          {project.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
          {project.code}
        </p>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Health Score (if available) */}
      {project.health && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Health Score
            </span>
            <span className={`text-lg font-bold ${
              project.health.score >= 70 
                ? 'text-green-600' 
                : project.health.score >= 50 
                ? 'text-yellow-600' 
                : 'text-red-600'
            }`}>
              {project.health.score}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                project.health.score >= 70
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : project.health.score >= 50
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-red-500 to-pink-500'
              }`}
              style={{ width: `${project.health.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline Progress */}
      {timelineProgress !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>Timeline</span>
            </div>
            <span className="text-sm font-medium">
              {timelineProgress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, timelineProgress)}%` }}
            />
          </div>
          {project.cutoffDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Due: {new Date(project.cutoffDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Budget Progress */}
      {budgetProgress !== null && project.budget && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <DollarSign className="w-4 h-4" />
              <span>Budget</span>
            </div>
            <span className="text-sm font-medium">
              {budgetProgress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                budgetProgress > 90
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : 'bg-gradient-to-r from-green-500 to-teal-500'
              }`}
              style={{ width: `${Math.min(100, budgetProgress)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ${(project.budgetSpent || 0).toLocaleString()} / ${project.budget.toLocaleString()}
          </p>
        </div>
      )}

      {/* Output Progress */}
      {project.quantity && project.quantity > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Package className="w-4 h-4" />
              <span>Output</span>
            </div>
            <span className="text-sm font-medium">
              Target: {project.quantity.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Attention Items */}
      {project.health && project.health.attentionItemCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-gray-700 dark:text-gray-300">
              {project.health.attentionItemCount} item{project.health.attentionItemCount > 1 ? 's' : ''} need attention
            </span>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Tasks</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Team</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>View Details →</span>
        </div>
      </div>
    </div>
  );
}

function calculateTimelineProgress(cutoffDate: string): number {
  const now = new Date();
  const end = new Date(cutoffDate);
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000); // Assume 90-day project

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  return (elapsed / total) * 100;
}

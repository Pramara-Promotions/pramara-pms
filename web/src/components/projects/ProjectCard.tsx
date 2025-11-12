import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Calendar, DollarSign, Package, CheckCircle, AlertCircle, TrendingUp, Users, Activity, Target, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

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

type VisualizationType = 'progress-bars' | 'pie-chart' | 'radial-chart' | 'heat-map' | 'pulse-animation';

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [currentViz, setCurrentViz] = useState<VisualizationType>('progress-bars');
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Auto-rotate visualizations every 5-7 seconds
  useEffect(() => {
    if (isPaused) return;

    const vizTypes: VisualizationType[] = ['progress-bars', 'pie-chart', 'radial-chart', 'heat-map', 'pulse-animation'];
    const randomDelay = 5000 + Math.random() * 2000; // 5-7 seconds

    timerRef.current = setTimeout(() => {
      const currentIndex = vizTypes.indexOf(currentViz);
      const nextIndex = (currentIndex + 1) % vizTypes.length;
      setCurrentViz(vizTypes[nextIndex]);
    }, randomDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentViz, isPaused]);

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
  const healthScore = project.health?.score || 0;

  // Prepare data for different visualizations
  const pieData = [
    { name: 'Health', value: healthScore, color: '#10b981' },
    { name: 'Timeline', value: timelineProgress || 0, color: '#3b82f6' },
    { name: 'Budget', value: budgetProgress || 0, color: '#8b5cf6' },
  ];

  const radialData = [
    {
      name: 'Health',
      value: healthScore,
      fill: healthScore >= 70 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444',
    },
    {
      name: 'Timeline',
      value: timelineProgress || 0,
      fill: '#3b82f6',
    },
    {
      name: 'Budget',
      value: budgetProgress || 0,
      fill: budgetProgress && budgetProgress > 90 ? '#ef4444' : '#8b5cf6',
    },
  ];

  // Heat map cells for critical metrics
  const heatMapData = [
    { label: 'Health', value: healthScore, max: 100 },
    { label: 'Timeline', value: timelineProgress || 0, max: 100 },
    { label: 'Budget', value: budgetProgress || 0, max: 100 },
    { label: 'Attention', value: project.health?.attentionItemCount || 0, max: 10 },
  ];

  const getHeatColor = (value: number, max: number) => {
    const ratio = value / max;
    if (ratio < 0.3) return 'bg-red-500';
    if (ratio < 0.5) return 'bg-orange-500';
    if (ratio < 0.7) return 'bg-yellow-500';
    if (ratio < 0.9) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  // Render different visualization types
  const renderVisualization = () => {
    switch (currentViz) {
      case 'progress-bars':
        return (
          <div className="space-y-4 transition-all duration-500">
            {/* Health Score */}
            {project.health && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Health Score
                  </span>
                  <span className={`text-lg font-bold ${healthScore >= 70 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {healthScore}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${healthScore >= 70
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : healthScore >= 50
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>
            )}

            {/* Timeline Progress */}
            {timelineProgress !== null && (
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>Timeline</span>
                  </div>
                  <span className="text-sm font-medium">{timelineProgress.toFixed(0)}%</span>
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
              <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <DollarSign className="w-4 h-4" />
                    <span>Budget</span>
                  </div>
                  <span className="text-sm font-medium">{budgetProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${budgetProgress > 90
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
          </div>
        );

      case 'pie-chart':
        return (
          <div className="h-48 animate-fade-in">
            <ResponsiveContainer width="100%" height={180} minWidth={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Health {healthScore}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Timeline {(timelineProgress || 0).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">Budget {(budgetProgress || 0).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        );

      case 'radial-chart':
        return (
          <div className="h-48 animate-fade-in">
            <ResponsiveContainer width="100%" height={180} minWidth={200}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="90%"
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                  animationDuration={1000}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{healthScore}%</div>
                <div className="text-gray-500">Health</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{(timelineProgress || 0).toFixed(0)}%</div>
                <div className="text-gray-500">Timeline</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{(budgetProgress || 0).toFixed(0)}%</div>
                <div className="text-gray-500">Budget</div>
              </div>
            </div>
          </div>
        );

      case 'heat-map':
        return (
          <div className="space-y-2 animate-fade-in">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Critical Metrics Heat Map
            </div>
            <div className="grid grid-cols-2 gap-3">
              {heatMapData.map((item, idx) => (
                <div
                  key={idx}
                  className={`relative overflow-hidden rounded-lg p-4 transition-all duration-500 ${getHeatColor(item.value, item.max)} bg-opacity-80 hover:bg-opacity-100`}
                  style={{
                    animationDelay: `${idx * 100}ms`,
                  }}
                >
                  <div className="relative z-10">
                    <div className="text-xs font-medium text-white opacity-90">{item.label}</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {item.label === 'Attention' ? item.value : `${item.value.toFixed(0)}%`}
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 bg-white opacity-20"
                    style={{
                      clipPath: `polygon(0 ${100 - (item.value / item.max) * 100}%, 100% ${100 - (item.value / item.max) * 100}%, 100% 100%, 0 100%)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'pulse-animation':
        return (
          <div className="h-48 flex items-center justify-center animate-fade-in">
            <div className="relative">
              {/* Pulsing circles */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-primary-500 opacity-20 animate-ping" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary-500 opacity-40 animate-pulse" />
              </div>

              {/* Center content */}
              <div className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex flex-col items-center justify-center shadow-2xl">
                <Zap className="w-8 h-8 text-white mb-2 animate-bounce" />
                <div className="text-3xl font-bold text-white">{healthScore}</div>
                <div className="text-xs text-white opacity-80">Health Score</div>
              </div>
            </div>

            {/* Floating metrics */}
            <div className="absolute top-4 right-4 bg-blue-500 rounded-lg px-3 py-2 shadow-lg animate-float">
              <div className="text-xs text-white opacity-80">Timeline</div>
              <div className="text-lg font-bold text-white">{(timelineProgress || 0).toFixed(0)}%</div>
            </div>

            <div className="absolute bottom-4 left-4 bg-purple-500 rounded-lg px-3 py-2 shadow-lg animate-float-delayed">
              <div className="text-xs text-white opacity-80">Budget</div>
              <div className="text-lg font-bold text-white">{(budgetProgress || 0).toFixed(0)}%</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
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

      {/* Dynamic Rotating Visualizations */}
      <div className="mb-4 min-h-[200px] relative">
        {renderVisualization()}
      </div>

      {/* Visualization Indicator Dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {['progress-bars', 'pie-chart', 'radial-chart', 'heat-map', 'pulse-animation'].map((viz) => (
          <button
            key={viz}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentViz(viz as VisualizationType);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 2000);
            }}
            className={`transition-all duration-300 rounded-full ${currentViz === viz
              ? 'bg-primary-500 w-6 h-2'
              : 'bg-gray-300 dark:bg-gray-600 hover:bg-primary-300 w-2 h-2'
              }`}
            title={viz.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          />
        ))}
      </div>

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

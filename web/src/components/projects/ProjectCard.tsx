import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Calendar, DollarSign, Package, CheckCircle, AlertCircle, TrendingUp, Users, Activity, Target, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

interface ProjectHealth {
  score: number;
  status: 'healthy' | 'at-risk' | 'critical';
  attentionItemCount: number;
  output?: {
    target: number;
    produced: number;
    remaining: number;
    percentComplete: number;
    status: string;
  };
  quality?: {
    totalProduced: number;
    totalGood: number;
    totalRejected: number;
    passRate: number;
    defectRate: number;
    status: string;
  };
  taskProgress?: {
    total: number;
    completed: number;
    inProgress: number;
    percentComplete: number;
  };
  timeline?: {
    percentComplete?: number;
    daysRemaining?: number | null;
    status?: string;
  };
  budget?: {
    total?: number;
    spent?: number;
    percentUsed?: number;
    status?: string;
  };
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
  snapshot?: {
    documents?: { count: number };
    throughput7d?: number;
    throughputTrend?: { date: string; output: number }[];
    tasks?: { total: number; atRisk: number };
    nextStage?: { id: string; name: string; status: string; startDate?: string | null; endDate?: string | null; sequence: number } | null;
  };
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
  const vizOrderRef = useRef<VisualizationType[]>([]);

  const VIZ_TYPES: VisualizationType[] = ['progress-bars', 'pie-chart', 'radial-chart', 'heat-map', 'pulse-animation'];
  const shuffle = (arr: VisualizationType[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Initialize randomized visualization order per card
  useEffect(() => {
    if (vizOrderRef.current.length === 0) {
      vizOrderRef.current = shuffle([...VIZ_TYPES]);
      setCurrentViz(vizOrderRef.current[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-rotate visualizations every 5-7 seconds
  useEffect(() => {
    if (isPaused) return;
    const order = vizOrderRef.current.length ? vizOrderRef.current : VIZ_TYPES;
    const randomDelay = 4000 + Math.random() * 4000; // 4-8 seconds
    timerRef.current = setTimeout(() => {
      const currentIndex = order.indexOf(currentViz);
      const nextIndex = (currentIndex + 1) % order.length;
      setCurrentViz(order[nextIndex]);
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

  // Extract real production metrics
  const healthScore = project.health?.score || 0;
  const productionProgress = project.health?.output?.percentComplete || 0;
  const qualityPassRate = project.health?.quality?.passRate || 100;
  const processProgress = project.health?.taskProgress?.percentComplete || 0;
  
  // Defect/rejection percentage
  const rejectionRate = project.health?.quality?.defectRate || 0;
  const totalProduced = project.health?.output?.produced || 0;
  const targetQty = project.health?.output?.target || project.quantity || 0;
  const docsCount = project.snapshot?.documents?.count || 0;
  const throughput7d = project.snapshot?.throughput7d || 0;
  const throughputTrend = project.snapshot?.throughputTrend || [];
  const tasksTotal = project.snapshot?.tasks?.total ?? project.health?.taskProgress?.total ?? 0;
  const tasksCompleted = project.health?.taskProgress?.completed ?? 0;

  // ---- Diversified Metric Sets (moved earlier to avoid temporal dead zone) ----
  type MetricItem = { key: string; label: string; value: number; unit?: string; severity?: 'good'|'warn'|'bad'|'info' };
  const metricSets: MetricItem[][] = [];
  metricSets.push([
    { key: 'production', label: 'Production', value: productionProgress, unit: '%', severity: productionProgress >= 75 ? 'good' : productionProgress >= 50 ? 'warn' : 'bad' },
    { key: 'quality', label: 'Quality Pass', value: qualityPassRate, unit: '%', severity: qualityPassRate >= 95 ? 'good' : qualityPassRate >= 90 ? 'warn' : 'bad' },
    { key: 'process', label: 'Process Steps', value: processProgress, unit: '%', severity: processProgress >= 75 ? 'good' : processProgress >= 50 ? 'warn' : 'bad' }
  ]);
  metricSets.push([
    { key: 'reject', label: 'Rejection', value: rejectionRate, unit: '%', severity: rejectionRate < 5 ? 'good' : rejectionRate < 10 ? 'warn' : 'bad' },
    { key: 'attention', label: 'Attention', value: project.health?.attentionItemCount || 0, unit: '', severity: (project.health?.attentionItemCount || 0) === 0 ? 'good' : (project.health?.attentionItemCount || 0) < 3 ? 'warn' : 'bad' },
    { key: 'tasks', label: 'Tasks Done', value: project.health?.taskProgress?.percentComplete || 0, unit: '%', severity: (project.health?.taskProgress?.percentComplete || 0) >= 75 ? 'good' : (project.health?.taskProgress?.percentComplete || 0) >= 50 ? 'warn' : 'bad' }
  ]);
  metricSets.push([
    { key: 'budget', label: 'Budget Used', value: project.health?.budget?.percentUsed || 0, unit: '%', severity: (project.health?.budget?.percentUsed || 0) <= 90 ? 'good' : (project.health?.budget?.percentUsed || 0) <= 100 ? 'warn' : 'bad' },
    { key: 'timeline', label: 'Timeline', value: project.health?.timeline?.percentComplete || 0, unit: '%', severity: project.health?.timeline?.status === 'overdue' ? 'bad' : (project.health?.timeline?.daysRemaining || 999) < 7 ? 'warn' : 'good' },
    { key: 'docs', label: 'Docs', value: docsCount, unit: '', severity: docsCount > 0 ? 'info' : 'warn' }
  ]);
  metricSets.push([
    { key: 'health', label: 'Health Score', value: healthScore, unit: '', severity: healthScore >= 70 ? 'good' : healthScore >= 50 ? 'warn' : 'bad' },
    { key: 'throughput7d', label: '7d Output', value: throughput7d, unit: '', severity: throughput7d > 0 ? 'info' : 'warn' },
    { key: 'defect', label: 'Defect Rate', value: project.health?.quality?.defectRate || 0, unit: '%', severity: (project.health?.quality?.defectRate || 0) < 5 ? 'good' : (project.health?.quality?.defectRate || 0) < 10 ? 'warn' : 'bad' }
  ]);
  const shuffledMetricSetsRef = useRef<MetricItem[][]>([]);
  if (shuffledMetricSetsRef.current.length === 0) {
    const copy = [...metricSets];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    shuffledMetricSetsRef.current = copy;
  }
  const [metricSetIndex, setMetricSetIndex] = useState(0);

  // Advance metric set whenever visualization changes (kept here after refs are initialized)
  useEffect(() => {
    if (!shuffledMetricSetsRef.current.length) return;
    setMetricSetIndex((prev) => (prev + 1) % shuffledMetricSetsRef.current.length);
  }, [currentViz]);

  // Prepare data for different visualizations
  const currentMetricSet = shuffledMetricSetsRef.current[metricSetIndex] || [];
  const pieData = currentMetricSet.map(m => ({ name: m.label, value: m.value, color: m.severity === 'good' ? '#10b981' : m.severity === 'warn' ? '#f59e0b' : m.severity === 'bad' ? '#ef4444' : '#3b82f6' }));
  const radialData = currentMetricSet.map(m => ({ name: m.label, value: m.value, fill: m.severity === 'good' ? '#10b981' : m.severity === 'warn' ? '#f59e0b' : m.severity === 'bad' ? '#ef4444' : '#3b82f6' }));

  // Heat map cells for critical metrics
  const heatMapData = [
    { label: 'Prod', value: productionProgress, max: 100 },
    { label: 'Qual', value: qualityPassRate, max: 100 },
    { label: 'Proc', value: processProgress, max: 100 },
    { label: 'Reject', value: rejectionRate, max: 10 },
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
            {currentMetricSet.map((m, idx) => (
              <div key={m.key} className="animate-fade-in" style={{ animationDelay: `${idx * 120}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {idx === 0 && <Package className="w-4 h-4" />}
                    {idx === 1 && <CheckCircle className="w-4 h-4" />}
                    {idx === 2 && <Target className="w-4 h-4" />}
                    {m.label}
                  </span>
                  <span className={clsx('text-sm font-bold',
                    m.severity === 'good' && 'text-green-600',
                    m.severity === 'warn' && 'text-yellow-600',
                    m.severity === 'bad' && 'text-red-600',
                    m.severity === 'info' && 'text-blue-600'
                  )}>
                    {m.value.toFixed(1)}{m.unit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={clsx('h-2 rounded-full transition-all duration-500',
                      m.severity === 'good' && 'bg-gradient-to-r from-green-500 to-emerald-500',
                      m.severity === 'warn' && 'bg-gradient-to-r from-yellow-500 to-orange-500',
                      m.severity === 'bad' && 'bg-gradient-to-r from-red-500 to-pink-500',
                      m.severity === 'info' && 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    )}
                    style={{ width: `${Math.min(100, m.value)}%` }}
                  />
                </div>
                {m.key === 'reject' && m.value > 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {m.value.toFixed(1)}% Rejection
                  </p>
                )}
              </div>
            ))}
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
              {currentMetricSet.map(m => (
                <div key={m.key} className="flex items-center gap-1">
                  <div className={clsx('w-3 h-3 rounded-full',
                    m.severity === 'good' && 'bg-green-500',
                    m.severity === 'warn' && 'bg-yellow-500',
                    m.severity === 'bad' && 'bg-red-500',
                    m.severity === 'info' && 'bg-blue-500'
                  )} />
                  <span className="text-gray-600 dark:text-gray-400">{m.label} {m.value.toFixed(0)}{m.unit}</span>
                </div>
              ))}
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
              {currentMetricSet.map(m => (
                <div key={m.key}>
                  <div className="font-semibold text-gray-900 dark:text-white">{m.value.toFixed(0)}{m.unit}</div>
                  <div className="text-gray-500 truncate" title={m.label}>{m.label}</div>
                </div>
              ))}
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
            <div className="absolute top-4 right-4 bg-green-500 rounded-lg px-3 py-2 shadow-lg animate-float">
              <div className="text-xs text-white opacity-80">Production</div>
              <div className="text-lg font-bold text-white">{productionProgress.toFixed(0)}%</div>
            </div>

            <div className="absolute bottom-4 left-4 bg-blue-500 rounded-lg px-3 py-2 shadow-lg animate-float-delayed">
              <div className="text-xs text-white opacity-80">Quality</div>
              <div className="text-lg font-bold text-white">{qualityPassRate.toFixed(0)}%</div>
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

      {/* Mini throughput sparkline (last 7 days) */}
      {throughputTrend.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>7-day Throughput</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{throughput7d.toLocaleString()} units</span>
          </div>
          <div className="flex items-end gap-1 h-10">
            {throughputTrend.map((t, idx) => {
              const max = Math.max(...throughputTrend.map(x => x.output || 0)) || 1;
              const h = Math.max(2, Math.round((t.output / max) * 36));
              return (
                <div key={idx} className="flex-1 bg-gray-200 dark:bg-slate-700 rounded">
                  <div className="bg-emerald-500 rounded" style={{ height: `${h}px` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

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
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          <span>Tasks {tasksCompleted}/{tasksTotal}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>Docs {docsCount}</span>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <TrendingUp className="w-3 h-3" />
          <span>7d {throughput7d.toLocaleString()}</span>
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

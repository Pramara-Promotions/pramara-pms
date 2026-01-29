// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { http } from '../../lib/http';

// Custom Tooltip Components
const QualityTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '4px', border: '1px solid #888' }}>
        <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>
          <strong>{data.result}:</strong> {data.count} submissions
        </p>
      </div>
    );
  }
  return null;
};

const ProjectsTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '4px', border: '1px solid #888' }}>
        <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>
          <strong>{data.status}:</strong> {data.value} projects
        </p>
      </div>
    );
  }
  return null;
};
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  ArrowRight,
  Activity,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

type Project = { 
  id: number; 
  name: string; 
  code: string;
  status?: string;
  dueDate?: string;
  health?: 'good' | 'warning' | 'critical';
};

type ActionItem = {
  id: string;
  title: string;
  type: 'approval' | 'overdue' | 'review' | 'info';
  priority: 'critical' | 'high' | 'medium' | 'low';
  project?: string;
  dueDate?: string;
  blockedTasks?: number;
};

type DashboardOverview = {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  production: {
    totalOutput: number;
    approved: number;
    rejected: number;
    entries: number;
    trend: Array<{ date: string; output: number; approved: number }>;
  };
  quality: {
    totalSubmissions: number;
    totalChecked: number;
    totalPassed: number;
    totalFailed: number;
    passRate: number;
    byResult: Array<{ result: string; count: number }>;
  };
  workforce: {
    activeToday: number;
    byShift: Array<{ shift: string; workers: number; output: number; avgEfficiency: number }>;
    topPerformers: Array<{ operatorId: number; operatorName: string; totalOutput: number }>;
  };
  projects: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
  };
};

async function getProjects() {
  const res = await http('/api/projects');
  if (!res.ok) return [] as any[];
  return res.json();
}

async function getActionItems(): Promise<ActionItem[]> {
  try {
    const res = await http('/api/dashboard/action-items');
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getDashboardOverview(days = 30): Promise<DashboardOverview | null> {
  try {
    const res = await http(`/api/dashboard/overview?days=${days}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dashboardVisibleCards');
      return saved ? new Set(JSON.parse(saved)) : new Set(['production', 'quality', 'workforce', 'projects']);
    } catch {
      return new Set(['production', 'quality', 'workforce', 'projects']);
    }
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [projectData, actionsData] = await Promise.all([
          getProjects(),
          getActionItems()
        ]);
        setProjects(Array.isArray(projectData) ? projectData : []);
        setActionItems(Array.isArray(actionsData) ? actionsData : []);
      } catch {
        setProjects([]);
        setActionItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setAnalyticsLoading(true);
        const data = await getDashboardOverview(30);
        setDashboardData(data);
      } catch {
        setDashboardData(null);
      } finally {
        setAnalyticsLoading(false);
      }
    })();

    // Auto-refresh every 60 seconds
    const interval = setInterval(async () => {
      const data = await getDashboardOverview(30);
      setDashboardData(data);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const recent = useMemo(() => projects.slice(0, 6), [projects]);
  const criticalItems = useMemo(
    () => actionItems.filter(item => item.priority === 'critical' || item.priority === 'high'),
    [actionItems]
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const toggleCard = (cardId: string) => {
    const newVisible = new Set(visibleCards);
    if (newVisible.has(cardId)) {
      newVisible.delete(cardId);
    } else {
      newVisible.add(cardId);
    }
    setVisibleCards(newVisible);
  };

  const saveView = () => {
    localStorage.setItem('dashboardVisibleCards', JSON.stringify(Array.from(visibleCards)));
    setShowCustomize(false);
  };

  const restoreDefault = () => {
    const defaultCards = new Set(['production', 'quality', 'workforce', 'projects']);
    setVisibleCards(defaultCards);
    localStorage.setItem('dashboardVisibleCards', JSON.stringify(Array.from(defaultCards)));
    setShowCustomize(false);
  };

  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', label: 'Critical' };
      case 'high':
        return { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', label: 'High' };
      case 'medium':
        return { icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20', label: 'Medium' };
      default:
        return { icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', label: 'Low' };
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-indigo-950'>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs text-gray-500 dark:text-gray-400'>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <h1 className='text-2xl font-semibold mt-1 text-gray-900 dark:text-white'>
              {getGreeting()}!
            </h1>
          </div>
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium'
          >
            {showCustomize ? 'Close' : 'Customize View'}
          </button>
        </div>

        {showCustomize && (
          <div className='bg-white dark:bg-neutral-800 rounded-xl border-2 border-blue-200 dark:border-blue-900/50 p-6'>
            <h2 className='font-semibold text-lg text-gray-900 dark:text-white mb-4'>Customize Dashboard View</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
              {[
                { id: 'production', label: 'Production', icon: BarChart3 },
                { id: 'quality', label: 'Quality', icon: CheckCircle2 },
                { id: 'workforce', label: 'Workforce', icon: Users },
                { id: 'projects', label: 'Projects', icon: FileText }
              ].map(card => (
                <label key={card.id} className='flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'>
                  <input
                    type='checkbox'
                    checked={visibleCards.has(card.id)}
                    onChange={() => toggleCard(card.id)}
                    className='w-5 h-5 rounded accent-blue-600'
                  />
                  <card.icon className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <span className='text-gray-700 dark:text-gray-300 font-medium'>{card.label}</span>
                </label>
              ))}
            </div>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={restoreDefault}
                className='px-4 py-2 border-2 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors font-medium'
              >
                Restore to Default
              </button>
              <button
                onClick={saveView}
                className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium'
              >
                Save as My Default View
              </button>
            </div>
          </div>
        )}

      {criticalItems.length > 0 && (
        <div className='rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <AlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
            <h2 className='font-semibold text-red-900 dark:text-red-100'>
              Needs Immediate Attention ({criticalItems.length})
            </h2>
          </div>
          <div className='space-y-2'>
            {criticalItems.slice(0, 3).map((item) => {
              const display = getPriorityDisplay(item.priority);
              const Icon = display.icon;
              return (
                <div
                  key={item.id}
                  className='bg-white dark:bg-neutral-800 rounded-lg p-3 flex items-start justify-between gap-3 hover:shadow-md transition-shadow'
                >
                  <div className='flex items-start gap-3 flex-1'>
                    <div className={'p-2 rounded-lg ' + display.color}>
                      <Icon className='h-4 w-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-medium text-gray-900 dark:text-white text-sm'>
                        {item.title}
                      </h3>
                      {item.project && (
                        <p className='text-xs text-gray-600 dark:text-gray-400 mt-0.5'>
                          {item.project}
                        </p>
                      )}
                      {item.blockedTasks && item.blockedTasks > 0 && (
                        <p className='text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1'>
                          <AlertTriangle className='h-3 w-3' />
                          Blocking {item.blockedTasks} task{item.blockedTasks > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <button className='flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap'>
                    Take Action
                    <ArrowRight className='h-3 w-3' />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800'>
          <div className='flex items-center justify-between p-4 border-b dark:border-neutral-800'>
            <h2 className='font-semibold text-gray-900 dark:text-white'>My Work</h2>
            <div className='flex items-center gap-2'>
              <span className='text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'>
                {actionItems.length} items
              </span>
            </div>
          </div>
          <div className='divide-y dark:divide-neutral-800'>
            {loading ? (
              <div className='p-4 text-sm text-gray-500 dark:text-gray-400'>
                Loading your work...
              </div>
            ) : actionItems.length === 0 ? (
              <div className='p-8 text-center'>
                <CheckCircle2 className='h-12 w-12 text-green-500 mx-auto mb-2' />
                <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  All caught up!
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  No pending actions at this time.
                </p>
              </div>
            ) : (
              actionItems.slice(0, 5).map((item) => {
                const display = getPriorityDisplay(item.priority);
                const Icon = display.icon;
                return (
                  <div
                    key={item.id}
                    className='p-3 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors'
                  >
                    <div className='flex items-start gap-3'>
                      <div className={'p-1.5 rounded ' + display.color}>
                        <Icon className='h-3.5 w-3.5' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-sm font-medium text-gray-900 dark:text-white'>
                          {item.title}
                        </h3>
                        {item.project && (
                          <p className='text-xs text-gray-600 dark:text-gray-400 mt-0.5'>
                            {item.project}
                          </p>
                        )}
                        {item.dueDate && (
                          <p className='text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1'>
                            <Clock className='h-3 w-3' />
                            {item.dueDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {actionItems.length > 5 && (
            <div className='p-3 border-t dark:border-neutral-800'>
              <Link
                to='/tasks'
                className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center justify-center gap-1'
              >
                View all {actionItems.length} items
                <ArrowRight className='h-4 w-4' />
              </Link>
            </div>
          )}
        </div>

        <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800'>
          <div className='flex items-center justify-between p-4 border-b dark:border-neutral-800'>
            <h2 className='font-semibold text-gray-900 dark:text-white'>Active Projects</h2>
            <Link
              to='/projects'
              className='text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium'
            >
              View all
            </Link>
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-2 gap-3 p-4'>
            {loading ? (
              <div className='col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-4'>
                Loading projects...
              </div>
            ) : recent.length === 0 ? (
              <div className='col-span-2 text-center py-8'>
                <FileText className='h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2' />
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  No projects yet
                </p>
              </div>
            ) : (
              recent.map((p) => (
                <Link
                  key={p.id}
                  to={'/projects/' + p.id}
                  className='rounded-lg border dark:border-neutral-700 p-3 hover:bg-gray-50 dark:hover:bg-neutral-800/50 hover:shadow-md transition-all group'
                >
                  <div className='flex items-start justify-between gap-2 mb-2'>
                    <div className='font-medium text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'>
                      {p.name}
                    </div>
                    {p.health && (
                      <span
                        className={'h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ' + (
                          p.health === 'good'
                            ? 'bg-green-500'
                            : p.health === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        )}
                      />
                    )}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400 font-mono'>
                    {p.code}
                  </div>
                  {p.status && (
                    <div className='mt-2 pt-2 border-t dark:border-neutral-700'>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>
                        {p.status}
                      </span>
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20'>
              <Users className='h-5 w-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <p className='text-2xl font-semibold text-gray-900 dark:text-white'>
                {projects.length}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Active Projects
              </p>
            </div>
          </div>
        </div>

        <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-green-50 dark:bg-green-900/20'>
              <TrendingUp className='h-5 w-5 text-green-600 dark:text-green-400' />
            </div>
            <div>
              <p className='text-2xl font-semibold text-gray-900 dark:text-white'>
                {dashboardData && typeof dashboardData.onTrackCount === 'number' ? dashboardData.onTrackCount : actionItems.filter(i => i.priority === 'low').length}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                On Track
              </p>
            </div>
          </div>
        </div>

        <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20'>
              <Clock className='h-5 w-5 text-yellow-600 dark:text-yellow-400' />
            </div>
            <div>
              <p className='text-2xl font-semibold text-gray-900 dark:text-white'>
                {dashboardData && typeof dashboardData.needAttentionCount === 'number' ? dashboardData.needAttentionCount : criticalItems.length}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Need Attention
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {dashboardData && (
        <div className='space-y-6 mt-8'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              Analytics Overview
            </h2>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              Last {dashboardData.period.days} days
            </span>
          </div>

          {/* Production & Quality Row */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Production Section */}
            {visibleCards.has('production') && (
            <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-2'>
                  <div className='p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20'>
                    <BarChart3 className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                  </div>
                  <h3 className='font-semibold text-gray-900 dark:text-white'>Production</h3>
                </div>
                <div className='text-right'>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {dashboardData.production.totalOutput.toLocaleString()}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Total Output</p>
                </div>
              </div>
              
              <div className='grid grid-cols-3 gap-4 mb-4'>
                <div className='text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20'>
                  <p className='text-lg font-semibold text-green-700 dark:text-green-400'>
                    {dashboardData.production.approved.toLocaleString()}
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Approved</p>
                </div>
                <div className='text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20'>
                  <p className='text-lg font-semibold text-red-700 dark:text-red-400'>
                    {dashboardData.production.rejected.toLocaleString()}
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Rejected</p>
                </div>
                <div className='text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20'>
                  <p className='text-lg font-semibold text-blue-700 dark:text-blue-400'>
                    {dashboardData.production.entries.toLocaleString()}
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Entries</p>
                </div>
              </div>

              {dashboardData.production.trend && dashboardData.production.trend.length > 0 && (
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={dashboardData.production.trend}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#374151' opacity={0.1} />
                      <XAxis 
                        dataKey='date' 
                        stroke='#9CA3AF' 
                        fontSize={12}
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke='#9CA3AF' fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString()}
                      />
                      <Legend />
                      <Line 
                        type='monotone' 
                        dataKey='output' 
                        stroke='#3B82F6' 
                        strokeWidth={2}
                        name='Output'
                        dot={{ fill: '#3B82F6', r: 4 }}
                      />
                      <Line 
                        type='monotone' 
                        dataKey='approved' 
                        stroke='#10B981' 
                        strokeWidth={2}
                        name='Approved'
                        dot={{ fill: '#10B981', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            )}

            {/* Quality Section */}
            {visibleCards.has('quality') && (
            <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-2'>
                  <div className='p-2 rounded-lg bg-green-50 dark:bg-green-900/20'>
                    <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400' />
                  </div>
                  <h3 className='font-semibold text-gray-900 dark:text-white'>Quality</h3>
                </div>
                <div className='text-right'>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {dashboardData.quality.passRate.toFixed(1)}%
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Pass Rate</p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 mb-4'>
                <div className='text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20'>
                  <p className='text-lg font-semibold text-blue-700 dark:text-blue-400'>
                    {dashboardData.quality.totalSubmissions.toLocaleString()}
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Submissions</p>
                </div>
                <div className='text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20'>
                  <p className='text-lg font-semibold text-green-700 dark:text-green-400'>
                    {dashboardData.quality.totalPassed.toLocaleString()}
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Passed</p>
                </div>
              </div>

              <div className='flex items-center justify-center h-64'>
                {dashboardData.quality.byResult && dashboardData.quality.byResult.length > 0 ? (
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={dashboardData.quality.byResult}
                        cx='50%'
                        cy='50%'
                        labelLine={false}
                        label={({ result, count }) => `${result}: ${count}`}
                        outerRadius={80}
                        fill='#8884d8'
                        dataKey='count'
                      >
                        {dashboardData.quality.byResult.map((entry, index) => {
                          const colors = {
                            pass: '#10B981',
                            fail: '#EF4444',
                            conditional: '#F59E0B',
                            pending: '#6B7280'
                          };
                          const color = colors[entry.result.toLowerCase()] || '#8B5CF6';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip content={<QualityTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className='text-sm text-gray-500 dark:text-gray-400'>No quality data available</p>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Workforce & Projects Row */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Workforce Section */}
            {visibleCards.has('workforce') && (
            <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-2'>
                  <div className='p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20'>
                    <Users className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                  </div>
                  <h3 className='font-semibold text-gray-900 dark:text-white'>Workforce</h3>
                </div>
                <div className='text-right'>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {dashboardData.workforce.activeToday}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Active Today</p>
                </div>
              </div>

              {dashboardData.workforce.byShift && dashboardData.workforce.byShift.length > 0 && (
                <>
                  <div className='h-48 mb-4'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={dashboardData.workforce.byShift}>
                        <CartesianGrid strokeDasharray='3 3' stroke='#374151' opacity={0.1} />
                        <XAxis dataKey='shift' stroke='#9CA3AF' fontSize={12} />
                        <YAxis stroke='#9CA3AF' fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                            border: 'none', 
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Legend />
                        <Bar dataKey='workers' fill='#8B5CF6' name='Workers' />
                        <Bar dataKey='output' fill='#3B82F6' name='Output' />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {dashboardData.workforce.topPerformers && dashboardData.workforce.topPerformers.length > 0 && (
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                        Top Performers
                      </h4>
                      <div className='space-y-2 max-h-40 overflow-y-auto'>
                        {dashboardData.workforce.topPerformers.slice(0, 5).map((performer, idx) => (
                          <div key={performer.operatorId} className='flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-neutral-800'>
                            <div className='flex items-center gap-2'>
                              <span className='text-xs font-semibold text-gray-500 dark:text-gray-400 w-6'>
                                #{idx + 1}
                              </span>
                              <span className='text-sm text-gray-900 dark:text-white'>
                                {performer.operatorName}
                              </span>
                            </div>
                            <span className='text-sm font-semibold text-indigo-600 dark:text-indigo-400'>
                              {performer.totalOutput.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            )}

            {/* Projects Section */}
            {visibleCards.has('projects') && (
            <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-2'>
                  <div className='p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20'>
                    <PieChartIcon className='h-5 w-5 text-orange-600 dark:text-orange-400' />
                  </div>
                  <h3 className='font-semibold text-gray-900 dark:text-white'>Projects</h3>
                </div>
                <div className='text-right'>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {dashboardData.projects.total}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Total Projects</p>
                </div>
              </div>

              <div className='flex items-center justify-center h-64'>
                {dashboardData.projects.byHealth && dashboardData.projects.byHealth.length > 0 ? (
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={dashboardData.projects.byHealth}
                        cx='50%'
                        cy='50%'
                        labelLine={false}
                        label={({ status, count }) => `${status}: ${count}`}
                        outerRadius={80}
                        fill='#8884d8'
                        dataKey='count'
                      >
                        {dashboardData.projects.byHealth.map((entry, index) => {
                          const colors = {
                            'healthy': '#10B981',
                            'at-risk': '#F59E0B',
                            'critical': '#EF4444'
                          };
                          const color = colors[entry.status.toLowerCase()] || '#8B5CF6';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip content={<ProjectsTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className='text-sm text-gray-500 dark:text-gray-400'>No project health data available</p>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {analyticsLoading && (
        <div className='rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-8 text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2'></div>
          <p className='text-sm text-gray-500 dark:text-gray-400'>Loading analytics...</p>
        </div>
      )}
      </div>
    </div>
  );
}

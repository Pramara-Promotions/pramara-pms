// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { http } from '../../lib/http';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  ArrowRight
} from 'lucide-react';

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

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>

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
                {actionItems.filter(i => i.priority === 'low').length}
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
                {criticalItems.length}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Need Attention
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

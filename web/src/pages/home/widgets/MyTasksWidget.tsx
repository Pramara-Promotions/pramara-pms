// My Tasks Widget
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Filter } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type Task = {
  id: number;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate?: string;
  project?: string;
};

const MyTasksWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/tasks/my-tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return task.status !== 'done';
    if (filter === 'completed') return task.status === 'done';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-green-600 dark:text-green-400';
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'review':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchTasks}
      onRemove={onRemove}
      allowRefresh
      allowRemove
    >
      {loading ? (
        <WidgetLoading message="Loading your tasks..." />
      ) : error ? (
        <WidgetError message={error} onRetry={fetchTasks} />
      ) : (
        <>
          {/* Filter Bar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex gap-1">
              {(['all', 'active', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    filter === f
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {filteredTasks.length} {filter === 'all' ? 'total' : filter}
            </div>
          </div>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <WidgetEmpty
              icon={CheckCircle2}
              title="No tasks"
              message={
                filter === 'completed'
                  ? "You haven't completed any tasks yet."
                  : filter === 'active'
                  ? "No active tasks. Time to relax!"
                  : "No tasks assigned to you."
              }
            />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {filteredTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${getStatusColor(task.status)}`}>
                      {task.status === 'done' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm font-medium ${
                          task.status === 'done'
                            ? 'line-through text-gray-500 dark:text-gray-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {task.project && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {task.project}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </WidgetWrapper>
  );
};

export default MyTasksWidget;

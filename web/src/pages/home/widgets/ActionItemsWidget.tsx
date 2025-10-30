// Action Items Widget
import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type ActionItem = {
  id: string;
  title: string;
  type: 'approval' | 'overdue' | 'review' | 'info';
  priority: 'critical' | 'high' | 'medium' | 'low';
  project?: string;
  dueDate?: string;
  blockedTasks?: number;
};

const ActionItemsWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActionItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/dashboard/action-items');
      if (!res.ok) throw new Error('Failed to fetch action items');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load action items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, []);

  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
        };
      case 'medium':
        return {
          icon: Clock,
          color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
        };
      default:
        return {
          icon: FileText,
          color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
        };
    }
  };

  const criticalItems = items.filter(item => item.priority === 'critical' || item.priority === 'high');
  const showCriticalOnly = config.config?.showCriticalOnly || false;
  const maxItems = config.config?.maxItems || 10;
  const displayItems = showCriticalOnly ? criticalItems : items;

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchActionItems}
      onRemove={onRemove}
      allowRefresh
      allowRemove
      allowSettings
    >
      {loading ? (
        <WidgetLoading message="Loading action items..." />
      ) : error ? (
        <WidgetError message={error} onRetry={fetchActionItems} />
      ) : displayItems.length === 0 ? (
        <WidgetEmpty
          icon={AlertCircle}
          title="All caught up!"
          message="No action items need your attention right now."
        />
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {displayItems.slice(0, maxItems).map((item) => {
            const display = getPriorityDisplay(item.priority);
            const Icon = display.icon;
            return (
              <div
                key={item.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${display.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.project && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {item.project}
                      </p>
                    )}
                    {item.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.dueDate}
                      </p>
                    )}
                    {item.blockedTasks && item.blockedTasks > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Blocking {item.blockedTasks} task{item.blockedTasks > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <button className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                    Action
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
          {displayItems.length > maxItems && (
            <div className="p-3 text-center">
              <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                View all {displayItems.length} items
              </button>
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
};

export default ActionItemsWidget;

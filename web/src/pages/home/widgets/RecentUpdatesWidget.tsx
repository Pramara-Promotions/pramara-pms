// Recent Updates Widget
import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type UpdateItem = {
  id: string;
  type: 'feature' | 'bug-fix' | 'improvement' | 'announcement' | 'maintenance';
  title: string;
  description: string;
  timestamp: string;
  url?: string;
};

const RecentUpdatesWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/system/updates');
      if (!res.ok) throw new Error('Failed to fetch updates');
      const data = await res.json();
      setUpdates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load updates');
      // Mock data for demo
      setUpdates([
        {
          id: '1',
          type: 'feature',
          title: 'New Dashboard Widgets',
          description: 'Customize your dashboard with drag-and-drop widgets.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          type: 'improvement',
          title: 'Performance Improvements',
          description: 'Faster page loads and smoother animations.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          type: 'bug-fix',
          title: 'Bug Fixes',
          description: 'Fixed various issues reported by users.',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return { icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' };
      case 'bug-fix':
        return { icon: CheckCircle2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
      case 'improvement':
        return { icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' };
      case 'announcement':
        return { icon: Bell, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' };
      case 'maintenance':
        return { icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
      default:
        return { icon: Info, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchUpdates}
      onRemove={onRemove}
      allowRefresh
      allowRemove
    >
      {loading ? (
        <WidgetLoading message="Loading updates..." />
      ) : error && updates.length === 0 ? (
        <WidgetError message={error} onRetry={fetchUpdates} />
      ) : updates.length === 0 ? (
        <WidgetEmpty
          icon={Bell}
          title="No recent updates"
          message="System updates and announcements will appear here."
        />
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {updates.map((update) => {
            const { icon: Icon, color, bg } = getUpdateIcon(update.type);
            return (
              <div
                key={update.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {update.title}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(update.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {update.description}
                    </p>
                    <div className="mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {update.type.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetWrapper>
  );
};

export default RecentUpdatesWidget;

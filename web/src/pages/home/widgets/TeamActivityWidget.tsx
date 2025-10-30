// Team Activity Widget
import React, { useState, useEffect } from 'react';
import { Activity, MessageSquare, FileText, Users, CheckCircle2, GitBranch } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type ActivityItem = {
  id: string;
  type: 'comment' | 'task' | 'project' | 'team' | 'file' | 'status';
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  target: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

const TeamActivityWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/activity/team');
      if (!res.ok) throw new Error('Failed to fetch team activity');
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team activity');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return { icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400' };
      case 'task':
        return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' };
      case 'file':
        return { icon: FileText, color: 'text-purple-600 dark:text-purple-400' };
      case 'team':
        return { icon: Users, color: 'text-orange-600 dark:text-orange-400' };
      case 'status':
        return { icon: GitBranch, color: 'text-indigo-600 dark:text-indigo-400' };
      default:
        return { icon: Activity, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchActivities}
      onRemove={onRemove}
      allowRefresh
      allowRemove
    >
      {loading ? (
        <WidgetLoading message="Loading team activity..." />
      ) : error ? (
        <WidgetError message={error} onRetry={fetchActivities} />
      ) : activities.length === 0 ? (
        <WidgetEmpty
          icon={Activity}
          title="No recent activity"
          message="Team activity will appear here once members start working."
        />
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {activities.slice(0, 15).map((activity) => {
            const { icon: Icon, color } = getActivityIcon(activity.type);
            return (
              <div
                key={activity.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {activity.user.avatar ? (
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                        {getUserInitials(activity.user.name)}
                      </div>
                    )}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{activity.user.name}</span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">{activity.action}</span>{' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
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

export default TeamActivityWidget;

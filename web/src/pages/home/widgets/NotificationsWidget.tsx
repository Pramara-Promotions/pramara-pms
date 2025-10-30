// Notifications Widget
import React, { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type Notification = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
};

const NotificationsWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await http(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await http('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await http(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' };
      case 'warning':
        return { icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
      default:
        return { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchNotifications}
      onRemove={onRemove}
      allowRefresh
      allowRemove
    >
      {loading ? (
        <WidgetLoading message="Loading notifications..." />
      ) : error ? (
        <WidgetError message={error} onRetry={fetchNotifications} />
      ) : (
        <>
          {/* Header Bar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-xs rounded-full transition-all flex items-center gap-1 ${
                  filter === 'unread'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-xs font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <WidgetEmpty
              icon={Bell}
              title={filter === 'unread' ? 'All caught up!' : 'No notifications'}
              message={
                filter === 'unread'
                  ? 'You have no unread notifications.'
                  : 'Notifications will appear here.'
              }
            />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {filteredNotifications.map((notification) => {
                const { icon: Icon, color, bg } = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-3 transition-colors ${
                      notification.read
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-blue-50/50 dark:bg-blue-900/10'
                    } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={() => dismissNotification(notification.id)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Dismiss"
                            >
                              <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          {notification.actionUrl && notification.actionLabel && (
                            <a
                              href={notification.actionUrl}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                              {notification.actionLabel}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </WidgetWrapper>
  );
};

export default NotificationsWidget;

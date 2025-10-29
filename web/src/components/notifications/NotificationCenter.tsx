// web/src/components/notifications/NotificationCenter.tsx
// Enhanced notification center with advanced features

import { useState, useEffect, useMemo } from 'react';
import { X, Bell, CheckCircle, Trash2, AlertTriangle, ExternalLink, Clock } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'unread' | 'critical';

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard navigation (j/k keys)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const filteredNotifs = getFilteredNotifications();
      
      if (e.key === 'j' && selectedIndex < filteredNotifs.length - 1) {
        e.preventDefault();
        setSelectedIndex(prev => prev + 1);
      } else if (e.key === 'k' && selectedIndex > 0) {
        e.preventDefault();
        setSelectedIndex(prev => prev - 1);
      } else if (e.key === 'Enter' && filteredNotifs[selectedIndex]) {
        e.preventDefault();
        const notif = filteredNotifs[selectedIndex];
        if (!notif.read) markAsRead(notif.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, notifications, activeTab, markAsRead, onClose]);

  // Filter notifications based on active tab
  const getFilteredNotifications = () => {
    return notifications.filter(n => {
      if (activeTab === 'unread') return !n.read;
      if (activeTab === 'critical') return n.priority === 'critical' || n.priority === 'high';
      return true;
    });
  };

  const filteredNotifications = useMemo(() => getFilteredNotifications(), [notifications, activeTab]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof notifications> = {};
    
    filteredNotifications.forEach(notif => {
      const date = new Date(notif.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(notif);
    });

    return groups;
  }, [filteredNotifications]);

  // Count critical notifications
  const criticalCount = notifications.filter(n => 
    !n.read && (n.priority === 'critical' || n.priority === 'high')
  ).length;

  // Format relative time (5m ago, 3h ago, etc.)
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get type emoji icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CUTOFF_WARNING': return '⚠️';
      case 'QC_FAILURE': return '🔴';
      case 'DAILY_PLAN_READY': return '📋';
      case 'DOCUMENT_APPROVAL': return '📄';
      case 'PASSWORD_RESET': return '🔑';
      case 'MFA_STATUS_CHANGED': return '🔐';
      case 'ROLE_CHANGED': return '🎖️';
      default: return '🔔';
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
            Medium
          </span>
        );
      default:
        return null;
    }
  };

  // Handle primary action click
  const handleAction = (notif: any, actionUrl?: string) => {
    if (actionUrl) {
      window.location.href = actionUrl;
    }
    if (!notif.read) {
      markAsRead(notif.id);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[28rem] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close notifications"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs - Now with Critical */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => { setActiveTab('all'); setSelectedIndex(0); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { setActiveTab('unread'); setSelectedIndex(0); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'unread'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => { setActiveTab('critical'); setSelectedIndex(0); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'critical'
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 bg-red-50/50 dark:bg-red-900/10'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            Critical {criticalCount > 0 && `(${criticalCount})`}
          </button>
        </div>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between">
            <button
              onClick={markAllAsRead}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Mark all as read
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">j</kbd>/
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">k</kbd> to navigate
            </span>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 m-4 rounded-lg">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
              {error}
            </div>
          )}

          {!loading && !error && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">
                {activeTab === 'unread' ? 'No unread notifications' : 
                 activeTab === 'critical' ? 'No critical notifications' : 
                 'No notifications'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                You're all caught up! ✨
              </p>
            </div>
          )}

          {!loading && !error && Object.entries(groupedNotifications).map(([dateGroup, notifs], groupIndex) => (
            <div key={dateGroup}>
              {/* Date Group Header */}
              <div className="sticky top-0 px-4 py-2 bg-gray-100 dark:bg-gray-900/70 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 z-10">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {dateGroup}
                </h3>
              </div>

              {/* Notifications in this group */}
              {notifs.map((notification, index) => {
                const globalIndex = Object.values(groupedNotifications)
                  .slice(0, groupIndex)
                  .reduce((acc, group) => acc + group.length, 0) + index;
                const isSelected = globalIndex === selectedIndex;

                return (
                  <div
                    key={notification.id}
                    className={`px-4 py-4 border-b border-gray-200 dark:border-gray-700 transition-all ${
                      !notification.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                    } ${
                      isSelected ? 'bg-indigo-100 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className="text-2xl flex-shrink-0 mt-0.5">
                        {getTypeIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title and Priority Badge */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm font-semibold ${
                            !notification.read
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </h3>
                          {getPriorityBadge(notification.priority)}
                        </div>

                        {/* Message */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>

                        {/* Entity Context Card (if available) */}
                        {notification.entityType && notification.entityName && (
                          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {notification.entityType}:
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {notification.entityName}
                                {notification.entityCode && ` (${notification.entityCode})`}
                              </span>
                            </div>
                            {notification.location && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                📍 {notification.location}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Impact Warning (if available) */}
                        {notification.impactLevel && notification.impactDetails && (
                          <div className={`mb-2 p-2 rounded border ${
                            notification.impactLevel === 'high'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          }`}>
                            <div className="flex items-start gap-2">
                              <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                                notification.impactLevel === 'high' ? 'text-red-600' : 'text-yellow-600'
                              }`} />
                              <span className={`text-xs ${
                                notification.impactLevel === 'high'
                                  ? 'text-red-800 dark:text-red-300'
                                  : 'text-yellow-800 dark:text-yellow-300'
                              }`}>
                                {notification.impactDetails}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {(notification.primaryAction || notification.secondaryActions) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {/* Primary Action */}
                            {notification.primaryAction && notification.primaryActionUrl && (
                              <button
                                onClick={() => handleAction(notification, notification.primaryActionUrl || undefined)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded transition-colors"
                              >
                                {notification.primaryAction}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                            
                            {/* Secondary Actions */}
                            {notification.secondaryActions && Array.isArray(notification.secondaryActions) &&
                              notification.secondaryActions.slice(0, 2).map((action: any, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => handleAction(notification, action.url)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                                >
                                  {action.label}
                                </button>
                              ))
                            }
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          {notification.assignedTo && (
                            <span>👤 {notification.assignedTo}</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                            title="Mark as read"
                          >
                            <CheckCircle className="h-4 w-4 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                          </button>
                        )}
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

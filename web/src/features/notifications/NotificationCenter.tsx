// web/src/features/notifications/NotificationCenter.tsx
// Advanced Notification Center with context-rich, actionable notifications

import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useNotifications } from './useNotifications';

interface Notification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  entityCode?: string;
  assignedTo?: string;
  location?: string;
  primaryAction?: string;
  primaryActionUrl?: string;
  primaryActionType?: string;
  secondaryActions?: Array<{ label: string; url: string; type: string }>;
  impactLevel?: string;
  impactDetails?: any;
  read: boolean;
  readAt?: string;
  dismissed: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { 
    notifications: allNotifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    dismissNotification 
  } = useNotifications();
  
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const notifications = allNotifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'critical') return n.priority === 'critical';
    return true;
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🔶';
      case 'medium': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'medium': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-30" onClick={onClose}></div>
      
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 border-b px-6 py-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'critical'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Critical
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Priority Icon */}
                    <div className="text-2xl mt-1">
                      {getPriorityIcon(notification.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Priority Badge */}
                      {notification.priority !== 'low' && (
                        <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${getPriorityColor(notification.priority)}`}>
                          {notification.priority.toUpperCase()}
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {notification.title}
                      </h3>

                      {/* Message */}
                      <p className="text-gray-700 text-sm mb-3">
                        {notification.message}
                      </p>

                      {/* Context */}
                      {notification.entityName && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Related to
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {notification.entityName}
                            {notification.entityCode && (
                              <span className="text-gray-500 ml-1">
                                ({notification.entityCode})
                              </span>
                            )}
                          </p>
                          {notification.assignedTo && (
                            <p className="text-xs text-gray-600 mt-1">
                              Assigned to: {notification.assignedTo}
                            </p>
                          )}
                          {notification.location && (
                            <p className="text-xs text-gray-600">
                              Location: {notification.location}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Impact */}
                      {notification.impactLevel && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-yellow-900">
                            ⚠️ Impact: {notification.impactLevel}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {notification.primaryActionUrl && (
                          <Link
                            to={notification.primaryActionUrl}
                            onClick={() => {
                              markAsRead(notification.id);
                              onClose();
                            }}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            {notification.primaryAction} →
                          </Link>
                        )}
                        
                        {notification.secondaryActions?.map((action, idx) => (
                          <Link
                            key={idx}
                            to={action.url}
                            onClick={() => {
                              markAsRead(notification.id);
                              onClose();
                            }}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatTimestamp(notification.createdAt)}</span>
                        <div className="flex gap-3">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => dismissNotification(notification.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

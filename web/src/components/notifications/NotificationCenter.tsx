// web/src/components/notifications/NotificationCenter.tsx
// Enhanced notification panel with three-part intelligence structure (What/Where, Impact, Solutions)

import { X, CheckCircle, Trash2, Filter, ArrowRight, AlertCircle, Clock, TrendingDown, Users } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useState } from 'react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'unread' | 'priority' | 'type';

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification
  } = useNotifications();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  if (!isOpen) return null;

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'priority') return n.priority === 'critical' || n.priority === 'high';
    return true;
  });

  // Get notification metadata (from impactDetails and secondaryActions fields)
  const getNotificationMeta = (notification: any) => {
    // Parse impact details from JSON if available
    let impact: any = null;
    if (notification.impactDetails) {
      try {
        const parsed = typeof notification.impactDetails === 'string' 
          ? JSON.parse(notification.impactDetails) 
          : notification.impactDetails;
        
        // Convert backend impact format to display format
        impact = {
          blockedTasks: parsed.delayedStagesCount || parsed.blockedTasks || null,
          affectedUsers: parsed.affectedUsers || parsed.teamMembersAffected || null,
          delayEstimate: parsed.hoursShortfall ? `${parsed.hoursShortfall}h` : null,
        };
      } catch (e) {
        console.error('Failed to parse impactDetails:', e);
      }
    }

    // Parse suggested actions from secondaryActions if available
    let suggestedActions: any[] = [];
    if (notification.secondaryActions) {
      try {
        const parsed = typeof notification.secondaryActions === 'string'
          ? JSON.parse(notification.secondaryActions)
          : notification.secondaryActions;
        
        suggestedActions = Array.isArray(parsed) ? parsed.map((action: any) => ({
          label: action.label,
          url: action.url,
          type: action.type,
          icon: action.icon || null
        })) : [];
      } catch (e) {
        console.error('Failed to parse secondaryActions:', e);
      }
    }

    return {
      impact: impact && (impact.blockedTasks || impact.affectedUsers || impact.delayEstimate) ? impact : null,
      suggestedActions
    };
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Panel - 450px width per design spec */}
      <div className="fixed inset-y-0 right-0 w-[450px] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
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
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'unread'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setFilter('priority')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'priority'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Priority
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {!loading && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                {filter === 'unread' ? "You're all caught up! ✨" : "We'll notify you when something needs your attention."}
              </p>
            </div>
          )}

          {!loading && filteredNotifications.map((notification) => {
            const meta = getNotificationMeta(notification);
            const hasPriority = notification.priority === 'critical' || notification.priority === 'high';
            
            return (
              <div
                key={notification.id}
                className={`px-4 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                  !notification.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-l-indigo-500' : ''
                }`}
              >
                {/* PART 1: What & Where */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold flex items-center gap-2 ${
                      !notification.read
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {hasPriority && <span className="text-red-500">●</span>}
                      {notification.title}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Mark as read"
                      >
                        <CheckCircle className="h-4 w-4 text-gray-400 hover:text-green-600" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>

                {/* PART 2: Impact Analysis (if available) */}
                {meta.impact && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-semibold text-orange-900 dark:text-orange-200 mb-2 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      IMPACT
                    </h4>
                    <div className="space-y-1.5 text-xs text-orange-800 dark:text-orange-300">
                      {meta.impact.blockedTasks && (
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-3 w-3" />
                          <span>{meta.impact.blockedTasks} tasks blocked</span>
                        </div>
                      )}
                      {meta.impact.affectedUsers && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span>{meta.impact.affectedUsers} team members affected</span>
                        </div>
                      )}
                      {meta.impact.delayEstimate && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>Est. {meta.impact.delayEstimate} delay</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PART 3: Suggested Actions (if available) */}
                {meta.suggestedActions && meta.suggestedActions.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      💡 SUGGESTED ACTIONS
                    </h4>
                    <div className="space-y-1.5">
                      {/* Problem viewing actions first */}
                      {meta.suggestedActions.filter((a: any) => a.isProblem).length > 0 && (
                        <>
                          <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 mb-1">
                            VIEW PROBLEM:
                          </div>
                          {meta.suggestedActions.filter((a: any) => a.isProblem).map((action: any, idx: number) => (
                            <button
                              key={idx}
                              className="w-full text-left text-xs py-1.5 px-2 rounded bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-900 dark:text-orange-200 flex items-center justify-between group transition-colors border border-orange-200 dark:border-orange-900/50"
                              onClick={() => {
                                if (action.type === 'navigate' && action.url) {
                                  window.location.href = action.url;
                                }
                              }}
                            >
                              <span className="flex items-center gap-2 font-medium">
                                {action.label}
                              </span>
                              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </>
                      )}
                      
                      {/* Solution actions */}
                      {meta.suggestedActions.filter((a: any) => !a.isProblem).length > 0 && (
                        <>
                          {meta.suggestedActions.filter((a: any) => a.isProblem).length > 0 && (
                            <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-2 mb-1">
                              SOLUTIONS:
                            </div>
                          )}
                          {meta.suggestedActions.filter((a: any) => !a.isProblem).map((action: any, idx: number) => (
                            <button
                              key={idx}
                              className="w-full text-left text-xs py-1.5 px-2 rounded bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-900 dark:text-blue-200 flex items-center justify-between group transition-colors"
                              onClick={() => {
                                if (action.type === 'navigate' && action.url) {
                                  window.location.href = action.url;
                                }
                              }}
                            >
                              <span className="flex items-center gap-2">
                                {action.label}
                              </span>
                              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

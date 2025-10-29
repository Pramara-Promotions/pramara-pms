// web/src/components/notifications/NotificationBell.tsx
// Enhanced notification bell with animations and advanced features

import { useState, useEffect, useRef } from 'react';
import { Bell, BellDot, Wifi, WifiOff } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationBellProps {
  onOpen: () => void;
}

export default function NotificationBell({ onOpen }: NotificationBellProps) {
  const { unreadCount, connected, notifications } = useNotifications();
  const [shake, setShake] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const prevUnreadCountRef = useRef(unreadCount);
  
  // Detect critical notifications for red badge
  const hasCritical = notifications.some(
    n => !n.read && (n.priority === 'critical' || n.priority === 'high')
  );

  // Trigger shake animation on new notification
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Keyboard accessibility - Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTooltip) {
        setShowTooltip(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTooltip]);

  const getConnectionStatus = () => {
    if (connected) return 'Connected';
    return 'Reconnecting...';
  };

  const getBadgeColor = () => {
    if (hasCritical) return 'bg-red-600';
    return 'bg-indigo-600';
  };

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 ${
          shake ? 'animate-shake' : ''
        }`}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded="false"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        {/* Bell Icon */}
        {unreadCount > 0 ? (
          <BellDot className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        ) : (
          <Bell className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        )}

        {/* Unread Count Badge - color-coded by priority */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white ${getBadgeColor()} rounded-full border-2 border-white dark:border-gray-800 ${
              hasCritical ? 'animate-pulse' : ''
            }`}
            aria-live="polite"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection Status Indicator (small dot) */}
        <span
          className={`absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white dark:border-gray-800 transition-colors ${
            connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
          }`}
          aria-label={getConnectionStatus()}
        />
      </button>

      {/* Enhanced Tooltip */}
      {showTooltip && (
        <div
          className="absolute top-full right-0 mt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          role="tooltip"
        >
          <div className="bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Notifications</span>
              <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                {unreadCount}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-300 pt-2 border-t border-gray-700">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-yellow-500" />
                  <span>Reconnecting...</span>
                </>
              )}
            </div>

            {hasCritical && (
              <div className="mt-2 text-xs text-red-400 font-medium">
                ⚠️ Critical notifications pending
              </div>
            )}
          </div>
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45 border-l border-t border-gray-700" />
        </div>
      )}

      {/* Shake Animation Styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

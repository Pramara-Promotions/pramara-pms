// web/src/hooks/useNotifications.ts
// WebSocket hook for real-time notifications

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { http } from '../lib/http';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  // Phase 4 fields
  entityType?: string;
  entityId?: string;
  entityName?: string;
  entityCode?: string;
  assignedTo?: string;
  location?: string;
  primaryAction?: string;
  primaryActionUrl?: string;
  primaryActionType?: string;
  secondaryActions?: any;
  priority: string;
  impactLevel?: string;
  impactDetails?: any;
  readAt?: string;
  dismissed: boolean;
  dismissedAt?: string;
  expiresAt?: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  loading: boolean;
  error: string | null;
  fetchNotifications: (filter?: 'all' | 'unread' | 'critical') => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const priorityEmoji = {
          critical: '🔴',
          high: '🔶',
          medium: '⚠️',
          low: 'ℹ️'
        }[notification.priority] || 'ℹ️';

        new Notification(`${priorityEmoji} ${notification.title}`, {
          body: notification.message,
          icon: '/logo.png',
          tag: notification.id, // Prevent duplicates
          requireInteraction: notification.priority === 'critical'
        });
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (filter: 'all' | 'unread' | 'critical' = 'all') => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/notifications?limit=50';
      if (filter === 'unread') {
        url += '&unreadOnly=true';
      } else if (filter === 'critical') {
        url += '&priority=critical';
      }

      const res = await http(url);
      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      // Find the notification to check if it was unread
      const notification = notifications.find(n => n.id === id);
      const wasUnread = notification && !notification.read;

      const res = await http(`/api/notifications/${id}/read`, {
        method: 'PATCH'
      });

      if (!res.ok) {
        throw new Error('Failed to mark as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
      );
      
      // Only decrement count if it was actually unread
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [notifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await http('/api/notifications/read-all', {
        method: 'POST'
      });

      if (!res.ok) {
        throw new Error('Failed to mark all as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback(async (id: string) => {
    try {
      // Find the notification BEFORE deleting to check if it was unread
      const notification = notifications.find(n => n.id === id);
      const wasUnread = notification && !notification.read;

      const res = await http(`/api/notifications/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to dismiss notification');
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Decrement unread count if it was unread
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  }, [notifications]);

  // Initialize WebSocket connection
  useEffect(() => {
    // Note: Token is in httpOnly cookie, so we can't read it with document.cookie
    // But Socket.IO will send it automatically with the connection request
    console.log('[useNotifications] Initializing WebSocket connection...');
    console.log('[useNotifications] Cookies will be sent automatically (httpOnly)');

    const wsUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    console.log('[useNotifications] WebSocket URL:', wsUrl);

    // Connect to WebSocket server
    // Token will be sent via cookies (httpOnly) automatically
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      withCredentials: true,  // This ensures cookies are sent
      autoConnect: true
    });

    console.log('[useNotifications] Socket.IO client created, attempting connection...');

    socketRef.current = socket;

    // Connection established
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setConnected(true);
      setError(null);
      
      // Fetch initial notifications on connect
      fetchNotifications();
    });

    // Handle incoming notifications
    socket.on('notification', (notification: Notification) => {
      console.log('📬 Received notification:', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      
      // Update unread count if it's unread
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
      }
      
      // Show browser notification for high/critical priority
      if (notification.priority === 'critical' || notification.priority === 'high') {
        showBrowserNotification(notification);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server forcibly disconnected, try to reconnect
        socket.connect();
      }
    });

    // Handle connection errors
    socket.on('connect_error', (error: any) => {
      console.error('🔌 WebSocket connection error:', error);
      console.error('🔌 Error message:', error.message);
      console.error('🔌 Error data:', error.data);
      setConnected(false);
      setError('Connection error. Retrying...');
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔌 Reconnection attempt ${attemptNumber}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 Reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setError(null);
      fetchNotifications(); // Re-fetch on reconnect
    });

    socket.on('reconnect_failed', () => {
      console.error('🔌 Reconnection failed');
      setError('Connection lost. Please refresh the page.');
    });

    // Fetch initial notifications
    fetchNotifications().then(() => setLoading(false));

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchNotifications, showBrowserNotification]);

  // Auto-request notification permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  return {
    notifications,
    unreadCount,
    connected,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    requestNotificationPermission
  };
}

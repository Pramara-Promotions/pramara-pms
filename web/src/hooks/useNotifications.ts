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
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

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
      const res = await http(`/api/notifications/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to dismiss notification');
      }

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Decrement unread count if it was unread
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  }, [notifications]);

  // Initialize WebSocket connection
  useEffect(() => {
    // Get auth token from cookie or localStorage
    const getAuthToken = () => {
      // Try to get from cookie first
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
      if (tokenCookie) {
        return tokenCookie.split('=')[1];
      }
      
      // Fallback to localStorage
      return localStorage.getItem('token');
    };

    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token found, skipping WebSocket connection');
      setLoading(false);
      return;
    }

    // Determine backend URL
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    // Initialize Socket.IO client
    const socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    socketRef.current = socket;

    // Connection established
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setConnected(true);
      setError(null);
      
      // Fetch initial notifications
      fetchNotifications();
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    // Connection error
    socket.on('connect_error', (err) => {
      console.error('🔌 WebSocket connection error:', err.message);
      setConnected(false);
      setError('Connection failed. Retrying...');
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected. Reason:', reason);
      setConnected(false);
      
      // Set reconnect timeout message
      if (reason === 'io server disconnect') {
        setError('Server disconnected. Reconnecting...');
      }
    });

    // Real-time notification received
    socket.on('notification', (notification: Notification) => {
      console.log('📬 New notification received:', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      
      // Increment unread count if not already read
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
      }
      
      // Show browser notification
      showBrowserNotification(notification);
    });

    // Pong response (for connection testing)
    socket.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      socket.disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchNotifications, showBrowserNotification]);

  // Auto-request notification permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Ping server periodically to keep connection alive
  useEffect(() => {
    if (!connected || !socketRef.current) return;

    const pingInterval = setInterval(() => {
      socketRef.current?.emit('ping');
    }, 30000); // Every 30 seconds

    return () => clearInterval(pingInterval);
  }, [connected]);

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

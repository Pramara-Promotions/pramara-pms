import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
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
  expiresAt?: string;
  readAt?: string;
  dismissedAt?: string;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  connected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationsProvider>');
  return ctx;
}

export default function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initial load
    fetchNotifications();

    // Connect socket
    const socket = io(getSocketUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (notification: NotificationItem) => {
      setNotifications((prev) => [notification, ...prev]);
      if (!notification.read) setUnreadCount((prev) => prev + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.message, icon: '/favicon.ico', tag: notification.id });
      }
    });

    socket.on('connect_error', () => {/* silent retry */});

    // Cleanup must return void, not the Socket instance
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=50', { credentials: 'include' });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const markAsRead = async (notificationId: string) => {
    // Optimistic
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Error marking notification as read:', e);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n)));
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markAllAsRead = async () => {
    const prevList = notifications;
    const prevCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Error marking all as read:', e);
      setNotifications(prevList);
      setUnreadCount(prevCount);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    // Use functional state to read latest value and avoid stale reads when a "mark as read" just occurred
    let removedWasUnread = false;
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === notificationId);
      removedWasUnread = !!target && !target.read;
      return prev.filter((n) => n.id !== notificationId);
    });
    if (removedWasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${notificationId}/dismiss`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Error dismissing notification:', e);
      // Revert by refetching minimal state (simple, avoids mismatched order)
      fetchNotifications();
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    fetchNotifications,
    requestNotificationPermission,
  }), [notifications, unreadCount, connected]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

function getSocketUrl(): string {
  const host = window.location.host;
  if (host.includes(':5173')) return 'http://localhost:4000';
  return `${window.location.protocol}//${host}`;
}

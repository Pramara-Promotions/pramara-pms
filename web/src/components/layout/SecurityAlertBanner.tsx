// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { http } from '../../lib/http';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  expiresAt: string | null;
}

export default function SecurityAlertBanner() {
  const [securityAlert, setSecurityAlert] = useState<Notification | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchSecurityAlert();
  }, []);

  const fetchSecurityAlert = async () => {
    try {
      const res = await http('/api/notifications');
      if (!res.ok) return;
      
      const data = await res.json();
      
      // Ensure data is an array
      const notifications: Notification[] = Array.isArray(data) ? data : [];
      
      // Find the most recent SECURITY_ALERT within 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const alert = notifications.find(
        (n) => n.type === 'SECURITY_ALERT' && 
        new Date(n.createdAt) > sevenDaysAgo
      );
      
      if (alert) {
        setSecurityAlert(alert);
      }
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
    }
  };

  const dismissAlert = () => {
    setDismissed(true);
  };

  if (!securityAlert || dismissed) {
    return null;
  }

  const daysRemaining = securityAlert.createdAt
    ? Math.max(0, 7 - Math.ceil(
        (new Date().getTime() - new Date(securityAlert.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      ))
    : 7;

  return (
    <div className="bg-yellow-500 dark:bg-yellow-600 border-b-2 border-yellow-600 dark:border-yellow-700">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-yellow-900 dark:text-yellow-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                🔒 Security Alert
              </h3>
              <p className="text-sm text-yellow-900 dark:text-yellow-100 mt-1">
                {securityAlert.message}
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                This alert will be shown for {daysRemaining} more day{daysRemaining !== 1 ? 's' : ''}.
                If you didn't request this password reset, please contact your administrator immediately.
              </p>
            </div>
          </div>
          <button
            onClick={dismissAlert}
            className="flex-shrink-0 ml-4 text-yellow-900 dark:text-yellow-100 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
            title="Dismiss (will show again on next page load)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

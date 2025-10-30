// Toast Notification Component
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useAutoDismiss, animations, useReducedMotion } from '../../utils/animations';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onDismiss,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const reducedMotion = useReducedMotion();
  const progress = useAutoDismiss(
    () => {
      setIsExiting(true);
      setTimeout(onDismiss, 300);
    },
    duration,
    isPaused
  );

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-green-600 dark:text-green-400',
          bg: 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800',
          progressBg: 'bg-green-500',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600 dark:text-red-400',
          bg: 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-800',
          progressBg: 'bg-red-500',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-800',
          progressBg: 'bg-yellow-500',
        };
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800',
          progressBg: 'bg-blue-500',
        };
    }
  };

  const styles = getToastStyles();
  const Icon = styles.icon;

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md
        ${styles.bg}
        ${isExiting ? animations.toastExit : animations.toastEnter}
        ${!reducedMotion && 'transition-all'}
      `}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {message}
          </p>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(onDismiss, 300);
        }}
        className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </button>

      {/* Progress Bar */}
      {!isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className={`h-full ${styles.progressBg} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Toast Container
export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const getPositionClasses = (position: string) => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'top-center':
      return 'top-4 left-1/2 -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-4 left-1/2 -translate-x-1/2';
    default: // top-right
      return 'top-4 right-4';
  }
};

export const ToastContainer: React.FC<ToastContainerProps & { toasts: ToastProps[] }> = ({
  position = 'top-right',
  toasts,
}) => {
  return (
    <div className={`fixed z-50 flex flex-col gap-2 ${getPositionClasses(position)}`}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

// Toast Manager Hook
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastProps = {
      ...toast,
      id,
      onDismiss: () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const success = (title: string, message?: string, duration?: number) => {
    showToast({ type: 'success', title, message, duration });
  };

  const error = (title: string, message?: string, duration?: number) => {
    showToast({ type: 'error', title, message, duration });
  };

  const warning = (title: string, message?: string, duration?: number) => {
    showToast({ type: 'warning', title, message, duration });
  };

  const info = (title: string, message?: string, duration?: number) => {
    showToast({ type: 'info', title, message, duration });
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  return {
    toasts,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
}

export default Toast;

import React from 'react';
import { FileQuestion, Inbox, Search, AlertCircle, CheckCircle, XCircle, ServerCrash, Clock } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: 'empty' | 'search' | 'error' | 'success' | 'offline' | 'loading';
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  illustration = 'empty'
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Illustration */}
      <div className="mb-6">
        {icon || <Illustration type={illustration} />}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6 max-w-md">
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <button
          onClick={action.onClick}
          className="
            px-6 py-2.5 rounded-lg
            bg-gradient-to-r from-indigo-600 to-purple-600
            hover:from-indigo-700 hover:to-purple-700
            text-white font-semibold
            shadow-md hover:shadow-lg
            transform hover:-translate-y-0.5
            transition-all duration-200
          "
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Illustration Component
function Illustration({ type }: { type: string }) {
  const illustrations = {
    empty: (
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-800/50 flex items-center justify-center">
          <Inbox className="w-16 h-16 text-gray-400 dark:text-neutral-600" />
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/40 dark:to-purple-950/40 opacity-50" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-950/40 dark:to-rose-950/40 opacity-50" />
      </div>
    ),
    search: (
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40 flex items-center justify-center">
          <Search className="w-16 h-16 text-indigo-600 dark:text-indigo-400" />
        </div>
        {/* Animated search circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-40 h-40 rounded-full border-4 border-indigo-200 dark:border-indigo-900/40 animate-ping opacity-20" />
        </div>
      </div>
    ),
    error: (
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40 flex items-center justify-center">
          <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
        </div>
        {/* Warning indicators */}
        <div className="absolute -top-1 -right-1">
          <AlertCircle className="w-8 h-8 text-amber-500 animate-bounce" />
        </div>
      </div>
    ),
    success: (
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-950/40 dark:to-green-950/40 flex items-center justify-center">
          <CheckCircle className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
        </div>
        {/* Success glow */}
        <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 blur-2xl animate-pulse" />
      </div>
    ),
    offline: (
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-slate-100 dark:from-neutral-800 dark:to-slate-800 flex items-center justify-center">
          <ServerCrash className="w-16 h-16 text-gray-600 dark:text-neutral-400" />
        </div>
        {/* Offline indicator */}
        <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-500 border-4 border-white dark:border-neutral-900 flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      </div>
    ),
    loading: (
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/40 dark:to-purple-950/40 flex items-center justify-center">
          <Clock className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-pulse" />
        </div>
        {/* Loading ring */}
        <div className="absolute inset-0">
          <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#loading-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="70 200"
            />
            <defs>
              <linearGradient id="loading-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    )
  };

  return illustrations[type as keyof typeof illustrations] || illustrations.empty;
}

// Specialized Empty States
export function NoResults({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      illustration="search"
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for"
      action={onReset ? {
        label: 'Clear filters',
        onClick: onReset
      } : undefined}
    />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      illustration="error"
      title="Something went wrong"
      description={message || "We couldn't load this content. Please try again."}
      action={onRetry ? {
        label: 'Try again',
        onClick: onRetry
      } : undefined}
    />
  );
}

export function OfflineState() {
  return (
    <EmptyState
      illustration="offline"
      title="You're offline"
      description="Check your internet connection and try again"
    />
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <EmptyState
      illustration="loading"
      title={message || "Loading..."}
    />
  );
}

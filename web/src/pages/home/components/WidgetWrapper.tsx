import React, { useState, useEffect } from 'react';
import { 
  MoreVertical, 
  RefreshCw, 
  X, 
  Settings,
  Maximize2,
  Minimize2,
  AlertCircle,
  Loader
} from 'lucide-react';
import { WidgetProps, WidgetState } from '../types';

export interface WidgetWrapperProps extends WidgetProps {
  children: React.ReactNode;
  showActions?: boolean;
  allowRemove?: boolean;
  allowRefresh?: boolean;
  allowSettings?: boolean;
  className?: string;
}

/**
 * Widget Wrapper Component
 * 
 * Provides consistent wrapper for all dashboard widgets with:
 * - Header (title, icon, actions menu)
 * - Body (widget content)
 * - Footer (optional)
 * - Loading state
 * - Error state
 * - Empty state
 */
export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  config,
  children,
  onUpdate,
  onRemove,
  onRefresh,
  showActions = true,
  allowRemove = true,
  allowRefresh = true,
  allowSettings = false,
  className = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  const Icon = config.icon;

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onRefresh?.();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`Remove "${config.title}" widget?`)) {
      onRemove?.();
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setIsExpanded(!isExpanded);
    // Could trigger a modal or full-screen view here
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        rounded-xl 
        border border-gray-200 dark:border-gray-700
        shadow-sm hover:shadow-md
        transition-all duration-200
        flex flex-col
        ${isExpanded ? 'col-span-full row-span-2' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
              <Icon className="w-4 h-4 text-white" />
            </div>
          )}
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {config.title}
          </h3>
        </div>

        {showActions && (
          <div className="relative flex items-center gap-1">
            <button
              onClick={handleToggleMenu}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Widget actions"
            >
              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Actions Menu */}
            {showMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                {allowRefresh && (
                  <button
                    onClick={handleRefresh}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                )}
                <button
                  onClick={handleToggleExpand}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  {isExpanded ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      Minimize
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      Expand
                    </>
                  )}
                </button>
                {allowSettings && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      // Open settings modal
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                )}
                {allowRemove && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={handleRemove}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Remove Widget
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

/**
 * Widget Loading State
 */
export const WidgetLoading: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <Loader className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
    <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
  </div>
);

/**
 * Widget Error State
 */
export const WidgetError: React.FC<{ 
  message?: string; 
  onRetry?: () => void;
}> = ({ 
  message = 'Failed to load data', 
  onRetry 
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20 mb-3">
      <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
    </div>
    <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
      Something went wrong
    </p>
    <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 text-center">
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    )}
  </div>
);

/**
 * Widget Empty State
 */
export const WidgetEmpty: React.FC<{ 
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  message?: string; 
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ 
  icon: Icon,
  title = 'No data yet',
  message = 'There\'s nothing to show here right now.',
  action
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    {Icon && (
      <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
      </div>
    )}
    <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
      {title}
    </p>
    <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 text-center max-w-xs">
      {message}
    </p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
      >
        {action.label}
      </button>
    )}
  </div>
);

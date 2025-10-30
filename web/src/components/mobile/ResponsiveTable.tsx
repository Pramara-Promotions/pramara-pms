import React from 'react';
import { useIsMobile } from '../../hooks/useResponsive';
import { ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string; // Optional custom label for mobile card view
  hideOnMobile?: boolean; // Hide this column on mobile
  sortable?: boolean;
  width?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  mobileCardLayout?: 'stacked' | 'compact';
}

export default function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyState,
  loading = false,
  mobileCardLayout = 'stacked'
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-neutral-800 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item) => {
          const visibleColumns = columns.filter(col => !col.hideOnMobile);
          
          if (mobileCardLayout === 'compact') {
            return (
              <button
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className="
                  w-full
                  flex items-center justify-between
                  p-4
                  bg-white dark:bg-neutral-900
                  border border-gray-200 dark:border-neutral-800
                  rounded-lg
                  hover:shadow-md
                  active:scale-[0.98]
                  transition-all duration-200
                "
              >
                <div className="flex-1 text-left">
                  {visibleColumns.slice(0, 2).map((col) => (
                    <div key={col.key}>
                      {col.render ? col.render(item) : item[col.key]}
                    </div>
                  ))}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            );
          }

          // Stacked layout
          return (
            <div
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`
                p-4
                bg-white dark:bg-neutral-900
                border border-gray-200 dark:border-neutral-800
                rounded-lg
                ${onRowClick ? 'active:scale-[0.98] cursor-pointer' : ''}
                transition-all duration-200
              `}
            >
              <div className="space-y-3">
                {visibleColumns.map((col) => (
                  <div key={col.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
                      {col.mobileLabel || col.label}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white text-right ml-4">
                      {col.render ? col.render(item) : item[col.key]}
                    </span>
                  </div>
                ))}
              </div>
              {onRowClick && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-800 flex justify-end">
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-neutral-800 dark:to-neutral-800/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`
                ${onRowClick 
                  ? 'cursor-pointer hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20' 
                  : ''
                }
                transition-colors duration-150
              `}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-6 py-4 text-sm text-gray-900 dark:text-white"
                >
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Specialized mobile list item component
interface MobileListItemProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileListItem({
  title,
  subtitle,
  badge,
  avatar,
  actions,
  onClick,
  className = ''
}: MobileListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3
        p-4
        bg-white dark:bg-neutral-900
        border-b border-gray-200 dark:border-neutral-800
        ${onClick ? 'active:bg-gray-50 dark:active:bg-neutral-800/50' : ''}
        transition-colors duration-150
        ${className}
      `}
    >
      {avatar && <div className="flex-shrink-0">{avatar}</div>}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-600 dark:text-neutral-400 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {actions}
        </div>
      )}

      {onClick && !actions && (
        <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400" />
      )}
    </div>
  );
}

// Skeleton Loader Component
import React from 'react';
import { animations, useReducedMotion } from '../../utils/animations';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}) => {
  const reducedMotion = useReducedMotion();

  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-lg';
      default: // text
        return 'rounded';
    }
  };

  const defaultHeight = variant === 'text' ? '1rem' : variant === 'circular' ? '3rem' : '6rem';

  const skeletonStyle = {
    width: width || (variant === 'circular' ? '3rem' : '100%'),
    height: height || defaultHeight,
  };

  const shimmerClass = reducedMotion ? '' : animations.shimmer;

  const skeletonElement = (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700
        ${getVariantClasses()}
        ${shimmerClass}
        ${className}
      `}
      style={{
        ...skeletonStyle,
        backgroundSize: '200% 100%',
      }}
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{skeletonElement}</div>
      ))}
    </div>
  );
};

// Preset Skeleton Layouts
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}>
    <div className="flex items-start gap-3">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1">
        <Skeleton variant="text" width="60%" height="1.25rem" className="mb-2" />
        <Skeleton variant="text" width="40%" height="1rem" />
      </div>
    </div>
    <Skeleton variant="rectangular" height="8rem" className="mt-4" />
    <div className="flex gap-2 mt-4">
      <Skeleton variant="rounded" width="4rem" height="2rem" />
      <Skeleton variant="rounded" width="4rem" height="2rem" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 5, 
  className = '' 
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
    {/* Header */}
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-4">
      <Skeleton variant="text" width="20%" height="1rem" />
      <Skeleton variant="text" width="30%" height="1rem" />
      <Skeleton variant="text" width="15%" height="1rem" />
      <Skeleton variant="text" width="20%" height="1rem" />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 flex gap-4">
        <Skeleton variant="text" width="20%" height="1rem" />
        <Skeleton variant="text" width="30%" height="1rem" />
        <Skeleton variant="text" width="15%" height="1rem" />
        <Skeleton variant="text" width="20%" height="1rem" />
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="70%" height="1rem" className="mb-1" />
          <Skeleton variant="text" width="40%" height="0.875rem" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 4, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i}>
        <Skeleton variant="text" width="25%" height="0.875rem" className="mb-2" />
        <Skeleton variant="rounded" height="2.5rem" />
      </div>
    ))}
    <Skeleton variant="rounded" width="8rem" height="2.5rem" className="mt-6" />
  </div>
);

export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Skeleton variant="text" width="50%" height="0.875rem" className="mb-2" />
          <Skeleton variant="text" width="70%" height="1.5rem" />
        </div>
      ))}
    </div>
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton variant="rounded" height="20rem" />
      <Skeleton variant="rounded" height="20rem" />
    </div>
  </div>
);

export default Skeleton;

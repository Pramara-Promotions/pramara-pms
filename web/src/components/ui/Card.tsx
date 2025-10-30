import React, { HTMLAttributes, forwardRef } from 'react';

export type CardVariant = 'default' | 'gradient' | 'glass' | 'elevated';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
  clickable?: boolean;
  loading?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      hoverable = false,
      clickable = false,
      loading = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: `
        bg-white dark:bg-neutral-900
        border border-gray-200 dark:border-neutral-800
        shadow-sm
      `,
      gradient: `
        bg-gradient-to-br from-white to-indigo-50/30 
        dark:from-neutral-900 dark:to-indigo-950/20
        border-2 border-transparent
        bg-clip-padding
        before:absolute before:inset-0 before:rounded-xl
        before:bg-gradient-to-r before:from-indigo-500 before:to-purple-500
        before:opacity-0 before:transition-opacity before:duration-300
        hover:before:opacity-10
        shadow-md
        relative
      `,
      glass: `
        bg-white/80 dark:bg-neutral-900/80
        backdrop-blur-lg
        border border-white/20 dark:border-neutral-700/50
        shadow-lg
      `,
      elevated: `
        bg-white dark:bg-neutral-900
        border border-gray-200 dark:border-neutral-800
        shadow-lg hover:shadow-2xl
      `
    };

    const hoverStyles = hoverable || clickable
      ? `
        transition-all duration-300
        hover:shadow-xl
        hover:-translate-y-1
        hover:border-indigo-300 dark:hover:border-purple-700
      `
      : '';

    const clickableStyles = clickable
      ? `
        cursor-pointer
        active:scale-[0.98]
        active:shadow-md
      `
      : '';

    const loadingStyles = loading
      ? `
        relative
        overflow-hidden
        before:absolute before:inset-0
        before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
        before:animate-shimmer
      `
      : '';

    const baseStyles = `
      rounded-xl
      p-6
      transition-all duration-200
    `;

    const cardClasses = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${hoverStyles}
      ${clickableStyles}
      ${loadingStyles}
      ${className}
    `;

    return (
      <div
        ref={ref}
        className={cardClasses}
        {...props}
      >
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-5/6"></div>
          </div>
        ) : (
          children
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;

// Card Header Component
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  gradient?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  (
    {
      title,
      subtitle,
      action,
      gradient = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const headerClasses = `
      flex items-start justify-between
      pb-4 mb-4
      border-b border-gray-200 dark:border-neutral-800
      ${gradient ? 'border-b-2 border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-border' : ''}
      ${className}
    `;

    return (
      <div ref={ref} className={headerClasses} {...props}>
        <div className="flex-1">
          {title && (
            <h3 className={`
              text-lg font-semibold
              ${gradient 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent' 
                : 'text-gray-900 dark:text-white'
              }
            `}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className="ml-4">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Body Component
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// Card Footer Component
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  (
    { children, gradient = false, className = '', ...props },
    ref
  ) => {
    const footerClasses = `
      flex items-center justify-between
      pt-4 mt-4
      border-t border-gray-200 dark:border-neutral-800
      ${gradient ? 'border-t-2 border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-border' : ''}
      ${className}
    `;

    return (
      <div ref={ref} className={footerClasses} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Stat Card Component (specialized)
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon?: React.ReactNode;
  gradient?: string;
  loading?: boolean;
}

export const StatCard = ({
  title,
  value,
  change,
  icon,
  gradient = 'from-indigo-600 to-purple-600',
  loading = false
}: StatCardProps) => {
  if (loading) {
    return <Card loading />;
  }

  return (
    <Card variant="gradient" hoverable>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 mb-1">
            {title}
          </p>
          <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value}
          </p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`
                text-sm font-medium
                ${change.trend === 'up' 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
                }
              `}>
                {change.trend === 'up' ? '↑' : '↓'} {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-neutral-500">
                vs last period
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`
            w-12 h-12 rounded-lg
            bg-gradient-to-br ${gradient}
            flex items-center justify-center
            text-white
            shadow-lg
          `}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

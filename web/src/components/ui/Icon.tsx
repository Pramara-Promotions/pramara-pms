import React from 'react';
import { LucideIcon, LucideProps } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconVariant = 'default' | 'gradient' | 'primary' | 'success' | 'warning' | 'error';

interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon;
  size?: IconSize;
  variant?: IconVariant;
  animated?: boolean;
}

const sizeMap: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 64
};

const variantStyles: Record<IconVariant, string> = {
  default: 'text-gray-600 dark:text-neutral-400',
  gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent',
  primary: 'text-indigo-600 dark:text-indigo-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400'
};

export default function Icon({
  icon: IconComponent,
  size = 'md',
  variant = 'default',
  animated = false,
  className = '',
  ...props
}: IconProps) {
  const iconSize = sizeMap[size];
  const variantClass = variantStyles[variant];
  
  return (
    <IconComponent
      size={iconSize}
      className={`
        ${variantClass}
        ${animated ? 'transition-transform duration-200 hover:scale-110' : ''}
        ${className}
      `}
      {...props}
    />
  );
}

// Gradient Icon with background
interface GradientIconProps {
  icon: LucideIcon;
  size?: IconSize;
  gradient?: string;
  className?: string;
}

export function GradientIcon({
  icon: IconComponent,
  size = 'md',
  gradient = 'from-indigo-600 to-purple-600',
  className = ''
}: GradientIconProps) {
  const iconSize = sizeMap[size];
  const containerSize = iconSize * 2;

  return (
    <div
      className={`
        rounded-lg
        bg-gradient-to-br ${gradient}
        flex items-center justify-center
        shadow-lg
        ${className}
      `}
      style={{ width: containerSize, height: containerSize }}
    >
      <IconComponent
        size={iconSize}
        className="text-white"
      />
    </div>
  );
}

// Animated Check Icon
export function AnimatedCheck({ size = 'xl', className = '' }: { size?: IconSize; className?: string }) {
  const iconSize = sizeMap[size];

  return (
    <div className={`relative ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 52 52"
        className="animate-scale-in"
      >
        {/* Circle */}
        <circle
          cx="26"
          cy="26"
          r="25"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="2"
          className="animate-[dash_1.5s_ease-in-out]"
          strokeDasharray="166"
          strokeDashoffset="166"
          strokeLinecap="round"
          style={{
            animation: 'dash 0.8s ease-in-out forwards'
          }}
        />
        {/* Check */}
        <path
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
          strokeDasharray="48"
          strokeDashoffset="48"
          style={{
            animation: 'dash 0.4s 0.5s ease-in-out forwards'
          }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Animated Loading Spinner
export function LoadingSpinner({ size = 'md', gradient = 'from-indigo-600 to-purple-600', className = '' }: { size?: IconSize; gradient?: string; className?: string }) {
  const iconSize = sizeMap[size];

  return (
    <div
      className={`relative ${className}`}
      style={{ width: iconSize, height: iconSize }}
    >
      <div
        className={`
          absolute inset-0 rounded-full
          border-4 border-transparent
          border-t-transparent
          bg-gradient-to-r ${gradient}
          animate-spin
        `}
        style={{
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '2px'
        }}
      />
    </div>
  );
}

// Status Badge
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy';
  size?: 'sm' | 'md' | 'lg';
  withPulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'md', withPulse = true, className = '' }: StatusBadgeProps) {
  const statusConfig = {
    online: {
      bg: 'bg-emerald-500',
      ring: 'ring-emerald-400'
    },
    offline: {
      bg: 'bg-gray-400',
      ring: 'ring-gray-300'
    },
    away: {
      bg: 'bg-amber-500',
      ring: 'ring-amber-400'
    },
    busy: {
      bg: 'bg-red-500',
      ring: 'ring-red-400'
    }
  };

  const sizeConfig = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const config = statusConfig[status];
  const sizeClass = sizeConfig[size];

  return (
    <span className={`relative inline-flex ${className}`}>
      <span
        className={`
          ${sizeClass} rounded-full
          ${config.bg}
          ${withPulse && status === 'online' ? 'animate-pulse' : ''}
        `}
      />
      {withPulse && status === 'online' && (
        <span
          className={`
            absolute inline-flex h-full w-full rounded-full
            ${config.bg} opacity-75
            animate-ping
          `}
        />
      )}
    </span>
  );
}

// Notification Badge
interface NotificationBadgeProps {
  count: number;
  max?: number;
  gradient?: string;
  className?: string;
}

export function NotificationBadge({
  count,
  max = 99,
  gradient = 'from-red-600 to-rose-600',
  className = ''
}: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  if (count === 0) return null;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        px-2 py-0.5 min-w-[20px] h-5
        text-xs font-semibold
        text-white
        bg-gradient-to-r ${gradient}
        rounded-full
        shadow-md
        ring-2 ring-white dark:ring-neutral-900
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
}

// Role Badge
interface RoleBadgeProps {
  role: string;
  gradient?: string;
  className?: string;
}

export function RoleBadge({
  role,
  gradient,
  className = ''
}: RoleBadgeProps) {
  // Default gradients by common role types
  const roleGradients: Record<string, string> = {
    admin: 'from-purple-600 to-indigo-600',
    manager: 'from-blue-600 to-cyan-600',
    operator: 'from-emerald-600 to-teal-600',
    viewer: 'from-gray-600 to-slate-600',
    qc: 'from-amber-600 to-orange-600'
  };

  const roleGradient = gradient || roleGradients[role.toLowerCase()] || 'from-indigo-600 to-purple-600';

  return (
    <span
      className={`
        inline-flex items-center
        px-3 py-1
        text-xs font-semibold
        text-white
        bg-gradient-to-r ${roleGradient}
        rounded-full
        shadow-sm
        ${className}
      `}
    >
      {role}
    </span>
  );
}

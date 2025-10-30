import React from 'react';
import { User } from 'lucide-react';
import { StatusBadge } from './Icon';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  gradient?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl'
};

const statusSizes: Record<AvatarSize, 'sm' | 'md' | 'lg'> = {
  xs: 'sm',
  sm: 'sm',
  md: 'sm',
  lg: 'md',
  xl: 'md',
  '2xl': 'lg'
};

export default function Avatar({
  src,
  alt,
  name,
  size = 'md',
  gradient = 'from-indigo-600 to-purple-600',
  status,
  showStatus = false,
  className = ''
}: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const sizeClass = sizeClasses[size];

  return (
    <div className={`relative inline-block ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={`
            ${sizeClass}
            rounded-full
            object-cover
            ring-2 ring-white dark:ring-neutral-900
            shadow-md
          `}
        />
      ) : (
        <div
          className={`
            ${sizeClass}
            rounded-full
            bg-gradient-to-br ${gradient}
            flex items-center justify-center
            text-white font-semibold
            ring-2 ring-white dark:ring-neutral-900
            shadow-md
          `}
        >
          {name ? initials : <User className="w-1/2 h-1/2" />}
        </div>
      )}

      {/* Status Badge */}
      {showStatus && status && (
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4">
          <StatusBadge
            status={status}
            size={statusSizes[size]}
            withPulse={status === 'online'}
          />
        </div>
      )}
    </div>
  );
}

// Avatar Group Component
interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    name?: string;
    gradient?: string;
  }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = 'md',
  className = ''
}: AvatarGroupProps) {
  const displayedAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  const overlapClass = {
    xs: '-ml-2',
    sm: '-ml-3',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
    '2xl': '-ml-6'
  }[size];

  return (
    <div className={`flex items-center ${className}`}>
      {displayedAvatars.map((avatar, index) => (
        <div
          key={index}
          className={`${index > 0 ? overlapClass : ''} ring-2 ring-white dark:ring-neutral-900 rounded-full`}
        >
          <Avatar
            {...avatar}
            size={size}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={`
            ${overlapClass}
            ${sizeClasses[size]}
            rounded-full
            bg-gradient-to-br from-gray-400 to-gray-500
            flex items-center justify-center
            text-white font-semibold
            ring-2 ring-white dark:ring-neutral-900
            shadow-md
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

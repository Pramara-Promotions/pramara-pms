import * as Icons from 'lucide-react';
import React from 'react';

export type IconName = keyof typeof Icons;

export type IconProps = {
  name: IconName;
  className?: string;
  size?: number;
  color?: string;
};

export function Icon({ name, className, size = 16, color }: IconProps) {
  const LucideIcon = Icons[name] as React.ComponentType<any>;
  if (!LucideIcon) return null;
  return <LucideIcon className={className} size={size} color={color} />;
}

// Semantic aliases for consistent usage
export const AppIcons = {
  status: {
    success: 'CheckCircle',
    warning: 'AlertTriangle',
    danger: 'AlertOctagon',
    info: 'Info',
  },
  actions: {
    add: 'Plus',
    edit: 'Pencil',
    delete: 'Trash2',
    open: 'ExternalLink',
    copy: 'Copy',
    more: 'MoreVertical',
  },
  data: {
    user: 'User',
    calendar: 'Calendar',
    tag: 'Tag',
    attachment: 'Paperclip',
    comment: 'MessageSquare',
    priority: 'Flag',
  },
} as const;

/**
 * Mobile-Optimized Task Card
 * Touch-friendly task card with swipe gestures
 */

import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Task } from '../state/tasks.store';
import { 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ChevronRight,
  Flag,
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { useSwipeGesture } from '../../../utils/responsive';

interface MobileTaskCardProps {
  task: Task;
  onSwipeLeft?: (task: Task) => void;
  onSwipeRight?: (task: Task) => void;
  onTap?: (task: Task) => void;
  compact?: boolean;
}

export function MobileTaskCard({
  task,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  compact = false,
}: MobileTaskCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
    onSwipeLeft: onSwipeLeft ? () => onSwipeLeft(task) : undefined,
    onSwipeRight: onSwipeRight ? () => onSwipeRight(task) : undefined,
    threshold: 100,
  });

  // Status colors
  const statusColors = {
    red: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
    amber: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
    green: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
  };

  // Priority icons
  const priorityIcons = {
    high: <Flag className="w-4 h-4 text-red-500" />,
    medium: <Flag className="w-4 h-4 text-amber-500" />,
    low: <Flag className="w-4 h-4 text-gray-400" />,
  };

  // Compact view (for lists)
  if (compact) {
    return (
      <div
        className={`
          min-h-[60px] flex items-center gap-3 p-3 
          border-l-4 ${statusColors[task.status || 'amber']}
          rounded-r-lg active:scale-[0.98] transition-transform
          ${isActive ? 'scale-[0.98]' : ''}
        `}
        onTouchStart={() => setIsActive(true)}
        onTouchEnd={() => setIsActive(false)}
        onClick={() => onTap?.(task)}
      >
        {/* Left: Status indicator */}
        <div className="flex-shrink-0">
          {task.status === 'green' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : task.status === 'red' ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600" />
          )}
        </div>

        {/* Center: Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {task.priority && priorityIcons[task.priority]}
              <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {task.name}
            </h3>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {task.assignee && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assignee}
              </span>
            )}
              {task.due && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                  {new Date(task.due).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            )}
          </div>
        </div>

        {/* Right: Chevron */}
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    );
  }

  // Full card view
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        border-l-4 ${statusColors[task.status || 'amber']}
        bg-white dark:bg-gray-800
        shadow-sm hover:shadow-md transition-shadow
        ${isActive ? 'scale-[0.98]' : ''}
      `}
      style={{ transform: `translateX(${swipeOffset}px)` }}
      onTouchStart={(e) => {
        setIsActive(true);
        handleTouchStart(e as any);
      }}
      onTouchEnd={(e) => {
        setIsActive(false);
        handleTouchEnd(e as any);
        setSwipeOffset(0);
      }}
      onClick={() => onTap?.(task)}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.priority && priorityIcons[task.priority]}
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {task.section || 'Pre-Prod'}
              </span>
            </div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 leading-tight">
            {task.name}
            </h3>
          </div>

          {/* Status icon */}
          <div className="flex-shrink-0">
            {task.status === 'green' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : task.status === 'red' ? (
              <AlertCircle className="w-6 h-6 text-red-600" />
            ) : (
              <Clock className="w-6 h-6 text-amber-600" />
            )}
          </div>
        </div>

      </div>

      {/* Details */}
      <div className="px-4 pb-4 space-y-2">
        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs">
              {task.assignee.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-700 dark:text-gray-300">
              {task.assignee}
            </span>
          </div>
        )}

        {/* Due date */}
          {task.due && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
                Due {new Date(task.due).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Footer: Metadata counts */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {task.attachments && task.attachments > 0 && (
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            <span>{task.attachments}</span>
          </div>
        )}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                {task.tags[0]}
              </span>
              {task.tags.length > 1 && (
                <span className="text-gray-400">+{task.tags.length - 1}</span>
              )}
            </div>
          )}
      </div>

      {/* Swipe actions overlay (hidden by default) */}
      {(onSwipeLeft || onSwipeRight) && (
        <>
          {onSwipeRight && (
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-green-500 flex items-center justify-center text-white">
              <CheckCircle className="w-6 h-6" />
            </div>
          )}
          {onSwipeLeft && (
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

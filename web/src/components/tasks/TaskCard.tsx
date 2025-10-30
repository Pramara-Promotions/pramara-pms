import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Paperclip,
  MessageSquare,
  Flag,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useReducedMotion } from '../../utils/animations';

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    status: 'green' | 'amber' | 'red';
    priority: 'Low' | 'Med' | 'High';
    assignee?: string;
    dueDate?: string;
    tags?: string[];
    attachments?: number;
  };
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
}

export default function TaskCard({ task, onClick, onEdit, onDelete, onAssign }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: reducedMotion ? undefined : transition || 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 1.05 : 1,
    rotate: isDragging ? '2deg' : '0deg',
    zIndex: isDragging ? 50 : 'auto',
    boxShadow: isDragging ? '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.15)' : undefined
  };

  // Status config
  const statusConfig = {
    green: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'ring-emerald-500', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', ring: 'ring-amber-500', dot: 'bg-amber-500' },
    red: { bg: 'bg-red-50 dark:bg-red-950/30', ring: 'ring-red-500', dot: 'bg-red-500' }
  };

  // Priority config with gradient backgrounds
  const priorityConfig = {
    Low: { 
      bg: 'bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20', 
      text: 'text-blue-700 dark:text-blue-300', 
      icon: '🔵',
      border: 'border-blue-300 dark:border-blue-700'
    },
    Med: { 
      bg: 'bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-900/20', 
      text: 'text-yellow-700 dark:text-yellow-300', 
      icon: '🟡',
      border: 'border-yellow-300 dark:border-yellow-700'
    },
    High: { 
      bg: 'bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-900/20', 
      text: 'text-red-700 dark:text-red-300', 
      icon: '🔴',
      border: 'border-red-300 dark:border-red-700'
    }
  };

  const statusStyle = statusConfig[task.status];
  const priorityStyle = priorityConfig[task.priority];

  // Due date formatting with urgency levels
  const formatDueDate = (date?: string) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        text: `${Math.abs(diffDays)}d overdue`, 
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/40',
        urgent: true
      };
    } else if (diffDays === 0) {
      return { 
        text: 'Due today', 
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        urgent: true
      };
    } else if (diffDays === 1) {
      return { 
        text: 'Due tomorrow', 
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        urgent: false
      };
    } else if (diffDays <= 7) {
      return { 
        text: `${diffDays}d left`, 
        color: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-100 dark:bg-gray-800',
        urgent: false
      };
    }
    return { 
      text: dueDate.toLocaleDateString(), 
      color: 'text-gray-500 dark:text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-800',
      urgent: false
    };
  };

  const dueDateInfo = formatDueDate(task.dueDate);

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setShowMenu(false);
    action();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        group relative rounded-lg border p-3 cursor-pointer
        transition-all duration-200 ease-out
        hover:shadow-xl hover:-translate-y-0.5
        ${!reducedMotion && 'hover:scale-[1.02]'}
        ${statusStyle.bg} ${statusStyle.ring} ring-1
        dark:border-neutral-700
        ${isDragging ? 'cursor-grabbing shadow-2xl ring-2 ring-indigo-500/50' : 'cursor-grab'}
        animate-[fadeIn_200ms_ease-out]
      `}
    >
      {/* Header: Status & Menu */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* Status Indicator Dot */}
        <div className={`w-2 h-2 rounded-full ${statusStyle.dot} animate-pulse`} />
        
        {/* Quick Actions Menu (on hover) */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <MoreVertical className="w-3 h-3 text-gray-600 dark:text-neutral-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-6 z-50 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 overflow-hidden animate-[slideDown_150ms_ease-out]">
              <button
                onClick={(e) => handleMenuClick(e, () => onEdit?.())}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={(e) => handleMenuClick(e, () => onAssign?.())}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2"
              >
                <UserPlus className="w-3 h-3" />
                Assign
              </button>
              <button
                onClick={(e) => handleMenuClick(e, () => onDelete?.())}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Priority Badge with enhanced styling */}
      <div className="mb-2">
        <span className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
          ${priorityStyle.bg} ${priorityStyle.text}
          border ${priorityStyle.border}
          shadow-sm
        `}>
          <span>{priorityStyle.icon}</span>
          <span>{task.priority}</span>
        </span>
      </div>

      {/* Task Name */}
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 pr-6 line-clamp-2">
        {task.name}
      </h4>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-800/50 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Urgent Due Date Banner */}
      {dueDateInfo?.urgent && (
        <div className={`mb-2 px-2 py-1 rounded ${dueDateInfo.bg} flex items-center gap-1`}>
          <AlertCircle className={`w-3 h-3 ${dueDateInfo.color}`} />
          <span className={`text-xs font-medium ${dueDateInfo.color}`}>
            {dueDateInfo.text}
          </span>
        </div>
      )}

      {/* Footer: Assignee, Due Date, Counts */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          {/* Assignee Avatar */}
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {task.assignee.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-600 dark:text-neutral-400 max-w-[70px] truncate">
                {task.assignee}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-600">
              <User className="w-3 h-3" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Due Date (if not urgent - urgent shown in banner) */}
          {dueDateInfo && !dueDateInfo.urgent && (
            <div className={`flex items-center gap-1 text-xs ${dueDateInfo.color}`}>
              <Clock className="w-3 h-3" />
              <span>{dueDateInfo.text}</span>
            </div>
          )}

          {/* Attachments Count with icon */}
          {task.attachments && task.attachments > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-neutral-500">
              <Paperclip className="w-3 h-3" />
              <span className="font-medium">{task.attachments}</span>
            </div>
          )}
        </div>
      </div>

      {/* Drag Handle Visual Indicator (gradient overlay on hover) */}
      <div className="
        absolute inset-0 rounded-lg
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        pointer-events-none
        bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5
        ring-2 ring-inset ring-indigo-500/20
      " />

      {/* Dragging state indicator */}
      {isDragging && (
        <div className="absolute inset-0 rounded-lg bg-indigo-500/20 ring-2 ring-indigo-500 animate-pulse" />
      )}
    </div>
  );
}

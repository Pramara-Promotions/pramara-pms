import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Plus, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useReducedMotion } from '../../utils/animations';

interface Task {
  id: string;
  name: string;
  status: 'green' | 'amber' | 'red';
  priority: 'Low' | 'Med' | 'High';
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  attachments?: number;
}

interface ColumnConfig {
  id: string;
  name: string;
  section: string;
  position: number;
  wipLimit?: number;
  color?: string;
  taskCount: number;
}

interface KanbanColumnProps {
  column: ColumnConfig;
  tasks: Task[];
  projectId?: number;
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onColumnMenu?: () => void;
}

export default function KanbanColumn({
  column,
  tasks,
  projectId,
  onTaskClick,
  onAddTask,
  onColumnMenu
}: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotion();

  const { setNodeRef, isOver } = useDroppable({
    id: column.section
  });

  // WIP limit check
  const isOverLimit = column.wipLimit && tasks.length >= column.wipLimit;

  // Color for column header
  const headerColor = column.color || '#6366f1';

  return (
    <div className={`flex flex-col h-full min-w-[280px] max-w-[320px] transition-all duration-300 ${collapsed ? 'min-w-[60px] max-w-[60px]' : ''}`}>
      {/* Column Header */}
      <div
        className="flex items-center justify-between p-3 rounded-t-lg border-b dark:border-neutral-700 cursor-pointer group hover:opacity-90 transition-opacity"
        style={{
          background: `linear-gradient(135deg, ${headerColor}15, ${headerColor}05)`,
          borderTop: `3px solid ${headerColor}`
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}>
          {collapsed ? (
            <div className="transform -rotate-90 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
              {column.name.substring(0, 3)}
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {column.name}
              </h3>
              <span className={`
                px-2 py-0.5 text-xs font-medium rounded-full
                ${isOverLimit
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400'
                }
              `}>
                {tasks.length}
                {column.wipLimit && ` / ${column.wipLimit}`}
              </span>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask?.();
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              title="Add task"
            >
              <Plus className="w-4 h-4 text-gray-600 dark:text-neutral-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onColumnMenu?.();
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              title="Column settings"
            >
              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-neutral-400" />
            </button>
            <button
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronDown className="w-4 h-4 text-gray-600 dark:text-neutral-400" /> : <ChevronUp className="w-4 h-4 text-gray-600 dark:text-neutral-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Tasks Container */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          className={`
            flex-1 overflow-y-auto p-3 space-y-3
            rounded-b-lg bg-gray-50 dark:bg-neutral-900/50
            border border-t-0 dark:border-neutral-700
            transition-all duration-300 ease-out
            ${isOver ? 'bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 ring-2 ring-inset ring-indigo-500/60 shadow-inner' : ''}
            ${isOverLimit ? 'ring-2 ring-red-500/30' : ''}
            ${!reducedMotion && isOver ? 'animate-pulse' : ''}
          `}
          style={{ minHeight: '200px', maxHeight: 'calc(100vh - 300px)' }}
        >
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.length === 0 ? (
              <div className={`
                flex flex-col items-center justify-center h-32 text-sm text-gray-400 dark:text-neutral-600
                ${isOver ? 'text-indigo-500 dark:text-indigo-400 font-medium' : ''}
                transition-colors duration-200
              `}>
                {isOver ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-2 animate-bounce">
                      <Plus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span>Drop task here</span>
                  </>
                ) : (
                  'No tasks'
                )}
              </div>
            ) : (
              tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  onClick={() => onTaskClick?.(task)}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}

      {/* WIP Limit Warning */}
      {isOverLimit && (
        <div className="mt-2 px-3 py-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-900">
          ⚠️ WIP limit reached ({column.wipLimit})
        </div>
      )}
    </div>
  );
}

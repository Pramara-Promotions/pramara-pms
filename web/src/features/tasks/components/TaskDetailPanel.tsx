/**
 * Task Detail Panel - Asana-style Slide-in Panel
 * Slides from right, full-height, with overlay
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTasks, Task, Section, RAG, Priority } from '../state/tasks.store';
import {
  X,
  Link as LinkIcon,
  ExternalLink,
  MoreVertical,
  Calendar,
  User,
  Flag,
  Tag,
  Paperclip,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { responsiveClasses } from '../../../utils/responsive';

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const {
    tasks,
    updateTask,
    getActivitiesFor,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    getSubtasksFor,
  } = useTasks();
  const [task, setTask] = useState<Task | null>(null);
  const [newSubtask, setNewSubtask] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load task
  useEffect(() => {
    if (taskId) {
      const foundTask = tasks.find((t) => t.id === taskId);
      setTask(foundTask || null);
    } else {
      setTask(null);
    }
  }, [taskId, tasks]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Save field with optimistic update
  const handleSave = async (field: string, value: any) => {
    if (!task) return;
    
    setSaving(true);
    // Optimistic update
    setTask({ ...task, [field]: value });
    
    // Actual save
    try {
      updateTask(task.id, { [field]: value });
      setTimeout(() => setSaving(false), 500);
    } catch (error) {
      console.error('Save failed:', error);
      setSaving(false);
    }
  };

  // Don't render if no task
  if (!taskId || !task) return null;

  // Status icon
  const StatusIcon = 
    task.status === 'green' ? CheckCircle :
    task.status === 'red' ? AlertCircle :
    Clock;
  const statusColor = 
    task.status === 'green' ? 'text-green-600' :
    task.status === 'red' ? 'text-red-600' :
    'text-amber-600';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 w-full md:w-[500px] lg:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-slideInRight"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-start gap-3">
            {/* Status Checkbox */}
            <button
              onClick={() => {
                const newStatus: RAG = task.status === 'green' ? 'amber' : 'green';
                handleSave('status', newStatus);
              }}
              className={`
                flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                ${task.status === 'green' 
                  ? 'bg-green-100 border-green-600 dark:bg-green-900/30' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                }
                transition-colors ${responsiveClasses.button}
              `}
            >
              {task.status === 'green' && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
            </button>

            {/* Title */}
            <div className="flex-1 min-w-0">
              {editingField === 'name' ? (
                <input
                  type="text"
                  defaultValue={task.name}
                  autoFocus
                  onBlur={(e) => {
                    handleSave('name', e.target.value);
                    setEditingField(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave('name', e.currentTarget.value);
                      setEditingField(null);
                    }
                  }}
                  className="w-full text-xl font-semibold bg-transparent border-0 border-b-2 border-indigo-500 focus:outline-none text-gray-900 dark:text-white"
                />
              ) : (
                <h2
                  onClick={() => setEditingField('name')}
                  className="text-xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {task.name}
                </h2>
              )}
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                  {task.status === 'green' ? 'On Track' : 
                   task.status === 'red' ? 'At Risk' : 
                   'Needs Attention'}
                </span>
                <span>•</span>
                <span>{task.section}</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`
                flex-shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800
                ${responsiveClasses.button}
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex gap-2 mt-4">
            <button
              className={`
                flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors
                ${responsiveClasses.button}
              `}
            >
              <LinkIcon className="w-4 h-4" />
              Copy link
            </button>
            <button
              className={`
                flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors
                ${responsiveClasses.button}
              `}
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </button>
            <button
              className={`
                flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors
                ${responsiveClasses.button}
              `}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Assignee */}
          <DetailField
            label="Assignee"
            icon={<User className="w-5 h-5" />}
            value={task.assignee}
            onSave={(value) => handleSave('assignee', value)}
            type="text"
          />

          {/* Due Date */}
          <DetailField
            label="Due Date"
            icon={<Calendar className="w-5 h-5" />}
            value={task.due}
            onSave={(value) => handleSave('due', value)}
            type="date"
          />

          {/* Priority */}
          <DetailField
            label="Priority"
            icon={<Flag className="w-5 h-5" />}
            value={task.priority}
            onSave={(value) => handleSave('priority', value)}
            type="select"
            options={['Low', 'Med', 'High']}
          />

          {/* Section */}
          <DetailField
            label="Section"
            icon={<Circle className="w-5 h-5" />}
            value={task.section}
            onSave={(value) => handleSave('section', value)}
            type="select"
            options={['Pre-Prod', 'Production', 'QC', 'Dispatch']}
          />

          {/* Tags */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Tag className="w-5 h-5 text-gray-400" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {task.tags && task.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
              <button className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                + Add tag
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Paperclip className="w-5 h-5 text-gray-400" />
              Attachments
              {task.attachments && task.attachments > 0 && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {task.attachments}
                </span>
              )}
            </label>
            <button className={`
              w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600
              rounded-xl text-sm text-gray-600 dark:text-gray-400
              hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10
              transition-colors ${responsiveClasses.button}
            `}>
              Drop files or click to upload
            </button>
          </div>

          {/* Subtasks */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Subtasks
            </h3>
            <div className="space-y-2">
              {getSubtasksFor(task.id).map((st) => (
                <div key={st.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleSubtask(st.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={st.completed ? 'line-through text-gray-400' : ''}>{st.title}</span>
                  </label>
                  <button
                    onClick={() => deleteSubtask(st.id)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
                <button
                  onClick={() => {
                    if (!newSubtask.trim()) return;
                    addSubtask(task.id, newSubtask.trim());
                    setNewSubtask('');
                  }}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Activity
            </h3>
            <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              {getActivitiesFor(task.id).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {(a.actor || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {a.actor || 'System'}
                      </span>{' '}
                      {a.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {getActivitiesFor(task.id).length === 0 && (
                <p className="text-xs text-gray-400">No activity yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div>
              Created {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'recently'}
            </div>
            {saving && (
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Reusable Detail Field Component
interface DetailFieldProps {
  label: string;
  icon: React.ReactNode;
  value?: string;
  onSave: (value: string) => void;
  type: 'text' | 'date' | 'select';
  options?: string[];
}

function DetailField({ label, icon, value, onSave, type, options }: DetailFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');

  const handleSave = () => {
    onSave(localValue);
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <span className="text-gray-400">{icon}</span>
        {label}
      </label>
      
      {isEditing ? (
        type === 'select' && options ? (
          <select
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onSave(e.target.value);
              setIsEditing(false);
            }}
            onBlur={handleSave}
            autoFocus
            className={`
              w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
              rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500
              ${responsiveClasses.button}
            `}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            className={`
              w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
              rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500
              ${responsiveClasses.button}
            `}
          />
        )
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {value || <span className="text-gray-400">Not set</span>}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Clock,
  User,
  Calendar,
  Flag,
  Tag,
  Paperclip,
  MessageSquare,
  Activity,
  CheckCircle2,
  Circle,
  Trash2,
  Save,
  Plus,
  Upload,
  Link2,
  ArrowRight,
  ArrowLeft,
  Search,
  AlertCircle,
  FileImage,
  FileText,
  FileArchive,
  Download,
} from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

interface Dependency {
  id: string;
  taskId: string;
  taskName: string;
  type: 'blocks' | 'blocked_by';
  status: 'todo' | 'in-progress' | 'review' | 'done';
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Task {
  id: string;
  name: string;
  section: string;
  status: 'green' | 'amber' | 'red';
  priority: 'Low' | 'Med' | 'High';
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  subtasks?: Subtask[];
  dependencies?: Dependency[];
  attachments?: Attachment[];
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Activity {
  id: string;
  type: 'created' | 'updated' | 'commented' | 'assigned' | 'moved' | 'status_changed';
  user: string;
  timestamp: string;
  details?: string;
}

interface TaskDetailPanelProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function TaskDetailPanel({ taskId, isOpen, onClose, onUpdate }: TaskDetailPanelProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  
  // Dependencies state
  const [showDependencySearch, setShowDependencySearch] = useState(false);
  const [dependencySearch, setDependencySearch] = useState('');
  const [dependencyType, setDependencyType] = useState<'blocks' | 'blocked_by'>('blocks');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Attachment states
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
    }
  }, [isOpen, taskId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  async function loadTaskDetails() {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const res = await fetch(`/api/tasks/${taskId}`);
      // const data = await res.json();
      // setTask(data.task);
      // setActivities(data.activities);
      
      // Mock data for now
      setTask({
        id: taskId,
        name: 'Sample Task',
        section: 'Production',
        status: 'amber',
        priority: 'High',
        assignee: 'John Doe',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        tags: ['urgent', 'production'],
        subtasks: [
          {
            id: 'st-1',
            title: 'Review specifications',
            completed: true,
            position: 0
          },
          {
            id: 'st-2',
            title: 'Prepare materials',
            completed: true,
            position: 1
          },
          {
            id: 'st-3',
            title: 'Quality check',
            completed: false,
            position: 2
          },
          {
            id: 'st-4',
            title: 'Final approval',
            completed: false,
            position: 3
          }
        ],
        attachments: [
          { id: 'att1', name: 'design-specs.pdf', size: 2457600, type: 'application/pdf', url: '#', uploadedBy: 'John Doe', uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'att2', name: 'mockup-v2.fig', size: 15728640, type: 'application/octet-stream', url: '#', uploadedBy: 'Jane Smith', uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'att3', name: 'screenshot.png', size: 524288, type: 'image/png', url: '#', uploadedBy: 'John Doe', uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
        ],
        position: 0,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      });

      setActivities([
        {
          id: '1',
          type: 'created',
          user: 'Jane Smith',
          timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
          details: 'Created this task'
        },
        {
          id: '2',
          type: 'assigned',
          user: 'Admin',
          timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
          details: 'Assigned to John Doe'
        },
        {
          id: '3',
          type: 'moved',
          user: 'John Doe',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          details: 'Moved from Pre_Prod to Production'
        },
        {
          id: '4',
          type: 'status_changed',
          user: 'John Doe',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: 'Changed status to amber'
        }
      ]);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  }

  function getActivityIcon(type: Activity['type']) {
    switch (type) {
      case 'created': return <Plus className="w-4 h-4 text-green-600" />;
      case 'updated': return <Edit2 className="w-4 h-4 text-blue-600" />;
      case 'commented': return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'assigned': return <User className="w-4 h-4 text-indigo-600" />;
      case 'moved': return <Activity className="w-4 h-4 text-amber-600" />;
      case 'status_changed': return <Flag className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Subtask Functions
  function addSubtask() {
    const title = newSubtask.trim();
    if (!title || !task) return;

    const subtask: Subtask = {
      id: `subtask-${Date.now()}`,
      title,
      completed: false,
      position: task.subtasks?.length || 0
    };

    setTask({
      ...task,
      subtasks: [...(task.subtasks || []), subtask]
    });
    setNewSubtask('');
  }

  function toggleSubtask(subtaskId: string) {
    if (!task) return;
    setTask({
      ...task,
      subtasks: task.subtasks?.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      )
    });
  }

  function startEditSubtask(subtask: Subtask) {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  }

  function saveEditSubtask() {
    if (!task || !editingSubtaskId) return;
    const title = editingSubtaskTitle.trim();
    if (!title) return;

    setTask({
      ...task,
      subtasks: task.subtasks?.map(st =>
        st.id === editingSubtaskId ? { ...st, title } : st
      )
    });
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  }

  function cancelEditSubtask() {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  }

  function deleteSubtask(subtaskId: string) {
    if (!task) return;
    if (!confirm('Delete this subtask?')) return;

    setTask({
      ...task,
      subtasks: task.subtasks?.filter(st => st.id !== subtaskId)
    });
  }

  const subtaskProgress = task?.subtasks
    ? {
        total: task.subtasks.length,
        completed: task.subtasks.filter(st => st.completed).length
      }
    : { total: 0, completed: 0 };

  // Dependency functions
  async function searchTasks(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    // TODO: Replace with actual API call
    // Mock search results
    const mockResults = [
      { id: 'task-101', name: 'Complete authentication system', status: 'in-progress' },
      { id: 'task-102', name: 'Set up CI/CD pipeline', status: 'todo' },
      { id: 'task-103', name: 'Write documentation', status: 'todo' },
      { id: 'task-104', name: 'Code review process', status: 'done' },
    ].filter(t => 
      t.name.toLowerCase().includes(query.toLowerCase()) && 
      t.id !== taskId &&
      !task?.dependencies?.some(d => d.taskId === t.id)
    );
    
    setSearchResults(mockResults);
  }

  async function addDependency(targetTaskId: string, targetTaskName: string, targetStatus: string) {
    if (!task) return;

    // Check for circular dependencies
    if (dependencyType === 'blocked_by') {
      const wouldBeCircular = task.dependencies?.some(
        d => d.taskId === targetTaskId && d.type === 'blocks'
      );
      if (wouldBeCircular) {
        alert('This would create a circular dependency!');
        return;
      }
    }

    const newDependency: Dependency = {
      id: `dep-${Date.now()}`,
      taskId: targetTaskId,
      taskName: targetTaskName,
      type: dependencyType,
      status: targetStatus as any,
      createdAt: new Date().toISOString()
    };

    setTask({
      ...task,
      dependencies: [...(task.dependencies || []), newDependency]
    });

    setShowDependencySearch(false);
    setDependencySearch('');
    setSearchResults([]);
  }

  async function removeDependency(dependencyId: string) {
    if (!task) return;
    if (!confirm('Remove this dependency?')) return;

    setTask({
      ...task,
      dependencies: task.dependencies?.filter(d => d.id !== dependencyId)
    });
  }

  function getDependencyStatusColor(status: string) {
    switch (status) {
      case 'done':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'in-progress':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'review':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  }

  // Attachment functions
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function getFileIcon(type: string): any {
    if (type.startsWith('image/')) return FileImage;
    if (type === 'application/pdf') return FileText;
    if (type.includes('zip') || type.includes('rar')) return FileArchive;
    return Paperclip;
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0 || !task) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/zip', 'application/x-rar',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream' // For figma files etc
    ];

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.fig')) {
        alert(`File type ${file.type} is not allowed.`);
        continue;
      }
    }

    setUploadingFiles(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // TODO: Replace with actual file upload API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newAttachments: Attachment[] = Array.from(files).map((file, index) => ({
      id: `att-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      url: URL.createObjectURL(file),
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString()
    }));

    setTask({
      ...task,
      attachments: [...(task.attachments || []), ...newAttachments]
    });

    setUploadingFiles(false);
    setUploadProgress(0);
  }

  async function deleteAttachment(attachmentId: string) {
    if (!task) return;
    if (!confirm('Delete this attachment?')) return;

    // TODO: Call API to delete file
    setTask({
      ...task,
      attachments: task.attachments?.filter(a => a.id !== attachmentId)
    });
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }

  const progressPercent = subtaskProgress.total > 0
    ? Math.round((subtaskProgress.completed / subtaskProgress.total) * 100)
    : 0;


  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-full lg:w-[500px] z-50
        bg-white dark:bg-neutral-900
        shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-neutral-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : task ? (
          <div className="flex-1 overflow-y-auto">
            {/* Task Info Section */}
            <div className="p-6 space-y-6">
              {/* Task Name */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                    {task.name}
                  </h3>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600 dark:text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-1 block">
                    Status
                  </label>
                  <select
                    value={task.status}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                  >
                    <option value="green">🟢 Green</option>
                    <option value="amber">🟡 Amber</option>
                    <option value="red">🔴 Red</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-1 block">
                    Priority
                  </label>
                  <select
                    value={task.priority}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                  >
                    <option value="Low">🔵 Low</option>
                    <option value="Med">🟡 Medium</option>
                    <option value="High">🔴 High</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-1 block">
                    <User className="w-3 h-3 inline mr-1" />
                    Assignee
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                      {task.assignee?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {task.assignee || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-1 block">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-2 block">
                  <Tag className="w-3 h-3 inline mr-1" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    >
                      {tag}
                    </span>
                  ))}
                  <button className="px-3 py-1 text-sm rounded-full border-2 border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors">
                    + Add tag
                  </button>
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    Subtasks ({subtaskProgress.completed}/{subtaskProgress.total})
                  </label>
                  {subtaskProgress.total > 0 && (
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {progressPercent}% Complete
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {subtaskProgress.total > 0 && (
                  <div className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}

                {/* Subtask List */}
                <div className="space-y-2 mb-3">
                  {task.subtasks?.map((subtask, index) => (
                    <div
                      key={subtask.id}
                      className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSubtask(subtask.id)}
                        className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 dark:border-neutral-600 flex items-center justify-center hover:border-indigo-500 transition-colors"
                      >
                        {subtask.completed && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>

                      {/* Title (Editable) */}
                      {editingSubtaskId === subtask.id ? (
                        <input
                          type="text"
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onBlur={saveEditSubtask}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditSubtask();
                            if (e.key === 'Escape') cancelEditSubtask();
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm rounded border border-indigo-500 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span
                          onClick={() => startEditSubtask(subtask)}
                          className={`flex-1 text-sm cursor-pointer ${
                            subtask.completed
                              ? 'line-through text-gray-400 dark:text-neutral-600'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {subtask.title}
                        </span>
                      )}

                      {/* Delete Button (Hidden until hover) */}
                      <button
                        onClick={() => deleteSubtask(subtask.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  ))}

                  {task.subtasks?.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-neutral-500 text-center py-4">
                      No subtasks yet. Add one below!
                    </div>
                  )}
                </div>

                {/* Add Subtask Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    placeholder="Add a subtask... (Press Enter)"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={addSubtask}
                    disabled={!newSubtask.trim()}
                    className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide">
                    <Link2 className="w-3 h-3 inline mr-1" />
                    Dependencies ({(task.dependencies || []).length})
                  </label>
                  <button
                    onClick={() => setShowDependencySearch(true)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    + Add
                  </button>
                </div>

                {/* Dependencies List */}
                {task.dependencies && task.dependencies.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {/* Blocked By */}
                    {task.dependencies.filter(d => d.type === 'blocked_by').length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
                          <ArrowLeft className="w-3 h-3" />
                          Blocked By
                        </div>
                        {task.dependencies
                          .filter(d => d.type === 'blocked_by')
                          .map(dep => (
                            <div
                              key={dep.id}
                              className="group flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-gray-50 to-transparent dark:from-neutral-800/30 dark:to-transparent hover:from-indigo-50 hover:to-purple-50/30 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20 transition-all duration-200"
                            >
                              <ArrowLeft className="w-4 h-4 text-gray-400 dark:text-neutral-500 flex-shrink-0" />
                              <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">
                                {dep.taskName}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDependencyStatusColor(dep.status)}`}>
                                {dep.status}
                              </span>
                              <button
                                onClick={() => removeDependency(dep.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                              >
                                <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Blocks */}
                    {task.dependencies.filter(d => d.type === 'blocks').length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Blocks
                        </div>
                        {task.dependencies
                          .filter(d => d.type === 'blocks')
                          .map(dep => (
                            <div
                              key={dep.id}
                              className="group flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-gray-50 to-transparent dark:from-neutral-800/30 dark:to-transparent hover:from-indigo-50 hover:to-purple-50/30 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20 transition-all duration-200"
                            >
                              <ArrowRight className="w-4 h-4 text-gray-400 dark:text-neutral-500 flex-shrink-0" />
                              <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">
                                {dep.taskName}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDependencyStatusColor(dep.status)}`}>
                                {dep.status}
                              </span>
                              <button
                                onClick={() => removeDependency(dep.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                              >
                                <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-neutral-500 italic py-2">
                    No dependencies
                  </p>
                )}
              </div>

              {/* Attachments */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-2 block">
                  <Paperclip className="w-3 h-3 inline mr-1" />
                  Attachments ({(task.attachments || []).length})
                </label>

                {/* Attachment List */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {task.attachments.map(attachment => {
                      const FileIcon = getFileIcon(attachment.type);
                      const isImage = attachment.type.startsWith('image/');

                      return (
                        <div
                          key={attachment.id}
                          className="group flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-transparent dark:from-neutral-800/30 dark:to-transparent hover:from-indigo-50 hover:to-purple-50/30 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20 transition-all duration-200"
                        >
                          {/* File Preview/Icon */}
                          <div className="flex-shrink-0">
                            {isImage ? (
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <FileIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-neutral-500">
                              {formatFileSize(attachment.size)} · {attachment.uploadedBy}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={attachment.url}
                              download={attachment.name}
                              className="p-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                // TODO: Implement actual download
                                alert('Download functionality will be implemented with actual file storage');
                              }}
                            >
                              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </a>
                            <button
                              onClick={() => deleteAttachment(attachment.id)}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative w-full px-4 py-6 rounded-lg border-2 border-dashed transition-all ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                      : 'border-gray-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-500'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingFiles}
                  />
                  <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <Upload className={`w-6 h-6 ${dragActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-neutral-500'}`} />
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      {uploadingFiles ? 'Uploading...' : dragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-neutral-500">
                      Max 10MB · Images, PDFs, Docs, Archives
                    </p>
                  </div>

                  {/* Upload Progress */}
                  {uploadingFiles && (
                    <div className="mt-3">
                      <div className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-gray-500 dark:text-neutral-500 mt-1">
                        {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="border-t dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
              <div className="px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Activity Feed
                </h3>

                {/* Comment Input */}
                <div className="mb-6">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:from-indigo-700 hover:to-purple-700 transition-all">
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-4">
                  {activities.map((activity, idx) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border-2 border-gray-200 dark:border-neutral-700 flex items-center justify-center">
                          {getActivityIcon(activity.type)}
                        </div>
                        {idx < activities.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-neutral-700 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                              {activity.user}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-neutral-500">
                              {activity.details}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-neutral-600">
                            {formatTimestamp(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Task not found
          </div>
        )}

        {/* Footer Actions */}
        {task && (
          <div className="px-6 py-4 border-t dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50 flex items-center justify-between">
            <button
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Task
            </button>
            <button
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Add Dependency Modal */}
      {showDependencySearch && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Dependency
              </h3>
              <button
                onClick={() => {
                  setShowDependencySearch(false);
                  setDependencySearch('');
                  setSearchResults([]);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Dependency Type Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2 block">
                  Dependency Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDependencyType('blocked_by')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      dependencyType === 'blocked_by'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400'
                        : 'border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Blocked By</span>
                  </button>
                  <button
                    onClick={() => setDependencyType('blocks')}
                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      dependencyType === 'blocks'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400'
                        : 'border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 hover:border-gray-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    <span className="text-sm font-medium">Blocks</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-2">
                  {dependencyType === 'blocked_by' 
                    ? 'This task is blocked by the selected task'
                    : 'This task blocks the selected task'}
                </p>
              </div>

              {/* Search Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2 block">
                  Search Tasks
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500" />
                  <input
                    type="text"
                    value={dependencySearch}
                    onChange={(e) => {
                      setDependencySearch(e.target.value);
                      searchTasks(e.target.value);
                    }}
                    placeholder="Search for tasks..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm"
                  />
                </div>
              </div>

              {/* Search Results */}
              {dependencySearch && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-2 block">
                    Results ({searchResults.length})
                  </label>
                  <div className="max-h-60 overflow-y-auto space-y-1 border dark:border-neutral-700 rounded-lg p-2">
                    {searchResults.length > 0 ? (
                      searchResults.map(result => (
                        <button
                          key={result.id}
                          onClick={() => addDependency(result.id, result.name, result.status)}
                          className="w-full p-3 rounded-lg bg-gradient-to-r from-gray-50 to-transparent dark:from-neutral-800/30 dark:to-transparent hover:from-indigo-50 hover:to-purple-50/30 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20 transition-all duration-200 flex items-center justify-between gap-2"
                        >
                          <span className="text-sm text-left text-gray-700 dark:text-neutral-300">
                            {result.name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDependencyStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-neutral-500 flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-gray-400 dark:text-neutral-600" />
                        <p>No tasks found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

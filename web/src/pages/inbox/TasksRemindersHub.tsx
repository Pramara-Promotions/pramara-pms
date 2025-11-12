// web/src/pages/inbox/TasksRemindersHub.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  snoozeReminder,
  completeReminder,
  dismissReminder,
  type Reminder,
  type CreateReminderData
} from '../../lib/services/reminders';
import {
  listTasks,
  createTask,
  updateTask,
} from '../../lib/services/tasks';
import {
  Bell,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  List as ListIcon,
  Filter,
  Trash2,
  Edit,
  AlertCircle,
  User,
  Zap,
  CheckSquare,
  Square,
  MoreVertical
} from 'lucide-react';

type MainTabType = 'tasks' | 'reminders';
type TabType = 'my' | 'created' | 'all';
type ViewType = 'list' | 'calendar';
type FilterType = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';

export default function TasksRemindersHub() {
  const [mainTab, setMainTab] = useState<MainTabType>('tasks');
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateReminderModalOpen, setIsCreateReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        const result = await listTasks({});
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    },
    enabled: mainTab === 'tasks',
  });

  // Fetch reminders
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders', activeTab, filterType],
    queryFn: () => {
      const params: any = { scope: activeTab };

      if (filterType === 'completed') {
        params.status = 'completed';
      } else if (filterType !== 'all') {
        params.status = 'pending';
      }

      return listReminders(params);
    },
    enabled: mainTab === 'reminders',
  });

  const isLoading = mainTab === 'tasks' ? tasksLoading : remindersLoading;

  // Filter tasks by time
  const filteredTasks = Array.isArray(tasksData)
    ? tasksData.filter(task => {
      if (filterType === 'all') return true;
      if (filterType === 'completed') return task.status === 'done' || task.status === 'completed';

      const now = new Date();
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      if (!dueDate) return filterType === 'upcoming';

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (filterType === 'overdue') {
        return dueDate < now && task.status !== 'done' && task.status !== 'completed';
      }
      if (filterType === 'today') {
        return dueDate >= today && dueDate < tomorrow && task.status !== 'done';
      }
      if (filterType === 'upcoming') {
        return dueDate >= tomorrow && task.status !== 'done';
      }

      return true;
    })
    : [];

  // Filter reminders by time
  const filteredReminders = Array.isArray(reminders)
    ? reminders.filter(reminder => {
      if (filterType === 'all') return true;
      if (filterType === 'completed') return reminder.status === 'completed';

      const now = new Date();
      const dueDate = new Date(reminder.dueAt);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (filterType === 'overdue') {
        return dueDate < now && reminder.status === 'pending';
      }
      if (filterType === 'today') {
        return dueDate >= today && dueDate < tomorrow && reminder.status === 'pending';
      }
      if (filterType === 'upcoming') {
        return dueDate >= tomorrow && reminder.status === 'pending';
      }

      return true;
    })
    : [];

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateTaskModalOpen(false);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  // Reminder mutations
  const createReminderMutation = useMutation({
    mutationFn: createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setIsCreateReminderModalOpen(false);
    }
  });

  const updateReminderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateReminder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setEditingReminder(null);
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: deleteReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const snoozeReminderMutation = useMutation({
    mutationFn: ({ id, snoozeUntil }: { id: string; snoozeUntil: string }) =>
      snoozeReminder(id, snoozeUntil),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const completeReminderMutation = useMutation({
    mutationFn: completeReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const dismissReminderMutation = useMutation({
    mutationFn: dismissReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const handleSnooze = (id: string) => {
    const hours = prompt('Snooze for how many hours?', '1');
    if (hours) {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + parseInt(hours));
      snoozeReminderMutation.mutate({ id, snoozeUntil: snoozeUntil.toISOString() });
    }
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      deleteReminderMutation.mutate(id);
    }
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  const handleToggleTask = (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: newStatus }
    });
  };

  const getStatusBadge = (reminder: Reminder) => {
    const now = new Date();
    const dueDate = new Date(reminder.dueAt);

    if (reminder.status === 'completed') {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Completed</span>;
    }
    if (reminder.status === 'dismissed') {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Dismissed</span>;
    }
    if (reminder.status === 'snoozed') {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Snoozed</span>;
    }
    if (dueDate < now) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </span>;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dueDate >= today && dueDate < tomorrow) {
      return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">Due Today</span>;
    }

    return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Upcoming</span>;
  };

  const getTaskStatusBadge = (task: any) => {
    const statusColors: any = {
      todo: 'bg-gray-100 text-gray-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      done: 'bg-green-100 text-green-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };

    const status = task.status || 'todo';
    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700';

    return <span className={`px-2 py-1 text-xs rounded ${colorClass}`}>{status}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: any = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
      urgent: 'bg-red-200 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs rounded ${colors[priority] || colors.medium}`}>{priority}</span>;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days < 0) {
      return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
    }
    if (days === 0 && hours >= 0) {
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    if (days > 0 && days < 7) {
      return `in ${days} day${days !== 1 ? 's' : ''}`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-7 w-7 text-blue-600" />
              Tasks & Reminders
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your tasks, reminders and stay on track
            </p>
          </div>
          <button
            onClick={() => mainTab === 'tasks' ? setIsCreateTaskModalOpen(true) : setIsCreateReminderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            {mainTab === 'tasks' ? 'New Task' : 'New Reminder'}
          </button>
        </div>
      </div>

      {/* Main Tabs (Tasks / Reminders) */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setMainTab('tasks')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'tasks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <CheckSquare className="h-4 w-4" />
              Tasks
            </button>
            <button
              onClick={() => setMainTab('reminders')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'reminders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <Bell className="h-4 w-4" />
              Reminders
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded ${viewType === 'list' ? 'bg-gray-100' : ''}`}
              title="List View"
            >
              <ListIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewType('calendar')}
              className={`p-2 rounded ${viewType === 'calendar' ? 'bg-gray-100' : ''}`}
              title="Calendar View"
            >
              <Calendar className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <div className="flex gap-2">
            {(['all', 'overdue', 'today', 'upcoming', 'completed'] as FilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-3 py-1 text-sm rounded-full ${filterType === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : mainTab === 'tasks' ? (
          // Tasks View
          filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <CheckSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No tasks found</p>
              <button
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Create your first task
              </button>
            </div>
          ) : viewType === 'list' ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="mt-1 text-gray-400 hover:text-blue-600"
                      >
                        {task.status === 'done' || task.status === 'completed' ? (
                          <CheckSquare className="h-5 w-5 text-green-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`text-lg font-semibold ${(task.status === 'done' || task.status === 'completed')
                            ? 'line-through text-gray-500'
                            : 'text-gray-900'
                            }`}>
                            {task.name || task.title || 'Untitled Task'}
                          </h3>
                          {getTaskStatusBadge(task)}
                          {task.priority && getPriorityBadge(task.priority)}
                        </div>

                        {task.description && (
                          <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                        )}

                        {/* Show context link from tags */}
                        {task.tags && Array.isArray(task.tags) && (() => {
                          const urlTag = task.tags.find((t: string) => t.startsWith('url:'));
                          if (urlTag) {
                            const url = urlTag.replace('url:', '');
                            return (
                              <a
                                href={url}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2"
                              >
                                <Zap className="h-3 w-3" />
                                Go to context
                              </a>
                            );
                          }
                          return null;
                        })()}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDateTime(task.dueDate)}
                            </div>
                          )}

                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {task.assignee}
                            </div>
                          )}

                          {task.project && (
                            <div className="flex items-center gap-1">
                              <Zap className="h-4 w-4" />
                              {task.project.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-center text-gray-500">Calendar view coming soon...</p>
            </div>
          )
        ) : (
          // Reminders View
          filteredReminders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No reminders found</p>
              <button
                onClick={() => setIsCreateReminderModalOpen(true)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Create your first reminder
              </button>
            </div>
          ) : viewType === 'list' ? (
            <div className="space-y-3">
              {filteredReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{reminder.title}</h3>
                        {getStatusBadge(reminder)}
                      </div>

                      {reminder.description && (
                        <div className="text-gray-600 text-sm mb-3">
                          {(() => {
                            const desc = reminder.description;
                            const linkMatch = desc.match(/🔗 Link: (.+?)(\n|$)/);
                            const contextMatch = desc.match(/📍 Context: (.+?)(\n|$)/);
                            const cleanDesc = desc.replace(/📍 Context:.*?(\n|$)/g, '').replace(/🔗 Link:.*?(\n|$)/g, '').trim();

                            return (
                              <div>
                                {cleanDesc && <p className="mb-2">{cleanDesc}</p>}
                                {contextMatch && (
                                  <div className="flex items-start gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                                    <span>📍</span>
                                    <span>{contextMatch[1]}</span>
                                  </div>
                                )}
                                {linkMatch && (
                                  <a
                                    href={linkMatch[1]}
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    <Zap className="h-3 w-3" />
                                    Go to context
                                  </a>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(reminder.dueAt)}
                        </div>

                        {reminder.assignedTo && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {reminder.assignedTo.firstName || reminder.assignedTo.email}
                          </div>
                        )}

                        {reminder.Task && (
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            {reminder.Task.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {reminder.status === 'pending' && (
                        <>
                          <button
                            onClick={() => completeReminderMutation.mutate(reminder.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Complete"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSnooze(reminder.id)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Snooze"
                          >
                            <Clock className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => dismissReminderMutation.mutate(reminder.id)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            title="Dismiss"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditingReminder(reminder)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-center text-gray-500">Calendar view coming soon...</p>
            </div>
          )
        )}
      </div>

      {/* Create/Edit Task Modal */}
      {(isCreateTaskModalOpen || editingTask) && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setIsCreateTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={(data) => {
            if (editingTask) {
              updateTaskMutation.mutate({ id: editingTask.id, data });
            } else {
              createTaskMutation.mutate(data);
            }
          }}
        />
      )}

      {/* Create/Edit Reminder Modal */}
      {(isCreateReminderModalOpen || editingReminder) && (
        <ReminderModal
          reminder={editingReminder}
          onClose={() => {
            setIsCreateReminderModalOpen(false);
            setEditingReminder(null);
          }}
          onSubmit={(data) => {
            if (editingReminder) {
              updateReminderMutation.mutate({ id: editingReminder.id, data });
            } else {
              createReminderMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}

// Task Modal Component
function TaskModal({
  task,
  onClose,
  onSubmit
}: {
  task: any | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: task?.name || task?.title || '',
    description: task?.description || '',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    section: task?.section || 'Pre_Prod',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    onSubmit({
      name: formData.name,
      title: formData.name,
      description: formData.description || undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      priority: formData.priority,
      status: formData.status,
      section: formData.section,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Complete design mockups"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Additional details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {task ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Reminder Modal Component
function ReminderModal({
  reminder,
  onClose,
  onSubmit
}: {
  reminder: Reminder | null;
  onClose: () => void;
  onSubmit: (data: CreateReminderData) => void;
}) {
  const [formData, setFormData] = useState({
    title: reminder?.title || '',
    description: reminder?.description || '',
    dueAt: reminder?.dueAt ? new Date(reminder.dueAt).toISOString().slice(0, 16) : '',
    assignedToId: reminder?.assignedToId || '',
    taskId: reminder?.taskId || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueAt) return;

    onSubmit({
      title: formData.title,
      description: formData.description || undefined,
      dueAt: new Date(formData.dueAt).toISOString(),
      assignedToId: formData.assignedToId || undefined,
      taskId: formData.taskId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {reminder ? 'Edit Reminder' : 'New Reminder'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Review project proposal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Additional details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Due Date & Time *</label>
              <input
                required
                type="datetime-local"
                value={formData.dueAt}
                onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {reminder ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

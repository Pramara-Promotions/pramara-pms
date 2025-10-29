import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, AlertCircle, Flag, TrendingUp, Users, Calendar, Filter } from 'lucide-react';

interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  progress: number;
  tags: string[];
  completedAt: string | null;
  createdAt: string;
  project: { id: number; name: string };
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string };
  _count: {
    comments: number;
    attachments: number;
  };
}

interface TaskAnalytics {
  totalTasks: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdueTasks: number;
}

const WorkflowPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    assignedTo: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    estimatedHours: 0,
    tags: [] as string[],
  });

  const statusOptions = [
    { value: 'todo', label: 'To Do', icon: Clock, color: 'bg-gray-100 text-gray-700' },
    { value: 'in_progress', label: 'In Progress', icon: TrendingUp, color: 'bg-blue-100 text-blue-700' },
    { value: 'review', label: 'Review', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700' },
    { value: 'done', label: 'Done', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
  ];

  useEffect(() => {
    fetchTasks();
    fetchAnalytics();
    fetchProjects();
    fetchUsers();
  }, [projectFilter, statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.append('projectId', projectFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const res = await fetch(`/api/tasks?${params}`, { credentials: 'include' });
      if (res.ok) setTasks(await res.json());
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.append('projectId', projectFilter);

      const res = await fetch(`/api/tasks/analytics/summary?${params}`, { credentials: 'include' });
      if (res.ok) setAnalytics(await res.json());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?status=active', { credentials: 'include' });
      if (res.ok) setProjects(await res.json());
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = selectedTask ? `/api/tasks/${selectedTask.id}` : '/api/tasks';
      const method = selectedTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchTasks();
        fetchAnalytics();
      } else {
        alert('Failed to save task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      title: '',
      description: '',
      assignedTo: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      estimatedHours: 0,
      tags: [],
    });
    setSelectedTask(null);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      projectId: task.projectId.toString(),
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      estimatedHours: task.estimatedHours || 0,
      tags: task.tags || [],
    });
    setIsModalOpen(true);
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchTasks();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const getPriorityConfig = (priority: string) => {
    return priorityOptions.find(p => p.value === priority) || priorityOptions[1];
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const groupedTasks = statusOptions.reduce((acc, status) => {
    acc[status.value] = tasks.filter(t => t.status === status.value);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="text-blue-600" size={32} />
            Workflow Engine
          </h1>
          <p className="text-gray-600 mt-1">Manage tasks and track progress</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Task
        </button>
      </div>

      {analytics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalTasks}</p>
              </div>
              <CheckCircle className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.byStatus.in_progress || 0}</p>
              </div>
              <TrendingUp className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-600">{analytics.byStatus.done || 0}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{analytics.overdueTasks}</p>
              </div>
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="flex gap-2 border rounded-lg p-1">
          <button
            onClick={() => setViewMode('board')}
            className={`px-4 py-2 rounded ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Board View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            List View
          </button>
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Priorities</option>
          {priorityOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-4 gap-4">
          {statusOptions.map((status) => {
            const StatusIcon = status.icon;
            const statusTasks = groupedTasks[status.value] || [];
            return (
              <div key={status.value} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StatusIcon size={20} className={status.color.includes('gray') ? 'text-gray-600' : status.color.includes('blue') ? 'text-blue-600' : status.color.includes('yellow') ? 'text-yellow-600' : 'text-green-600'} />
                    <h3 className="font-bold text-gray-900">{status.label}</h3>
                  </div>
                  <span className="px-2 py-1 bg-white rounded-full text-sm font-medium">{statusTasks.length}</span>
                </div>

                <div className="space-y-3">
                  {statusTasks.map((task) => {
                    const priorityConfig = getPriorityConfig(task.priority);
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleEdit(task)}
                        className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                          <Flag size={14} className={priorityConfig.color} />
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{task.project.name}</span>
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-600'}`}>
                              <Calendar size={12} />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {task.assignee && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                            <Users size={12} />
                            {task.assignee.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task) => {
                const statusConfig = getStatusConfig(task.status);
                const priorityConfig = getPriorityConfig(task.priority);
                return (
                  <tr key={task.id} onClick={() => handleEdit(task)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{task.title}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{task.project.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{task.assignee?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${priorityConfig.color}`}>{priorityConfig.label}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {task.dueDate ? (
                        <span className={isOverdue(task.dueDate) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{selectedTask ? 'Edit' : 'New'} Task</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Project *</label>
                    <select required value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Assign To</label>
                    <select value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Due Date</label>
                    <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status *</label>
                    <select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority *</label>
                    <select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {priorityOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                    <input type="number" step="0.5" min="0" value={formData.estimatedHours} onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : selectedTask ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowPage;

import { apiGet, apiPost, apiPut } from '../../lib/api';

export function listTasks(filters: { projectId?: string; status?: string; priority?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  if (filters.status) qs.set('status', filters.status);
  if (filters.priority) qs.set('priority', filters.priority);
  return apiGet(`/api/tasks?${qs.toString()}`);
}

export function getTasksAnalytics(filters: { projectId?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  return apiGet(`/api/tasks/analytics/summary?${qs.toString()}`);
}

function mapTaskPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    title: String(input.title || ''),
    description: input.description || '',
    assignedTo: input.assignedTo || null,
    status: input.status || 'todo',
    priority: input.priority || 'medium',
    dueDate: input.dueDate || null,
    estimatedHours: input.estimatedHours != null && input.estimatedHours !== '' ? Number(input.estimatedHours) : null,
    tags: Array.isArray(input.tags) ? input.tags : [],
  };
}

export function createTask(input: any) {
  return apiPost('/api/tasks', mapTaskPayload(input));
}

export function updateTask(id: number | string, input: any) {
  return apiPut(`/api/tasks/${id}`, mapTaskPayload(input));
}

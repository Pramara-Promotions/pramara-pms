// web/src/lib/services/reminders.ts
import { apiGet, apiPost, apiPut, apiDelete } from '../api';

export interface Reminder {
  id: string;
  taskId?: string;
  title: string;
  description?: string;
  dueAt: string;
  status: 'pending' | 'snoozed' | 'completed' | 'dismissed';
  assignedToId?: string;
  createdById: string;
  snoozeUntil?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  Task?: {
    id: string;
    name: string;
    section: string;
    projectId?: number;
  };
  assignedTo?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  createdBy: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface ReminderListParams {
  status?: 'pending' | 'snoozed' | 'completed' | 'dismissed';
  assignedToId?: string;
  taskId?: string;
  scope?: 'my' | 'created' | 'all';
}

export interface CreateReminderData {
  taskId?: string;
  title: string;
  description?: string;
  dueAt: string;
  assignedToId?: string;
}

export interface UpdateReminderData {
  title?: string;
  description?: string;
  dueAt?: string;
  assignedToId?: string;
  status?: 'pending' | 'snoozed' | 'completed' | 'dismissed';
}

// List reminders with filters
export const listReminders = async (params?: ReminderListParams): Promise<Reminder[]> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.assignedToId) queryParams.append('assignedToId', params.assignedToId);
  if (params?.taskId) queryParams.append('taskId', params.taskId);
  if (params?.scope) queryParams.append('scope', params.scope);
  
  const url = `/reminders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiGet(url) as Promise<Reminder[]>;
};

// Get single reminder
export const getReminder = async (id: string): Promise<Reminder> => {
  return apiGet(`/reminders/${id}`) as Promise<Reminder>;
};

// Create new reminder
export const createReminder = async (data: CreateReminderData): Promise<Reminder> => {
  return apiPost('/reminders', data) as Promise<Reminder>;
};

// Update reminder
export const updateReminder = async (id: string, data: UpdateReminderData): Promise<Reminder> => {
  return apiPut(`/reminders/${id}`, data) as Promise<Reminder>;
};

// Delete reminder
export const deleteReminder = async (id: string): Promise<void> => {
  return apiDelete(`/reminders/${id}`) as Promise<void>;
};

// Snooze reminder
export const snoozeReminder = async (id: string, snoozeUntil: string): Promise<Reminder> => {
  return apiPost(`/reminders/${id}/snooze`, { snoozeUntil }) as Promise<Reminder>;
};

// Complete reminder
export const completeReminder = async (id: string): Promise<Reminder> => {
  return apiPost(`/reminders/${id}/complete`, {}) as Promise<Reminder>;
};

// Dismiss reminder
export const dismissReminder = async (id: string): Promise<Reminder> => {
  return apiPost(`/reminders/${id}/dismiss`, {}) as Promise<Reminder>;
};

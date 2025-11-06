import { apiGet } from '../../lib/api';

export function listDailyPlans(filters: { projectId?: number | string; date?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId != null) qs.set('projectId', String(filters.projectId));
  if (filters.date) qs.set('date', filters.date);
  if (filters.status) qs.set('status', filters.status);
  return apiGet(`/api/daily-plans?${qs.toString()}`);
}

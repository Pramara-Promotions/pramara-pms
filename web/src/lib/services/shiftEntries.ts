import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

export function listShiftEntries(filters: { projectId?: string; stationId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  if (filters.stationId) qs.set('stationId', filters.stationId);
  if (filters.status) qs.set('status', filters.status);
  return apiGet(`/api/shift-entries?${qs.toString()}`);
}

function mapPayload(input: any) {
  return {
    projectId: Number(input.projectId),
    stationId: input.stationId ? Number(input.stationId) : null,
    shiftDate: input.shiftDate,
    shiftType: input.shiftType,
    shiftStartTime: input.shiftStartTime,
    shiftEndTime: input.shiftEndTime,
    supervisorId: input.supervisorId,
    workersPresent: Number(input.workersPresent || 0),
    workersAbsent: Number(input.workersAbsent || 0),
    totalProduced: Number(input.totalProduced || 0),
    targetProduction: input.targetProduction != null ? Number(input.targetProduction) : null,
    qualityPassed: Number(input.qualityPassed || 0),
    qualityRejected: Number(input.qualityRejected || 0),
    downtimeMinutes: Number(input.downtimeMinutes || 0),
    downtimeReason: input.downtimeReason || '',
    achievements: input.achievements || '',
    handoverNotes: input.handoverNotes || '',
  };
}

export function createShiftEntry(input: any) {
  return apiPost('/api/shift-entries', mapPayload(input));
}

export function updateShiftEntry(id: string, input: any) {
  return apiPut(`/api/shift-entries/${id}`, mapPayload(input));
}

export function deleteShiftEntry(id: string) {
  return apiDelete(`/api/shift-entries/${id}`);
}

export function submitShiftEntry(id: string) {
  return apiPost(`/api/shift-entries/${id}/submit`, {});
}

export function approveShiftEntry(id: string) {
  return apiPost(`/api/shift-entries/${id}/approve`, {});
}

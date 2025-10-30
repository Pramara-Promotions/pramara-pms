import { apiGet, apiPost, apiPut } from '../../lib/api';

export async function listStations(filters: { projectId?: string; status?: string; search?: string; stationTypeId?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  if (filters.status) qs.set('status', filters.status);
  if (filters.search) qs.set('search', filters.search);
  if (filters.stationTypeId) qs.set('stationTypeId', filters.stationTypeId);
  return apiGet(`/api/stations?${qs.toString()}`);
}

export async function listStationTypes() {
  return apiGet('/api/stations/meta/types');
}

export async function getStationAnalytics(stationId: number | string) {
  return apiGet(`/api/stations/${stationId}/analytics`);
}

function mapStationPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : null,
    name: String(input.name || ''),
    code: input.code ? String(input.code) : undefined,
    description: input.description ? String(input.description) : undefined,
    stationTypeId: input.stationTypeId ? Number(input.stationTypeId) : null,
    capacity: input.capacity != null ? Number(input.capacity) : 1,
    status: input.status || 'operational',
    active: Boolean(input.active ?? true),
  };
}

export async function createStation(input: any) {
  return apiPost('/api/stations', mapStationPayload(input));
}

export async function updateStation(id: number | string, input: any) {
  return apiPut(`/api/stations/${id}`, mapStationPayload(input));
}

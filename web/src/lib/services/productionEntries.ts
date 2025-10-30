import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

export function listProductionEntries(filters: { projectId?: string; stationId?: string; batchCode?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  if (filters.stationId) qs.set('stationId', filters.stationId);
  if (filters.batchCode) qs.set('batchCode', filters.batchCode);
  return apiGet(`/api/production-entries?${qs.toString()}`);
}

export function getProductionAnalytics(filters: { projectId?: string; stationId?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  if (filters.stationId) qs.set('stationId', filters.stationId);
  return apiGet(`/api/production-entries/analytics/summary?${qs.toString()}`);
}

export function createProductionEntry(input: any) {
  const body: any = { ...input };
  if (body.projectId) body.projectId = Number(body.projectId);
  if (body.stationId) body.stationId = Number(body.stationId);
  if (body.shiftId) body.shiftId = String(body.shiftId);
  if (body.targetQty != null) body.targetQty = Number(body.targetQty);
  if (body.actualQty != null) body.actualQty = Number(body.actualQty);
  if (body.rejectedQty != null) body.rejectedQty = Number(body.rejectedQty);
  return apiPost('/api/production-entries', body);
}

export function updateProductionEntry(id: string, input: any) {
  const body: any = { ...input };
  if (body.targetQty != null) body.targetQty = Number(body.targetQty);
  if (body.actualQty != null) body.actualQty = Number(body.actualQty);
  if (body.rejectedQty != null) body.rejectedQty = Number(body.rejectedQty);
  return apiPut(`/api/production-entries/${id}`, body);
}

export function deleteProductionEntry(id: string) {
  return apiDelete(`/api/production-entries/${id}`);
}

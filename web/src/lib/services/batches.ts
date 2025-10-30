import { apiGet, apiPost } from '../../lib/api';

export async function listBatches(filters: { projectId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  if (filters.status) qs.set('status', filters.status);
  return apiGet(`/api/batches?${qs.toString()}`);
}

export async function getBatchAnalytics(filters: { projectId?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  return apiGet(`/api/batches/analytics/summary?${qs.toString()}`);
}

export async function createBatch(input: {
  projectId: string | number,
  projectSkuId?: string | number,
  batchCode?: string,
  targetQty: string | number,
  stationId?: string | number,
}) {
  const body: any = {
    projectId: Number(input.projectId),
    projectSkuId: input.projectSkuId ? Number(input.projectSkuId) : undefined,
    quantity: Number(input.targetQty),
  };
  if (input.batchCode) body.batchNumber = input.batchCode;
  if (input.stationId) body.stationId = Number(input.stationId);
  return apiPost('/api/batches', body);
}

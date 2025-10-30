import { apiGet, apiPost, apiDelete } from '../../lib/api';

export function listWipTransactions(filters: { projectId?: string; stationId?: string; batchId?: string; itemCode?: string; transactionType?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/wip-ledger?${qs.toString()}`);
}

export function createWipTransaction(input: any) {
  const body: any = { ...input };
  if (body.projectId) body.projectId = Number(body.projectId);
  if (body.stationId) body.stationId = Number(body.stationId);
  if (body.fromStationId) body.fromStationId = Number(body.fromStationId);
  if (body.toStationId) body.toStationId = Number(body.toStationId);
  if (body.quantity) body.quantity = Number(body.quantity);
  return apiPost('/api/wip-ledger', body);
}

export function cancelWipTransaction(id: string, cancelReason = '') {
  return apiPost(`/api/wip-ledger/${id}/cancel`, { cancelReason });
}

export function deleteWipTransaction(id: string) {
  return apiDelete(`/api/wip-ledger/${id}`);
}

export function getWipBalanceSummary(filters: { projectId?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set('projectId', filters.projectId);
  return apiGet(`/api/wip-ledger/balance/summary?${qs.toString()}`);
}

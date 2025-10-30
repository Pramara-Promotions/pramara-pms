import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

export function listQCSubmissions(filters: { projectId?: string; stationId?: string; status?: string; result?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/qc-submissions?${qs.toString()}`);
}

export function getQCAnalytics(filters: { projectId?: string; stationId?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/qc-submissions/analytics/summary?${qs.toString()}`);
}

function mapPayload(input: any) {
  return {
    projectId: Number(input.projectId),
    stationId: input.stationId ? Number(input.stationId) : null,
    batchCode: input.batchCode || undefined,
    submissionDate: input.submissionDate,
    inspectorId: input.inspectorId,
    sampleSize: Number(input.sampleSize || 0),
    passedQty: Number(input.passedQty || 0),
    failedQty: Number(input.failedQty || 0),
    defectQty: Number(input.defectQty || 0),
    result: input.result,
    inspectorNotes: input.inspectorNotes || '',
  };
}

export function createQCSubmission(input: any) {
  return apiPost('/api/qc-submissions', mapPayload(input));
}

export function updateQCSubmission(id: number | string, input: any) {
  return apiPut(`/api/qc-submissions/${id}`, mapPayload(input));
}

export function approveQCSubmission(id: number | string, approverNotes = 'Approved') {
  return apiPost(`/api/qc-submissions/${id}/approve`, { approverNotes });
}

export function rejectQCSubmission(id: number | string, approverNotes: string) {
  return apiPost(`/api/qc-submissions/${id}/reject`, { approverNotes });
}

export function deleteQCSubmission(id: number | string) {
  return apiDelete(`/api/qc-submissions/${id}`);
}

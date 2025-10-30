import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

// Molds
export function listMolds(filters: { projectId?: string; status?: string; search?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/pre-production/molds?${qs.toString()}`);
}

export function getMold(id: number | string) {
  return apiGet(`/api/pre-production/molds/${id}`);
}

function mapMoldPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    moldNumber: String(input.moldNumber || ''),
    cavity: input.cavity ? Number(input.cavity) : 1,
    material: input.material || '',
    supplier: input.supplier || '',
    cost: input.cost ? Number(input.cost) : 0,
    leadTime: input.leadTime ? Number(input.leadTime) : 0,
    status: input.status || 'active',
    notes: input.notes || '',
  };
}

export function createMold(input: any) {
  return apiPost('/api/pre-production/molds', mapMoldPayload(input));
}

export function updateMold(id: number | string, input: any) {
  return apiPut(`/api/pre-production/molds/${id}`, mapMoldPayload(input));
}

export function deleteMold(id: number | string) {
  return apiDelete(`/api/pre-production/molds/${id}`);
}

// Trials
export function listTrials(filters: { projectId?: string; moldId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/pre-production/trials?${qs.toString()}`);
}

function mapTrialPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    moldId: input.moldId ? Number(input.moldId) : undefined,
    trialDate: input.trialDate,
    cycleTime: input.cycleTime ? Number(input.cycleTime) : 0,
    temperature: input.temperature ? Number(input.temperature) : 0,
    pressure: input.pressure ? Number(input.pressure) : 0,
    qualityScore: input.qualityScore ? Number(input.qualityScore) : 0,
    result: input.result || 'pending',
    notes: input.notes || '',
  };
}

export function createTrial(input: any) {
  return apiPost('/api/pre-production/trials', mapTrialPayload(input));
}

export function approveTrial(id: number | string) {
  return apiPost(`/api/pre-production/trials/${id}/approve`, {});
}

// Packaging
export function listPackaging(filters: { projectId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/pre-production/packaging?${qs.toString()}`);
}

function mapPackagingPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    packagingType: input.packagingType || '',
    material: input.material || '',
    dimensions: input.dimensions || '',
    weight: input.weight ? Number(input.weight) : 0,
    cost: input.cost ? Number(input.cost) : 0,
    supplier: input.supplier || '',
    status: input.status || 'draft',
    notes: input.notes || '',
  };
}

export function createPackaging(input: any) {
  return apiPost('/api/pre-production/packaging', mapPackagingPayload(input));
}

export function updatePackaging(id: number | string, input: any) {
  return apiPut(`/api/pre-production/packaging/${id}`, mapPackagingPayload(input));
}

export function reviewPackaging(id: number | string, notes = '') {
  return apiPost(`/api/pre-production/packaging/${id}/review`, { notes });
}

export function approvePackaging(id: number | string, notes = '') {
  return apiPost(`/api/pre-production/packaging/${id}/approve`, { notes });
}

export function deletePackaging(id: number | string) {
  return apiDelete(`/api/pre-production/packaging/${id}`);
}

// PPS (Pre-Production Samples)
export function listPPS(filters: { projectId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/pre-production/pps?${qs.toString()}`);
}

function mapPPSPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    sampleDate: input.sampleDate,
    quantity: input.quantity ? Number(input.quantity) : 1,
    purpose: input.purpose || '',
    status: input.status || 'pending',
    notes: input.notes || '',
  };
}

export function createPPS(input: any) {
  return apiPost('/api/pre-production/pps', mapPPSPayload(input));
}

export function updatePPS(id: number | string, input: any) {
  return apiPut(`/api/pre-production/pps/${id}`, mapPPSPayload(input));
}

export function approvePPS(id: number | string, notes = '') {
  return apiPost(`/api/pre-production/pps/${id}/approve`, { notes });
}

export function rejectPPS(id: number | string, notes: string) {
  return apiPost(`/api/pre-production/pps/${id}/reject`, { notes });
}

export function deletePPS(id: number | string) {
  return apiDelete(`/api/pre-production/pps/${id}`);
}

// Process Flows
export function listProcessFlows(filters: { projectId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/process-flows?${qs.toString()}`);
}

function mapProcessFlowPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    flowName: String(input.flowName || ''),
    description: input.description || '',
    steps: input.steps || [],
    status: input.status || 'draft',
  };
}

export function createProcessFlow(input: any) {
  return apiPost('/api/process-flows', mapProcessFlowPayload(input));
}

export function updateProcessFlow(id: number | string, input: any) {
  return apiPut(`/api/process-flows/${id}`, mapProcessFlowPayload(input));
}

export function activateProcessFlow(id: number | string) {
  return apiPost(`/api/process-flows/${id}/activate`, {});
}

export function deleteProcessFlow(id: number | string) {
  return apiDelete(`/api/process-flows/${id}`);
}

// Project Policies
export function listProjectPolicies(filters: { projectId?: string; category?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/project-policies?${qs.toString()}`);
}

function mapProjectPolicyPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    category: input.category || '',
    title: String(input.title || ''),
    description: input.description || '',
    createdBy: input.createdBy || '',
    status: input.status || 'draft',
  };
}

export function createProjectPolicy(input: any) {
  return apiPost('/api/project-policies', mapProjectPolicyPayload(input));
}

export function updateProjectPolicy(id: number | string, input: any) {
  return apiPut(`/api/project-policies/${id}`, mapProjectPolicyPayload(input));
}

export function activateProjectPolicy(id: number | string) {
  return apiPost(`/api/project-policies/${id}/activate`, {});
}

export function deleteProjectPolicy(id: number | string) {
  return apiDelete(`/api/project-policies/${id}`);
}

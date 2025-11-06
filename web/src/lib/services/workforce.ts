import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

// ============================================================================
// WORKERS
// ============================================================================

export function listWorkers(filters: {
  workerType?: string;
  providerId?: string;
  skill?: string;
  status?: string;
  search?: string;
} = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/workforce/workers?${qs.toString()}`);
}

function mapWorkerPayload(input: any) {
  return {
    name: input.name || '',
    employeeCode: input.employeeCode || null,
    email: input.email || null,
    phone: input.phone || null,
    workerType: input.workerType || 'company',
    providerId: input.providerId || null,
    skills: input.skills || [],
    certifications: input.certifications || null,
    shiftPreference: input.shiftPreference || null,
    hireDate: input.hireDate || null,
    contractEnd: input.contractEnd || null,
    hourlyRate: input.hourlyRate ? parseFloat(input.hourlyRate) : null,
    overtimeRate: input.overtimeRate ? parseFloat(input.overtimeRate) : null,
  };
}

export function createWorker(input: any) {
  return apiPost('/api/workforce/workers', mapWorkerPayload(input));
}

export function updateWorker(id: string, input: any) {
  return apiPut(`/api/workforce/workers/${id}`, mapWorkerPayload(input));
}

export function deactivateWorker(id: string) {
  return apiDelete(`/api/workforce/workers/${id}`);
}

// ============================================================================
// PROVIDERS / CONTRACTORS
// ============================================================================

export function listProviders(filters: { active?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (filters.active !== undefined) qs.set('active', String(filters.active));
  return apiGet(`/api/workforce/providers?${qs.toString()}`);
}

function mapProviderPayload(input: any) {
  return {
    name: input.name || '',
    contactPerson: input.contactPerson || '',
    email: input.email || null,
    phone: input.phone || null,
    location: input.location || null,
    contractStart: input.contractStart || null,
    contractEnd: input.contractEnd || null,
    rateStructure: input.rateStructure || null,
  };
}

export function createProvider(input: any) {
  return apiPost('/api/workforce/providers', mapProviderPayload(input));
}

export function updateProvider(id: string, input: any) {
  return apiPut(`/api/workforce/providers/${id}`, mapProviderPayload(input));
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

export function getPerformanceLeaderboard(filters: {
  days?: number;
  projectId?: number;
  limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (filters.days) qs.set('days', String(filters.days));
  if (filters.projectId) qs.set('projectId', String(filters.projectId));
  if (filters.limit) qs.set('limit', String(filters.limit));
  return apiGet(`/api/workforce/performance/leaderboard?${qs.toString()}`);
}

function mapPerformancePayload(input: any) {
  return {
    workerId: input.workerId,
    projectId: input.projectId ? Number(input.projectId) : undefined,
    stationId: input.stationId ? Number(input.stationId) : undefined,
    date: input.date,
    shiftId: input.shiftId || null,
    shiftType: input.shiftType || null,
    hoursWorked: input.hoursWorked ? parseFloat(input.hoursWorked) : null,
    tasksCompleted: input.tasksCompleted ? Number(input.tasksCompleted) : null,
    targetQty: input.targetQty ? Number(input.targetQty) : 0,
    actualQty: input.actualQty ? Number(input.actualQty) : 0,
    rejectedQty: input.rejectedQty ? Number(input.rejectedQty) : 0,
  };
}

export function recordPerformance(input: any) {
  return apiPost('/api/workforce/performance/record', mapPerformancePayload(input));
}

export function getWorkerPerformance(workerId: string, filters: {
  days?: number;
  projectId?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (filters.days) qs.set('days', String(filters.days));
  if (filters.projectId) qs.set('projectId', String(filters.projectId));
  return apiGet(`/api/workforce/performance/${workerId}?${qs.toString()}`);
}

// ============================================================================
// PROVIDER PERFORMANCE
// ============================================================================

export function getProviderPerformance(filters: {
  providerId?: string;
  months?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (filters.providerId) qs.set('providerId', filters.providerId);
  if (filters.months) qs.set('months', String(filters.months));
  return apiGet(`/api/workforce/provider-performance?${qs.toString()}`);
}

function mapProviderPerformancePayload(input: any) {
  return {
    providerId: input.providerId,
    monthYear: input.monthYear,
    totalWorkers: input.totalWorkers ? Number(input.totalWorkers) : 0,
    avgAttendance: input.avgAttendance ? parseFloat(input.avgAttendance) : 0,
    stabilityScore: input.stabilityScore ? parseFloat(input.stabilityScore) : 0,
    qualityScore: input.qualityScore ? parseFloat(input.qualityScore) : 0,
    incidents: input.incidents ? Number(input.incidents) : 0,
  };
}

export function recordProviderPerformance(input: any) {
  return apiPost('/api/workforce/provider-performance', mapProviderPerformancePayload(input));
}

// ============================================================================
// DASHBOARD
// ============================================================================

export function getWorkforceDashboard() {
  return apiGet('/api/workforce/dashboard');
}

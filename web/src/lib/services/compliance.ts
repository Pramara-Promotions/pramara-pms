import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

// Compliance Records
export function listComplianceRecords(filters: { projectId?: string; status?: string; category?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/compliance/records?${qs.toString()}`);
}

export function getComplianceSummary(projectId?: string) {
  const qs = new URLSearchParams();
  if (projectId) qs.set('projectId', projectId);
  return apiGet(`/api/compliance/summary?${qs.toString()}`);
}

function mapComplianceRecordPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    category: input.category || '',
    standard: input.standard || '',
    description: input.description || '',
    status: input.status || 'pending',
    reviewDate: input.reviewDate || null,
    expiryDate: input.expiryDate || null,
    notes: input.notes || '',
  };
}

export function createComplianceRecord(input: any) {
  return apiPost('/api/compliance/records', mapComplianceRecordPayload(input));
}

export function updateComplianceRecord(id: number | string, input: any) {
  return apiPut(`/api/compliance/records/${id}`, mapComplianceRecordPayload(input));
}

export function deleteComplianceRecord(id: number | string) {
  return apiDelete(`/api/compliance/records/${id}`);
}

// Lab Tests
export function listLabTests(filters: { projectId?: string; status?: string; testType?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/compliance/lab-tests?${qs.toString()}`);
}

function mapLabTestPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    testType: input.testType || '',
    testDate: input.testDate,
    laboratory: input.laboratory || '',
    result: input.result || 'pending',
    status: input.status || 'pending',
    reportUrl: input.reportUrl || null,
    notes: input.notes || '',
  };
}

export function createLabTest(input: any) {
  return apiPost('/api/compliance/lab-tests', mapLabTestPayload(input));
}

export function updateLabTest(id: number | string, input: any) {
  return apiPut(`/api/compliance/lab-tests/${id}`, mapLabTestPayload(input));
}

export function approveLabTest(id: number | string, notes = '') {
  return apiPost(`/api/compliance/lab-tests/${id}/approve`, { notes });
}

export function deleteLabTest(id: number | string) {
  return apiDelete(`/api/compliance/lab-tests/${id}`);
}

// Certifications
export function listCertifications(filters: { projectId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/compliance/certifications?${qs.toString()}`);
}

function mapCertificationPayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    certType: input.certType || '',
    issuedBy: input.issuedBy || '',
    issueDate: input.issueDate,
    expiryDate: input.expiryDate || null,
    certNumber: input.certNumber || '',
    status: input.status || 'active',
    documentUrl: input.documentUrl || null,
  };
}

export function createCertification(input: any) {
  return apiPost('/api/compliance/certifications', mapCertificationPayload(input));
}

export function updateCertification(id: number | string, input: any) {
  return apiPut(`/api/compliance/certifications/${id}`, mapCertificationPayload(input));
}

export function deleteCertification(id: number | string) {
  return apiDelete(`/api/compliance/certifications/${id}`);
}

// Material Compliance
export function listMaterialCompliance(filters: { projectId?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v as string); });
  return apiGet(`/api/compliance/materials?${qs.toString()}`);
}

function mapMaterialCompliancePayload(input: any) {
  return {
    projectId: input.projectId ? Number(input.projectId) : undefined,
    materialName: String(input.materialName || ''),
    supplier: input.supplier || '',
    standard: input.standard || '',
    status: input.status || 'pending',
    testDate: input.testDate || null,
    approvalDate: input.approvalDate || null,
    notes: input.notes || '',
  };
}

export function createMaterialCompliance(input: any) {
  return apiPost('/api/compliance/materials', mapMaterialCompliancePayload(input));
}

export function updateMaterialCompliance(id: number | string, input: any) {
  return apiPut(`/api/compliance/materials/${id}`, mapMaterialCompliancePayload(input));
}

export function approveMaterialCompliance(id: number | string, notes = '') {
  return apiPost(`/api/compliance/materials/${id}/approve`, { notes });
}

export function deleteMaterialCompliance(id: number | string) {
  return apiDelete(`/api/compliance/materials/${id}`);
}

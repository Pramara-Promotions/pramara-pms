import { apiPost } from '../../lib/api';

export type CreateApprovalInput = {
  projectId: number | string;
  approvalType: string; // 'document' | 'certification' | ...
  title: string;
  description?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  dueDate?: string; // ISO date
  expectedDate?: string; // ISO date, used to compute buffer
  priority?: 'low' | 'medium' | 'high' | string;
};

export function createApproval(input: CreateApprovalInput) {
  const body: any = { ...input };
  body.projectId = Number(input.projectId);
  if (body.dueDate) body.dueDate = new Date(body.dueDate).toISOString();
  if (body.expectedDate) body.expectedDate = new Date(body.expectedDate).toISOString();
  if (!body.priority) body.priority = 'medium';
  return apiPost('/api/approvals', body);
}

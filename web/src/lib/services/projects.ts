import { apiGet } from '../../lib/api';

export async function listProjects() {
  return apiGet('/api/projects');
}

export async function listProjectSkus(projectId: string | number) {
  // Backend expects /api/project-skus?projectId=
  const rows = await apiGet(`/api/project-skus?projectId=${projectId}`);
  // Normalize to expected UI shape in some places (skuCode/skuName)
  return (rows || []).map((r: any) => ({
    id: r.id,
    skuCode: r.code,
    skuName: r.name || r.code,
  }));
}

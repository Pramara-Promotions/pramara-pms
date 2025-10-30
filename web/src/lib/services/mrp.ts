import { apiGet, apiPost } from '../../lib/api';

// Normalize inputs and outputs between UI and API
export async function calculateMRP(params: {
  projectId: string | number,
  skuId: string | number,
  targetQty: string | number,
  lossType?: 'project_wide' | 'stage_specific',
  projectWideLoss?: string | number, // UI often uses 0-1; API expects percent 0-100
}) {
  const body: any = {
    projectId: Number(params.projectId),
    skuId: Number(params.skuId),
    targetQuantity: Number(params.targetQty),
    lossType: params.lossType || 'project_wide',
  };

  if (body.lossType === 'project_wide') {
    const v = params.projectWideLoss == null ? 0 : Number(params.projectWideLoss);
    // If UI passed 0-1, convert to percent; if already >1, assume percent
    body.projectWideLoss = v <= 1 ? v * 100 : v;
  }

  return apiPost('/api/mrp/calculate', body);
}

export async function getMRPAccuracy(days = 90) {
  return apiGet(`/api/mrp/learning/accuracy?days=${encodeURIComponent(String(days))}`);
}

export async function getMRPRecommendations(status = 'pending') {
  return apiGet(`/api/mrp/learning/recommendations?status=${encodeURIComponent(String(status))}`);
}

export async function listProjectMRPs(projectId: string | number) {
  // Backend returns an array for GET /api/mrp/:projectId
  return apiGet(`/api/mrp/${projectId}`);
}

export async function acceptRecommendation(id: string | number) {
  return apiPost(`/api/mrp/recommendations/${id}/accept`, {});
}

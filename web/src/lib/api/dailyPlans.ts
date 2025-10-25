import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const dailyPlansApi = {
  generate: (data: any) => axios.post(`${API_BASE}/daily-plans/generate`, data),
  getPlans: (params?: any) => axios.get(`${API_BASE}/daily-plans`, { params }),
  createPlan: (data: any) => axios.post(`${API_BASE}/daily-plans`, data),
  approvePlan: (id: number, data: any) => axios.put(`${API_BASE}/daily-plans/${id}/approve`, data),

  // Stations
  addStation: (planId: number, data: any) => axios.post(`${API_BASE}/daily-plans/${planId}/stations`, data),
  updateStation: (id: number, data: any) => axios.put(`${API_BASE}/daily-plans/stations/${id}`, data),

  // Material Validation
  validateMaterials: (planId: number, data: any) => axios.post(`${API_BASE}/daily-plans/${planId}/validate-materials`, data),

  // Worker Suggestions
  suggestWorkers: (params?: any) => axios.get(`${API_BASE}/daily-plans/suggest-workers`, { params }),

  // Adaptations
  adapt: (planId: number, data: any) => axios.post(`${API_BASE}/daily-plans/${planId}/adapt`, data),
  getAdaptations: (planId: number) => axios.get(`${API_BASE}/daily-plans/${planId}/adaptations`),
  resolveAdaptation: (id: number, data: any) => axios.post(`${API_BASE}/daily-plans/adaptations/${id}/resolve`, data),
};
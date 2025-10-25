import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const workflowsApi = {
  // Stages
  getStages: (params?: any) => axios.get(`${API_BASE}/workflows/stages`, { params }),
  createStage: (data: any) => axios.post(`${API_BASE}/workflows/stages`, data),
  updateStage: (id: number, data: any) => axios.put(`${API_BASE}/workflows/stages/${id}`, data),
  deleteStage: (id: number) => axios.delete(`${API_BASE}/workflows/stages/${id}`),

  // Tasks
  getTasks: (stageId: number) => axios.get(`${API_BASE}/workflows/stages/${stageId}/tasks`),
  createTask: (data: any) => axios.post(`${API_BASE}/workflows/tasks`, data),
  updateTask: (id: number, data: any) => axios.put(`${API_BASE}/workflows/tasks/${id}`, data),

  // Dependencies
  createDependency: (data: any) => axios.post(`${API_BASE}/workflows/dependencies`, data),
  getDependencies: (stageId: number) => axios.get(`${API_BASE}/workflows/stages/${stageId}/dependencies`),
  deleteDependency: (id: number) => axios.delete(`${API_BASE}/workflows/dependencies/${id}`),

  // Documents
  linkDocument: (stageId: number, data: any) => axios.post(`${API_BASE}/workflows/stages/${stageId}/documents`, data),
  getDocuments: (stageId: number) => axios.get(`${API_BASE}/workflows/stages/${stageId}/documents`),
};
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const productionApi = {
  // Configs
  getConfigs: (params?: any) => axios.get(`${API_BASE}/production/configs`, { params }),
  createConfig: (data: any) => axios.post(`${API_BASE}/production/configs`, data),
  updateConfig: (id: number, data: any) => axios.put(`${API_BASE}/production/configs/${id}`, data),

  // Calculations
  calculate: (data: any) => axios.post(`${API_BASE}/production/calculate`, data),

  // Entries
  createEntry: (data: any) => axios.post(`${API_BASE}/production/entries`, data),
  getEntries: (params?: any) => axios.get(`${API_BASE}/production/entries`, { params }),

  // Variance
  getVariance: (params?: any) => axios.get(`${API_BASE}/production/variance`, { params }),

  // Capacity
  getCapacity: (params?: any) => axios.get(`${API_BASE}/production/capacity`, { params }),
};
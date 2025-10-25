import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const batchesApi = {
  createBatch: (data: any) => axios.post(`${API_BASE}/batches`, data),
  getBatches: (params?: any) => axios.get(`${API_BASE}/batches`, { params }),
  getBatch: (id: number) => axios.get(`${API_BASE}/batches/${id}`),
  moveBatch: (id: number, data: any) => axios.post(`${API_BASE}/batches/${id}/move`, data),
  rejectBatch: (id: number, data: any) => axios.put(`${API_BASE}/batches/${id}/reject`, data),
  traceBatch: (batchCode: string) => axios.get(`${API_BASE}/batches/trace/${batchCode}`),
  traceMaterial: (lotNumber: string) => axios.get(`${API_BASE}/batches/trace-material/${lotNumber}`),
  traceOperator: (operatorId: string) => axios.get(`${API_BASE}/batches/trace-operator/${operatorId}`),
  getHandoverSheet: (id: number) => axios.get(`${API_BASE}/batches/${id}/handover-sheet`),
  getLabel: (id: number) => axios.get(`${API_BASE}/batches/${id}/label`),
};
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const approvalsApi = {
  getApprovals: (params?: any) => axios.get(`${API_BASE}/approvals`, { params }),
  createApproval: (data: any) => axios.post(`${API_BASE}/approvals`, data),
  approve: (id: number, data: any) => axios.put(`${API_BASE}/approvals/${id}/approve`, data),
  reject: (id: number, data: any) => axios.put(`${API_BASE}/approvals/${id}/reject`, data),
  delay: (id: number, data: any) => axios.put(`${API_BASE}/approvals/${id}/delay`, data),
  override: (id: number, data: any) => axios.post(`${API_BASE}/approvals/${id}/override`, data),
  remind: (id: number) => axios.post(`${API_BASE}/approvals/${id}/remind`),
  getBufferReport: (params?: any) => axios.get(`${API_BASE}/approvals/buffer-report`, { params }),
  getOverdue: (params?: any) => axios.get(`${API_BASE}/approvals/overdue`, { params }),
  getReminders: (id: number) => axios.get(`${API_BASE}/approvals/${id}/reminders`),
};
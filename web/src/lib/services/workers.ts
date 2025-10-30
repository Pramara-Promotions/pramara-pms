import { apiGet } from '../../lib/api';

export interface WorkerLite { id: string; name: string }

export async function listWorkers(): Promise<WorkerLite[]> {
  const resp = await apiGet('/api/workers');
  const rows = resp?.workers || [];
  return rows.map((w: any) => ({ id: String(w.id), name: w.name || w.email || String(w.id) }));
}

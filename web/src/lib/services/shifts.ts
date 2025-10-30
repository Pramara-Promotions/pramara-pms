import { apiGet } from '../../lib/api';

export interface ShiftLite { id: string; name: string }

export async function listShifts(): Promise<ShiftLite[]> {
  const rows = await apiGet('/api/shifts');
  return (rows || []).map((s: any) => ({ id: String(s.id), name: s.name || String(s.id) }));
}

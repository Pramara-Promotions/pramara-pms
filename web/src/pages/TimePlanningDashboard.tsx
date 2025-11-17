import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';

type StageStatus = {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  overdueDays?: number;
  atRisk?: boolean;
};

export default function TimePlanningDashboard() {
  const search: any = useSearch({ from: '/planning/time' as any });
  const projectId = Number(search?.projectId) || 0;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ summary?: any; stages?: StageStatus[]; cutoffDate?: string } | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [stRes, polRes] = await Promise.all([
        fetch(`/api/time-planning/projects/${projectId}/status`, { credentials: 'include' }),
        fetch(`/api/time-planning/policies`, { credentials: 'include' })
      ]);
      const stJson = await stRes.json();
      const polJson = await polRes.json();
      setStatus(stJson);
      setPolicy(polJson.policy);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  async function runBackwardSchedule() {
    if (!projectId) return;
    setLoading(true);
    try {
      await fetch(`/api/time-planning/projects/${projectId}/backward-schedule`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buffers: { shippingDays: 2, qcDays: 1 } })
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function checkAlerts() {
    setLoading(true);
    try {
      await fetch(`/api/time-planning/alerts/check`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: [projectId] })
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Time Planning</h1>
          <p className="text-sm text-gray-500">Project {projectId} cutoff-aware scheduling and risk</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runBackwardSchedule} className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50" disabled={loading || !projectId}>Backward Schedule</button>
          <button onClick={checkAlerts} className="px-3 py-2 text-sm rounded bg-amber-600 text-white disabled:opacity-50" disabled={loading || !projectId}>Check Alerts</button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {loading && <div className="text-sm text-gray-500">Loading…</div>}

      {status && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">Cutoff: {status.cutoffDate ? new Date(status.cutoffDate).toLocaleDateString() : '—'}</div>
          <div className="rounded border p-3">
            <div className="font-medium">Summary</div>
            <div className="text-sm text-gray-600">Overdue: {status.summary?.overdueCount} · At Risk: {status.summary?.atRiskCount}</div>
          </div>
          <div className="rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2">Overdue</th>
                  <th className="text-left p-2">At Risk</th>
                </tr>
              </thead>
              <tbody>
                {(status.stages || []).map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">{s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'}</td>
                    <td className="p-2">{s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}</td>
                    <td className="p-2">{s.overdueDays || 0}</td>
                    <td className="p-2">{s.atRisk ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {policy && (
            <div className="text-xs text-gray-500">Policy: urgency {policy.urgencyWeight}, value {policy.valueWeight}, effort {policy.effortWeight}, atRisk &lt; {policy.atRiskThresholdDays} days</div>
          )}
        </div>
      )}
    </div>
  );
}

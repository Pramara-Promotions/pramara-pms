import { useEffect, useMemo, useState } from 'react';
import { http } from '../../lib/http';

interface Job {
  id: string;
  entity: string;
  entityId?: string | null;
  filename: string;
  mimeType?: string | null;
  fileKey?: string | null;
  fileSize?: number;
  processingMode: string;
  status: string;
  confidenceAvg?: number | null;
  createdAt: string;
}

interface Field {
  id: string;
  name: string;
  value?: string | null;
  confidence?: number | null;
  method?: string | null;
  sourcePage?: number | null;
  sourceFile?: string | null;
}

export default function DocIntelJobs() {
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ status: string | 'ALL'; entity: string | 'ALL' }>({ status: 'ALL', entity: 'ALL' });

  const [detail, setDetail] = useState<{ job: Job; fields: Field[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/doc-intelligence/jobs');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load jobs');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter(j => (filter.status === 'ALL' || j.status === filter.status) && (filter.entity === 'ALL' || j.entity === filter.entity));
  }, [items, filter]);

  async function view(job: Job) {
    try {
      setBusy(true);
      const res = await http(`/doc-intelligence/jobs/${job.id}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to load details');
      setDetail({ job: data.job || job, fields: data.fields || [] });
    } catch (e: any) {
      alert(e.message || 'Failed to load details');
    } finally {
      setBusy(false);
    }
  }

  async function source(job: Job) {
    try {
      const res = await http(`/doc-intelligence/jobs/${job.id}/source-url`);
      const data = await res.json();
      if (data?.url) window.open(data.url, '_blank');
    } catch {}
  }

  async function retry(job: Job) {
    try {
      setBusy(true);
      const res = await http(`/doc-intelligence/jobs/${job.id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Retry failed');
      await load();
    } catch (e: any) {
      alert(e.message || 'Retry failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Document Intelligence Jobs</div>
          <div className="text-xs text-gray-500">Latest 200 jobs. Super Admin only.</div>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={filter.entity} onChange={e => setFilter(f => ({ ...f, entity: e.target.value as any }))}>
            <option value="ALL">All Entities</option>
            <option value="ProjectDocument">ProjectDocument</option>
            <option value="PurchaseOrder">PurchaseOrder</option>
          </select>
          <select className="border rounded px-2 py-1 text-sm" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value as any }))}>
            <option value="ALL">All Status</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button className="rounded border px-3 py-1 text-sm" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Entity</th>
              <th className="text-left p-2">Filename</th>
              <th className="text-left p-2">Size</th>
              <th className="text-left p-2">Mode</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Confidence</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={8}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-3" colSpan={8}>No jobs</td></tr>
            ) : (
              filtered.map(j => (
                <tr key={j.id} className="border-t">
                  <td className="p-2">{new Date(j.createdAt).toLocaleString()}</td>
                  <td className="p-2">{j.entity}{j.entityId ? `#${j.entityId}` : ''}</td>
                  <td className="p-2">{j.filename}</td>
                  <td className="p-2">{j.fileSize ? `${(j.fileSize/1024/1024).toFixed(2)} MB` : '-'}</td>
                  <td className="p-2">{j.processingMode}</td>
                  <td className="p-2">{j.status}</td>
                  <td className="p-2">{j.confidenceAvg != null ? `${j.confidenceAvg}%` : '-'}</td>
                  <td className="p-2 space-x-2">
                    <button className="text-blue-600" onClick={() => view(j)} disabled={busy}>Details</button>
                    {j.fileKey && <button className="text-blue-600" onClick={() => source(j)} disabled={busy}>Source</button>}
                    <button className="text-orange-600" onClick={() => retry(j)} disabled={busy}>Retry</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setDetail(null)}>
          <div className="bg-white rounded shadow-lg w-full max-w-3xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold">Job {detail.job.id}</div>
                <div className="text-xs text-gray-500">{detail.job.entity} — {detail.job.filename}</div>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-500">✕</button>
            </div>
            <div className="border rounded divide-y max-h-[60vh] overflow-auto">
              {detail.fields.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No fields recorded.</div>
              ) : (
                detail.fields.map(f => (
                  <div key={f.id} className="p-2 text-sm">
                    <div><span className="font-medium">{f.name}:</span> {String(f.value ?? '')}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      {f.confidence != null && <span>Confidence: {f.confidence}%</span>}
                      {f.method && <span>Method: {f.method}</span>}
                      {(f.sourceFile || f.sourcePage != null) && (
                        <span>From: {f.sourceFile || detail.job.filename}{f.sourcePage != null ? ` p.${f.sourcePage}` : ''}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

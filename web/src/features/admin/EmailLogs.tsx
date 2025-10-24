import { useEffect, useMemo, useState } from 'react';
import { http } from '../../lib/http';

type EmailLogItem = {
  id: string;
  to: string;
  cc: string[];
  bcc: string[];
  from: string;
  replyTo?: string;
  subject: string;
  status: string;
  provider: string;
  providerMsgId?: string;
  sentAt?: string;
  error?: string;
  templateId?: string;
  userId?: string;
  notificationId?: string;
  createdAt: string;
}

export default function EmailLogs() {
  const [items, setItems] = useState<EmailLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<EmailLogItem | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (recipient) params.set('recipient', recipient);
      const res = await http(`/admin/email-logs?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const res = await http('/admin/email-stats');
    setStats(await res.json());
  }

  async function openDetails(row: EmailLogItem) {
    setSelected(row);
    const res = await http(`/admin/email-logs/${row.id}`);
    setDetails(await res.json());
  }

  async function resend(row: EmailLogItem) {
    const res = await http(`/admin/email-logs/${row.id}/resend`, { method: 'POST' });
    const data = await res.json();
    alert(data.success ? 'Resent successfully' : `Resend failed: ${data.error}`);
    await load();
    await loadStats();
  }

  useEffect(() => { load(); }, [page, pageSize]);
  useEffect(() => { loadStats(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Email Logs</h2>
        <p className="text-gray-600 text-sm">Monitor outbound emails, inspect details, and resend if needed.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { k: 'total', label: 'Total' },
            { k: 'sent', label: 'Sent' },
            { k: 'failed', label: 'Failed' },
            { k: 'dummy', label: 'Training' },
            { k: 'last24h', label: 'Last 24h' },
          ].map(s => (
            <div key={s.k} className="bg-white dark:bg-gray-800 rounded border p-3">
              <div className="text-gray-500 text-xs">{s.label}</div>
              <div className="text-lg font-bold">{stats[s.k] ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Search subject/body" value={q} onChange={e => setQ(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Recipient contains" value={recipient} onChange={e => setRecipient(e.target.value)} />
          <select className="border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="dummy_training_mode">Training</option>
          </select>
          <button className="bg-blue-600 text-white rounded px-4" onClick={() => { setPage(1); load(); }}>Apply</button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Date</th>
                <th className="p-2">To</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-3 text-center">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-3 text-center text-gray-500">No results</td></tr>
              ) : items.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="p-2">{row.to}</td>
                  <td className="p-2">{row.subject}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${row.status === 'sent' ? 'bg-green-100 text-green-700' : row.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{row.status}</span>
                  </td>
                  <td className="p-2 space-x-2">
                    <button className="text-blue-600 hover:underline" onClick={() => openDetails(row)}>Details</button>
                    <button className="text-indigo-600 hover:underline" onClick={() => resend(row)}>Resend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="space-x-2">
            <button className="px-3 py-1 border rounded" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <span className="text-sm">Page {page} / {totalPages}</span>
            <button className="px-3 py-1 border rounded" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
          </div>
          <select className="border rounded px-2 py-1" value={pageSize} onChange={e => setPageSize(parseInt(e.target.value) || 20)}>
            {[10,20,50,100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      {selected && details && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center" onClick={() => { setSelected(null); setDetails(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded shadow-lg w-full max-w-3xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Email Details</div>
              <button className="text-gray-500" onClick={() => { setSelected(null); setDetails(null); }}>✕</button>
            </div>
            <div className="text-sm space-y-1">
              <div><span className="font-medium">To:</span> {selected.to}</div>
              <div><span className="font-medium">Subject:</span> {selected.subject}</div>
              <div><span className="font-medium">Status:</span> {selected.status}</div>
              {details.template && (
                <div><span className="font-medium">Template:</span> {details.template.name} ({details.template.category})</div>
              )}
              {details.log?.error && (
                <div className="text-red-600">Error: {details.log.error}</div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="bg-indigo-600 text-white px-4 py-2 rounded" onClick={() => resend(selected)}>Resend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

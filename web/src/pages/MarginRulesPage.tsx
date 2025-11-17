import { useEffect, useState } from 'react';

type MarginRule = {
  id: string;
  name: string;
  marginType: string;
  marginValue: number;
  priority: number;
  active: boolean;
  applicableToCustomer?: string[];
  applicableToMarket?: string[];
  minVolume?: number | null;
  maxVolume?: number | null;
};

export default function MarginRulesPage() {
  const [rules, setRules] = useState<MarginRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', marginType: 'percentage', marginValue: 20, priority: 0, active: true });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/margin-rules', { credentials: 'include' });
      const json = await res.json();
      setRules(json.rules || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name) return;
    setLoading(true);
    try {
      await fetch('/api/margin-rules', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setForm({ name: '', marginType: 'percentage', marginValue: 20, priority: 0, active: true });
      setShowForm(false);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setLoading(true);
    try {
      await fetch(`/api/margin-rules/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Margin Rules</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 text-sm rounded bg-blue-600 text-white">
          {showForm ? 'Cancel' : 'New Rule'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded border bg-gray-50 space-y-3">
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Rule Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="flex gap-2">
            <input className="flex-1 border rounded px-3 py-2 text-sm" type="number" placeholder="Margin %" value={form.marginValue} onChange={e => setForm({ ...form, marginValue: Number(e.target.value) })} />
            <input className="flex-1 border rounded px-3 py-2 text-sm" type="number" placeholder="Priority" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} />
          </div>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          <button onClick={handleCreate} className="px-4 py-2 text-sm rounded bg-green-600 text-white" disabled={loading || !form.name}>
            Create
          </button>
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      <div className="rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Margin %</th>
              <th className="text-left p-2">Priority</th>
              <th className="text-left p-2">Active</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.marginType}</td>
                <td className="p-2">{r.marginValue}%</td>
                <td className="p-2">{r.priority}</td>
                <td className="p-2">{r.active ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  <button onClick={() => toggleActive(r.id, r.active)} className="text-xs underline" disabled={loading}>
                    {r.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

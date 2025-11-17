import { useEffect, useState } from 'react';

type CostTemplate = {
  id: string;
  name: string;
  category: string;
  unit?: string;
  costPerUnit?: number;
  createdAt: string;
};

export default function CostTemplatesPage() {
  const [templates, setTemplates] = useState<CostTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'material', unit: '', costPerUnit: 0 });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/cost-templates', { credentials: 'include' });
      const json = await res.json();
      setTemplates(json.templates || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name) return;
    setLoading(true);
    try {
      await fetch('/api/cost-templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setForm({ name: '', category: 'material', unit: '', costPerUnit: 0 });
      setShowForm(false);
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Cost Templates</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 text-sm rounded bg-blue-600 text-white">
          {showForm ? 'Cancel' : 'New Template'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded border bg-gray-50 space-y-3">
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Template Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="flex gap-2">
            <select className="flex-1 border rounded px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="material">Material</option>
              <option value="labor">Labor</option>
              <option value="overhead">Overhead</option>
              <option value="logistics">Logistics</option>
            </select>
            <input className="flex-1 border rounded px-3 py-2 text-sm" placeholder="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            <input className="flex-1 border rounded px-3 py-2 text-sm" type="number" placeholder="Cost/Unit" value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: Number(e.target.value) })} />
          </div>
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
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Unit</th>
              <th className="text-left p-2">Cost/Unit</th>
              <th className="text-left p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{t.name}</td>
                <td className="p-2">{t.category}</td>
                <td className="p-2">{t.unit || '—'}</td>
                <td className="p-2">{t.costPerUnit ? `$${t.costPerUnit}` : '—'}</td>
                <td className="p-2">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

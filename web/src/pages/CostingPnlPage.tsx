import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';

type PnlData = {
  costingId: string;
  exFactory: number;
  materialCostStandard: number;
  materialCostActual: number;
  materialVariance: number;
  laborCostStandard: number;
  laborCostActual: number;
  laborVariance: number;
  totalVariance: number;
};

export default function CostingPnlPage() {
  const search: any = useSearch({ from: '/planning/costing/pnl' as any });
  const costingId = search?.costingId || '';

  const [loading, setLoading] = useState(false);
  const [pnl, setPnl] = useState<PnlData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!costingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/costing/${costingId}/pnl`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load P&L');
      const json = await res.json();
      setPnl(json);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [costingId]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Costing P&L Comparison</h1>
        <p className="text-sm text-gray-500">Standard vs Actual Costs for {costingId || '(no costing selected)'}</p>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {loading && <div className="text-sm text-gray-500">Loading…</div>}

      {pnl && (
        <div className="space-y-4">
          <div className="rounded border p-4">
            <div className="font-medium mb-2">Ex-Factory Cost</div>
            <div className="text-2xl">${pnl.exFactory.toFixed(2)}</div>
          </div>

          <div className="rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Standard</th>
                  <th className="text-left p-2">Actual</th>
                  <th className="text-left p-2">Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-2">Material</td>
                  <td className="p-2">${pnl.materialCostStandard.toFixed(2)}</td>
                  <td className="p-2">${pnl.materialCostActual.toFixed(2)}</td>
                  <td className={`p-2 ${pnl.materialVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${pnl.materialVariance.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="p-2">Labor</td>
                  <td className="p-2">${pnl.laborCostStandard.toFixed(2)}</td>
                  <td className="p-2">${pnl.laborCostActual.toFixed(2)}</td>
                  <td className={`p-2 ${pnl.laborVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${pnl.laborVariance.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t font-medium">
                  <td className="p-2">Total Variance</td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className={`p-2 ${pnl.totalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${pnl.totalVariance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

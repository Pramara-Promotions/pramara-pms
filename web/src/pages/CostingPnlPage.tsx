import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingDown, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

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

const COLORS = {
  material: '#3b82f6',
  labor: '#8b5cf6',
  overhead: '#f59e0b',
  positive: '#10b981',
  negative: '#ef4444'
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

  // Prepare chart data
  const costBreakdownData = pnl ? [
    { name: 'Material', value: pnl.materialCostActual, color: COLORS.material },
    { name: 'Labor', value: pnl.laborCostActual, color: COLORS.labor }
  ] : [];

  const varianceComparisonData = pnl ? [
    { category: 'Material', Standard: pnl.materialCostStandard, Actual: pnl.materialCostActual },
    { category: 'Labor', Standard: pnl.laborCostStandard, Actual: pnl.laborCostActual }
  ] : [];

  const varianceTrendData = pnl ? [
    { period: 'Material', variance: pnl.materialVariance },
    { period: 'Labor', variance: pnl.laborVariance },
    { period: 'Total', variance: pnl.totalVariance }
  ] : [];

  const marginPercent = pnl ? ((pnl.exFactory - pnl.materialCostActual - pnl.laborCostActual) / pnl.exFactory * 100) : 0;
  const variancePercent = pnl && pnl.exFactory > 0 ? (pnl.totalVariance / pnl.exFactory * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Costing P&L Analysis</h1>
              <p className="text-sm text-gray-500 mt-1">
                Standard vs Actual Costs for {costingId || '(no costing selected)'}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Error Loading Data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 flex items-center justify-center">
            <div className="text-gray-500">Loading P&L data...</div>
          </div>
        )}

        {pnl && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Ex-Factory Cost</div>
                <div className="text-2xl font-bold text-gray-900">${pnl.exFactory.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">Base price</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Variance</div>
                <div className={`text-2xl font-bold ${pnl.totalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(pnl.totalVariance).toFixed(2)}
                  {pnl.totalVariance < 0 ? (
                    <TrendingDown className="w-5 h-5 inline ml-2" />
                  ) : (
                    <TrendingUp className="w-5 h-5 inline ml-2" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {pnl.totalVariance < 0 ? 'Under budget' : 'Over budget'} ({variancePercent.toFixed(1)}%)
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Gross Margin</div>
                <div className="text-2xl font-bold text-gray-900">{marginPercent.toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">After costs</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Cost Efficiency</div>
                <div className={`text-2xl font-bold ${pnl.totalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pnl.totalVariance < 0 ? 'Good' : 'Poor'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Performance rating</div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Breakdown Pie Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Variance Trend Line Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Variance by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={varianceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="variance"
                      stroke={COLORS.negative}
                      strokeWidth={2}
                      name="Variance Amount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Standard vs Actual Bar Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Standard vs Actual Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={varianceComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="Standard" fill={COLORS.material} />
                  <Bar dataKey="Actual" fill={COLORS.labor} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Category</th>
                      <th className="text-right p-3 font-semibold">Standard</th>
                      <th className="text-right p-3 font-semibold">Actual</th>
                      <th className="text-right p-3 font-semibold">Variance</th>
                      <th className="text-right p-3 font-semibold">Variance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">Material</td>
                      <td className="p-3 text-right">${pnl.materialCostStandard.toFixed(2)}</td>
                      <td className="p-3 text-right">${pnl.materialCostActual.toFixed(2)}</td>
                      <td className={`p-3 text-right font-medium ${pnl.materialVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${pnl.materialVariance.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right ${pnl.materialVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnl.materialCostStandard > 0 ? ((pnl.materialVariance / pnl.materialCostStandard) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">Labor</td>
                      <td className="p-3 text-right">${pnl.laborCostStandard.toFixed(2)}</td>
                      <td className="p-3 text-right">${pnl.laborCostActual.toFixed(2)}</td>
                      <td className={`p-3 text-right font-medium ${pnl.laborVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${pnl.laborVariance.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right ${pnl.laborVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnl.laborCostStandard > 0 ? ((pnl.laborVariance / pnl.laborCostStandard) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                    <tr className="border-t bg-gray-50 font-semibold">
                      <td className="p-3">Total Variance</td>
                      <td className="p-3 text-right"></td>
                      <td className="p-3 text-right"></td>
                      <td className={`p-3 text-right ${pnl.totalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${pnl.totalVariance.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right ${pnl.totalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variancePercent.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

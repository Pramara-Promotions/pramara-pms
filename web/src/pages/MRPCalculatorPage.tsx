import { useState, useEffect } from 'react';
import { listProjects } from '../lib/services/projects';
import { calculateMRP, getMRPAccuracy, getMRPRecommendations, listProjectMRPs, acceptRecommendation } from '../lib/services/mrp';
import { listProjectSkus } from '../lib/services/projects';
import { HelpCircle, Calculator, TrendingUp, Package } from 'lucide-react';

interface MRP {
  id: string;
  targetQty: number;
  lossType: string;
  projectWideLoss: number;
  totalCost: number;
  requirements: any;
  Project: { projectCode: string };
  ProjectSku: { skuCode: string };
}

export default function MRPCalculatorPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [mrps, setMRPs] = useState<MRP[]>([]);
  const [accuracy, setAccuracy] = useState<any>({});
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    skuId: '',
    targetQty: '',
    lossType: 'project_wide',
    projectWideLoss: '0.05'
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      fetchSKUs(formData.projectId);
    }
  }, [formData.projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProjects(),
        fetchAccuracy(),
        fetchRecommendations()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await listProjects();
      setProjects(response || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSKUs = async (projectId: string) => {
    try {
      const response = await listProjectSkus(projectId);
      setSkus(response || []);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
    }
  };

  const fetchAccuracy = async () => {
    try {
      const response = await getMRPAccuracy(90);
      setAccuracy(response);
    } catch (error) {
      console.error('Error fetching accuracy:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await getMRPRecommendations('pending');
      setRecommendations(response || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleCalculate = async () => {
    if (!formData.projectId || !formData.skuId || !formData.targetQty) {
      alert('Please fill all required fields');
      return;
    }

    setCalculating(true);
    try {
      await calculateMRP({
        projectId: formData.projectId,
        skuId: formData.skuId,
        targetQty: formData.targetQty,
        lossType: formData.lossType as any,
        projectWideLoss: formData.projectWideLoss,
      });

      alert('MRP calculated successfully!');

      // Fetch MRPs for this project
      const mrpResponse: any = await listProjectMRPs(formData.projectId);
      setMRPs(Array.isArray(mrpResponse) ? mrpResponse : (mrpResponse.mrps || []));
    } catch (error) {
      console.error('Error calculating MRP:', error);
      alert('Failed to calculate MRP');
    } finally {
      setCalculating(false);
    }
  };

  const handleAcceptRecommendation = async (id: string) => {
    try {
      await acceptRecommendation(id);
      fetchRecommendations();
      alert('Recommendation accepted');
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      alert('Failed to accept recommendation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading MRP calculator...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Material Requirements Planning (MRP)</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Calculate precise raw material quantities needed for production using BOM explosion, loss factors, and AI-powered recommendations
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            BOM Explosion: Breaks down finished goods into raw materials
          </span>
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            Loss Factors: Accounts for material waste during production
          </span>
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            AI Learning: Improves accuracy based on actual production data
          </span>
        </div>
      </div>

      {/* How MRP Calculation Works */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Calculator className="text-blue-600 dark:text-blue-400 w-10 h-10" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              How MRP Calculation Works
            </h3>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">Base Quantity</div>
                </div>
                <p className="text-blue-800 dark:text-blue-200 text-xs">Material needed per unit × Target quantity</p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                  <div className="text-blue-900 dark:text-blue-200">Example:</div>
                  <div className="text-blue-700 dark:text-blue-300">0.5 kg × 1000 units</div>
                  <div className="text-blue-900 dark:text-blue-200 font-bold">= 500 kg</div>
                </div>
              </div>

              <div className="bg-white dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">Loss Factor</div>
                </div>
                <p className="text-blue-800 dark:text-blue-200 text-xs">Additional % for wastage/defects</p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                  <div className="text-blue-900 dark:text-blue-200">Example:</div>
                  <div className="text-blue-700 dark:text-blue-300">500 kg × 5% loss</div>
                  <div className="text-blue-900 dark:text-blue-200 font-bold">= +25 kg</div>
                </div>
              </div>

              <div className="bg-white dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">AI Learning</div>
                </div>
                <p className="text-blue-800 dark:text-blue-200 text-xs">System adjusts loss based on history</p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                  <div className="text-blue-900 dark:text-blue-200">If historical:</div>
                  <div className="text-blue-700 dark:text-blue-300">Actual loss was 7%</div>
                  <div className="text-blue-900 dark:text-blue-200 font-bold">System suggests 7%</div>
                </div>
              </div>

              <div className="bg-white dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-xs">4</div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">Total Required</div>
                </div>
                <p className="text-blue-800 dark:text-blue-200 text-xs">Base + Loss = Final quantity</p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                  <div className="text-blue-900 dark:text-blue-200">Final:</div>
                  <div className="text-blue-700 dark:text-blue-300">500 kg + 25 kg</div>
                  <div className="text-blue-900 dark:text-blue-200 font-bold">= 525 kg to order</div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>💡 Pro Tip:</strong> The system learns from every production run. As you complete orders, MRP accuracy improves automatically by analyzing actual material consumption vs. estimates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 group hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Overall Accuracy</div>
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-56 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                How close MRP predictions match actual material usage in production. Higher is better.
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{accuracy.overallAccuracy || 0}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{accuracy.totalDataPoints || 0} data points analyzed</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Predictions vs. actual consumption</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 group hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Recommendations</div>
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-56 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                AI-generated suggestions to improve loss factors based on historical production patterns
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{recommendations.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Awaiting your review</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Accept to improve future calculations</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 group hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy by Category</div>
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-56 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                Prediction accuracy broken down by material type (fabric, hardware, packaging, etc.)
              </div>
            </div>
          </div>
          <div className="space-y-1 mt-2">
            {Object.entries(accuracy.byType || {}).length > 0 ? (
              Object.entries(accuracy.byType || {}).map(([type, acc]: [string, any]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{type}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{acc}%</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No data yet</p>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Different materials have different waste patterns</div>
        </div>
      </div>

      {/* MRP Calculator Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Calculate Material Requirements</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter production details to calculate exact raw material quantities needed</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1 text-gray-900 dark:text-white">
              Project *
              <div className="relative group/tooltip">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                  The manufacturing project with a configured Bill of Materials (BOM)
                </div>
              </div>
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value, skuId: '' })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode} - {p.projectName}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose the project to plan materials for</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1 text-gray-900 dark:text-white">
              SKU (Product) *
              <div className="relative group/tooltip">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                  The finished product variant you want to manufacture
                </div>
              </div>
            </label>
            <select
              value={formData.skuId}
              onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              disabled={!formData.projectId}
            >
              <option value="">Select SKU</option>
              {skus.map((s: any) => (
                <option key={s.id} value={s.id}>{s.skuCode} - {s.skuName}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.projectId ? 'Select the finished product variant' : 'Select a project first'}</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1 text-gray-900 dark:text-white">
              Target Quantity *
              <div className="relative group/tooltip">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                  Number of finished units you plan to produce. MRP calculates raw materials needed for this quantity.
                </div>
              </div>
            </label>
            <input
              type="number"
              value={formData.targetQty}
              onChange={(e) => setFormData({ ...formData, targetQty: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., 10000"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">How many finished units to manufacture</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1 text-gray-900 dark:text-white">
              Loss Type
              <div className="relative group/tooltip">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-full mt-1 w-64 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                  <strong>Project-Wide:</strong> Apply same loss % to all materials (simpler)<br />
                  <strong>Stage-Specific:</strong> Different loss % per production stage (more accurate)
                </div>
              </div>
            </label>
            <select
              value={formData.lossType}
              onChange={(e) => setFormData({ ...formData, lossType: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="project_wide">Project-Wide Loss % (Uniform)</option>
              <option value="stage_specific">Stage-Specific Loss % (Detailed)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">How loss factor is applied across operations</p>
          </div>

          {formData.lossType === 'project_wide' && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-1 text-gray-900 dark:text-white">
                Project-Wide Loss Factor
                <div className="relative group/tooltip">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                  <div className="absolute left-0 top-full mt-1 w-64 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                    Expected material wastage as decimal (0.05 = 5% loss)<br />
                    <strong>Examples:</strong><br />
                    • 0.03 = 3% (low waste, precision work)<br />
                    • 0.05 = 5% (typical manufacturing)<br />
                    • 0.10 = 10% (high waste, cutting/trimming)
                  </div>
                </div>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.projectWideLoss}
                onChange={(e) => setFormData({ ...formData, projectWideLoss: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., 0.05 for 5%"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <strong>Current:</strong> {(parseFloat(formData.projectWideLoss || '0') * 100).toFixed(1)}% waste factor applied
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            💡 <strong>Tip:</strong> After production, the system compares MRP estimates with actual material usage. If actual loss is higher/lower, you'll receive AI recommendations to adjust your loss factors for better accuracy next time.
          </p>
        </div>

        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {calculating ? 'Calculating...' : (
            <>
              <Calculator className="w-5 h-5" />
              Calculate Material Requirements
            </>
          )}
        </button>
      </div>      {/* System Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-yellow-900 mb-4">💡 System Recommendations</h2>
          <div className="space-y-3">
            {recommendations.slice(0, 3).map(rec => (
              <div key={rec.id} className="bg-white rounded-lg p-4 border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{rec.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{rec.description}</div>
                    <div className="text-sm text-green-600 font-medium mt-2">Impact: {rec.impact}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-blue-600">{rec.confidence.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">Confidence</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAcceptRecommendation(rec.id)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent MRPs */}
      {mrps.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">Recent MRP Calculations</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loss Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mrps.map(mrp => (
                  <tr key={mrp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{mrp.Project.projectCode}</td>
                    <td className="px-4 py-3">{mrp.ProjectSku.skuCode}</td>
                    <td className="px-4 py-3 text-right">{mrp.targetQty.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {mrp.lossType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      ₹{mrp.totalCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {Object.keys(mrp.requirements).length} materials
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

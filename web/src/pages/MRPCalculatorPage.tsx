import { useState, useEffect } from 'react';
import { listProjects } from '../lib/services/projects';
import { calculateMRP, getMRPAccuracy, getMRPRecommendations, listProjectMRPs, acceptRecommendation } from '../lib/services/mrp';
import { listProjectSkus } from '../lib/services/projects';

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
        <h1 className="text-3xl font-bold text-gray-900">MRP Calculator</h1>
        <p className="text-gray-600 mt-1">Material Requirement Planning with self-learning</p>
      </div>

      {/* Learning Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Overall Accuracy</div>
          <div className="text-3xl font-bold text-green-600">{accuracy.overallAccuracy || 0}%</div>
          <div className="text-xs text-gray-500 mt-1">{accuracy.totalDataPoints || 0} data points</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Pending Recommendations</div>
          <div className="text-3xl font-bold text-blue-600">{recommendations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">MRP Accuracy by Type</div>
          <div className="space-y-1 mt-2">
            {Object.entries(accuracy.byType || {}).map(([type, acc]: [string, any]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="text-gray-600">{type}:</span>
                <span className="font-medium">{acc}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MRP Calculator Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Calculate Material Requirements</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project *</label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value, skuId: '' })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode} - {p.projectName}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">SKU *</label>
            <select
              value={formData.skuId}
              onChange={(e) => setFormData({ ...formData, skuId: e.target.value })}
              className="w-full border rounded px-3 py-2"
              disabled={!formData.projectId}
            >
              <option value="">Select SKU</option>
              {skus.map((s: any) => (
                <option key={s.id} value={s.id}>{s.skuCode} - {s.skuName}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Target Quantity *</label>
            <input
              type="number"
              value={formData.targetQty}
              onChange={(e) => setFormData({ ...formData, targetQty: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., 10000"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Loss Type</label>
            <select
              value={formData.lossType}
              onChange={(e) => setFormData({ ...formData, lossType: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="project_wide">Project-Wide Loss %</option>
              <option value="stage_specific">Stage-Specific Loss %</option>
            </select>
          </div>
          
          {formData.lossType === 'project_wide' && (
            <div>
              <label className="block text-sm font-medium mb-1">Project-Wide Loss (0-1)</label>
              <input
                type="number"
                step="0.01"
                value={formData.projectWideLoss}
                onChange={(e) => setFormData({ ...formData, projectWideLoss: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., 0.05 for 5%"
              />
            </div>
          )}
        </div>
        
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {calculating ? 'Calculating...' : 'Calculate MRP'}
        </button>
      </div>

      {/* System Recommendations */}
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

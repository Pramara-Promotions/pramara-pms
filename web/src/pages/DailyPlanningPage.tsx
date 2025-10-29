import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api';

interface DailyPlan {
  id: string;
  date: string;
  targetQty: number;
  scenarioType: string;
  status: string;
  Project: { projectCode: string; projectName: string };
  stations: any[];
}

export default function DailyPlanningPage() {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [showAdaptModal, setShowAdaptModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DailyPlan | null>(null);
  
  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    targetQty: ''
  });

  const [adaptData, setAdaptData] = useState({
    adaptationType: 'worker_change',
    stationId: '',
    oldWorkerId: '',
    newWorkerId: '',
    oldQty: '',
    newQty: '',
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPlans(), fetchProjects()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await apiGet('/api/daily-plans');
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await apiGet('/api/projects');
      setProjects(response || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleGenerateScenarios = async () => {
    if (!formData.projectId || !formData.date || !formData.targetQty) {
      alert('Please fill all fields');
      return;
    }
    
    try {
      const response = await apiPost('/api/daily-plans/generate', {
        projectId: formData.projectId,
        date: formData.date,
        targetQty: parseInt(formData.targetQty)
      });
      
      setScenarios(response.scenarios || []);
      setShowScenarioModal(true);
    } catch (error) {
      console.error('Error generating scenarios:', error);
      alert('Failed to generate scenarios');
    }
  };

  const handleCreatePlan = async (scenario: any) => {
    try {
      await apiPost('/api/daily-plans', {
        projectId: formData.projectId,
        date: formData.date,
        targetQty: scenario.targetQty,
        scenarioType: scenario.scenarioType,
        stations: scenario.stations.map((s: any) => ({
          stationId: s.stationId,
          targetQty: s.targetQty,
          workerId: s.suggestedWorkers[0]?.workerId,
          assignmentReason: s.suggestedWorkers[0]?.reason
        }))
      });
      
      setShowScenarioModal(false);
      setScenarios([]);
      fetchPlans();
      alert('Daily plan created successfully!');
    } catch (error: any) {
      console.error('Error creating plan:', error);
      alert(error.message || 'Failed to create plan');
    }
  };

  const handleApprovePlan = async (planId: string) => {
    try {
      await apiPut(`/api/daily-plans/${planId}/approve`, {});
      fetchPlans();
    } catch (error) {
      console.error('Error approving plan:', error);
      alert('Failed to approve plan');
    }
  };

  const handleAdapt = async () => {
    if (!selectedPlan) return;
    
    try {
      await apiPost(`/api/daily-plans/${selectedPlan.id}/adapt`, adaptData);
      setShowAdaptModal(false);
      fetchPlans();
      alert('Adaptation logged successfully');
    } catch (error) {
      console.error('Error adapting plan:', error);
      alert('Failed to adapt plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading daily plans...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Daily Planning</h1>
        <p className="text-gray-600 mt-1">Generate scenarios, validate materials, assign workers</p>
      </div>

      {/* Plan Creation Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Generate New Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project *</label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Qty *</label>
            <input
              type="number"
              value={formData.targetQty}
              onChange={(e) => setFormData({ ...formData, targetQty: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateScenarios}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Generate 3 Scenarios
            </button>
          </div>
        </div>
      </div>

      {/* Existing Plans */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Daily Plans</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stations</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {plans.map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{new Date(plan.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{plan.Project.projectCode}</div>
                    <div className="text-sm text-gray-500">{plan.Project.projectName}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{plan.targetQty}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      plan.scenarioType === 'fastest' ? 'bg-red-100 text-red-800' :
                      plan.scenarioType === 'cheapest' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {plan.scenarioType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{plan.stations.length} stations</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      plan.status === 'approved' ? 'bg-green-100 text-green-800' :
                      plan.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {plan.status === 'draft' && (
                        <button
                          onClick={() => handleApprovePlan(plan.id)}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowAdaptModal(true);
                        }}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Adapt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenarios Modal */}
      {showScenarioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Choose Scenario</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenarios.map(scenario => (
                  <div key={scenario.scenarioType} className="border-2 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
                    <div className="text-center mb-4">
                      <div className="text-lg font-bold capitalize mb-1">{scenario.scenarioType}</div>
                      <div className="text-3xl font-bold text-green-600">₹{scenario.totalCost}</div>
                      <div className="text-sm text-gray-500">{scenario.estimatedDuration} hrs</div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {scenario.stations.map((station: any, idx: number) => (
                        <div key={idx} className="text-sm border-t pt-2">
                          <div className="font-medium">{station.stationName}</div>
                          <div className="text-gray-600">{station.workersNeeded} workers needed</div>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handleCreatePlan(scenario)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Select This Plan
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setShowScenarioModal(false);
                    setScenarios([]);
                  }}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adapt Modal */}
      {showAdaptModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Adapt Plan</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Adaptation Type</label>
                  <select
                    value={adaptData.adaptationType}
                    onChange={(e) => setAdaptData({ ...adaptData, adaptationType: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="worker_change">Worker Change</option>
                    <option value="qty_change">Quantity Change</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Reason *</label>
                  <textarea
                    value={adaptData.reason}
                    onChange={(e) => setAdaptData({ ...adaptData, reason: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 mt-4 border-t">
                <button
                  onClick={() => setShowAdaptModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdapt}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Log Adaptation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

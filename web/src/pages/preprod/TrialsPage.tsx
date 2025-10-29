import { useState, useEffect } from 'react';
import { Plus, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Trial {
  id: string;
  moldId: string;
  projectId: number;
  trialNumber: number;
  trialDate: string;
  machineId: string | null;
  cycleTime: number | null;
  temperature: number | null;
  pressure: number | null;
  samplesProduced: number | null;
  defectsFound: number | null;
  defectTypes: DefectType[] | null;
  observations: string | null;
  outcome: string;
  nextSteps: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mold: {
    id: string;
    moldCode: string;
    moldName: string;
  };
  runner: {
    id: string;
    name: string;
  };
  approver: {
    id: string;
    name: string;
  } | null;
}

interface DefectType {
  type: string;
  count: number;
  severity: string;
}

const TrialsPage = () => {
  const moldIdParam = new URLSearchParams(window.location.search).get('moldId');
  
  const [trials, setTrials] = useState<Trial[]>([]);
  const [selectedMold, setSelectedMold] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    moldId: moldIdParam || '',
    projectId: '',
    trialNumber: '',
    trialDate: new Date().toISOString().split('T')[0],
    machineId: '',
    cycleTime: '',
    temperature: '',
    pressure: '',
    samplesProduced: '',
    defectsFound: '',
    observations: '',
    nextSteps: '',
  });

  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);

  const outcomeOptions = [
    { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-gray-100 text-gray-800' },
    { value: 'passed', label: 'Passed', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { value: 'failed', label: 'Failed', icon: XCircle, color: 'bg-red-100 text-red-800' },
    { value: 'conditional', label: 'Conditional', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  ];

  useEffect(() => {
    if (moldIdParam) {
      fetchMoldDetails(moldIdParam);
      fetchTrials();
    }
  }, [moldIdParam]);

  const fetchMoldDetails = async (moldId: string) => {
    try {
      const res = await fetch(`/api/pre-production/molds/${moldId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedMold(data);
        setFormData(prev => ({
          ...prev,
          projectId: data.projectId.toString(),
          trialNumber: (data.trials?.length + 1).toString(),
        }));
      }
    } catch (error) {
      console.error('Error fetching mold:', error);
    }
  };

  const fetchTrials = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (moldIdParam) params.append('moldId', moldIdParam);

      const res = await fetch(`/api/pre-production/trials?${params}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTrials(data);
      }
    } catch (error) {
      console.error('Error fetching trials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addDefectType = () => {
    setDefectTypes([...defectTypes, { type: '', count: 0, severity: 'minor' }]);
  };

  const updateDefectType = (index: number, field: keyof DefectType, value: any) => {
    const updated = [...defectTypes];
    updated[index] = { ...updated[index], [field]: value };
    setDefectTypes(updated);
  };

  const removeDefectType = (index: number) => {
    setDefectTypes(defectTypes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/pre-production/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          defectTypes: defectTypes.length > 0 ? defectTypes : null,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchTrials();
        fetchMoldDetails(moldIdParam!);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create trial');
      }
    } catch (error) {
      console.error('Error creating trial:', error);
      alert('Failed to create trial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTrial = async (trialId: string) => {
    if (!confirm('Are you sure you want to approve this trial?')) return;

    try {
      const res = await fetch(`/api/pre-production/trials/${trialId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        fetchTrials();
      } else {
        alert('Failed to approve trial');
      }
    } catch (error) {
      console.error('Error approving trial:', error);
      alert('Failed to approve trial');
    }
  };

  const resetForm = () => {
    setFormData({
      moldId: moldIdParam || '',
      projectId: selectedMold?.projectId.toString() || '',
      trialNumber: (trials.length + 1).toString(),
      trialDate: new Date().toISOString().split('T')[0],
      machineId: '',
      cycleTime: '',
      temperature: '',
      pressure: '',
      samplesProduced: '',
      defectsFound: '',
      observations: '',
      nextSteps: '',
    });
    setDefectTypes([]);
  };

  const getOutcomeConfig = (outcome: string) => {
    return outcomeOptions.find(o => o.value === outcome) || outcomeOptions[0];
  };

  if (!moldIdParam) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Please select a mold from the Molds page to view trials.</p>
          <button
            onClick={() => window.location.href = '/preprod/molds'}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Molds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.location.href = '/preprod/molds'}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            Trials - {selectedMold?.moldCode}
          </h1>
          <p className="text-gray-600 mt-1">{selectedMold?.moldName}</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Trial
        </button>
      </div>

      {/* Mold Info Card */}
      {selectedMold && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Supplier</p>
              <p className="font-medium">{selectedMold.supplierName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cavities</p>
              <p className="font-medium">{selectedMold.cavities}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Material</p>
              <p className="font-medium">{selectedMold.material || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Trials</p>
              <p className="font-medium">{trials.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trials List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading trials...</div>
        ) : trials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No trials yet. Click "New Trial" to create one.</p>
          </div>
        ) : (
          trials.map((trial) => {
            const outcomeConfig = getOutcomeConfig(trial.outcome);
            const OutcomeIcon = outcomeConfig.icon;

            return (
              <div key={trial.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Trial #{trial.trialNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(trial.trialDate).toLocaleDateString()} • Run by {trial.runner.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${outcomeConfig.color}`}>
                      <OutcomeIcon size={16} />
                      {outcomeConfig.label}
                    </span>
                    {trial.outcome === 'pending' && (
                      <button
                        onClick={() => handleApproveTrial(trial.id)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Machine ID</p>
                    <p className="font-medium">{trial.machineId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cycle Time</p>
                    <p className="font-medium">{trial.cycleTime ? `${trial.cycleTime}s` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Temperature</p>
                    <p className="font-medium">{trial.temperature ? `${trial.temperature}°C` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pressure</p>
                    <p className="font-medium">{trial.pressure ? `${trial.pressure} bar` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Samples Produced</p>
                    <p className="font-medium">{trial.samplesProduced || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Defects Found</p>
                    <p className="font-medium text-red-600">{trial.defectsFound || 0}</p>
                  </div>
                </div>

                {trial.defectTypes && Array.isArray(trial.defectTypes) && trial.defectTypes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Defect Breakdown:</p>
                    <div className="flex flex-wrap gap-2">
                      {trial.defectTypes.map((defect: DefectType, idx: number) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded text-xs ${
                            defect.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : defect.severity === 'major'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {defect.type}: {defect.count} ({defect.severity})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {trial.observations && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Observations:</p>
                    <p className="text-sm text-gray-600">{trial.observations}</p>
                  </div>
                )}

                {trial.nextSteps && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Next Steps:</p>
                    <p className="text-sm text-gray-600">{trial.nextSteps}</p>
                  </div>
                )}

                {trial.approver && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-gray-600">
                      Approved by <span className="font-medium">{trial.approver.name}</span> on{' '}
                      {new Date(trial.approvedAt!).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Trial Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Create New Trial - #{formData.trialNumber}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trial Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.trialDate}
                      onChange={(e) => setFormData({ ...formData, trialDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Machine ID
                    </label>
                    <input
                      type="text"
                      value={formData.machineId}
                      onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="M-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cycle Time (seconds)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.cycleTime}
                      onChange={(e) => setFormData({ ...formData, cycleTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pressure (bar)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.pressure}
                      onChange={(e) => setFormData({ ...formData, pressure: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Samples Produced
                    </label>
                    <input
                      type="number"
                      value={formData.samplesProduced}
                      onChange={(e) => setFormData({ ...formData, samplesProduced: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Defects Found
                    </label>
                    <input
                      type="number"
                      value={formData.defectsFound}
                      onChange={(e) => setFormData({ ...formData, defectsFound: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Defect Types */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Defect Types
                    </label>
                    <button
                      type="button"
                      onClick={addDefectType}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Defect Type
                    </button>
                  </div>

                  <div className="space-y-2">
                    {defectTypes.map((defect, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={defect.type}
                          onChange={(e) => updateDefectType(index, 'type', e.target.value)}
                          placeholder="Defect type"
                          className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          value={defect.count}
                          onChange={(e) => updateDefectType(index, 'count', parseInt(e.target.value) || 0)}
                          placeholder="Count"
                          className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={defect.severity}
                          onChange={(e) => updateDefectType(index, 'severity', e.target.value)}
                          className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="minor">Minor</option>
                          <option value="major">Major</option>
                          <option value="critical">Critical</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeDefectType(index)}
                          className="col-span-1 text-red-600 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observations
                  </label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Detailed observations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Steps
                  </label>
                  <textarea
                    value={formData.nextSteps}
                    onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="What needs to be done next..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create Trial'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrialsPage;

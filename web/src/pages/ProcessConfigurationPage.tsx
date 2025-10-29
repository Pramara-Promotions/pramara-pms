import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

interface Station {
  id: string;
  code: string;
  name: string;
  type: string;
  requiredSkills?: string[];
}

interface Project {
  id: string;
  projectCode: string;
  projectName: string;
}

interface ProcessConfig {
  id: string;
  stationId: string;
  projectId: string;
  cycleTimeSec?: number;
  cavities?: number;
  itemWeight?: number;
  runnerWeight?: number;
  paintConsumption?: number;
  thinnerConsumption?: number;
  assemblyTimeSec?: number;
  scrapRate: number;
}

export default function ProcessConfigurationPage() {
  const navigate = useNavigate();
  const [filterStationId, setFilterStationId] = useState<string>('');
  
  const [configs, setConfigs] = useState<ProcessConfig[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ProcessConfig | null>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    stationId: '',
    projectId: '',
    cycleTimeSec: '',
    cavities: '',
    itemWeight: '',
    runnerWeight: '',
    paintConsumption: '',
    thinnerConsumption: '',
    assemblyTimeSec: '',
    scrapRate: ''
  });

  useEffect(() => {
    fetchConfigs();
    fetchStations();
    fetchProjects();
  }, [filterStationId]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStationId) params.append('stationId', filterStationId);
      
      const response = await apiGet(`/api/process-config?${params}`);
      setConfigs(response.configs || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await apiGet('/api/stations');
      setStations(response.stations || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cycleTimeSec: parseFloat(formData.cycleTimeSec) || null,
        cavities: parseInt(formData.cavities) || null,
        itemWeight: parseFloat(formData.itemWeight) || null,
        runnerWeight: parseFloat(formData.runnerWeight) || null,
        paintConsumption: parseFloat(formData.paintConsumption) || null,
        thinnerConsumption: parseFloat(formData.thinnerConsumption) || null,
        assemblyTimeSec: parseFloat(formData.assemblyTimeSec) || null,
        scrapRate: parseFloat(formData.scrapRate) || 0
      };

      if (selectedConfig) {
        await apiPut(`/api/process-config/${selectedConfig.id}`, payload);
      } else {
        await apiPost('/api/process-config', payload);
      }
      
      setShowModal(false);
      resetForm();
      fetchConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    }
  };

  const handleCalculate = async (configId) => {
    try {
      const targetQty = prompt('Enter target quantity to calculate:');
      if (!targetQty) return;
      
      const response = await apiPost(`/api/process-config/${configId}/calculate`, {
        targetQty: parseInt(targetQty)
      });
      
      setCalculationResult(response.calculation);
      alert(`Output/Hour: ${response.calculation.outputPerHour}\nTime Required: ${response.calculation.totalTimeRequired.toFixed(2)} hrs\nMachines: ${response.calculation.machinesRequired}\nMaterial: ${response.calculation.materialConsumption?.toFixed(2) || 0} kg`);
    } catch (error) {
      console.error('Error calculating:', error);
      alert('Failed to calculate production metrics');
    }
  };

  const handleEdit = (config) => {
    setSelectedConfig(config);
    setFormData({
      stationId: config.stationId,
      projectId: config.projectId,
      cycleTimeSec: config.cycleTimeSec || '',
      cavities: config.cavities || '',
      itemWeight: config.itemWeight || '',
      runnerWeight: config.runnerWeight || '',
      paintConsumption: config.paintConsumption || '',
      thinnerConsumption: config.thinnerConsumption || '',
      assemblyTimeSec: config.assemblyTimeSec || '',
      scrapRate: config.scrapRate || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this configuration?')) return;
    
    try {
      await apiDelete(`/api/process-config/${id}`);
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      stationId: '',
      projectId: '',
      cycleTimeSec: '',
      cavities: '',
      itemWeight: '',
      runnerWeight: '',
      paintConsumption: '',
      thinnerConsumption: '',
      assemblyTimeSec: '',
      scrapRate: ''
    });
    setSelectedConfig(null);
  };

  const getStationType = (stationId) => {
    const station = stations.find(s => s.id === stationId);
    return station?.type || 'unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading configurations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Process Configuration</h1>
          <p className="text-gray-600 mt-1">Configure production parameters and calculations</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + New Configuration
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <select
          value={filterStationId}
          onChange={(e) => setFilterStationId(e.target.value)}
          className="border rounded px-3 py-2 w-64"
        >
          <option value="">All Stations</option>
          {stations.map(station => (
            <option key={station.id} value={station.id}>{station.name}</option>
          ))}
        </select>
      </div>

      {/* Configs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs.map(config => {
          const station = stations.find(s => s.id === config.stationId);
          const project = projects.find(p => p.id === config.projectId);
          const type = station?.type || 'unknown';
          
          return (
            <div key={config.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{station?.name}</h3>
                    <p className="text-sm text-gray-500">{project?.projectCode}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    type === 'molding' ? 'bg-purple-100 text-purple-800' :
                    type === 'painting' ? 'bg-blue-100 text-blue-800' :
                    type === 'assembly' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {type.toUpperCase()}
                  </span>
                </div>

                {/* Parameters based on type */}
                <div className="space-y-2 mb-4">
                  {type === 'molding' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cycle Time:</span>
                        <span className="font-medium">{config.cycleTimeSec}s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cavities:</span>
                        <span className="font-medium">{config.cavities}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Item Weight:</span>
                        <span className="font-medium">{config.itemWeight}g</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Runner Weight:</span>
                        <span className="font-medium">{config.runnerWeight}g</span>
                      </div>
                    </>
                  )}
                  
                  {type === 'painting' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paint:</span>
                        <span className="font-medium">{config.paintConsumption}ml/unit</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Thinner:</span>
                        <span className="font-medium">{config.thinnerConsumption}ml/unit</span>
                      </div>
                    </>
                  )}
                  
                  {type === 'assembly' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Assembly Time:</span>
                      <span className="font-medium">{config.assemblyTimeSec}s</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Scrap Rate:</span>
                    <span className="font-medium">{(config.scrapRate * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleCalculate(config.id)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition text-sm"
                  >
                    Calculate
                  </button>
                  <button
                    onClick={() => handleEdit(config)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No configurations found. Create one to get started.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {selectedConfig ? 'Edit Configuration' : 'New Configuration'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Station *</label>
                  <select
                    required
                    value={formData.stationId}
                    onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Station</option>
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.name} ({station.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Project *</label>
                  <select
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.projectCode} - {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional fields based on station type */}
                {formData.stationId && getStationType(formData.stationId) === 'molding' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Cycle Time (sec)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.cycleTimeSec}
                          onChange={(e) => setFormData({ ...formData, cycleTimeSec: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Cavities</label>
                        <input
                          type="number"
                          value={formData.cavities}
                          onChange={(e) => setFormData({ ...formData, cavities: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Item Weight (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.itemWeight}
                          onChange={(e) => setFormData({ ...formData, itemWeight: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Runner Weight (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.runnerWeight}
                          onChange={(e) => setFormData({ ...formData, runnerWeight: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                    </div>
                  </>
                )}

                {formData.stationId && getStationType(formData.stationId) === 'painting' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Paint (ml/unit)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.paintConsumption}
                        onChange={(e) => setFormData({ ...formData, paintConsumption: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Thinner (ml/unit)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.thinnerConsumption}
                        onChange={(e) => setFormData({ ...formData, thinnerConsumption: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                {formData.stationId && getStationType(formData.stationId) === 'assembly' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Assembly Time (sec)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.assemblyTimeSec}
                      onChange={(e) => setFormData({ ...formData, assemblyTimeSec: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Scrap Rate (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.scrapRate}
                    onChange={(e) => setFormData({ ...formData, scrapRate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    {selectedConfig ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

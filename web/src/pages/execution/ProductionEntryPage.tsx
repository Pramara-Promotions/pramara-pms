import { useState, useEffect } from 'react';
import { Plus, Factory, TrendingUp, Package, AlertCircle, Clock } from 'lucide-react';
import { listProjects } from '../../lib/services/projects';
import { listStations } from '../../lib/services/stations';
import { listShifts } from '../../lib/services/shifts';
import { listProductionEntries, getProductionAnalytics, createProductionEntry } from '../../lib/services/productionEntries';

interface ProductionEntry {
  id: string;
  projectId: number;
  stationId: number;
  shiftId: string;
  batchCode: string | null;
  startTime: string;
  endTime: string | null;
  targetQty: number;
  actualQty: number;
  rejectedQty: number;
  outputVariance: number;
  notes: string | null;
  Project: { id: number; name: string };
  Station: { id: number; name: string; code: string };
  Shift: { id: string; name: string };
  MaterialConsumption: Array<{ materialName: string; quantityUsed: number; unit: string }>;
}

interface ProductionAnalytics {
  totalEntries: number;
  totalTarget: number;
  totalProduced: number;
  totalRejected: number;
  approvedQty: number;
  efficiency: number;
  qualityRate: number;
  avgVariance: number;
}

const ProductionEntryPage = () => {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [analytics, setAnalytics] = useState<ProductionAnalytics | null>(null);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [stations, setStations] = useState<Array<{ id: number; name: string }>>([]);
  const [shifts, setShifts] = useState<Array<{ id: string; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    stationId: '',
    shiftId: '',
    batchCode: '',
    startTime: '',
    endTime: '',
    targetQty: 0,
    actualQty: 0,
    rejectedQty: 0,
    notes: '',
  });

  useEffect(() => {
    fetchEntries();
    fetchAnalytics();
    fetchProjects();
    fetchStations();
    fetchShifts();
  }, [projectFilter, stationFilter]);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const rows = await listProductionEntries({ projectId: projectFilter, stationId: stationFilter });
      setEntries(rows || []);
    } catch (error) {
      console.error('Error fetching production entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await getProductionAnalytics({ projectId: projectFilter, stationId: stationFilter });
      setAnalytics(data || null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const rows = await listProjects();
      setProjects(rows || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchStations = async () => {
    try {
      const rows = await listStations();
      setStations(rows || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const rows = await listShifts();
      setShifts(rows || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createProductionEntry(formData);
      setIsModalOpen(false);
      resetForm();
      fetchEntries();
      fetchAnalytics();
    } catch (error) {
      console.error('Error creating production entry:', error);
      alert('Failed to create production entry');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      stationId: '',
      shiftId: '',
      batchCode: '',
      startTime: '',
      endTime: '',
      targetQty: 0,
      actualQty: 0,
      rejectedQty: 0,
      notes: '',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="text-blue-600" size={32} />
            Production Entry
          </h1>
          <p className="text-gray-600 mt-1">Track daily production output and material consumption</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Entry
        </button>
      </div>

      {analytics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalEntries}</p>
              </div>
              <Package className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Produced</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.totalProduced}</p>
              </div>
              <TrendingUp className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Efficiency</p>
                <p className="text-2xl font-bold text-green-600">{analytics.efficiency.toFixed(1)}%</p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Quality Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.qualityRate.toFixed(1)}%</p>
              </div>
              <Clock className="text-green-600" size={32} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Stations</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Factory size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No production entries found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const approvedQty = entry.actualQty - entry.rejectedQty;
            const efficiency = entry.targetQty > 0 ? (entry.actualQty / entry.targetQty) * 100 : 0;
            return (
              <div key={entry.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{entry.Project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.Station.name} • {entry.Shift.name} • {new Date(entry.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${efficiency >= 100 ? 'bg-green-100 text-green-700' : efficiency >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {efficiency.toFixed(1)}% Efficiency
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-4">
                  {entry.batchCode && (
                    <div>
                      <p className="text-gray-600 text-sm">Batch Code</p>
                      <p className="font-medium">{entry.batchCode}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600 text-sm">Target</p>
                    <p className="font-medium">{entry.targetQty}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Produced</p>
                    <p className="font-medium text-blue-600">{entry.actualQty}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Approved</p>
                    <p className="font-medium text-green-600">{approvedQty}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Rejected</p>
                    <p className="font-medium text-red-600">{entry.rejectedQty}</p>
                  </div>
                </div>

                {entry.MaterialConsumption.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 mb-2">Materials Used:</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.MaterialConsumption.map((mat, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white rounded text-sm">
                          {mat.materialName}: {mat.quantityUsed} {mat.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entry.notes && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">{entry.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">New Production Entry</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Project *</label>
                    <select required value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Station *</label>
                    <select required value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Station</option>
                      {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Shift *</label>
                    <select required value={formData.shiftId} onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Shift</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Batch Code</label>
                    <input type="text" value={formData.batchCode} onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="BATCH-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Time *</label>
                    <input required type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Time</label>
                    <input type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Qty *</label>
                    <input required type="number" min="1" value={formData.targetQty} onChange={(e) => setFormData({ ...formData, targetQty: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Actual Qty *</label>
                    <input required type="number" min="0" value={formData.actualQty} onChange={(e) => setFormData({ ...formData, actualQty: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rejected Qty</label>
                    <input type="number" min="0" value={formData.rejectedQty} onChange={(e) => setFormData({ ...formData, rejectedQty: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Creating...' : 'Create Entry'}
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

export default ProductionEntryPage;

import { useState, useEffect } from 'react';
import { listProjects } from '../../lib/services/projects';
import { listStations, listStationTypes, getStationAnalytics, createStation, updateStation } from '../../lib/services/stations';
import { Plus, Factory, TrendingUp, Clock, AlertCircle, CheckCircle, Wrench, Search, BarChart3 } from 'lucide-react';

interface Station {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: string;
  active: boolean;
  capacity: number;
  avgOutputRate: number | null;
  avgQualityRate: number | null;
  totalJobsCompleted: number;
  project: { id: number; name: string } | null;
  StationType: { id: number; name: string } | null;
  Room: { id: number; name: string } | null;
  _count: {
    ProductionEntry: number;
    QCSubmission: number;
    MaintenanceLog: number;
    shiftEntries: number;
  };
}

interface StationAnalytics {
  production: {
    totalEntries: number;
    totalProduced: number;
    totalApproved: number;
    totalRejected: number;
    qualityRate: number;
  };
  qc: { totalSubmissions: number };
  shifts: {
    totalShifts: number;
    totalProduced: number;
    totalWorkers: number;
    totalDowntime: number;
    avgEfficiency: number;
  };
  wip: {
    input: number;
    output: number;
    transfer: number;
    scrap: number;
  };
}

const StationsPage = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [stationTypes, setStationTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [analytics, setAnalytics] = useState<StationAnalytics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    name: '',
    code: '',
    description: '',
    stationTypeId: '',
    capacity: 1,
    status: 'operational',
    active: true,
  });

  const statusOptions = [
    { value: 'operational', label: 'Operational', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-yellow-600 bg-yellow-100' },
    { value: 'down', label: 'Down', icon: AlertCircle, color: 'text-red-600 bg-red-100' },
    { value: 'idle', label: 'Idle', icon: Clock, color: 'text-gray-600 bg-gray-100' },
  ];

  useEffect(() => {
    fetchStations();
    fetchProjects();
    fetchStationTypes();
  }, [statusFilter, projectFilter]);

  const fetchStations = async () => {
    setIsLoading(true);
    try {
      const rows = await listStations({ status: statusFilter, projectId: projectFilter, search });
      setStations(rows || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setIsLoading(false);
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

  const fetchStationTypes = async () => {
    try {
      const rows = await listStationTypes();
      setStationTypes(rows || []);
    } catch (error) {
      console.error('Error fetching station types:', error);
    }
  };

  const fetchAnalytics = async (stationId: number) => {
    try {
      const data = await getStationAnalytics(stationId);
      setAnalytics(data);
      setIsAnalyticsOpen(true);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedStation) {
        await updateStation(selectedStation.id, formData);
      } else {
        await createStation(formData);
      }

      {
        setIsModalOpen(false);
        resetForm();
        fetchStations();
      }
    } catch (error) {
      console.error('Error saving station:', error);
      alert('Failed to save station');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      name: '',
      code: '',
      description: '',
      stationTypeId: '',
      capacity: 1,
      status: 'operational',
      active: true,
    });
    setSelectedStation(null);
  };

  const handleEdit = (station: Station) => {
    setSelectedStation(station);
    setFormData({
      projectId: station.project?.id.toString() || '',
      name: station.name,
      code: station.code || '',
      description: station.description || '',
      stationTypeId: station.StationType?.id.toString() || '',
      capacity: station.capacity,
      status: station.status,
      active: station.active,
    });
    setIsModalOpen(true);
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[3];
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="text-blue-600" size={32} />
            Station Management
          </h1>
          <p className="text-gray-600 mt-1">Manage production stations and equipment</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Station
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search stations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStations()}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
      ) : stations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Factory size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No stations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station) => {
            const statusConfig = getStatusConfig(station.status);
            const StatusIcon = statusConfig.icon;
            return (
              <div key={station.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{station.name}</h3>
                        {!station.active && (
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">Inactive</span>
                        )}
                      </div>
                      {station.code && (
                        <p className="text-sm text-gray-600 font-mono">{station.code}</p>
                      )}
                    </div>
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                      <StatusIcon size={14} />
                      {statusConfig.label}
                    </span>
                  </div>

                  {station.description && (
                    <p className="text-gray-700 mb-4 text-sm line-clamp-2">{station.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    {station.project && (
                      <div>
                        <p className="text-gray-600">Project</p>
                        <p className="font-medium truncate">{station.project.name}</p>
                      </div>
                    )}
                    {station.StationType && (
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p className="font-medium">{station.StationType.name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600">Capacity</p>
                      <p className="font-medium">{station.capacity} units</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Jobs Done</p>
                      <p className="font-medium">{station.totalJobsCompleted}</p>
                    </div>
                  </div>

                  {(station.avgOutputRate !== null || station.avgQualityRate !== null) && (
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      {station.avgOutputRate !== null && (
                        <div>
                          <p className="text-gray-600">Avg Output</p>
                          <p className="font-medium text-blue-600">{station.avgOutputRate.toFixed(1)}%</p>
                        </div>
                      )}
                      {station.avgQualityRate !== null && (
                        <div>
                          <p className="text-gray-600">Avg Quality</p>
                          <p className="font-medium text-green-600">{station.avgQualityRate.toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleEdit(station)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => fetchAnalytics(station.id)}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                    >
                      <BarChart3 size={16} />
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{selectedStation ? 'Edit' : 'New'} Station</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Project</label>
                    <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">No Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Code</label>
                    <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="STA-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select value={formData.stationTypeId} onChange={(e) => setFormData({ ...formData, stationTypeId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Type</option>
                      {stationTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Capacity *</label>
                    <input required type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status *</label>
                    <select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="w-4 h-4" />
                    <label className="text-sm font-medium">Active</label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : selectedStation ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isAnalyticsOpen && analytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Station Analytics</h2>
                <button onClick={() => setIsAnalyticsOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="text-blue-600" size={20} />
                    Production
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Entries:</span><strong>{analytics.production.totalEntries}</strong></div>
                    <div className="flex justify-between"><span>Total Produced:</span><strong>{analytics.production.totalProduced}</strong></div>
                    <div className="flex justify-between"><span>Approved:</span><strong className="text-green-600">{analytics.production.totalApproved}</strong></div>
                    <div className="flex justify-between"><span>Rejected:</span><strong className="text-red-600">{analytics.production.totalRejected}</strong></div>
                    <div className="flex justify-between"><span>Quality Rate:</span><strong>{analytics.production.qualityRate.toFixed(1)}%</strong></div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="text-purple-600" size={20} />
                    Quality Control
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Submissions:</span><strong>{analytics.qc.totalSubmissions}</strong></div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="text-green-600" size={20} />
                    Shift Performance
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Shifts:</span><strong>{analytics.shifts.totalShifts}</strong></div>
                    <div className="flex justify-between"><span>Total Produced:</span><strong>{analytics.shifts.totalProduced}</strong></div>
                    <div className="flex justify-between"><span>Total Workers:</span><strong>{analytics.shifts.totalWorkers}</strong></div>
                    <div className="flex justify-between"><span>Downtime:</span><strong>{analytics.shifts.totalDowntime} min</strong></div>
                    <div className="flex justify-between"><span>Avg Efficiency:</span><strong>{analytics.shifts.avgEfficiency.toFixed(1)}%</strong></div>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Factory className="text-orange-600" size={20} />
                    WIP Movement
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Input:</span><strong className="text-green-600">+{analytics.wip.input}</strong></div>
                    <div className="flex justify-between"><span>Output:</span><strong className="text-blue-600">-{analytics.wip.output}</strong></div>
                    <div className="flex justify-between"><span>Transfer:</span><strong>{analytics.wip.transfer}</strong></div>
                    <div className="flex justify-between"><span>Scrap:</span><strong className="text-red-600">-{analytics.wip.scrap}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationsPage;

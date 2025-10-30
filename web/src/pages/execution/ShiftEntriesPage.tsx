import { useState, useEffect } from 'react';
import { listProjects } from '../../lib/services/projects';
import { listStations } from '../../lib/services/stations';
import { listWorkers } from '../../lib/services/workers';
import { listShiftEntries, createShiftEntry, updateShiftEntry, deleteShiftEntry, submitShiftEntry, approveShiftEntry } from '../../lib/services/shiftEntries';
import { Plus, Edit2, Trash2, Clock, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface ShiftEntry {
  id: string;
  projectId: number;
  project: { id: number; name: string };
  stationId: number | null;
  station: { id: number; name: string; code: string } | null;
  shiftDate: string;
  shiftType: string;
  shiftStartTime: string;
  shiftEndTime: string;
  supervisor: { id: string; name: string; email: string };
  workersPresent: number;
  workersAbsent: number;
  totalProduced: number;
  targetProduction: number | null;
  qualityPassed: number;
  qualityRejected: number;
  downtimeMinutes: number;
  efficiency: number | null;
  status: string;
  createdAt: string;
}

const ShiftEntriesPage = () => {
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [stations, setStations] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ShiftEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    stationId: '',
    shiftDate: '',
    shiftType: 'morning',
    shiftStartTime: '',
    shiftEndTime: '',
    supervisorId: '',
    workersPresent: 0,
    workersAbsent: 0,
    totalProduced: 0,
    targetProduction: 0,
    qualityPassed: 0,
    qualityRejected: 0,
    downtimeMinutes: 0,
    downtimeReason: '',
    achievements: '',
    handoverNotes: '',
  });

  const shiftTypes = ['morning', 'afternoon', 'night', 'custom'];

  useEffect(() => {
    fetchProjects();
    fetchStations();
    fetchUsers();
    fetchEntries();
  }, [projectFilter, statusFilter]);

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

  const fetchUsers = async () => {
    try {
      const rows = await listWorkers();
      setUsers(rows || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const rows = await listShiftEntries({ projectId: projectFilter, status: statusFilter });
      setEntries(rows || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingEntry) {
        await updateShiftEntry(editingEntry.id, formData);
      } else {
        await createShiftEntry(formData);
      }

      {
        setIsModalOpen(false);
        setEditingEntry(null);
        resetForm();
        fetchEntries();
      }
    } catch (error) {
      console.error('Error saving shift entry:', error);
      alert('Failed to save shift entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      await submitShiftEntry(id);
      fetchEntries();
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this shift entry?')) return;
    try {
      await approveShiftEntry(id);
      fetchEntries();
    } catch (error) {
      console.error('Error approving entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shift entry?')) return;
    try {
      await deleteShiftEntry(id);
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      stationId: '',
      shiftDate: '',
      shiftType: 'morning',
      shiftStartTime: '',
      shiftEndTime: '',
      supervisorId: '',
      workersPresent: 0,
      workersAbsent: 0,
      totalProduced: 0,
      targetProduction: 0,
      qualityPassed: 0,
      qualityRejected: 0,
      downtimeMinutes: 0,
      downtimeReason: '',
      achievements: '',
      handoverNotes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return { color: 'bg-green-100 text-green-800', label: 'Approved', icon: CheckCircle };
      case 'submitted': return { color: 'bg-blue-100 text-blue-800', label: 'Submitted', icon: Clock };
      case 'draft': return { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Clock };
      default: return { color: 'bg-gray-100 text-gray-800', label: status, icon: Clock };
    }
  };

  const getEfficiencyColor = (efficiency: number | null) => {
    if (!efficiency) return 'text-gray-600';
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="text-blue-600" size={32} />
            Shift Entries
          </h1>
          <p className="text-gray-600 mt-1">Track daily shift performance and handovers</p>
        </div>
        <button
          onClick={() => { setEditingEntry(null); resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Entry
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
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
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No shift entries found</p>
          </div>
        ) : (
          entries.map((entry) => {
            const status = getStatusBadge(entry.status);
            const StatusIcon = status.icon;
            const qualityRate = entry.totalProduced > 0 
              ? ((entry.qualityPassed / entry.totalProduced) * 100).toFixed(1)
              : '0';
            return (
              <div key={entry.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {new Date(entry.shiftDate).toLocaleDateString()} - {entry.shiftType.toUpperCase()}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={16} />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-gray-600">{entry.project.name}</p>
                    <p className="text-sm text-gray-500">
                      {entry.station?.name || 'No station'} • Supervisor: {entry.supervisor.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {entry.status === 'draft' && (
                      <button onClick={() => handleSubmitForApproval(entry.id)} className="p-2 border border-blue-300 text-blue-600 rounded hover:bg-blue-50">
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {entry.status === 'submitted' && (
                      <button onClick={() => handleApprove(entry.id)} className="p-2 border border-green-300 text-green-600 rounded hover:bg-green-50">
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button onClick={() => { 
                      setEditingEntry(entry); 
                      setFormData({
                        projectId: entry.projectId.toString(),
                        stationId: entry.stationId?.toString() || '',
                        shiftDate: entry.shiftDate.split('T')[0],
                        shiftType: entry.shiftType,
                        shiftStartTime: entry.shiftStartTime.substring(0, 16),
                        shiftEndTime: entry.shiftEndTime.substring(0, 16),
                        supervisorId: entry.supervisor.id,
                        workersPresent: entry.workersPresent,
                        workersAbsent: entry.workersAbsent,
                        totalProduced: entry.totalProduced,
                        targetProduction: entry.targetProduction || 0,
                        qualityPassed: entry.qualityPassed,
                        qualityRejected: entry.qualityRejected,
                        downtimeMinutes: entry.downtimeMinutes,
                        downtimeReason: '',
                        achievements: '',
                        handoverNotes: ''
                      }); 
                      setIsModalOpen(true); 
                    }} className="p-2 border rounded hover:bg-gray-50">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-700 mb-1">Production</p>
                    <p className="text-2xl font-bold text-blue-900">{entry.totalProduced}</p>
                    {entry.targetProduction && (
                      <p className="text-xs text-blue-700">Target: {entry.targetProduction}</p>
                    )}
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm text-green-700 mb-1">Quality Rate</p>
                    <p className="text-2xl font-bold text-green-900">{qualityRate}%</p>
                    <p className="text-xs text-green-700">{entry.qualityPassed} passed</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-purple-700 mb-1">Efficiency</p>
                    <p className={`text-2xl font-bold ${getEfficiencyColor(entry.efficiency)}`}>
                      {entry.efficiency ? `${entry.efficiency.toFixed(1)}%` : '-'}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-sm text-orange-700 mb-1">Workers</p>
                    <p className="text-2xl font-bold text-orange-900">{entry.workersPresent}</p>
                    {entry.workersAbsent > 0 && (
                      <p className="text-xs text-orange-700">{entry.workersAbsent} absent</p>
                    )}
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-sm text-red-700 mb-1">Downtime</p>
                    <p className="text-2xl font-bold text-red-900">{entry.downtimeMinutes}m</p>
                  </div>
                </div>

                {entry.downtimeMinutes > 0 && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded">
                    <AlertTriangle size={16} />
                    Downtime recorded: {entry.downtimeMinutes} minutes
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingEntry ? 'Edit' : 'New'} Shift Entry</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Project *</label>
                    <select required value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Station</label>
                    <select value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Station</option>
                      {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Shift Date *</label>
                    <input required type="date" value={formData.shiftDate} onChange={(e) => setFormData({ ...formData, shiftDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Shift Type *</label>
                    <select required value={formData.shiftType} onChange={(e) => setFormData({ ...formData, shiftType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {shiftTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Time *</label>
                    <input required type="datetime-local" value={formData.shiftStartTime} onChange={(e) => setFormData({ ...formData, shiftStartTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Time *</label>
                    <input required type="datetime-local" value={formData.shiftEndTime} onChange={(e) => setFormData({ ...formData, shiftEndTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Supervisor *</label>
                    <select required value={formData.supervisorId} onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Supervisor</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Workers Present</label>
                    <input type="number" value={formData.workersPresent} onChange={(e) => setFormData({ ...formData, workersPresent: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Workers Absent</label>
                    <input type="number" value={formData.workersAbsent} onChange={(e) => setFormData({ ...formData, workersAbsent: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Produced</label>
                    <input type="number" value={formData.totalProduced} onChange={(e) => setFormData({ ...formData, totalProduced: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Production</label>
                    <input type="number" value={formData.targetProduction} onChange={(e) => setFormData({ ...formData, targetProduction: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality Passed</label>
                    <input type="number" value={formData.qualityPassed} onChange={(e) => setFormData({ ...formData, qualityPassed: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality Rejected</label>
                    <input type="number" value={formData.qualityRejected} onChange={(e) => setFormData({ ...formData, qualityRejected: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Downtime (minutes)</label>
                    <input type="number" value={formData.downtimeMinutes} onChange={(e) => setFormData({ ...formData, downtimeMinutes: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Downtime Reason</label>
                    <input type="text" value={formData.downtimeReason} onChange={(e) => setFormData({ ...formData, downtimeReason: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Achievements</label>
                    <textarea value={formData.achievements} onChange={(e) => setFormData({ ...formData, achievements: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Handover Notes</label>
                    <textarea value={formData.handoverNotes} onChange={(e) => setFormData({ ...formData, handoverNotes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingEntry(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : editingEntry ? 'Update' : 'Create'}
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

export default ShiftEntriesPage;

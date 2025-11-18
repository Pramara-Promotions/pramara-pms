import { useState, useEffect } from 'react';
import { Plus, X, Building2, Users2, Shield } from 'lucide-react';
import { useAuth } from '../features/common/AuthProvider';
import {
  listWorkers,
  listProviders,
  getPerformanceLeaderboard,
  getWorkforceDashboard,
  createWorker,
  createProvider,
} from '../lib/services/workforce';

interface Worker {
  id: string;
  name: string;
  employeeCode?: string;
  email?: string;
  phone?: string;
  workerType: string;
  skills: string[];
  hourlyRate?: number;
  overtimeRate?: number;
  status: string;
  ThirdPartyProvider?: { id: string; name: string; contactPerson: string };
}

interface Provider {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  stabilityScore: number;
  performanceScore: number;
  attendanceRate: number;
  activeWorkerCount: number;
  totalWorkerCount: number;
  Worker: any[];
}

export default function WorkforceManagementPage() {
  const { user, hasRole, isSuperAdmin } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'company' | 'contractors' | 'leaderboard'>('company');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);

  // Permission check - super admin, admin or manager can manage workforce
  const canManageWorkforce = isSuperAdmin() || hasRole('admin') || hasRole('manager');
  const [workerForm, setWorkerForm] = useState({
    name: '',
    employeeCode: '',
    email: '',
    phone: '',
    workerType: 'company',
    skills: '',
    hourlyRate: '',
    overtimeRate: '',
    providerId: ''
  });
  const [contractorForm, setContractorForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: '',
    gstNumber: '',
    contractStart: '',
    contractEnd: ''
  });
  const [providerForm, setProviderForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWorkers(),
        fetchProviders(),
        fetchLeaderboard(),
        fetchSummary()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const data = await listWorkers({ status: 'active' });
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const data = await listProviders({ active: true });
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await getPerformanceLeaderboard({ days: 30, limit: 20 });
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await getWorkforceDashboard();
      setSummary(data || {});
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = workerForm.skills.split(',').map(s => s.trim()).filter(s => s);
      await createWorker({
        ...workerForm,
        skills: skillsArray,
        hourlyRate: workerForm.hourlyRate ? parseFloat(workerForm.hourlyRate) : undefined,
        overtimeRate: workerForm.overtimeRate ? parseFloat(workerForm.overtimeRate) : undefined,
        providerId: workerForm.providerId || undefined
      });
      setShowWorkerModal(false);
      setWorkerForm({
        name: '',
        employeeCode: '',
        email: '',
        phone: '',
        workerType: 'company',
        skills: '',
        hourlyRate: '',
        overtimeRate: '',
        providerId: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating worker:', error);
      alert('Failed to create worker');
    }
  };

  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProvider(contractorForm);
      setShowContractorModal(false);
      setContractorForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        location: '',
        gstNumber: '',
        contractStart: '',
        contractEnd: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating contractor:', error);
      alert('Failed to create contractor');
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProvider(providerForm);
      setShowProviderModal(false);
      setProviderForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        location: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating provider:', error);
      alert('Failed to create provider');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading workforce data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workforce Management</h1>
        <p className="text-gray-600 mt-1">Workers, providers, and performance tracking</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Workers</div>
          <div className="text-2xl font-bold text-gray-900">{summary.workers?.total || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Company Workers</div>
          <div className="text-2xl font-bold text-blue-600">{summary.workers?.company || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">3rd Party Workers</div>
          <div className="text-2xl font-bold text-purple-600">{summary.workers?.contractor || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Avg Efficiency</div>
          <div className="text-2xl font-bold text-green-600">{summary.recentPerformance?.avgEfficiency?.toFixed(1) || '0.0'}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex">
              <button
                onClick={() => { setTab('company'); setSelectedProvider(null); }}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${tab === 'company' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
              >
                <Users2 size={18} />
                Company Workers ({workers.filter(w => w.workerType === 'company').length})
              </button>
              <button
                onClick={() => { setTab('contractors'); setSelectedProvider(null); }}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${tab === 'contractors' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-600'}`}
              >
                <Building2 size={18} />
                Contractors ({providers.length})
              </button>
              <button
                onClick={() => { setTab('leaderboard'); setSelectedProvider(null); }}
                className={`px-6 py-3 font-medium ${tab === 'leaderboard' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}
              >
                🏆 Leaderboard
              </button>
            </div>
            <div className="pr-4 flex items-center gap-3">
              {!canManageWorkforce && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Shield size={16} />
                  View Only
                </div>
              )}
              {canManageWorkforce && tab === 'company' && (
                <button
                  onClick={() => setShowWorkerModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  Add Worker
                </button>
              )}
              {canManageWorkforce && tab === 'contractors' && !selectedProvider && (
                <button
                  onClick={() => setShowContractorModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus size={16} />
                  Add Contractor
                </button>
              )}
              {tab === 'contractors' && selectedProvider && (
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ← Back to Contractors
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Company Workers Tab */}
          {tab === 'company' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate (₹/hr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workers.filter(w => w.workerType === 'company').map(worker => (
                    <tr key={worker.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{worker.name}</div>
                        {worker.email && <div className="text-xs text-gray-500">{worker.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {worker.employeeCode || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${worker.workerType === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                          {worker.workerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {worker.skills.slice(0, 3).join(', ')}
                        {worker.skills.length > 3 && ` +${worker.skills.length - 3}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {worker.ThirdPartyProvider?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {worker.hourlyRate ? `₹${worker.hourlyRate}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Contractors Tab */}
          {tab === 'contractors' && !selectedProvider && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map(contractor => (
                <div 
                  key={contractor.id} 
                  onClick={() => setSelectedProvider(contractor.id)}
                  className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50/30 cursor-pointer hover:bg-orange-100/50 hover:border-orange-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="text-orange-600" size={20} />
                        <h3 className="font-bold text-lg text-gray-900">{contractor.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <span className="font-medium">Contact:</span> {contractor.contactPerson}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {contractor.activeWorkerCount} active / {contractor.totalWorkerCount} total workers
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {contractor.stabilityScore?.toFixed(0) || 0}
                      </div>
                      <div className="text-xs text-gray-500">Stability</div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-orange-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Performance:</span>
                      <span className="font-medium">{contractor.performanceScore?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Attendance:</span>
                      <span className="font-medium">{contractor.attendanceRate?.toFixed(1) || 0}%</span>
                    </div>
                    {contractor.email && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Email:</span>
                        <span className="text-xs text-gray-500">{contractor.email}</span>
                      </div>
                    )}
                    {contractor.phone && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Phone:</span>
                        <span className="text-xs text-gray-500">{contractor.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contractor Workers Detail View */}
          {tab === 'contractors' && selectedProvider && (
            <div>
              {(() => {
                const provider = providers.find(p => p.id === selectedProvider);
                const providerWorkers = workers.filter(w => w.ThirdPartyProvider?.id === selectedProvider);
                if (!provider) return <div>Provider not found</div>;
                
                return (
                  <div>
                    <div className="mb-6 border-2 border-orange-200 rounded-lg p-6 bg-orange-50/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="text-orange-600" size={24} />
                            <h2 className="text-2xl font-bold text-gray-900">{provider.name}</h2>
                          </div>
                          <p className="text-sm text-gray-600">Contact: {provider.contactPerson}</p>
                          {provider.email && <p className="text-sm text-gray-500">{provider.email}</p>}
                          {provider.phone && <p className="text-sm text-gray-500">{provider.phone}</p>}
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-orange-600">{provider.stabilityScore?.toFixed(0) || 0}</div>
                          <div className="text-xs text-gray-500">Stability Score</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-orange-200">
                        <div>
                          <div className="text-sm text-gray-600">Performance</div>
                          <div className="text-xl font-bold text-gray-900">{provider.performanceScore?.toFixed(1) || 0}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Attendance</div>
                          <div className="text-xl font-bold text-gray-900">{provider.attendanceRate?.toFixed(1) || 0}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Workers</div>
                          <div className="text-xl font-bold text-gray-900">{providerWorkers.length}</div>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Workers from {provider.name}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate (₹/hr)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {providerWorkers.map(worker => (
                            <tr key={worker.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{worker.name}</div>
                                {worker.email && <div className="text-xs text-gray-500">{worker.email}</div>}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{worker.employeeCode || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {worker.skills.slice(0, 3).join(', ')}
                                {worker.skills.length > 3 && ` +${worker.skills.length - 3}`}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900 font-medium">
                                {worker.hourlyRate ? `₹${worker.hourlyRate}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {providerWorkers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No workers from this contractor yet</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Leaderboard Tab */}
          {tab === 'leaderboard' && (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div key={entry.workerId} className="flex items-center gap-4 border rounded-lg p-4 hover:bg-gray-50">
                  <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{entry.workerName}</div>
                    <div className="text-sm text-gray-500">
                      <span className={`px-2 py-0.5 rounded text-xs ${entry.workerType === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                        {entry.workerType}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {entry.performanceScore?.toFixed(1) || 0}
                    </div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {entry.totalTasks || 0}
                    </div>
                    <div className="text-xs text-gray-500">Tasks</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-purple-600">
                      {entry.avgQuality?.toFixed(0) || 0}%
                    </div>
                    <div className="text-xs text-gray-500">Quality</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{entry.totalHours?.toFixed(0) || 0}h</div>
                    <div className="text-xs text-gray-500">Hours</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Worker Modal */}
      {showWorkerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Worker</h2>
                <button
                  onClick={() => setShowWorkerModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateWorker} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input
                      required
                      type="text"
                      value={workerForm.name}
                      onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Worker full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Employee Code</label>
                    <input
                      type="text"
                      value={workerForm.employeeCode}
                      onChange={(e) => setWorkerForm({ ...workerForm, employeeCode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="EMP-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Worker Type *</label>
                    <select
                      required
                      value={workerForm.workerType}
                      onChange={(e) => setWorkerForm({ ...workerForm, workerType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="company">Company Worker</option>
                      <option value="contractor">Contractor Worker (3rd Party)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={workerForm.email}
                      onChange={(e) => setWorkerForm({ ...workerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="worker@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={workerForm.phone}
                      onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={workerForm.skills}
                      onChange={(e) => setWorkerForm({ ...workerForm, skills: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Welding, Assembly, Quality Check"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hourly Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={workerForm.hourlyRate}
                      onChange={(e) => setWorkerForm({ ...workerForm, hourlyRate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="150"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Overtime Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={workerForm.overtimeRate}
                      onChange={(e) => setWorkerForm({ ...workerForm, overtimeRate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="225"
                    />
                  </div>

                  {workerForm.workerType === 'contractor' && (
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Building2 size={16} className="text-orange-600" />
                        Contractor Company *
                      </label>
                      <select
                        required
                        value={workerForm.providerId}
                        onChange={(e) => setWorkerForm({ ...workerForm, providerId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Contractor</option>
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the contractor company this worker belongs to
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWorkerModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Worker
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Contractor Modal */}
      {showContractorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Building2 size={24} className="text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Contractor</h2>
                </div>
                <button
                  onClick={() => setShowContractorModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateContractor} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Company Name *</label>
                    <input
                      required
                      type="text"
                      value={contractorForm.name}
                      onChange={(e) => setContractorForm({ ...contractorForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="ABC Construction Services Pvt Ltd"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Person *</label>
                    <input
                      required
                      type="text"
                      value={contractorForm.contactPerson}
                      onChange={(e) => setContractorForm({ ...contractorForm, contactPerson: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">GST Number</label>
                    <input
                      type="text"
                      value={contractorForm.gstNumber}
                      onChange={(e) => setContractorForm({ ...contractorForm, gstNumber: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="29ABCDE1234F1Z5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={contractorForm.email}
                      onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="contact@contractor.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input
                      required
                      type="tel"
                      value={contractorForm.phone}
                      onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={contractorForm.location}
                      onChange={(e) => setContractorForm({ ...contractorForm, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Mumbai, Maharashtra"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Contract Start Date</label>
                    <input
                      type="date"
                      value={contractorForm.contractStart}
                      onChange={(e) => setContractorForm({ ...contractorForm, contractStart: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Contract End Date</label>
                    <input
                      type="date"
                      value={contractorForm.contractEnd}
                      onChange={(e) => setContractorForm({ ...contractorForm, contractEnd: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> After creating the contractor, you can add workers and assign them to this contractor company.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowContractorModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Create Contractor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Provider</h2>
                <button
                  onClick={() => setShowProviderModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateProvider} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Company Name *</label>
                    <input
                      required
                      type="text"
                      value={providerForm.name}
                      onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="ABC Staffing Solutions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Person *</label>
                    <input
                      required
                      type="text"
                      value={providerForm.contactPerson}
                      onChange={(e) => setProviderForm({ ...providerForm, contactPerson: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={providerForm.email}
                      onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="contact@provider.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      value={providerForm.phone}
                      onChange={(e) => setProviderForm({ ...providerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={providerForm.location}
                      onChange={(e) => setProviderForm({ ...providerForm, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Mumbai, Maharashtra"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProviderModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Provider
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

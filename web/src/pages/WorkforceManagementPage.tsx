import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';

interface Worker {
  id: string;
  name: string;
  workerType: string;
  skills: string[];
  Provider?: { name: string; stabilityScore: number };
  performance: any[];
}

interface Provider {
  id: string;
  name: string;
  stabilityScore: number;
  turnoverRate: number;
  performanceScore: number;
  workers: Worker[];
}

export default function WorkforceManagementPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'workers' | 'providers' | 'leaderboard'>('workers');

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
      const response = await apiGet('/api/workers');
      setWorkers(response.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await apiGet('/api/workers/providers/list');
      setProviders(response.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await apiGet('/api/workers/performance/leaderboard?days=30');
      setLeaderboard(response.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiGet('/api/workers/dashboard/summary');
      setSummary(response);
    } catch (error) {
      console.error('Error fetching summary:', error);
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
          <div className="text-2xl font-bold text-gray-900">{summary.totalWorkers || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Company Workers</div>
          <div className="text-2xl font-bold text-blue-600">{summary.byType?.company || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">3rd Party Workers</div>
          <div className="text-2xl font-bold text-purple-600">{summary.byType?.third_party || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Avg Efficiency</div>
          <div className="text-2xl font-bold text-green-600">{summary.avgEfficiency || 0}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setTab('workers')}
              className={`px-6 py-3 font-medium ${tab === 'workers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              Workers ({workers.length})
            </button>
            <button
              onClick={() => setTab('providers')}
              className={`px-6 py-3 font-medium ${tab === 'providers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              Providers ({providers.length})
            </button>
            <button
              onClick={() => setTab('leaderboard')}
              className={`px-6 py-3 font-medium ${tab === 'leaderboard' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Workers Tab */}
          {tab === 'workers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shifts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workers.map(worker => (
                    <tr key={worker.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{worker.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          worker.workerType === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {worker.workerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {worker.skills.slice(0, 3).join(', ')}
                        {worker.skills.length > 3 && ` +${worker.skills.length - 3}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {worker.Provider?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {worker.performance.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Providers Tab */}
          {tab === 'providers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map(provider => (
                <div key={provider.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.workers.length} workers</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {provider.stabilityScore?.toFixed(0) || 0}
                      </div>
                      <div className="text-xs text-gray-500">Stability Score</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Performance:</span>
                      <span className="font-medium">{provider.performanceScore?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Turnover Rate:</span>
                      <span className="font-medium">{provider.turnoverRate?.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Leaderboard Tab */}
          {tab === 'leaderboard' && (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div key={entry.worker.id} className="flex items-center gap-4 border rounded-lg p-4 hover:bg-gray-50">
                  <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{entry.worker.name}</div>
                    <div className="text-sm text-gray-500">
                      {entry.worker.skills.slice(0, 2).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {entry.overallScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Overall Score</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {entry.avgEfficiency.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Efficiency</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-purple-600">
                      {entry.avgQuality.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Quality</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{entry.totalShifts}</div>
                    <div className="text-xs text-gray-500">Shifts</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

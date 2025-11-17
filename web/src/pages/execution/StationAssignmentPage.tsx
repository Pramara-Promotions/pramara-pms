import React, { useEffect, useMemo, useState } from 'react';
import {
  Factory,
  Users,
  Settings,
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Filter,
  Search,
  Lightbulb,
  Info,
  Wrench,
  MapPin,
  BarChart3,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface Station {
  id: number;
  name: string;
  code: string;
  status: 'operational' | 'maintenance' | 'down' | 'idle';
  capacity: number;
  Room?: {
    name: string;
    section: { floor: { factory: { name: string }, name: string }, name: string }
  } | null;
}

interface AssignableTask {
  id: string;
  projectCode: string;
  projectName: string;
  stageName: string;
  requiredQty: number;
  dueDate: string;
  skillTag?: string;
  status: 'pending' | 'in-progress' | 'blocked';
}

interface AssignmentSuggestion {
  stationId: number;
  stationName: string;
  score: number; // 0-100
  reasoning: string;
  estimatedFinish: string;
  conflicts?: string[];
}

interface MaintenanceBlock {
  id: string;
  stationId: number;
  start: string;
  end: string;
  reason: string;
}

const StationAssignmentPage = () => {
  // Resolve optional projectId from either query string or URL (/projects/:id/...)
  const projectId = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('projectId');
      if (q) return q;
      const m = window.location.pathname.match(/\/projects\/(\d+)/);
      return m?.[1] || '';
    } catch {
      return '';
    }
  })();
  const [stations, setStations] = useState<Station[]>([]);
  const [tasks, setTasks] = useState<AssignableTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AssignableTask | null>(null);
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceBlock[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState<string | null>(null);

  useEffect(() => {
    fetchStations();
    fetchTasks();
    fetchMaintenance();
  }, [statusFilter]);

  const fetchStations = async () => {
    try {
      const res = await fetch('/api/stations');
      const data = await res.json();
      setStations(data || []);
    } catch (e) {
      console.error('Failed to load stations', e);
    }
  };

  const fetchTasks = async () => {
    try {
      const qs = projectId ? `?projectId=${projectId}` : '';
      const res = await fetch(`/api/assignments/unassigned${qs}`);
      const data = await res.json();
      setTasks(data || []);
    } catch (e) {
      console.error('Failed to load tasks', e);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const res = await fetch('/api/maintenance');
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setMaintenance(items as any);
    } catch (e) {
      console.error('Failed to load maintenance', e);
    }
  };

  const filteredStations = useMemo(() => {
    let rows = stations as Station[];
    if (statusFilter) rows = rows.filter(s => s.status === statusFilter);
    if (search) rows = rows.filter(s => (s.name + s.code).toLowerCase().includes(search.toLowerCase()));
    return rows;
  }, [stations, search, statusFilter]);

  const requestSuggestions = async (task: AssignableTask) => {
    setSelectedTask(task);
    setIsLoading(true);
    try {
      const extra = projectId ? `&projectId=${projectId}` : '';
      const res = await fetch(`/api/assignments/suggest?taskId=${task.id}${extra}`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch (e) {
      console.error('Suggestion request failed', e);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const assignToStation = async (taskId: string, stationId: number, overrideReason?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/assignments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, stationId, overrideReason, projectId: projectId || undefined }),
      });
      if (res.ok) {
        await fetchTasks();
        setSelectedTask(null);
        setSuggestions([]);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to assign');
      }
    } catch (e) {
      console.error('Assignment failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleMaintenance = async (stationId: number) => {
    const start = prompt('Maintenance start (YYYY-MM-DD HH:mm)');
    const end = prompt('Maintenance end (YYYY-MM-DD HH:mm)');
    const reason = prompt('Maintenance description');
    if (!start || !end || !reason) return;
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, maintenanceType: 'scheduled', description: reason, startTime: start, endTime: end })
      });
      if (res.ok) fetchMaintenance();
    } catch (e) {
      console.error('Failed to schedule maintenance', e);
    }
  };

  const expiringMaintenance = maintenance.filter(m => new Date(m.end).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 2);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="w-8 h-8 text-blue-600" />
            Station Assignment
          </h1>
          <p className="text-gray-600 mt-1">Assign work intelligently with system suggestions and reasoning</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button className="px-3 py-1 rounded">Today</button>
            <button className="px-3 py-1 rounded">Week</button>
            <button className="px-3 py-1 rounded">Month</button>
          </div>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure Rules
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Unassigned Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <Lightbulb className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Operational Stations</p>
              <p className="text-2xl font-bold text-gray-900">{stations.filter(s => s.status === 'operational').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">{stations.filter(s => s.status === 'maintenance').length}</p>
            </div>
            <Wrench className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Upcoming Blocks</p>
              <p className="text-2xl font-bold text-gray-900">{expiringMaintenance.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Unassigned tasks */}
        <div className="col-span-5 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3 mb-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                placeholder="Search tasks..."
                className="flex-1 border rounded px-3 py-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No tasks pending assignment</div>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="p-3 border rounded hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{t.projectCode}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{t.stageName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Qty {t.requiredQty} • Due {new Date(t.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => requestSuggestions(t)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Suggest
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Maintenance scheduler */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Wrench className="w-4 h-4" /> Maintenance Scheduler</h3>
              <button className="text-sm text-blue-600" onClick={() => {
                const stationId = Number(prompt('Station ID to block?'));
                if (stationId) scheduleMaintenance(stationId);
              }}>Add Block</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {maintenance.length === 0 ? (
                <div className="text-gray-500 text-sm">No maintenance blocks</div>
              ) : maintenance.map(m => (
                <div key={m.id} className="text-sm p-2 border rounded">
                  <div className="font-medium">Station #{m.stationId}</div>
                  <div className="text-gray-600">{new Date(m.start).toLocaleString()} → {new Date(m.end).toLocaleString()}</div>
                  <div className="text-gray-600">{m.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Suggestions and Stations */}
        <div className="col-span-7 space-y-4">
          {/* Suggestion Panel */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" /> AI Suggestions</h3>
              {selectedTask && (
                <span className="text-sm text-gray-500">For {selectedTask.projectCode} • {selectedTask.stageName}</span>
              )}
            </div>

            {!selectedTask ? (
              <div className="text-gray-500 text-sm">Select a task and click Suggest to view recommendations.</div>
            ) : (
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-sm text-gray-500">Loading suggestions...</div>
                ) : suggestions.length === 0 ? (
                  <div className="text-sm text-gray-500">No suggestions available.</div>
                ) : suggestions.map(s => (
                  <div key={s.stationId} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">{s.score}</div>
                        <div>
                          <div className="font-medium text-gray-900">{s.stationName}</div>
                          <div className="text-xs text-gray-500">ETA {new Date(s.estimatedFinish).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 text-sm border rounded hover:bg-gray-50" onClick={() => setShowReasoning(s.reasoning)}>Reasoning</button>
                        <button className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" onClick={() => assignToStation(selectedTask.id, s.stationId)}>Assign</button>
                      </div>
                    </div>
                    {s.conflicts && s.conflicts.length > 0 && (
                      <div className="text-xs text-orange-600 mt-2">Conflicts: {s.conflicts.join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stations List */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4" /> Stations</h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select className="border rounded px-2 py-1 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="idle">Idle</option>
                  <option value="down">Down</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredStations.map(s => (
                <div key={s.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.code}</div>
                      {s.Room && (
                        <div className="text-xs text-gray-500">{s.Room.section.floor.factory.name} / {s.Room.section.floor.name} / {s.Room.section.name} / {s.Room.name}</div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      s.status === 'operational' ? 'bg-green-100 text-green-700' :
                      s.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                      s.status === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>{s.status}</span>
                  </div>
                  {selectedTask && (
                    <div className="mt-3 flex items-center gap-2">
                      <button className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100" onClick={() => assignToStation(selectedTask.id, s.id)}>Quick Assign</button>
                      <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={() => {
                        const reason = prompt('Provide reason for override assignment:');
                        if (reason) assignToStation(selectedTask.id, s.id, reason);
                      }}>Override</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reasoning Modal */}
      {showReasoning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Info className="w-4 h-4" /> Suggestion Reasoning</h3>
              <button onClick={() => setShowReasoning(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line">{showReasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationAssignmentPage;

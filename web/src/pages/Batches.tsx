import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Batch {
  id: string;
  batchCode: string;
  projectId: string;
  quantity: number;
  status: string;
  location?: string;
  createdAt: string;
  project?: {
    code: string;
    name: string;
  };
}

interface BatchMovement {
  id: string;
  batchId: string;
  fromLocation?: string;
  toLocation: string;
  quantity: number;
  movedBy?: string;
  timestamp: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [movements, setMovements] = useState<BatchMovement[]>([]);
  const [view, setView] = useState<'batches' | 'movements' | 'trace'>('batches');
  const [loading, setLoading] = useState(false);
  const [traceQuery, setTraceQuery] = useState<string>('');

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      loadMovements();
    }
  }, [selectedBatch]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/batches`, { withCredentials: true });
      setBatches(res.data as Batch[]);
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const res = await axios.get(`${API_BASE}/batches/${selectedBatch}/movements`, {
        withCredentials: true
      });
      setMovements(res.data as BatchMovement[]);
    } catch (error) {
      console.error('Failed to load movements:', error);
    }
  };

  const handleTrace = async () => {
    if (!traceQuery) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/batches/trace/batch/${traceQuery}`, {
        withCredentials: true
      });
      console.log('Trace results:', res.data);
      // Display trace results
    } catch (error) {
      console.error('Failed to trace batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'quarantine': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-sm text-gray-600">Track batch movements, traceability, and handover sheets</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          Create Batch
        </button>
      </div>

      {/* View Toggle */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView('batches')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'batches'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Batches
          </button>
          <button
            onClick={() => setView('movements')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'movements'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Movements
          </button>
          <button
            onClick={() => setView('trace')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'trace'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Traceability
          </button>
        </div>
      </div>

      {loading && view === 'batches' && (
        <div className="text-center py-12 text-gray-500">
          Loading batches...
        </div>
      )}

      {/* Batches View */}
      {!loading && view === 'batches' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Batch Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Project</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Quantity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No batches found. Create your first batch to get started.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selectedBatch === batch.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedBatch(batch.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium">{batch.batchCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      {batch.project ? (
                        <div>
                          <div className="font-medium">{batch.project.name}</div>
                          <div className="text-xs text-gray-500">{batch.project.code}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{batch.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{batch.location || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Movements View */}
      {view === 'movements' && selectedBatch && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-900">Movement History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">From</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">To</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Quantity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Moved By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No movements recorded for this batch.
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{movement.fromLocation || 'Origin'}</td>
                    <td className="px-4 py-3 font-medium">{movement.toLocation}</td>
                    <td className="px-4 py-3 text-right font-mono">{movement.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{movement.movedBy || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(movement.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'movements' && !selectedBatch && (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
          Select a batch to view its movement history
        </div>
      )}

      {/* Traceability View */}
      {view === 'trace' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Batch Traceability</h2>
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={traceQuery}
              onChange={(e) => setTraceQuery(e.target.value)}
              placeholder="Enter batch code or material lot..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTrace}
              disabled={loading || !traceQuery}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Tracing...' : 'Trace'}
            </button>
          </div>
          <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
            Enter a batch code or material lot number to view complete traceability
          </div>
        </div>
      )}
    </div>
  );
}


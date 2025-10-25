import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Factory {
  id: number;
  name: string;
  code: string;
  location?: string;
  active: boolean;
}

interface Station {
  id: number;
  name: string;
  code?: string;
  status: string;
  capacity?: number;
  StationType?: { name: string; code: string };
}

export default function StationsPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
  const [view, setView] = useState<'hierarchy' | 'stations'>('hierarchy');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFactories();
  }, []);

  useEffect(() => {
    if (selectedFactory) {
      loadStations(selectedFactory);
    }
  }, [selectedFactory]);

  const loadFactories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/factories`, { withCredentials: true });
      setFactories(res.data as Factory[]);
      if ((res.data as Factory[]).length > 0) setSelectedFactory((res.data as Factory[])[0].id);
    } catch (error) {
      console.error('Failed to load factories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStations = async (factoryId: number) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/stations`, { 
        params: { factoryId },
        withCredentials: true 
      });
      setStations(res.data as Station[]);
    } catch (error) {
      console.error('Failed to load stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stations</h1>
          <p className="text-sm text-gray-600">Manage factory hierarchy and station configurations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('hierarchy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'hierarchy'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setView('stations')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'stations'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Stations
          </button>
        </div>
      </div>

      {/* Factory Selector */}
      <div className="bg-white rounded-lg border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Factory</label>
        <select
          value={selectedFactory || ''}
          onChange={(e) => setSelectedFactory(Number(e.target.value))}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a factory...</option>
          {factories.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.code}) {f.location && `- ${f.location}`}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading stations...
        </div>
      )}

      {/* Stations View */}
      {!loading && view === 'stations' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Capacity</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No stations found. Select a factory to view stations.
                  </td>
                </tr>
              ) : (
                stations.map((station) => (
                  <tr key={station.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{station.code || '-'}</td>
                    <td className="px-4 py-3 font-medium">{station.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {station.StationType?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(station.status)}`}>
                        {station.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{station.capacity || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Hierarchy View */}
      {!loading && view === 'hierarchy' && (
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="font-medium">Factory hierarchy tree view</p>
            <p className="text-sm mt-1">Coming soon: Interactive floor/section/room/station tree</p>
          </div>
        </div>
      )}
    </div>
  );
}


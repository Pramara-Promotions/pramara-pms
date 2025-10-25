import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Worker {
  id: string;
  name: string;
  employeeId?: string;
  type: 'direct' | 'thirdParty';
  providerName?: string;
  skills: string[];
  availability: 'available' | 'occupied' | 'unavailable';
  performanceScore?: number;
  efficiencyRating?: number;
  qualityScore?: number;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, [filter]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter === 'direct') params.type = 'direct';
      if (filter === 'thirdParty') params.type = 'thirdParty';
      if (filter === 'available') params.availability = 'available';
      
      const res = await axios.get(`${API_BASE}/workers`, { 
        params,
        withCredentials: true 
      });
      setWorkers(res.data as Worker[]);
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'occupied': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSkillColor = (skill: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-cyan-100 text-cyan-800'
    ];
    const hash = skill.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workers</h1>
          <p className="text-sm text-gray-600">Manage worker profiles, skills, and performance tracking</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          Add Worker
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Workers
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'available'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setFilter('direct')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'direct'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => setFilter('thirdParty')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'thirdParty'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Third Party
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading workers...
        </div>
      )}

      {/* Workers Table */}
      {!loading && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Worker</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Skills</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Availability</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Performance</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Efficiency</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Quality</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No workers found. Add your first worker to get started.
                  </td>
                </tr>
              ) : (
                workers.map((worker) => (
                  <tr key={worker.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{worker.name}</div>
                      {worker.employeeId && (
                        <div className="text-xs text-gray-500">ID: {worker.employeeId}</div>
                      )}
                      {worker.providerName && (
                        <div className="text-xs text-gray-500">{worker.providerName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        worker.type === 'direct' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {worker.type === 'direct' ? 'Direct' : 'Third Party'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {worker.skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSkillColor(skill)}`}
                          >
                            {skill}
                          </span>
                        ))}
                        {worker.skills.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            +{worker.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAvailabilityColor(worker.availability)}`}>
                        {worker.availability}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-medium ${getPerformanceColor(worker.performanceScore)}`}>
                        {worker.performanceScore ? `${worker.performanceScore}%` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-medium ${getPerformanceColor(worker.efficiencyRating)}`}>
                        {worker.efficiencyRating ? `${worker.efficiencyRating}%` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-medium ${getPerformanceColor(worker.qualityScore)}`}>
                        {worker.qualityScore ? `${worker.qualityScore}%` : '-'}
                      </span>
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
    </div>
  );
}


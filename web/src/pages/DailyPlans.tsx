import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Project {
  id: string;
  name: string;
  code: string;
}

interface Scenario {
  type: 'fastest' | 'cheapest' | 'balanced';
  estimatedTime: number;
  estimatedCost: number;
  workers: any[];
  materials: any[];
  reasoning: string;
}

interface WorkerSuggestion {
  workerId: string;
  workerName: string;
  confidenceScore: number;
  reasoning: string;
}

export default function DailyPlansPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [workerSuggestions, setWorkerSuggestions] = useState<WorkerSuggestion[]>([]);
  const [view, setView] = useState<'scenarios' | 'workers'>('scenarios');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`, { withCredentials: true });
      setProjects(res.data as Project[]);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleGenerateScenarios = async () => {
    if (!selectedProject || !date) return;
    
    try {
      setGenerating(true);
      const res = await axios.post(
        `${API_BASE}/daily-plans/generate`,
        { projectId: selectedProject, date },
        { withCredentials: true }
      );
      setScenarios((res.data as any).scenarios || []);
    } catch (error) {
      console.error('Failed to generate scenarios:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestWorkers = async (stationId: string) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/daily-plans/suggest-workers`,
        { stationId, date },
        { withCredentials: true }
      );
      setWorkerSuggestions((res.data as any).suggestions || []);
    } catch (error) {
      console.error('Failed to suggest workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScenarioColor = (type: string) => {
    switch (type) {
      case 'fastest': return 'bg-green-100 text-green-800 border-green-200';
      case 'cheapest': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'balanced': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Plans</h1>
          <p className="text-sm text-gray-600">AI-powered planning with scenario generation and worker suggestions</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          Approve Plan
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateScenarios}
              disabled={generating || !selectedProject}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Scenarios'}
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      {selectedProject && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setView('scenarios')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                view === 'scenarios'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Scenarios
            </button>
            <button
              onClick={() => setView('workers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                view === 'workers'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Worker Suggestions
            </button>
          </div>
        </div>
      )}

      {/* Scenarios View */}
      {view === 'scenarios' && scenarios.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.type}
              className={`bg-white rounded-lg border-2 p-6 ${getScenarioColor(scenario.type)}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg capitalize">{scenario.type}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border">
                  {scenario.type === 'fastest' ? '⚡' : scenario.type === 'cheapest' ? '💰' : '⚖️'}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estimated Time:</span>
                  <span className="font-mono font-medium">{scenario.estimatedTime}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estimated Cost:</span>
                  <span className="font-mono font-medium">₹{scenario.estimatedCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Workers:</span>
                  <span className="font-medium">{scenario.workers.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Materials:</span>
                  <span className="font-medium">{scenario.materials.length}</span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="text-xs text-gray-600 mb-1">AI Reasoning:</div>
                <div className="text-sm">{scenario.reasoning}</div>
              </div>

              <button className="w-full mt-4 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 font-medium text-sm">
                Select This Plan
              </button>
            </div>
          ))}
        </div>
      )}

      {view === 'scenarios' && scenarios.length === 0 && selectedProject && (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
          Click "Generate Scenarios" to create AI-powered daily plans
        </div>
      )}

      {/* Worker Suggestions View */}
      {view === 'workers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-600 mb-3">Select a station to get AI worker suggestions</p>
            <button
              onClick={() => handleSuggestWorkers('demo-station-id')}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:bg-gray-300"
            >
              {loading ? 'Loading...' : 'Get Suggestions for Demo Station'}
            </button>
          </div>

          {workerSuggestions.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Worker</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-700">Confidence</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">AI Reasoning</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workerSuggestions.map((suggestion, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{suggestion.workerName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono font-medium ${getConfidenceColor(suggestion.confidenceScore)}`}>
                          {suggestion.confidenceScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{suggestion.reasoning}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


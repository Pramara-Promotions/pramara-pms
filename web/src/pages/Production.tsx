import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Project {
  id: string;
  name: string;
  code: string;
}

interface ProductionConfig {
  id: string;
  projectId: string;
  processType: string;
  cycleTime?: number;
  cavities?: number;
  efficiency?: number;
  scrapRate?: number;
}

interface ProductionCalculation {
  id: string;
  projectId: string;
  targetQty: number;
  estimatedOutput: number;
  estimatedTime: number;
  requiredCycles: number;
  createdAt: string;
}

export default function ProductionPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [configs, setConfigs] = useState<ProductionConfig[]>([]);
  const [calculations, setCalculations] = useState<ProductionCalculation[]>([]);
  const [view, setView] = useState<'calculator' | 'history'>('calculator');
  const [loading, setLoading] = useState(false);
  
  // Calculator form state
  const [targetQty, setTargetQty] = useState<number>(0);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadConfigs();
      loadCalculations();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`, { withCredentials: true });
      setProjects(res.data as Project[]);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/production/configs`, {
        params: { projectId: selectedProject },
        withCredentials: true
      });
      setConfigs(res.data as ProductionConfig[]);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalculations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/production/calculations`, {
        params: { projectId: selectedProject },
        withCredentials: true
      });
      setCalculations(res.data as ProductionCalculation[]);
    } catch (error) {
      console.error('Failed to load calculations:', error);
    }
  };

  const handleCalculate = async () => {
    if (!selectedProject || !targetQty) return;
    
    try {
      setCalculating(true);
      const res = await axios.post(
        `${API_BASE}/production/calculate`,
        { projectId: selectedProject, targetQty },
        { withCredentials: true }
      );
      setResult(res.data);
      loadCalculations();
    } catch (error) {
      console.error('Failed to calculate:', error);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production</h1>
          <p className="text-sm text-gray-600">Calculate production output, log entries, and track variance</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          Log Entry
        </button>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-lg border p-4">
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

      {/* View Toggle */}
      {selectedProject && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setView('calculator')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                view === 'calculator'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                view === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calculation History
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading production data...
        </div>
      )}

      {/* Calculator View */}
      {!loading && selectedProject && view === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Process Configuration */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Process Configuration</h2>
            {configs.length === 0 ? (
              <p className="text-sm text-gray-500">No process configuration found.</p>
            ) : (
              <div className="space-y-3">
                {configs.map((config) => (
                  <div key={config.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-2">{config.processType}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Cycle Time:</span>
                        <span className="ml-2 font-mono">{config.cycleTime || '-'}s</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cavities:</span>
                        <span className="ml-2 font-mono">{config.cavities || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Efficiency:</span>
                        <span className="ml-2 font-mono">{config.efficiency || '-'}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Scrap Rate:</span>
                        <span className="ml-2 font-mono">{config.scrapRate || '-'}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculator */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Production Calculator</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Quantity
                </label>
                <input
                  type="number"
                  value={targetQty}
                  onChange={(e) => setTargetQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter target quantity..."
                />
              </div>
              
              <button
                onClick={handleCalculate}
                disabled={calculating || !targetQty}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {calculating ? 'Calculating...' : 'Calculate'}
              </button>

              {result && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-900 mb-3">Calculation Results</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Output:</span>
                      <span className="font-mono font-medium">{result.estimatedOutput} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Time:</span>
                      <span className="font-mono font-medium">{result.estimatedTime} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Required Cycles:</span>
                      <span className="font-mono font-medium">{result.requiredCycles}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History View */}
      {!loading && selectedProject && view === 'history' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Target Qty</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Est. Output</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Est. Time (hrs)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Cycles</th>
              </tr>
            </thead>
            <tbody>
              {calculations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No calculations found.
                  </td>
                </tr>
              ) : (
                calculations.map((calc) => (
                  <tr key={calc.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(calc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{calc.targetQty}</td>
                    <td className="px-4 py-3 text-right font-mono">{calc.estimatedOutput}</td>
                    <td className="px-4 py-3 text-right font-mono">{calc.estimatedTime}</td>
                    <td className="px-4 py-3 text-right font-mono">{calc.requiredCycles}</td>
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


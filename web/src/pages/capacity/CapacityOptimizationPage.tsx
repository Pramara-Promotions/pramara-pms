// web/src/pages/capacity/CapacityOptimizationPage.tsx
import React, { useState, useEffect } from 'react';
import { Settings, Zap, TrendingUp, AlertTriangle, Download, Save, Play } from 'lucide-react';
import { http } from '../../lib/http';

interface Station {
  id: number;
  name: string;
  type: string;
  capacity: number;
  utilization: number;
  x: number;
  y: number;
}

interface ScenarioResult {
  id: string;
  name: string;
  score: number;
  throughput: number;
  efficiency: number;
  bottlenecks: string[];
  changes: {
    stationId: number;
    oldPosition: { x: number; y: number };
    newPosition: { x: number; y: number };
  }[];
}

export default function CapacityOptimizationPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStations();
    loadScenarios();
  }, []);

  async function loadStations() {
    try {
      setLoading(true);
      const res = await http('/api/stations');
      if (res.ok) {
        const data = await res.json();
        setStations(data);
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadScenarios() {
    try {
      const res = await http('/api/capacity/scenarios');
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
      }
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    }
  }

  async function runOptimization() {
    try {
      setIsOptimizing(true);
      const res = await http('/api/capacity/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentLayout: stations })
      });

      if (res.ok) {
        const scenario = await res.json();
        setScenarios([scenario, ...scenarios]);
        setSelectedScenario(scenario.id);
      }
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  }

  async function applyScenario(scenarioId: string) {
    if (!confirm('Apply this optimization scenario? This will update station positions.')) return;

    try {
      const res = await http(`/api/capacity/scenarios/${scenarioId}/apply`, {
        method: 'POST'
      });

      if (res.ok) {
        await loadStations();
        alert('Scenario applied successfully!');
      }
    } catch (error) {
      console.error('Failed to apply scenario:', error);
      alert('Failed to apply scenario.');
    }
  }

  const selectedScenarioData = scenarios.find(s => s.id === selectedScenario);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Zap className="text-indigo-600" size={32} />
          Capacity Optimization
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Optimize factory floor layout for maximum throughput and efficiency
        </p>
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={runOptimization}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {isOptimizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Play size={20} />
                Run Optimization
              </>
            )}
          </button>

          <button
            onClick={() => loadScenarios()}
            className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Refresh Scenarios
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Download size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Factory Floor Visualization */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Factory Floor Layout
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Current station positions and utilization
              </p>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 mt-4">Loading floor plan...</p>
                  </div>
                </div>
              ) : (
                <div className="relative bg-gray-50 dark:bg-slate-900 rounded-lg h-96 border-2 border-dashed border-gray-300 dark:border-slate-600">
                  {/* Grid lines */}
                  <div className="absolute inset-0 opacity-20">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="absolute w-full border-t border-gray-300 dark:border-slate-600"
                        style={{ top: `${i * 10}%` }}
                      />
                    ))}
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={`v-${i}`}
                        className="absolute h-full border-l border-gray-300 dark:border-slate-600"
                        style={{ left: `${i * 10}%` }}
                      />
                    ))}
                  </div>

                  {/* Stations */}
                  {stations.map((station) => (
                    <div
                      key={station.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move"
                      style={{
                        left: `${station.x}%`,
                        top: `${station.y}%`
                      }}
                    >
                      <div
                        className={`
                          px-4 py-3 rounded-lg shadow-lg border-2 
                          ${
                            station.utilization > 90
                              ? 'bg-red-100 border-red-500 dark:bg-red-950/30 dark:border-red-500'
                              : station.utilization > 70
                              ? 'bg-yellow-100 border-yellow-500 dark:bg-yellow-950/30 dark:border-yellow-500'
                              : 'bg-green-100 border-green-500 dark:bg-green-950/30 dark:border-green-500'
                          }
                        `}
                      >
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {station.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {station.utilization}% utilized
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Utilization</span>
                <TrendingUp size={16} className="text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stations.length > 0
                  ? Math.round(stations.reduce((sum, s) => sum + s.utilization, 0) / stations.length)
                  : 0}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Bottlenecks</span>
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stations.filter(s => s.utilization > 90).length}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Stations</span>
                <Settings size={16} className="text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stations.length}
              </div>
            </div>
          </div>
        </div>

        {/* Scenarios List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Optimization Scenarios
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                What-if analysis results
              </p>
            </div>

            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {scenarios.length === 0 ? (
                <div className="text-center py-8">
                  <Zap size={48} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No scenarios yet. Run optimization to generate scenarios.
                  </p>
                </div>
              ) : (
                scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        selectedScenario === scenario.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {scenario.name}
                      </h3>
                      <span
                        className={`
                          px-2 py-1 rounded text-xs font-semibold
                          ${
                            scenario.score > 80
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400'
                              : scenario.score > 60
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                          }
                        `}
                      >
                        {scenario.score}/100
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Throughput:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          +{scenario.throughput}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Efficiency:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {scenario.efficiency}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Bottlenecks:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {scenario.bottlenecks.length}
                        </span>
                      </div>
                    </div>

                    {selectedScenario === scenario.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          applyScenario(scenario.id);
                        }}
                        className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold"
                      >
                        Apply Scenario
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Scenario Details */}
          {selectedScenarioData && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow mt-4 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Scenario Changes
              </h3>
              <div className="space-y-2 text-sm">
                {selectedScenarioData.changes.map((change, idx) => {
                  const station = stations.find(s => s.id === change.stationId);
                  return (
                    <div key={idx} className="p-2 bg-gray-50 dark:bg-slate-900 rounded">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {station?.name || `Station ${change.stationId}`}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                        Move: ({change.oldPosition.x}, {change.oldPosition.y}) → (
                        {change.newPosition.x}, {change.newPosition.y})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

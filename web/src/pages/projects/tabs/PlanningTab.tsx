// web/src/pages/projects/tabs/PlanningTab.tsx
// Planning section - accessed INSIDE project as a tab
import { Calendar, Users, Box, Calculator, CheckCircle, Brain, Grid, Shuffle, AlertTriangle } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { http } from '../../../lib/http';
import { useProjectContext } from '../ProjectContext';

export default function PlanningTab() {
  const project = useProjectContext();
  const [assets, setAssets] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [targetStationId, setTargetStationId] = useState<number | ''>('');
  const [moving, setMoving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  
  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;
  
  const projectId = project.id;

  // Load movable assets and project stations
  useEffect(() => {
    (async () => {
      try {
        const [assetsRes, stationsRes] = await Promise.all([
          http(`/api/assets?mobility=movable&pageSize=200`),
          http(`/api/stations?projectId=${projectId}`),
        ]);
        if (assetsRes.ok) {
          const a = await assetsRes.json();
          setAssets(a.items || a || []);
        }
        if (stationsRes.ok) {
          const s = await stationsRes.json();
          setStations(s || []);
        }
      } catch (e) {
        console.error('load assets/stations failed', e);
      }
    })();
  }, [projectId]);

  // Load conflicts for next 14 days and filter to project stations
  useEffect(() => {
    (async () => {
      try {
        setLoadingConflicts(true);
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);
        const res = await http(`/api/time-planning/conflicts?start=${start.toISOString().slice(0,10)}&end=${end.toISOString().slice(0,10)}`);
        if (res.ok) {
          const json = await res.json();
          const stationIds = new Set(stations.map(s => s.id));
          setConflicts((json.conflicts || []).filter((c: any) => stationIds.has(c.stationId)));
        }
      } catch (e) {
        console.error('load conflicts failed', e);
      } finally {
        setLoadingConflicts(false);
      }
    })();
  }, [stations.length]);

  // When selecting an asset, fetch its move history
  useEffect(() => {
    (async () => {
      if (!selectedAssetId) { setHistory([]); return; }
      try {
        const res = await http(`/api/workstation-assets/asset/${selectedAssetId}/history`);
        if (res.ok) {
          const json = await res.json();
          setHistory(json.history || []);
        }
      } catch (e) {
        console.error('load asset history failed', e);
      }
    })();
  }, [selectedAssetId]);

  async function moveAsset() {
    if (!selectedAssetId || !targetStationId) return;
    try {
      setMoving(true);
      const res = await http('/api/workstation-assets/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: selectedAssetId, toStationId: Number(targetStationId) })
      });
      if (!res.ok) throw new Error('Move failed');
      // reload history
      const h = await http(`/api/workstation-assets/asset/${selectedAssetId}/history`);
      if (h.ok) {
        const json = await h.json();
        setHistory(json.history || []);
      }
      alert('✅ Asset moved');
    } catch (e: any) {
      alert(`❌ ${e?.message || 'Asset move failed'}`);
    } finally {
      setMoving(false);
    }
  }
  
  const planningCards = [
    {
      title: 'Auto Planning',
      description: 'System-generated daily plans',
      icon: Calendar,
      link: `/planning/auto?projectId=${projectId}`,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
      badge: 'NEW'
    },
    {
      title: 'Daily Planning (Legacy)',
      description: 'Manual daily production planning',
      icon: Calendar,
      link: `/planning/daily?projectId=${projectId}`,
      color: 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
    },
    {
      title: 'Material Planning',
      description: 'Material requirements and inventory',
      icon: Box,
      link: `/planning/materials?projectId=${projectId}`,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    },
    {
      title: 'MRP Calculator',
      description: 'Material Requirements Planning',
      icon: Calculator,
      link: `/planning/mrp?projectId=${projectId}`,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    },
    {
      title: 'Project Costing',
      description: 'Cost calculation and pricing tiers',
      icon: Calculator,
      link: `/planning/costing?projectId=${projectId}`,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
      badge: 'NEW'
    },
    {
      title: 'Time Planning',
      description: 'Cutoff-aware schedule & risk dashboard',
      icon: Calendar,
      link: `/planning/time?projectId=${projectId}`,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
      badge: 'NEW'
    },
    {
      title: 'Approvals Tracker',
      description: 'Track approval requests',
      icon: CheckCircle,
      link: `/planning/approvals?projectId=${projectId}`,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
    },
    {
      title: 'Adaptive Planning',
      description: 'AI planning and resource optimization (project-scoped)',
      icon: Brain,
      link: `/projects/${projectId}/planning/adaptive`,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
      badge: 'NEW'
    },
    {
      title: 'Workforce Skill Matrix',
      description: 'Skills, certifications, and training (project-scoped)',
      icon: Grid,
      link: `/projects/${projectId}/workforce/skills`,
      color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
    },
  ];
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Planning
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Planning and resource management for {project.name}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planningCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.link}
              to={card.link as any}
              className="block p-6 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`inline-flex p-3 rounded-lg ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                {(card as any).badge && (
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                    {(card as any).badge}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Capacity Conflicts Summary */}
      <div className="mt-8 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-amber-600" />
          <h3 className="font-semibold">Upcoming Capacity Conflicts (14 days)</h3>
        </div>
        {loadingConflicts ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : conflicts.length === 0 ? (
          <div className="text-sm text-gray-500">No conflicts detected for this project.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="p-2">Date</th>
                  <th className="p-2">Station</th>
                  <th className="p-2">Allocated</th>
                  <th className="p-2">Capacity</th>
                  <th className="p-2">Over by</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.slice(0, 10).map((c: any, idx: number) => {
                  const st = stations.find(s => s.id === c.stationId);
                  return (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{c.date}</td>
                      <td className="p-2">{st?.name || `#${c.stationId}`}</td>
                      <td className="p-2">{c.allocated}</td>
                      <td className="p-2">{c.capacity}</td>
                      <td className="p-2 text-red-600">+{c.overBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Mobility: quick move panel */}
      <div className="mt-6 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shuffle className="text-indigo-600" />
            <h3 className="font-semibold">Move Asset Between Stations</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Asset</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select movable asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetCode || a.id} — {a.assetName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Station</label>
            <select
              value={targetStationId}
              onChange={(e) => setTargetStationId(e.target.value ? Number(e.target.value) : '')}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select station</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={moveAsset}
              disabled={!selectedAssetId || !targetStationId || moving}
              className={`w-full px-4 py-2 rounded ${(!selectedAssetId || !targetStationId || moving) ? 'bg-gray-300 text-gray-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              {moving ? 'Moving…' : 'Move Asset'}
            </button>
          </div>
        </div>

        {selectedAssetId && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Recent Moves</h4>
            {history.length === 0 ? (
              <div className="text-xs text-gray-500">No movement history.</div>
            ) : (
              <ul className="text-sm list-disc ml-5 space-y-1">
                {history.slice(0,5).map((h, idx) => (
                  <li key={idx}>
                    {h.assignedAt ? new Date(h.assignedAt).toLocaleString() : ''} → {h.stationName || `#${h.workstationId}`} {h.removedAt ? `(removed ${new Date(h.removedAt).toLocaleString()})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

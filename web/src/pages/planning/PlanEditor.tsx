import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit,
  History,
  Save,
  Scissors,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';

interface ProcessPlanDetail {
  id: string;
  planId: string;
  operationId: string;
  date: Date;
  sequence: number;
  inputCapacity: number | null;
  operationCapacity: number;
  effectiveOutput: number;
  isBottleneck: boolean;
  stationId: number | null;
  assignedMachines: number;
  assignedWorkers: number | null;
  capacityUtilization: number;
  status: string;
  ProcessOperation: {
    id: string;
    name: string;
    cycleTime: number | null;
  };
  Station: {
    id: number;
    name: string;
  } | null;
}

interface Conflict {
  id: string;
  conflictType: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  suggestion: string | null;
  resolved: boolean;
}

interface ModificationHistory {
  id: string;
  changeType: string;
  fieldChanged: string;
  oldValue: any;
  newValue: any;
  reason: string | null;
  createdAt: Date;
  User: {
    name: string | null;
    email: string;
  } | null;
}

interface PlanEditorProps {
  planId: string;
}

export default function PlanEditor({ planId }: PlanEditorProps) {
  const queryClient = useQueryClient();
  const [editingDetail, setEditingDetail] = useState<ProcessPlanDetail | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  // Fetch plan operations
  const { data: operations, isLoading: opsLoading } = useQuery<{
    details: ProcessPlanDetail[];
    grouped: Record<string, ProcessPlanDetail[]>;
  }>({
    queryKey: ['plan-operations', planId],
    queryFn: async () => {
      const res = await fetch(`/api/auto-planning/plans/${planId}/operations`);
      if (!res.ok) throw new Error('Failed to fetch operations');
      return res.json();
    },
    enabled: !!planId
  });

  // Fetch conflicts
  const { data: conflictsData, refetch: refetchConflicts } = useQuery<{
    conflicts: Conflict[];
    summary: { total: number; critical: number; warning: number; info: number };
  }>({
    queryKey: ['plan-conflicts', planId],
    queryFn: async () => {
      const res = await fetch(`/api/plan-editor/plans/${planId}/conflicts`);
      if (!res.ok) throw new Error('Failed to fetch conflicts');
      return res.json();
    },
    enabled: !!planId && showConflicts
  });

  // Fetch history
  const { data: historyData } = useQuery<{ history: ModificationHistory[] }>({
    queryKey: ['plan-history', planId],
    queryFn: async () => {
      const res = await fetch(`/api/plan-editor/plans/${planId}/history?limit=20`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: !!planId && showHistory
  });

  // Update operation mutation
  const updateOperation = useMutation({
    mutationFn: async ({
      detailId,
      updates,
      reason
    }: {
      detailId: string;
      updates: Record<string, any>;
      reason: string;
    }) => {
      const res = await fetch(`/api/plan-editor/operations/${detailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, reason })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update operation');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-operations', planId] });
      queryClient.invalidateQueries({ queryKey: ['plan-conflicts', planId] });
      setEditingDetail(null);
      setEditValues({});
    }
  });

  // Resolve conflict mutation
  const resolveConflict = useMutation({
    mutationFn: async ({
      conflictId,
      resolutionNote
    }: {
      conflictId: string;
      resolutionNote: string;
    }) => {
      const res = await fetch(`/api/plan-editor/conflicts/${conflictId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote })
      });
      if (!res.ok) throw new Error('Failed to resolve conflict');
      return res.json();
    },
    onSuccess: () => {
      refetchConflicts();
    }
  });

  const handleEdit = (detail: ProcessPlanDetail) => {
    setEditingDetail(detail);
    setEditValues({
      effectiveOutput: detail.effectiveOutput,
      date: new Date(detail.date).toISOString().split('T')[0],
      assignedMachines: detail.assignedMachines,
      assignedWorkers: detail.assignedWorkers || 1
    });
  };

  const handleSave = () => {
    if (!editingDetail) return;

    const updates: Record<string, any> = {};
    if (editValues.effectiveOutput !== editingDetail.effectiveOutput) {
      updates.effectiveOutput = Number(editValues.effectiveOutput);
    }
    if (editValues.date !== new Date(editingDetail.date).toISOString().split('T')[0]) {
      updates.date = new Date(editValues.date);
    }
    if (editValues.assignedMachines !== editingDetail.assignedMachines) {
      updates.assignedMachines = Number(editValues.assignedMachines);
    }
    if (editValues.assignedWorkers !== editingDetail.assignedWorkers) {
      updates.assignedWorkers = Number(editValues.assignedWorkers);
    }

    if (Object.keys(updates).length === 0) {
      setEditingDetail(null);
      return;
    }

    updateOperation.mutate({
      detailId: editingDetail.id,
      updates,
      reason: 'Manual adjustment via Plan Editor'
    });
  };

  const handleCancel = () => {
    setEditingDetail(null);
    setEditValues({});
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-300 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (opsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!operations) return null;

  const dates = Object.keys(operations.grouped).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Plan Editor" />

      <div className="p-6 space-y-6">
        {/* Action Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowConflicts(!showConflicts)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showConflicts
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                Conflicts {conflictsData?.summary.total ? `(${conflictsData.summary.total})` : ''}
              </button>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showHistory
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <History className="w-4 h-4" />
                History
              </button>
            </div>

            {conflictsData && conflictsData.summary.critical > 0 && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {conflictsData.summary.critical} critical conflicts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conflicts Panel */}
        {showConflicts && conflictsData && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conflicts</h3>
            {conflictsData.conflicts.length === 0 ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span>No conflicts detected</span>
              </div>
            ) : (
              <div className="space-y-3">
                {conflictsData.conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className={`border-2 rounded-lg p-4 ${getSeverityColor(conflict.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(conflict.severity)}
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{conflict.description}</h4>
                        {conflict.suggestion && (
                          <p className="text-sm opacity-80 mb-2">
                            💡 {conflict.suggestion}
                          </p>
                        )}
                        {!conflict.resolved && (
                          <button
                            onClick={() =>
                              resolveConflict.mutate({
                                conflictId: conflict.id,
                                resolutionNote: 'Manually resolved'
                              })
                            }
                            className="text-sm px-3 py-1 bg-white border border-current rounded hover:bg-opacity-50 transition-colors"
                          >
                            Mark as Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Panel */}
        {showHistory && historyData && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Modification History</h3>
            {historyData.history.length === 0 ? (
              <p className="text-gray-500">No changes recorded yet</p>
            ) : (
              <div className="space-y-3">
                {historyData.history.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{item.changeType}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {item.fieldChanged}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {item.User && (
                      <p className="text-sm text-gray-600">
                        By: {item.User.name || item.User.email}
                      </p>
                    )}
                    {item.reason && (
                      <p className="text-sm text-gray-700 mt-1">Reason: {item.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Operations by Date */}
        <div className="space-y-4">
          {dates.map((dateKey) => (
            <div key={dateKey} className="bg-white border border-gray-200 rounded-lg">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">
                    {new Date(dateKey).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <span className="text-sm text-gray-600">
                    ({operations.grouped[dateKey].length} operations)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {operations.grouped[dateKey].map((detail) => {
                  const isEditing = editingDetail?.id === detail.id;

                  return (
                    <div
                      key={detail.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        detail.isBottleneck ? 'bg-red-50' : ''
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Edit className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900">
                              Editing: {detail.ProcessOperation.name}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Effective Output
                              </label>
                              <input
                                type="number"
                                value={editValues.effectiveOutput || ''}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    effectiveOutput: e.target.value
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                value={editValues.date || ''}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, date: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assigned Machines
                              </label>
                              <input
                                type="number"
                                value={editValues.assignedMachines || ''}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    assignedMachines: e.target.value
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assigned Workers
                              </label>
                              <input
                                type="number"
                                value={editValues.assignedWorkers || ''}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    assignedWorkers: e.target.value
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSave}
                              disabled={updateOperation.isPending}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              Save Changes
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                #{detail.sequence} {detail.ProcessOperation.name}
                              </span>
                              {detail.isBottleneck && (
                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                  Bottleneck
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Station: {detail.Station?.name || 'Unassigned'}</span>
                              <span>Output: {detail.effectiveOutput} units</span>
                              <span>Machines: {detail.assignedMachines}</span>
                              <span>
                                Utilization: {(detail.capacityUtilization * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleEdit(detail)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Calendar, Edit2, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import ImpactAnalyzer from './ImpactAnalyzer';

interface ProcessPlanDetail {
    id: string;
    operationId: string;
    date: string;
    sequence: number;
    operationCapacity: number;
    effectiveOutput: number;
    isBottleneck: boolean;
    stationId: number | null;
    assignedMachines: number;
    capacityUtilization: number;
    ProcessOperation: {
        id: string;
        operationName: string;
        operationCode: string;
    };
    Station: {
        id: number;
        name: string;
    } | null;
}

interface PlanEditorProps {
    planId: string;
    onClose: () => void;
    onSave: () => void;
}

export default function PlanEditor({ planId, onClose, onSave }: PlanEditorProps) {
    const [details, setDetails] = useState<ProcessPlanDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingDetail, setEditingDetail] = useState<ProcessPlanDetail | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [impactAnalysis, setImpactAnalysis] = useState<any>(null);
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [showImpact, setShowImpact] = useState(false);

    useEffect(() => {
        fetchPlanDetails();
    }, [planId]);

    const fetchPlanDetails = async () => {
        setLoading(true);
        try {
            const response = await apiGet(`/api/auto-planning/plans/${planId}`);
            if (response.processDetails) {
                setDetails(response.processDetails);
            }
        } catch (error) {
            console.error('Error fetching plan details:', error);
            alert('Failed to load plan details');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (detail: ProcessPlanDetail) => {
        setEditingDetail(detail);
        setEditForm({
            effectiveOutput: detail.effectiveOutput,
            date: new Date(detail.date).toISOString().split('T')[0],
            assignedMachines: detail.assignedMachines,
            capacityUtilization: detail.capacityUtilization
        });
        setShowImpact(false);
        setImpactAnalysis(null);
        setConflicts([]);
    };

    const handleAnalyzeImpact = async () => {
        if (!editingDetail) return;

        try {
            const updates = {
                effectiveOutput: parseInt(editForm.effectiveOutput),
                date: new Date(editForm.date),
                assignedMachines: parseInt(editForm.assignedMachines)
            };

            const response = await apiPost('/api/plan-editor/analyze-impact', {
                detailId: editingDetail.id,
                updates
            });

            setImpactAnalysis(response.impact);
            setConflicts(response.conflicts || []);
            setShowImpact(true);
        } catch (error) {
            console.error('Error analyzing impact:', error);
            alert('Failed to analyze impact');
        }
    };

    const handleSaveChanges = async () => {
        if (!editingDetail) return;

        const hasCriticalConflicts = conflicts.some((c: any) => c.severity === 'critical');
        if (hasCriticalConflicts) {
            alert('Cannot save: Critical conflicts detected. Please resolve them first.');
            return;
        }

        setSaving(true);
        try {
            const updates = {
                effectiveOutput: parseInt(editForm.effectiveOutput),
                date: new Date(editForm.date),
                assignedMachines: parseInt(editForm.assignedMachines)
            };

            const reason = prompt('Please provide a reason for this modification:');
            if (!reason) {
                setSaving(false);
                return;
            }

            await apiPut(`/api/plan-editor/operations/${editingDetail.id}`, {
                updates,
                reason
            });

            alert('✅ Changes saved successfully!');
            setEditingDetail(null);
            setShowImpact(false);
            await fetchPlanDetails();
            onSave();
        } catch (error: any) {
            console.error('Error saving changes:', error);
            alert(`Failed to save changes: ${error.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingDetail(null);
        setShowImpact(false);
        setImpactAnalysis(null);
        setConflicts([]);
    };

    const groupByDate = (details: ProcessPlanDetail[]) => {
        const grouped: { [key: string]: ProcessPlanDetail[] } = {};
        details.forEach(detail => {
            const dateKey = new Date(detail.date).toISOString().split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(detail);
        });
        return grouped;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-gray-600">Loading plan details...</div>
            </div>
        );
    }

    const groupedDetails = groupByDate(details);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Edit Production Plan</h2>
                    <p className="text-gray-600 mt-1">
                        Modify operation quantities, dates, and resources. Impact analysis will show downstream effects.
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Close
                </button>
            </div>

            {/* Edit Form */}
            {editingDetail && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-blue-900">
                            Editing: {editingDetail.ProcessOperation.operationName}
                        </h3>
                        <button
                            onClick={handleCancel}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Effective Output (units/hr)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={editingDetail.operationCapacity}
                                value={editForm.effectiveOutput}
                                onChange={(e) => setEditForm({ ...editForm, effectiveOutput: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Max capacity: {editingDetail.operationCapacity} units/hr
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assigned Machines
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={editForm.assignedMachines}
                                onChange={(e) => setEditForm({ ...editForm, assignedMachines: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleAnalyzeImpact}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Analyze Impact
                        </button>
                        <button
                            onClick={handleSaveChanges}
                            disabled={saving || !showImpact}
                            className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${saving || !showImpact
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>

                    {!showImpact && (
                        <div className="mt-3 text-sm text-blue-700 bg-blue-100 rounded p-2">
                            💡 Click "Analyze Impact" to see how this change affects other operations before saving.
                        </div>
                    )}
                </div>
            )}

            {/* Impact Analysis */}
            {showImpact && editingDetail && (
                <ImpactAnalyzer
                    impact={impactAnalysis}
                    conflicts={conflicts}
                    showDetails={true}
                />
            )}

            {/* Plan Timeline */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Plan Timeline</h3>
                <div className="space-y-6">
                    {Object.entries(groupedDetails).map(([date, dayDetails]) => (
                        <div key={date} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <h4 className="font-bold text-gray-900">
                                    {new Date(date).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </h4>
                                <span className="text-sm text-gray-600">
                                    ({dayDetails.length} operations)
                                </span>
                            </div>

                            <div className="space-y-2">
                                {dayDetails.sort((a, b) => a.sequence - b.sequence).map((detail) => (
                                    <div
                                        key={detail.id}
                                        className={`border rounded-lg p-3 transition-all ${editingDetail?.id === detail.id
                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                : detail.isBottleneck
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${detail.isBottleneck ? 'bg-red-600' : 'bg-blue-500'
                                                        }`}
                                                >
                                                    {detail.sequence}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="font-bold text-gray-900">
                                                            {detail.ProcessOperation.operationName}
                                                        </h5>
                                                        {detail.isBottleneck && (
                                                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                                                                BOTTLENECK
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                                        <span>
                                                            Station: <span className="font-medium">{detail.Station?.name || 'Unassigned'}</span>
                                                        </span>
                                                        <span>
                                                            Output: <span className="font-medium">{detail.effectiveOutput} units/hr</span>
                                                        </span>
                                                        <span>
                                                            Machines: <span className="font-medium">{detail.assignedMachines}</span>
                                                        </span>
                                                        <span>
                                                            Utilization:{' '}
                                                            <span className={`font-medium ${detail.capacityUtilization >= 0.9 ? 'text-red-600' :
                                                                    detail.capacityUtilization >= 0.7 ? 'text-yellow-600' :
                                                                        'text-green-600'
                                                                }`}>
                                                                {(detail.capacityUtilization * 100).toFixed(1)}%
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleEditClick(detail)}
                                                disabled={editingDetail !== null}
                                                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${editingDetail !== null
                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">💡 Editing Tips</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Click "Edit" on any operation to modify its details</li>
                    <li>• Always click "Analyze Impact" before saving to see downstream effects</li>
                    <li>• Critical conflicts will prevent you from saving changes</li>
                    <li>• Changes to output capacity will propagate to downstream operations</li>
                    <li>• Bottleneck operations are highlighted in red - these constrain the entire chain</li>
                </ul>
            </div>
        </div>
    );
}

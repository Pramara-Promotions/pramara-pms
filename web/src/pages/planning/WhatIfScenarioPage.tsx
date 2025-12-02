import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { useProjectContext } from '../../hooks';
import {
    GitCompare,
    Plus,
    Play,
    Trash2,
    TrendingUp,
    TrendingDown,
    Clock,
    DollarSign,
    Users,
    AlertCircle
} from 'lucide-react';

interface Scenario {
    id: string;
    name: string;
    description: string;
    parameters: {
        machineCount?: number;
        shiftHours?: number;
        utilizationRate?: number;
        laborCost?: number;
    };
    results?: {
        completionDays: number;
        totalCost: number;
        laborHours: number;
        efficiency: number;
    };
}

export default function WhatIfScenarioPage() {
    const { projectId } = useProjectContext();
    const [scenarios, setScenarios] = useState<Scenario[]>([
        {
            id: 'baseline',
            name: 'Current Plan (Baseline)',
            description: 'Existing production plan with current resources',
            parameters: {
                machineCount: 3,
                shiftHours: 8,
                utilizationRate: 85,
                laborCost: 25
            },
            results: {
                completionDays: 15,
                totalCost: 45000,
                laborHours: 360,
                efficiency: 85
            }
        }
    ]);

    const [selectedScenarios, setSelectedScenarios] = useState<string[]>(['baseline']);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newScenario, setNewScenario] = useState<Partial<Scenario>>({
        name: '',
        description: '',
        parameters: {
            machineCount: 3,
            shiftHours: 8,
            utilizationRate: 85,
            laborCost: 25
        }
    });

    const handleCreateScenario = () => {
        const scenario: Scenario = {
            id: `scenario-${Date.now()}`,
            name: newScenario.name || 'Unnamed Scenario',
            description: newScenario.description || '',
            parameters: newScenario.parameters!,
            results: calculateScenarioResults(newScenario.parameters!)
        };

        setScenarios([...scenarios, scenario]);
        setShowCreateModal(false);
        setNewScenario({
            name: '',
            description: '',
            parameters: {
                machineCount: 3,
                shiftHours: 8,
                utilizationRate: 85,
                laborCost: 25
            }
        });
    };

    const calculateScenarioResults = (params: any) => {
        const baselineCapacity = 3 * 8 * 0.85;
        const scenarioCapacity = params.machineCount * params.shiftHours * (params.utilizationRate / 100);
        const speedup = scenarioCapacity / baselineCapacity;

        return {
            completionDays: Math.ceil(15 / speedup),
            totalCost: 45000 * (params.laborCost / 25) * speedup,
            laborHours: 360 * speedup,
            efficiency: params.utilizationRate
        };
    };

    const toggleScenarioSelection = (id: string) => {
        setSelectedScenarios(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    const deleteScenario = (id: string) => {
        if (id === 'baseline') return;
        setScenarios(scenarios.filter(s => s.id !== id));
        setSelectedScenarios(selectedScenarios.filter(s => s !== id));
    };

    const selectedScenarioData = scenarios.filter(s => selectedScenarios.includes(s.id));
    const baselineResults = scenarios[0].results!;

    if (!projectId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-medium text-yellow-900">No Project Context</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Navigate to a project to run what-if scenarios.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <PageHeader title="What-If Scenario Analysis" />

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Scenario
                    </button>
                </div>

                {/* Scenario Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scenarios.map((scenario) => (
                        <div
                            key={scenario.id}
                            className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedScenarios.includes(scenario.id)
                                    ? 'border-blue-500 shadow-lg'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => toggleScenarioSelection(scenario.id)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{scenario.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{scenario.description}</p>
                                </div>
                                {scenario.id !== 'baseline' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteScenario(scenario.id);
                                        }}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Machines:</span>
                                    <span className="font-medium">{scenario.parameters.machineCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Shift Hours:</span>
                                    <span className="font-medium">{scenario.parameters.shiftHours}h</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Utilization:</span>
                                    <span className="font-medium">{scenario.parameters.utilizationRate}%</span>
                                </div>
                                {scenario.results && (
                                    <>
                                        <div className="border-t pt-2 mt-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Days:</span>
                                                <span className="font-semibold text-gray-900">
                                                    {scenario.results.completionDays}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Cost:</span>
                                                <span className="font-semibold text-gray-900">
                                                    ${scenario.results.totalCost.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Comparison Table */}
                {selectedScenarioData.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <GitCompare className="w-5 h-5" />
                            Scenario Comparison
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-3 font-semibold">Metric</th>
                                        {selectedScenarioData.map((scenario) => (
                                            <th key={scenario.id} className="text-right p-3 font-semibold">
                                                {scenario.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-t">
                                        <td className="p-3 font-medium">Completion Days</td>
                                        {selectedScenarioData.map((scenario) => {
                                            const diff = scenario.results!.completionDays - baselineResults.completionDays;
                                            return (
                                                <td key={scenario.id} className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="font-semibold">{scenario.results!.completionDays}</span>
                                                        {scenario.id !== 'baseline' && (
                                                            <span className={`text-xs ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                ({diff > 0 ? '+' : ''}{diff})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr className="border-t">
                                        <td className="p-3 font-medium">Total Cost</td>
                                        {selectedScenarioData.map((scenario) => {
                                            const diff = scenario.results!.totalCost - baselineResults.totalCost;
                                            return (
                                                <td key={scenario.id} className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="font-semibold">${scenario.results!.totalCost.toLocaleString()}</span>
                                                        {scenario.id !== 'baseline' && (
                                                            <span className={`text-xs ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                ({diff > 0 ? '+' : ''}${Math.abs(diff).toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr className="border-t">
                                        <td className="p-3 font-medium">Labor Hours</td>
                                        {selectedScenarioData.map((scenario) => (
                                            <td key={scenario.id} className="p-3 text-right">
                                                <span className="font-semibold">{scenario.results!.laborHours}</span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-t">
                                        <td className="p-3 font-medium">Efficiency</td>
                                        {selectedScenarioData.map((scenario) => (
                                            <td key={scenario.id} className="p-3 text-right">
                                                <span className="font-semibold">{scenario.results!.efficiency}%</span>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Scenario</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Scenario Name *
                                </label>
                                <input
                                    type="text"
                                    value={newScenario.name}
                                    onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Add 2 Machines"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newScenario.description}
                                    onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                    placeholder="Brief description of this scenario"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Machine Count
                                    </label>
                                    <input
                                        type="number"
                                        value={newScenario.parameters?.machineCount}
                                        onChange={(e) => setNewScenario({
                                            ...newScenario,
                                            parameters: { ...newScenario.parameters!, machineCount: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Shift Hours
                                    </label>
                                    <input
                                        type="number"
                                        value={newScenario.parameters?.shiftHours}
                                        onChange={(e) => setNewScenario({
                                            ...newScenario,
                                            parameters: { ...newScenario.parameters!, shiftHours: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="1"
                                        max="24"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Utilization Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={newScenario.parameters?.utilizationRate}
                                        onChange={(e) => setNewScenario({
                                            ...newScenario,
                                            parameters: { ...newScenario.parameters!, utilizationRate: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="1"
                                        max="100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Labor Cost ($/hr)
                                    </label>
                                    <input
                                        type="number"
                                        value={newScenario.parameters?.laborCost}
                                        onChange={(e) => setNewScenario({
                                            ...newScenario,
                                            parameters: { ...newScenario.parameters!, laborCost: Number(e.target.value) }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleCreateScenario}
                                disabled={!newScenario.name}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Create Scenario
                            </button>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 border border-gray-300 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

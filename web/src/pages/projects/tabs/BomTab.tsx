// web/src/pages/projects/tabs/BomTab.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectContext } from '../ProjectContext';
import {
    Plus,
    Trash2,
    Edit2,
    Link as LinkIcon,
    ChevronRight,
    ChevronDown,
    Package,
    Layers,
    DollarSign,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

interface Component {
    id: number;
    type: string;
    name: string;
    quantityPerUnit: number;
    color?: string;
    pantoneCode?: string;
    notes?: string;
    materials: ComponentMaterial[];
    isActive: boolean;
}

interface ComponentMaterial {
    id: string;
    materialId: string;
    quantityPerComponent: number;
    unit: string;
    stage?: string;
    Material: {
        id: string;
        name: string;
        type: string;
        unit: string;
        costPerUnit?: number;
    };
}

interface MaterialRequirement {
    materialId: string;
    materialName: string;
    totalQuantity: number;
    unit: string;
    costPerUnit?: number;
    totalCost?: number;
}

export default function BomTab() {
    const project = useProjectContext();
    const queryClient = useQueryClient();
    const [expandedComponents, setExpandedComponents] = useState<Set<number>>(new Set());
    const [isAddingComponent, setIsAddingComponent] = useState(false);
    const [editingComponent, setEditingComponent] = useState<Component | null>(null);
    const [linkingMaterial, setLinkingMaterial] = useState<Component | null>(null);

    if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;

    const projectId = project.id;

    // Fetch BOM
    const { data: bomData, isLoading: bomLoading } = useQuery({
        queryKey: ['bom', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/bom/${projectId}`);
            if (!res.ok) throw new Error('Failed to fetch BOM');
            return res.json();
        }
    });

    // Fetch material requirements
    const { data: requirementsData } = useQuery({
        queryKey: ['bom-requirements', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/bom/${projectId}/requirements`);
            if (!res.ok) throw new Error('Failed to fetch requirements');
            return res.json();
        },
        enabled: !!bomData?.bom?.length
    });

    // Fetch project SKUs
    const { data: skusData } = useQuery({
        queryKey: ['project-skus', projectId],
        queryFn: async () => {
            const res = await fetch(`/api/project-skus?projectId=${projectId}`);
            if (!res.ok) throw new Error('Failed to fetch SKUs');
            return res.json();
        }
    });

    // Fetch materials for linking
    const { data: materialsData } = useQuery({
        queryKey: ['materials'],
        queryFn: async () => {
            const res = await fetch('/api/materials');
            if (!res.ok) throw new Error('Failed to fetch materials');
            return res.json();
        }
    });

    // Create component mutation
    const createComponentMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/bom/component', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create component');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bom', projectId] });
            queryClient.invalidateQueries({ queryKey: ['bom-requirements', projectId] });
            queryClient.invalidateQueries({ queryKey: ['workflow-status', projectId] });
            setIsAddingComponent(false);
        }
    });

    // Deactivate component mutation
    const deactivateComponentMutation = useMutation({
        mutationFn: async (componentId: number) => {
            const res = await fetch(`/api/bom/component/${componentId}/deactivate`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to deactivate component');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bom', projectId] });
            queryClient.invalidateQueries({ queryKey: ['workflow-status', projectId] });
        }
    });

    // Link material mutation
    const linkMaterialMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/bom/material-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to link material');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bom', projectId] });
            queryClient.invalidateQueries({ queryKey: ['bom-requirements', projectId] });
            setLinkingMaterial(null);
        }
    });

    const bom: Component[] = bomData?.bom || [];
    const requirements: MaterialRequirement[] = requirementsData?.requirements || [];
    const skus = skusData?.skus || [];
    const materials = materialsData?.materials || [];

    const toggleExpand = (componentId: number) => {
        const newExpanded = new Set(expandedComponents);
        if (newExpanded.has(componentId)) {
            newExpanded.delete(componentId);
        } else {
            newExpanded.add(componentId);
        }
        setExpandedComponents(newExpanded);
    };

    const totalCost = requirements.reduce((sum, req) => sum + (req.totalCost || 0), 0);

    if (bomLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500 dark:text-gray-400">Loading BOM...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Bill of Materials
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Define product components and link materials
                    </p>
                </div>
                <button
                    onClick={() => setIsAddingComponent(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Add Component
                </button>
            </div>

            {/* Summary Cards */}
            {bom.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {bom.length}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Components
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {requirements.length}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Materials
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    ${totalCost.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Material Cost
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BOM Tree */}
            {bom.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Components Defined
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Start by adding components that make up your product (e.g., Frame, Temple, Lenses)
                    </p>
                    <button
                        onClick={() => setIsAddingComponent(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Add First Component
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {bom.map(component => (
                        <ComponentCard
                            key={component.id}
                            component={component}
                            isExpanded={expandedComponents.has(component.id)}
                            onToggle={() => toggleExpand(component.id)}
                            onDelete={() => {
                                if (confirm(`Delete component "${component.name}"?`)) {
                                    deactivateComponentMutation.mutate(component.id);
                                }
                            }}
                            onLinkMaterial={() => setLinkingMaterial(component)}
                        />
                    ))}
                </div>
            )}

            {/* Material Requirements Summary */}
            {requirements.length > 0 && (
                <div className="mt-8 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Material Requirements Summary
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                        Material
                                    </th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                        Required Qty
                                    </th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                        Unit
                                    </th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                        Cost/Unit
                                    </th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                        Total Cost
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {requirements.map(req => (
                                    <tr key={req.materialId} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="py-2 px-3 text-gray-900 dark:text-white">
                                            {req.materialName}
                                        </td>
                                        <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                                            {req.totalQuantity.toFixed(2)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                                            {req.unit}
                                        </td>
                                        <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                                            ${req.costPerUnit?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-white">
                                            ${req.totalCost?.toFixed(2) || '0.00'}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="font-bold">
                                    <td colSpan={4} className="py-3 px-3 text-right text-gray-900 dark:text-white">
                                        Total Material Cost:
                                    </td>
                                    <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                                        ${totalCost.toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Component Modal */}
            {isAddingComponent && (
                <AddComponentModal
                    projectId={projectId}
                    skus={skus}
                    onClose={() => setIsAddingComponent(false)}
                    onSubmit={(data) => createComponentMutation.mutate(data)}
                />
            )}

            {/* Link Material Modal */}
            {linkingMaterial && (
                <LinkMaterialModal
                    component={linkingMaterial}
                    materials={materials}
                    onClose={() => setLinkingMaterial(null)}
                    onSubmit={(data) => linkMaterialMutation.mutate(data)}
                />
            )}
        </div>
    );
}

// Component Card
function ComponentCard({
    component,
    isExpanded,
    onToggle,
    onDelete,
    onLinkMaterial
}: {
    component: Component;
    isExpanded: boolean;
    onToggle: () => void;
    onDelete: () => void;
    onLinkMaterial: () => void;
}) {
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1">
                    <button
                        onClick={onToggle}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        )}
                    </button>

                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                {component.name}
                            </h4>
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                {component.type}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Quantity per unit: {component.quantityPerUnit}
                            {component.color && ` • Color: ${component.color}`}
                            {component.pantoneCode && ` • Pantone: ${component.pantoneCode}`}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {component.materials.length} material{component.materials.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={onLinkMaterial}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Link Material"
                        >
                            <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Delete Component"
                        >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded: Show Materials */}
            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                    {component.materials.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                            No materials linked. Click the link icon to add materials.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {component.materials.map(mat => (
                                <div
                                    key={mat.id}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {mat.Material.name}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Type: {mat.Material.type}
                                            {mat.stage && ` • Stage: ${mat.stage}`}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {mat.quantityPerComponent} {mat.unit}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            per component
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Add Component Modal
function AddComponentModal({
    projectId,
    skus,
    onClose,
    onSubmit
}: {
    projectId: number;
    skus: any[];
    onClose: () => void;
    onSubmit: (data: any) => void;
}) {
    const [formData, setFormData] = useState({
        skuId: skus[0]?.id || '',
        type: '',
        name: '',
        quantityPerUnit: 1,
        color: '',
        pantoneCode: '',
        notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ projectId, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Add Component
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            SKU *
                        </label>
                        <select
                            value={formData.skuId}
                            onChange={e => setFormData({ ...formData, skuId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            required
                        >
                            {skus.map(sku => (
                                <option key={sku.id} value={sku.id}>
                                    {sku.name || sku.sku}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Component Type *
                        </label>
                        <input
                            type="text"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            placeholder="e.g., Frame, Temple, Lens"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Component Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Front Frame, Temple Left"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Quantity Per Unit *
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={formData.quantityPerUnit}
                            onChange={e => setFormData({ ...formData, quantityPerUnit: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Color
                            </label>
                            <input
                                type="text"
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                placeholder="e.g., Black"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Pantone Code
                            </label>
                            <input
                                type="text"
                                value={formData.pantoneCode}
                                onChange={e => setFormData({ ...formData, pantoneCode: e.target.value })}
                                placeholder="e.g., PMS 1234"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Add Component
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Link Material Modal
function LinkMaterialModal({
    component,
    materials,
    onClose,
    onSubmit
}: {
    component: Component;
    materials: any[];
    onClose: () => void;
    onSubmit: (data: any) => void;
}) {
    const [formData, setFormData] = useState({
        materialId: materials[0]?.id || '',
        quantityPerComponent: 1,
        unit: 'kg',
        stage: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ componentId: component.id, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Link Material to {component.name}
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Material *
                        </label>
                        <select
                            value={formData.materialId}
                            onChange={e => setFormData({ ...formData, materialId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            required
                        >
                            {materials.map(mat => (
                                <option key={mat.id} value={mat.id}>
                                    {mat.name} ({mat.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Quantity Per Component *
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={formData.quantityPerComponent}
                            onChange={e => setFormData({ ...formData, quantityPerComponent: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unit *
                        </label>
                        <select
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            required
                        >
                            <option value="kg">kg</option>
                            <option value="pcs">pieces</option>
                            <option value="m">meters</option>
                            <option value="cm">cm</option>
                            <option value="l">liters</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Production Stage
                        </label>
                        <input
                            type="text"
                            value={formData.stage}
                            onChange={e => setFormData({ ...formData, stage: e.target.value })}
                            placeholder="e.g., Molding, Assembly"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Link Material
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

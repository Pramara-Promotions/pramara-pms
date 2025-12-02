import { useState, useEffect } from 'react';
import { Lightbulb, Sparkles, CheckCircle, X, TrendingUp, Users, Clock } from 'lucide-react';

interface ProcessTemplate {
    id: string;
    name: string;
    description: string;
    processType: string;
    subType: string | null;
    usageCount: number;
    successRate: number;
    structure: {
        stages: string[];
        requiredResources: string[];
        commonParameters: Record<string, any>;
    };
    isSystemDefined: boolean;
}

interface TemplateSuggestionModalProps {
    isOpen: boolean;
    operationName: string;
    processFlowId: string;
    onAccept: (templateId: string) => Promise<void>;
    onSkip: () => void;
    onClose: () => void;
}

export default function TemplateSuggestionModal({
    isOpen,
    operationName,
    processFlowId,
    onAccept,
    onSkip,
    onClose
}: TemplateSuggestionModalProps) {
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ProcessTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && operationName) {
            fetchTemplateSuggestions();
        }
    }, [isOpen, operationName]);

    const fetchTemplateSuggestions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/process-templates/suggest?operation=${encodeURIComponent(operationName)}`);
            if (!response.ok) throw new Error('Failed to fetch template suggestions');

            const data = await response.json();
            setTemplates(data.templates || []);

            // Auto-select the first template if available
            if (data.templates && data.templates.length > 0) {
                setSelectedTemplate(data.templates[0]);
            }
        } catch (err) {
            console.error('Error fetching templates:', err);
            setError('Failed to load template suggestions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptTemplate = async () => {
        if (!selectedTemplate) return;

        setIsApplying(true);
        try {
            await onAccept(selectedTemplate.id);
        } catch (err) {
            console.error('Error applying template:', err);
            setError('Failed to apply template');
        } finally {
            setIsApplying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Template Suggestions</h2>
                                <p className="text-gray-600 mt-1">
                                    We found {templates.length} template{templates.length !== 1 ? 's' : ''} for: <span className="font-medium">{operationName}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            disabled={isApplying}
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-4">Loading template suggestions...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="bg-red-50 text-red-700 p-4 rounded-lg inline-block">
                                {error}
                            </div>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12">
                            <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg mb-2">No templates found</p>
                            <p className="text-gray-500 text-sm">
                                You can continue creating this operation manually. We'll learn from it for future suggestions!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-6">
                            {/* Template List */}
                            <div className="col-span-1 space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Available Templates</h3>
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition ${selectedTemplate?.id === template.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                                            {template.isSystemDefined && (
                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                                    System
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {template.usageCount}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                {(template.successRate * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Template Details */}
                            <div className="col-span-2">
                                {selectedTemplate ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-2">{selectedTemplate.name}</h3>
                                            <p className="text-gray-600 text-sm">{selectedTemplate.description}</p>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users className="w-4 h-4 text-blue-600" />
                                                    <span className="text-xs text-blue-700 font-medium">Usage Count</span>
                                                </div>
                                                <p className="text-2xl font-bold text-blue-900">{selectedTemplate.usageCount}</p>
                                            </div>
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                                    <span className="text-xs text-green-700 font-medium">Success Rate</span>
                                                </div>
                                                <p className="text-2xl font-bold text-green-900">
                                                    {(selectedTemplate.successRate * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 p-3 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Clock className="w-4 h-4 text-purple-600" />
                                                    <span className="text-xs text-purple-700 font-medium">Process Type</span>
                                                </div>
                                                <p className="text-sm font-bold text-purple-900 capitalize">
                                                    {selectedTemplate.processType.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Structure Preview */}
                                        <div className="border rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 mb-3">Template Structure</h4>

                                            {/* Stages */}
                                            {selectedTemplate.structure.stages && selectedTemplate.structure.stages.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">Stages ({selectedTemplate.structure.stages.length})</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedTemplate.structure.stages.map((stage, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                {stage}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Resources */}
                                            {selectedTemplate.structure.requiredResources && selectedTemplate.structure.requiredResources.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                                        Required Resources ({selectedTemplate.structure.requiredResources.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedTemplate.structure.requiredResources.map((resource, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                {resource}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Parameters */}
                                            {selectedTemplate.structure.commonParameters && Object.keys(selectedTemplate.structure.commonParameters).length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 mb-2">Common Parameters</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.entries(selectedTemplate.structure.commonParameters).map(([key, value]) => (
                                                            <div key={key} className="bg-gray-50 p-2 rounded text-xs">
                                                                <span className="font-medium text-gray-700">{key}:</span>{' '}
                                                                <span className="text-gray-600">{String(value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Benefits */}
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-medium text-yellow-900 mb-1">Why use this template?</h4>
                                                    <ul className="text-sm text-yellow-800 space-y-1">
                                                        <li>✓ Saves time with pre-configured operations</li>
                                                        <li>✓ Based on {selectedTemplate.usageCount} successful implementations</li>
                                                        <li>✓ {(selectedTemplate.successRate * 100).toFixed(0)}% success rate from past projects</li>
                                                        <li>✓ You can still customize after applying</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">
                                        Select a template to view details
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            {templates.length > 0
                                ? 'Choose a template to auto-generate operations, or skip to create manually.'
                                : 'No templates available. Your manual setup will help train our system!'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onSkip}
                                disabled={isApplying}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Skip & Create Manually
                            </button>
                            {templates.length > 0 && selectedTemplate && (
                                <button
                                    onClick={handleAcceptTemplate}
                                    disabled={isApplying}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isApplying ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Applying...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Accept Template
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

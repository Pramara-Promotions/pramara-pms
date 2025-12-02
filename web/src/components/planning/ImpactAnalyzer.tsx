import { AlertTriangle, TrendingUp, TrendingDown, Clock, Zap, CheckCircle, XCircle } from 'lucide-react';

interface ImpactAnalysis {
    affectedOperations: Array<{
        operationId: string;
        operationName: string;
        currentInput: number;
        newInput: number;
        impact: string;
    }>;
    bottleneckShifted: boolean;
    completionDelayed: boolean;
    estimatedDelayDays: number;
    resourceConflicts: Array<{
        type: string;
        message: string;
    }>;
}

interface Conflict {
    id?: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    affectedDetails: string[];
    description: string;
    suggestion: string;
}

interface ImpactAnalyzerProps {
    impact: ImpactAnalysis | null;
    conflicts: Conflict[];
    showDetails?: boolean;
}

export default function ImpactAnalyzer({ impact, conflicts, showDetails = true }: ImpactAnalyzerProps) {
    if (!impact && (!conflicts || conflicts.length === 0)) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">No Impact Detected</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                    This change can be applied safely without affecting other operations.
                </p>
            </div>
        );
    }

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
                return <CheckCircle className="w-5 h-5 text-blue-600" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-gray-600" />;
        }
    };

    const hasImpact = impact && (
        impact.affectedOperations.length > 0 ||
        impact.bottleneckShifted ||
        impact.completionDelayed ||
        impact.resourceConflicts.length > 0
    );

    const hasCriticalConflicts = conflicts.some(c => c.severity === 'critical');

    return (
        <div className="space-y-4">
            {/* Summary Banner */}
            <div className={`border-2 rounded-lg p-4 ${hasCriticalConflicts
                    ? 'bg-red-50 border-red-400'
                    : hasImpact
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-green-50 border-green-400'
                }`}>
                <div className="flex items-center gap-3">
                    {hasCriticalConflicts ? (
                        <>
                            <XCircle className="w-6 h-6 text-red-600" />
                            <div>
                                <h3 className="font-bold text-red-900">Critical Issues Detected</h3>
                                <p className="text-sm text-red-700">This change cannot be applied safely. Review conflicts below.</p>
                            </div>
                        </>
                    ) : hasImpact ? (
                        <>
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            <div>
                                <h3 className="font-bold text-yellow-900">Impact Detected</h3>
                                <p className="text-sm text-yellow-700">This change will affect other operations. Review details before applying.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                                <h3 className="font-bold text-green-900">Safe to Apply</h3>
                                <p className="text-sm text-green-700">No conflicts or downstream impacts detected.</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Conflicts */}
            {conflicts && conflicts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        Conflicts ({conflicts.length})
                    </h3>
                    <div className="space-y-3">
                        {conflicts.map((conflict, idx) => (
                            <div key={idx} className={`border-2 rounded-lg p-3 ${getSeverityColor(conflict.severity)}`}>
                                <div className="flex items-start gap-3">
                                    {getSeverityIcon(conflict.severity)}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-sm">{conflict.type.replace(/_/g, ' ').toUpperCase()}</h4>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${conflict.severity === 'critical'
                                                    ? 'bg-red-200 text-red-900'
                                                    : conflict.severity === 'warning'
                                                        ? 'bg-yellow-200 text-yellow-900'
                                                        : 'bg-blue-200 text-blue-900'
                                                }`}>
                                                {conflict.severity.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm mb-2">{conflict.description}</p>
                                        {conflict.suggestion && (
                                            <div className="bg-white bg-opacity-50 rounded p-2 text-xs">
                                                <span className="font-medium">💡 Suggestion:</span> {conflict.suggestion}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Impact Analysis */}
            {impact && hasImpact && showDetails && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Downstream Impact Analysis
                    </h3>

                    <div className="space-y-4">
                        {/* Affected Operations */}
                        {impact.affectedOperations.length > 0 && (
                            <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">
                                    Affected Operations ({impact.affectedOperations.length})
                                </h4>
                                <div className="space-y-2">
                                    {impact.affectedOperations.map((op, idx) => (
                                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                                            <div className="font-medium text-sm text-blue-900">{op.operationName}</div>
                                            <div className="text-xs text-blue-700 mt-1">
                                                {op.impact}
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-xs">
                                                <span className="text-gray-600">
                                                    Current Input: <span className="font-bold">{op.currentInput}</span> units/hr
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-blue-700">
                                                    New Input: <span className="font-bold">{op.newInput}</span> units/hr
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottleneck Shift */}
                        {impact.bottleneckShifted && (
                            <div className="bg-purple-50 border border-purple-200 rounded p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-purple-600" />
                                    <h4 className="font-medium text-sm text-purple-900">Bottleneck Shift Detected</h4>
                                </div>
                                <p className="text-xs text-purple-700">
                                    This change will shift the bottleneck to a different operation. System throughput may increase.
                                </p>
                            </div>
                        )}

                        {/* Completion Delay */}
                        {impact.completionDelayed && (
                            <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-orange-600" />
                                    <h4 className="font-medium text-sm text-orange-900">Completion Delay</h4>
                                </div>
                                <p className="text-xs text-orange-700">
                                    Estimated delay: <span className="font-bold">{impact.estimatedDelayDays} day(s)</span>
                                </p>
                            </div>
                        )}

                        {/* Resource Conflicts */}
                        {impact.resourceConflicts.length > 0 && (
                            <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">
                                    Resource Conflicts ({impact.resourceConflicts.length})
                                </h4>
                                <div className="space-y-2">
                                    {impact.resourceConflicts.map((conflict, idx) => (
                                        <div key={idx} className="bg-red-50 border border-red-200 rounded p-2">
                                            <div className="text-xs text-red-800">
                                                <span className="font-medium">{conflict.type.replace(/_/g, ' ')}:</span> {conflict.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Before/After Comparison */}
            {showDetails && impact && hasImpact && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Impact Summary</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-gray-600 mb-1">Affected Operations</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {impact.affectedOperations.length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-600 mb-1">Resource Conflicts</div>
                            <div className="text-2xl font-bold text-orange-600">
                                {impact.resourceConflicts.length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-600 mb-1">Delay Days</div>
                            <div className="text-2xl font-bold text-red-600">
                                {impact.estimatedDelayDays || 0}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

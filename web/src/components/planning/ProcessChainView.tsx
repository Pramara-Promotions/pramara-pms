import { AlertTriangle, TrendingDown, Activity, Clock, Zap, CheckCircle } from 'lucide-react';

interface OperationBreakdown {
    operationId: string;
    operationName: string;
    sequence: number;
    standardOutput: number;
    estimatedTime: number;
    stationId: number | null;
    stationName: string;
    isBottleneck: boolean;
    effectiveOutput: number;
    capacityUtilization: number;
    idleCapacity: number;
}

interface ProcessChainAnalysis {
    processFlowId: string;
    processFlowName: string;
    totalOperations: number;
    bottleneck: {
        operationId: string;
        operationName: string;
        sequence: number;
        capacity: number;
    };
    effectiveCapacity: number;
    operationBreakdown: OperationBreakdown[];
    warnings: Array<{
        type: string;
        message: string;
        operations?: any;
    }>;
}

interface ProcessChainViewProps {
    analysis: ProcessChainAnalysis;
    showDetails?: boolean;
}

export default function ProcessChainView({ analysis, showDetails = true }: ProcessChainViewProps) {
    const getUtilizationColor = (utilization: number) => {
        if (utilization >= 90) return 'text-red-700 bg-red-100 border-red-300';
        if (utilization >= 70) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
        if (utilization >= 50) return 'text-green-700 bg-green-100 border-green-300';
        return 'text-blue-700 bg-blue-100 border-blue-300';
    };

    const getWarningIcon = (type: string) => {
        switch (type) {
            case 'MISSING_CAPACITY':
                return <AlertTriangle className="w-4 h-4 text-red-600" />;
            case 'SEVERE_UNDERUTILIZATION':
                return <TrendingDown className="w-4 h-4 text-yellow-600" />;
            case 'UNASSIGNED_STATIONS':
                return <AlertTriangle className="w-4 h-4 text-orange-600" />;
            default:
                return <AlertTriangle className="w-4 h-4 text-gray-600" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Total Operations</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{analysis.totalOperations}</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-red-900">Bottleneck</span>
                    </div>
                    <p className="text-lg font-bold text-red-900 truncate">{analysis.bottleneck.operationName}</p>
                    <p className="text-sm text-red-700">Step {analysis.bottleneck.sequence}</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Effective Capacity</span>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{analysis.effectiveCapacity}</p>
                    <p className="text-sm text-green-700">units/hour</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">Warnings</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">{analysis.warnings.length}</p>
                    <p className="text-sm text-purple-700">issues found</p>
                </div>
            </div>

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Process Chain Warnings
                    </h3>
                    <div className="space-y-2">
                        {analysis.warnings.map((warning, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-white rounded p-3">
                                {getWarningIcon(warning.type)}
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{warning.message}</p>
                                    {warning.operations && Array.isArray(warning.operations) && warning.operations.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {warning.operations.map((op: any, opIdx: number) => (
                                                <span key={opIdx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                                    {typeof op === 'string' ? op : op.name}
                                                    {typeof op === 'object' && op.utilization && ` (${op.utilization}%)`}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Process Flow Visualization */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Process Flow Sequence</h3>
                <div className="space-y-3">
                    {analysis.operationBreakdown.map((op, idx) => (
                        <div key={op.operationId}>
                            <div
                                className={`border-2 rounded-lg p-4 transition-all ${op.isBottleneck
                                        ? 'border-red-500 bg-red-50 shadow-lg'
                                        : op.capacityUtilization < 50
                                            ? 'border-yellow-300 bg-yellow-50'
                                            : 'border-gray-200 bg-white hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    {/* Left: Operation Info */}
                                    <div className="flex gap-4 flex-1">
                                        {/* Sequence Number */}
                                        <div
                                            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${op.isBottleneck
                                                    ? 'bg-red-600'
                                                    : op.capacityUtilization < 50
                                                        ? 'bg-yellow-500'
                                                        : 'bg-blue-500'
                                                }`}
                                        >
                                            {op.sequence}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-bold text-gray-900">{op.operationName}</h4>
                                                {op.isBottleneck && (
                                                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        BOTTLENECK
                                                    </span>
                                                )}
                                                {!op.isBottleneck && op.capacityUtilization < 50 && (
                                                    <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full">
                                                        UNDERUTILIZED
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Station</p>
                                                    <p className="font-medium text-gray-900">{op.stationName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Max Capacity</p>
                                                    <p className="font-medium text-gray-900">{op.standardOutput} units/hr</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Effective Output</p>
                                                    <p className="font-medium text-gray-900">{op.effectiveOutput} units/hr</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Utilization</p>
                                                    <p
                                                        className={`font-bold ${op.capacityUtilization >= 90
                                                                ? 'text-red-700'
                                                                : op.capacityUtilization >= 70
                                                                    ? 'text-yellow-700'
                                                                    : op.capacityUtilization >= 50
                                                                        ? 'text-green-700'
                                                                        : 'text-blue-700'
                                                            }`}
                                                    >
                                                        {op.capacityUtilization.toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Capacity Bar */}
                                            {showDetails && (
                                                <div className="mt-3">
                                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                        <span>Capacity Utilization</span>
                                                        <span className="font-medium">
                                                            {op.effectiveOutput} / {op.standardOutput} units/hr
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${op.isBottleneck
                                                                    ? 'bg-red-600'
                                                                    : op.capacityUtilization >= 70
                                                                        ? 'bg-yellow-500'
                                                                        : op.capacityUtilization >= 50
                                                                            ? 'bg-green-500'
                                                                            : 'bg-blue-500'
                                                                }`}
                                                            style={{ width: `${Math.min(op.capacityUtilization, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Idle Capacity Warning */}
                                            {showDetails && op.idleCapacity > 0 && !op.isBottleneck && (
                                                <div className="mt-2 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                                                    <TrendingDown className="w-3 h-3" />
                                                    <span>
                                                        {op.idleCapacity} units/hr idle capacity (could produce more but constrained by
                                                        bottleneck)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Arrow between operations */}
                            {idx < analysis.operationBreakdown.length - 1 && (
                                <div className="flex justify-center py-2">
                                    <div className="text-gray-400">
                                        <svg
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path d="M12 5v14M19 12l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary Info */}
            {showDetails && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Process Chain Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-600">Process Flow</p>
                            <p className="font-medium text-gray-900">{analysis.processFlowName}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Critical Path Operation</p>
                            <p className="font-medium text-red-700">{analysis.bottleneck.operationName}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">System Throughput</p>
                            <p className="font-medium text-gray-900">{analysis.effectiveCapacity} units/hour</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Daily Capacity (8 hrs)</p>
                            <p className="font-medium text-gray-900">{analysis.effectiveCapacity * 8} units/day</p>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                        <p className="font-medium mb-1">💡 Planning Insight:</p>
                        <p>
                            The entire process chain is limited by <strong>{analysis.bottleneck.operationName}</strong> (Step{' '}
                            {analysis.bottleneck.sequence}). Improving this operation's capacity will increase overall throughput.
                            Other operations have idle capacity that cannot be utilized until the bottleneck is resolved.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

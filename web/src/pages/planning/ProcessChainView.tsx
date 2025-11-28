import { useQuery } from '@tanstack/react-query';
import { useParams, useRouterState } from '@tanstack/react-router';
import { AlertCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface ProcessOperation {
  id: string;
  name: string;
  sequence: number;
  standardOutput: number | null;
  standardTime: number | null;
  stationId: string;
  Station: {
    id: string;
    name: string;
    category: string;
  };
}

interface BottleneckInfo {
  operationId: string;
  operationName: string;
  stationName: string;
  capacityUnitsPerDay: number;
  utilizationPercent: number;
  severity: 'critical' | 'moderate' | 'minor';
}

interface ProcessChainAnalysis {
  processFlow: {
    id: string;
    flowName: string;
    totalOperations: number;
  };
  operations: ProcessOperation[];
  bottlenecks: BottleneckInfo[];
  estimatedCompletionDays: number;
  totalCapacity: number;
  warnings: string[];
}

export default function ProcessChainView() {
  const params = useParams({ strict: false });
  const flowId = (params as any).flowId;
  
  const { data: analysis, isLoading, error } = useQuery<ProcessChainAnalysis>({
    queryKey: ['process-chain-analysis', flowId],
    queryFn: async () => {
      const res = await fetch(`/api/auto-planning/analyze-process-flow/${flowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to analyze process flow');
      return res.json();
    },
    enabled: !!flowId
  });

  if (!flowId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-900">No Process Flow Selected</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Select a process flow to analyze its operation chain and identify bottlenecks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-900">Analysis Failed</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'moderate': return 'border-yellow-300 bg-yellow-50';
      case 'minor': return 'border-blue-300 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'minor': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {analysis.processFlow.flowName}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {analysis.processFlow.totalOperations} operations in process chain
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.estimatedCompletionDays.toFixed(1)} days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.totalCapacity.toLocaleString()} units/day
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bottlenecks Found</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.bottlenecks.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900 mb-2">Warnings</h3>
              <ul className="space-y-1">
                {analysis.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-800">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {analysis.bottlenecks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Identified Bottlenecks
          </h3>
          <div className="space-y-3">
            {analysis.bottlenecks.map((bottleneck) => (
              <div
                key={bottleneck.operationId}
                className={`border-2 rounded-lg p-4 ${getSeverityColor(bottleneck.severity)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {bottleneck.operationName}
                      </h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityBadge(
                          bottleneck.severity
                        )}`}
                      >
                        {bottleneck.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Station: {bottleneck.stationName}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Capacity:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {bottleneck.capacityUnitsPerDay.toFixed(1)} units/day
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Utilization:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {bottleneck.utilizationPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="text-xs text-gray-600 mb-1">Load</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          bottleneck.utilizationPercent > 90
                            ? 'bg-red-500'
                            : bottleneck.utilizationPercent > 70
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(bottleneck.utilizationPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operation Chain */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Operation Chain ({analysis.operations.length} operations)
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {analysis.operations.map((operation, idx) => {
              const bottleneck = analysis.bottlenecks.find(
                (b) => b.operationId === operation.id
              );
              const isBottleneck = !!bottleneck;

              return (
                <div
                  key={operation.id}
                  className={`p-4 flex items-center gap-4 ${
                    isBottleneck ? getSeverityColor(bottleneck.severity) : ''
                  }`}
                >
                  <div className="flex-shrink-0 w-12 text-center">
                    <div
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        isBottleneck
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {operation.sequence}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {operation.name}
                      </h4>
                      {isBottleneck && (
                        <span className="flex items-center gap-1 text-xs text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Bottleneck
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {operation.Station.name} ({operation.Station.category})
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {operation.standardOutput && (
                      <div className="text-sm">
                        <span className="text-gray-600">Output:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {operation.standardOutput} units/hr
                        </span>
                      </div>
                    )}
                    {operation.standardTime && (
                      <div className="text-sm text-gray-600">
                        {operation.standardTime} min/unit
                      </div>
                    )}
                  </div>
                  {idx < analysis.operations.length - 1 && (
                    <div className="absolute left-8 mt-16 h-8 w-0.5 bg-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

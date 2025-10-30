import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Package, AlertCircle, ArrowUp, ArrowDown, Loader2, GitBranch } from 'lucide-react';

interface TraceNode {
  batch: {
    id: string;
    batchCode: string;
    status: string;
    currentQty: number;
    targetQty: number;
    rejectedQty?: number;
    isRejection?: boolean;
    isAssembly?: boolean;
    project: { id: number; name: string };
    sku: { id: number; skuCode: string; name: string };
    station: { id: number; name: string; code: string } | null;
    createdAt: string;
    completedAt?: string | null;
  };
  subBatches?: TraceNode[];
  assemblies?: TraceNode[];
  parentBatch?: TraceNode | null;
  componentBatches?: TraceNode[];
  materialLots?: Array<{
    lotNumber: string;
    materialName: string;
    quantityUsed: number;
    timestamp: string;
  }>;
}

interface BatchTraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  batchCode: string;
}

const BatchTraceabilityModal: React.FC<BatchTraceabilityModalProps> = ({
  isOpen,
  onClose,
  batchId,
  batchCode
}) => {
  const [activeTab, setActiveTab] = useState<'forward' | 'backward'>('forward');
  const [traceData, setTraceData] = useState<TraceNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([batchId]));

  useEffect(() => {
    if (isOpen) {
      fetchTraceData();
    }
  }, [isOpen, activeTab, batchId]);

  const fetchTraceData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = activeTab === 'forward' 
        ? `/api/batches/${batchId}/trace-forward`
        : `/api/batches/${batchId}/trace-backward`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch trace data');
      }

      const data = await response.json();
      setTraceData(data.trace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load traceability data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      split: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      reworked: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
      on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
  };

  const renderBatchNode = (node: TraceNode, level: number = 0, isLast: boolean = false) => {
    const isExpanded = expandedNodes.has(node.batch.id);
    const hasChildren = (node.subBatches && node.subBatches.length > 0) || 
                        (node.assemblies && node.assemblies.length > 0) ||
                        (node.componentBatches && node.componentBatches.length > 0);

    return (
      <div key={node.batch.id} className={`${level > 0 ? 'ml-6' : ''}`}>
        {/* Batch Node */}
        <div 
          className={`card p-4 mb-2 hover:shadow-md transition-shadow cursor-pointer ${
            node.batch.id === batchId ? 'ring-2 ring-primary-500' : ''
          }`}
          onClick={() => hasChildren && toggleNode(node.batch.id)}
        >
          <div className="flex items-start gap-3">
            {/* Expand/Collapse Icon */}
            <div className="flex-shrink-0 mt-1">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-tertiary" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-tertiary" />
                )
              ) : (
                <Package className="w-5 h-5 text-tertiary" />
              )}
            </div>

            {/* Batch Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="font-bold text-primary">{node.batch.batchCode}</h4>
                  <p className="text-sm text-tertiary">{node.batch.sku.skuCode} - {node.batch.project.name}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(node.batch.status)}`}>
                  {node.batch.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-tertiary">Current:</span>
                  <span className="ml-1 font-medium text-primary">{node.batch.currentQty}</span>
                </div>
                <div>
                  <span className="text-tertiary">Target:</span>
                  <span className="ml-1 font-medium text-primary">{node.batch.targetQty}</span>
                </div>
                {node.batch.rejectedQty && node.batch.rejectedQty > 0 && (
                  <div>
                    <span className="text-tertiary">Rejected:</span>
                    <span className="ml-1 font-medium text-error-600">{node.batch.rejectedQty}</span>
                  </div>
                )}
              </div>

              {/* Station */}
              {node.batch.station && (
                <p className="text-xs text-tertiary mt-2">
                  Station: {node.batch.station.name}
                </p>
              )}

              {/* Badges */}
              <div className="flex gap-2 mt-2">
                {node.batch.isRejection && (
                  <span className="px-2 py-0.5 bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-300 rounded text-xs font-medium">
                    Rejection
                  </span>
                )}
                {node.batch.isAssembly && (
                  <span className="px-2 py-0.5 bg-info-100 text-info-700 dark:bg-info-900/20 dark:text-info-300 rounded text-xs font-medium">
                    Assembly
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Material Lots (Backward trace only) */}
        {isExpanded && node.materialLots && node.materialLots.length > 0 && (
          <div className="ml-6 mb-2">
            <div className="card bg-slate-50 dark:bg-slate-900 p-3">
              <h5 className="text-xs font-semibold text-secondary mb-2 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Material Lots Used
              </h5>
              <div className="space-y-1">
                {node.materialLots.map((lot, idx) => (
                  <div key={idx} className="text-xs flex justify-between items-center">
                    <span className="text-primary font-medium">{lot.lotNumber}</span>
                    <span className="text-tertiary">{lot.materialName}: {lot.quantityUsed} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Children Nodes */}
        {isExpanded && (
          <>
            {/* Parent Batch (Backward trace) */}
            {node.parentBatch && (
              <div className="ml-6 mb-2">
                <p className="text-xs font-semibold text-secondary mb-1 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  Parent Batch
                </p>
                {renderBatchNode(node.parentBatch, level + 1)}
              </div>
            )}

            {/* Component Batches (Backward trace) */}
            {node.componentBatches && node.componentBatches.length > 0 && (
              <div className="ml-6 mb-2">
                <p className="text-xs font-semibold text-secondary mb-1 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Component Batches ({node.componentBatches.length})
                </p>
                {node.componentBatches.map((child, idx) => 
                  renderBatchNode(child, level + 1, idx === node.componentBatches!.length - 1)
                )}
              </div>
            )}

            {/* Sub-Batches (Forward trace) */}
            {node.subBatches && node.subBatches.length > 0 && (
              <div className="ml-6 mb-2">
                <p className="text-xs font-semibold text-secondary mb-1 flex items-center gap-1">
                  <ArrowDown className="w-3 h-3" />
                  Sub-Batches ({node.subBatches.length})
                </p>
                {node.subBatches.map((child, idx) => 
                  renderBatchNode(child, level + 1, idx === node.subBatches!.length - 1)
                )}
              </div>
            )}

            {/* Assemblies (Forward trace) */}
            {node.assemblies && node.assemblies.length > 0 && (
              <div className="ml-6 mb-2">
                <p className="text-xs font-semibold text-secondary mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Assembled Into ({node.assemblies.length})
                </p>
                {node.assemblies.map((child, idx) => 
                  renderBatchNode(child, level + 1, idx === node.assemblies!.length - 1)
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 w-full md:max-w-4xl md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Batch Traceability</h2>
                <p className="text-sm text-white/80">{batchCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('forward')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'forward'
                  ? 'bg-white text-primary-600'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowDown className="w-4 h-4" />
                <span>Forward Trace</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('backward')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'backward'
                  ? 'bg-white text-primary-600'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowUp className="w-4 h-4" />
                <span>Backward Trace</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
            </div>
          ) : traceData ? (
            <div>
              {/* Info Banner */}
              <div className="mb-4 p-4 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg">
                <p className="text-sm text-info-800 dark:text-info-200">
                  {activeTab === 'forward' ? (
                    <>
                      <strong>Forward Traceability:</strong> Shows where this batch went (sub-batches, assemblies, lots).
                      Click nodes to expand and see downstream batches.
                    </>
                  ) : (
                    <>
                      <strong>Backward Traceability:</strong> Shows where this batch came from (parent batch, components, materials).
                      Click nodes to expand and see source materials.
                    </>
                  )}
                </p>
              </div>

              {/* Tree View */}
              {renderBatchNode(traceData)}
            </div>
          ) : (
            <div className="text-center py-12 text-tertiary">
              No traceability data available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="btn-ghost w-full touch-target"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchTraceabilityModal;

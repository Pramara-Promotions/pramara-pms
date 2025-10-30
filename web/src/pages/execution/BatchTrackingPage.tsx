import { useState, useEffect } from 'react';
import { listProjects, listProjectSkus } from '../../lib/services/projects';
import { listBatches, getBatchAnalytics, createBatch } from '../../lib/services/batches';
import { Plus, Package, TrendingUp, AlertCircle, CheckCircle, MapPin, Clock, QrCode, MoveRight, FileText, Scissors, AlertTriangle, GitBranch, Boxes } from 'lucide-react';
import QRCodeDisplay from '../../components/batch/QRCodeDisplay';
import QRCodeModal from '../../components/batch/QRCodeModal';
import FloatingScanButton from '../../components/batch/FloatingScanButton';
import BatchMovementModal from '../../components/batch/BatchMovementModal';
import BatchDetailModal from '../../components/batch/BatchDetailModal';
import SplitBatchModal from '../../components/batch/SplitBatchModal';
import RejectionModal from '../../components/batch/RejectionModal';
import BatchTraceabilityModal from '../../components/batch/BatchTraceabilityModal';
import { AssemblyModal } from '../../components/batch/AssemblyModal';

interface Batch {
  id: string;
  batchCode: string;
  projectId: number;
  poNumber: string | null;
  projectSkuId: number;
  targetQty: number;
  currentQty: number;
  rejectedQty: number;
  currentStationId: number | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  qrCodeUrl?: string;
  qrCodeDataURL?: string;
  Project: { id: number; name: string };
  ProjectSku: { id: number; skuCode: string; name: string };
  Station: { id: number; name: string; code: string } | null;
  _count: {
    BatchMovement: number;
    QCSubmission: number;
    wipLedgers: number;
  };
}

interface BatchAnalytics {
  totalBatches: number;
  byStatus: Record<string, number>;
  totalTarget: number;
  totalProduced: number;
  totalRejected: number;
  completionRate: number;
  avgProduced: number;
}

const BatchTrackingPage = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [analytics, setAnalytics] = useState<BatchAnalytics | null>(null);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [projectSkus, setProjectSkus] = useState<Array<{ id: number; skuCode: string; name: string }>>([]);
  const [stations, setStations] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedQRBatch, setSelectedQRBatch] = useState<Batch | null>(null);
  const [selectedMovementBatch, setSelectedMovementBatch] = useState<Batch | null>(null);
  const [selectedDetailBatch, setSelectedDetailBatch] = useState<string | null>(null);
  const [selectedSplitBatch, setSelectedSplitBatch] = useState<Batch | null>(null);
  const [selectedRejectionBatch, setSelectedRejectionBatch] = useState<Batch | null>(null);
  const [selectedTraceabilityBatch, setSelectedTraceabilityBatch] = useState<Batch | null>(null);
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    projectSkuId: '',
    poNumber: '',
    targetQty: 0,
    batchCode: '',
  });

  const statusOptions = [
    { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
    { value: 'on_hold', label: 'On Hold', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700' },
    { value: 'cancelled', label: 'Cancelled', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
  ];

  useEffect(() => {
    fetchBatches();
    fetchAnalytics();
    fetchProjects();
    fetchStations();
  }, [projectFilter, statusFilter]);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      if (response.ok) {
        const data = await response.json();
        setStations(data || []);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const data = await listBatches({ projectId: projectFilter, status: statusFilter });
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await getBatchAnalytics({ projectId: projectFilter });
      setAnalytics(data || null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const rows = await listProjects();
      setProjects(rows || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProjectSkus = async (projectId: number) => {
    try {
      const rows = await listProjectSkus(projectId);
      setProjectSkus(rows || []);
    } catch (error) {
      console.error('Error fetching project SKUs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createBatch({
        projectId: formData.projectId,
        projectSkuId: formData.projectSkuId,
        batchCode: formData.batchCode,
        targetQty: formData.targetQty,
      });

      {
        setIsModalOpen(false);
        resetForm();
        fetchBatches();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      alert('Failed to create batch');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      projectSkuId: '',
      poNumber: '',
      targetQty: 0,
      batchCode: '',
    });
    setProjectSkus([]);
  };

  const handleProjectChange = (projectId: string) => {
    setFormData({ ...formData, projectId, projectSkuId: '' });
    if (projectId) fetchProjectSkus(parseInt(projectId));
    else setProjectSkus([]);
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const handlePrintHandover = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const printWindow = window.open(`/api/batches/${batchId}/handover-sheet`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleSplitBatch = (batch: Batch, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSplitBatch(batch);
  };

  const handleRejectBatch = (batch: Batch, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRejectionBatch(batch);
  };

  const handleTraceability = (batch: Batch, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTraceabilityBatch(batch);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-blue-600" size={32} />
            Batch Tracking
          </h1>
          <p className="text-gray-600 mt-1">Monitor batch production and genealogy</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAssemblyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Boxes size={20} />
            Create Assembly
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            New Batch
          </button>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalBatches}</p>
              </div>
              <Package className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Target Qty</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalTarget}</p>
              </div>
              <TrendingUp className="text-gray-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Produced</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.totalProduced}</p>
              </div>
              <CheckCircle className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.completionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{analytics.totalRejected}</p>
              </div>
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No batches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => {
            const statusConfig = getStatusConfig(batch.status);
            const StatusIcon = statusConfig.icon;
            const completionPercent = batch.targetQty > 0 ? (batch.currentQty / batch.targetQty) * 100 : 0;
            return (
              <div 
                key={batch.id} 
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-5 cursor-pointer"
                onClick={() => setSelectedTraceabilityBatch(batch)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{batch.batchCode}</h3>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{batch.Project.name}</p>
                    <p className="text-sm text-gray-600">SKU: {batch.ProjectSku.skuCode}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      Click to view traceability
                    </p>
                  </div>
                  
                  {/* QR Code Preview Button */}
                  {batch.qrCodeDataURL && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQRBatch(batch);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                      title="View QR Code"
                    >
                      <QrCode className="w-5 h-5 text-slate-600 group-hover:text-primary-600 transition-colors" />
                    </button>
                  )}
                </div>

                {batch.poNumber && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600">PO Number</p>
                    <p className="text-sm font-medium">{batch.poNumber}</p>
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{batch.currentQty} / {batch.targetQty}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${completionPercent >= 100 ? 'bg-green-600' : completionPercent >= 75 ? 'bg-blue-600' : 'bg-yellow-600'}`}
                      style={{ width: `${Math.min(completionPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{completionPercent.toFixed(1)}% Complete</p>
                </div>

                {batch.Station && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                    <MapPin size={14} />
                    <span>Current: {batch.Station.name}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-3 border-t text-xs">
                  <div className="text-center">
                    <p className="text-gray-600">Movements</p>
                    <p className="font-bold">{batch._count.BatchMovement}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">QC Checks</p>
                    <p className="font-bold">{batch._count.QCSubmission}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">WIP Logs</p>
                    <p className="font-bold">{batch._count.wipLedgers}</p>
                  </div>
                </div>

                {batch.rejectedQty > 0 && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                    <p className="text-red-600 font-medium">Rejected: {batch.rejectedQty}</p>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Created: {new Date(batch.createdAt).toLocaleDateString()}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMovementBatch(batch);
                    }}
                    className="btn-primary flex items-center justify-center gap-2 text-sm touch-target"
                  >
                    <MoveRight className="w-4 h-4" />
                    <span className="hidden sm:inline">Log Movement</span>
                    <span className="sm:hidden">Move</span>
                  </button>
                  <button
                    onClick={(e) => handleRejectBatch(batch, e)}
                    className="btn-primary bg-error-600 hover:bg-error-700 flex items-center justify-center gap-2 text-sm touch-target"
                    title="Report Rejection"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Report Rejection</span>
                    <span className="sm:hidden">Reject</span>
                  </button>
                  <button
                    onClick={(e) => handleSplitBatch(batch, e)}
                    className="btn-gradient flex items-center justify-center gap-2 text-sm touch-target"
                    title="Split into Sub-Batches"
                    disabled={batch.status === 'split'}
                  >
                    <Scissors className="w-4 h-4" />
                    <span className="hidden sm:inline">Split Batch</span>
                    <span className="sm:hidden">Split</span>
                  </button>
                  <button
                    onClick={(e) => handlePrintHandover(batch.id, e)}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm touch-target"
                    title="Print Handover Sheet"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Print Sheet</span>
                    <span className="sm:hidden">Print</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">New Batch</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Project *</label>
                  <select required value={formData.projectId} onChange={(e) => handleProjectChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SKU *</label>
                  <select required value={formData.projectSkuId} onChange={(e) => setFormData({ ...formData, projectSkuId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" disabled={!formData.projectId}>
                    <option value="">Select SKU</option>
                    {projectSkus.map((s: any) => <option key={s.id} value={s.id}>{s.skuCode} - {s.skuName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Batch Code</label>
                  <input type="text" value={formData.batchCode} onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Auto-generated if empty" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">PO Number</label>
                  <input type="text" value={formData.poNumber} onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="PO-12345" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Target Quantity *</label>
                  <input required type="number" min="1" value={formData.targetQty} onChange={(e) => setFormData({ ...formData, targetQty: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Creating...' : 'Create Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedQRBatch && selectedQRBatch.qrCodeDataURL && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setSelectedQRBatch(null)}
          qrCodeDataURL={selectedQRBatch.qrCodeDataURL}
          batchCode={selectedQRBatch.batchCode}
          batchId={selectedQRBatch.id}
        />
      )}

      {/* Batch Movement Modal */}
      {selectedMovementBatch && (
        <BatchMovementModal
          isOpen={true}
          onClose={() => setSelectedMovementBatch(null)}
          onSuccess={() => {
            fetchBatches();
            fetchAnalytics();
          }}
          batchId={selectedMovementBatch.id}
          batchCode={selectedMovementBatch.batchCode}
          currentStationId={selectedMovementBatch.currentStationId}
          currentQty={selectedMovementBatch.currentQty}
          stations={stations}
        />
      )}

      {/* Batch Detail Modal */}
      {selectedDetailBatch && (
        <BatchDetailModal
          isOpen={true}
          onClose={() => setSelectedDetailBatch(null)}
          batchId={selectedDetailBatch}
        />
      )}

      {/* Split Batch Modal */}
      {selectedSplitBatch && (
        <SplitBatchModal
          isOpen={true}
          onClose={() => setSelectedSplitBatch(null)}
          onSuccess={() => {
            fetchBatches();
            fetchAnalytics();
            setSelectedSplitBatch(null);
          }}
          batchId={selectedSplitBatch.id}
          batchCode={selectedSplitBatch.batchCode}
          currentQty={selectedSplitBatch.currentQty}
          projectName={selectedSplitBatch.Project.name}
          skuCode={selectedSplitBatch.ProjectSku.skuCode}
        />
      )}

      {/* Rejection Modal */}
      {selectedRejectionBatch && (
        <RejectionModal
          isOpen={true}
          onClose={() => setSelectedRejectionBatch(null)}
          onSuccess={() => {
            fetchBatches();
            fetchAnalytics();
            setSelectedRejectionBatch(null);
          }}
          batchId={selectedRejectionBatch.id}
          batchCode={selectedRejectionBatch.batchCode}
          currentQty={selectedRejectionBatch.currentQty}
          projectName={selectedRejectionBatch.Project.name}
          skuCode={selectedRejectionBatch.ProjectSku.skuCode}
          operatorId={1}
          stations={stations}
        />
      )}

      {/* Batch Traceability Modal */}
      {selectedTraceabilityBatch && (
        <BatchTraceabilityModal
          isOpen={true}
          onClose={() => setSelectedTraceabilityBatch(null)}
          batchId={selectedTraceabilityBatch.id}
          batchCode={selectedTraceabilityBatch.batchCode}
        />
      )}

      {/* Assembly Modal */}
      {isAssemblyModalOpen && projectFilter && (
        <AssemblyModal
          isOpen={true}
          onClose={() => setIsAssemblyModalOpen(false)}
          projectId={projectFilter}
          onAssemblyCreated={() => {
            fetchBatches();
            fetchAnalytics();
            setIsAssemblyModalOpen(false);
          }}
        />
      )}

      {!projectFilter && isAssemblyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Project First</h3>
            <p className="text-gray-600 mb-6">
              Please select a project from the filter dropdown before creating an assembly.
            </p>
            <button
              onClick={() => setIsAssemblyModalOpen(false)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Floating Scan Button */}
      <FloatingScanButton 
        stations={stations}
        openMovementModal={true}
      />
    </div>
  );
};

export default BatchTrackingPage;

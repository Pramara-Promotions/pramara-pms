import React, { useState, useEffect } from 'react';
import { X, MapPin, Package, Calendar, User, FileText, Image as ImageIcon, TrendingUp, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface BatchMovement {
  id: string;
  batchId: string;
  fromStationId: number | null;
  toStationId: number;
  qty: number;
  operatorId: string;
  condition: string;
  notes: string | null;
  photos: string[];
  timestamp: string;
  Station_BatchMovement_fromStationIdToStation: { id: number; name: string; code: string } | null;
  Station_BatchMovement_toStationIdToStation: { id: number; name: string; code: string };
}

interface BatchDetails {
  id: string;
  batchCode: string;
  projectId: number;
  poNumber: string | null;
  targetQty: number;
  currentQty: number;
  rejectedQty: number;
  currentStationId: number | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
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

interface BatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
}

const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  isOpen,
  onClose,
  batchId
}) => {
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [movements, setMovements] = useState<BatchMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMovement, setExpandedMovement] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'photos' | 'stats'>('timeline');

  useEffect(() => {
    if (isOpen && batchId) {
      fetchBatchDetails();
      fetchMovements();
    }
  }, [isOpen, batchId]);

  const fetchBatchDetails = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}`);
      if (response.ok) {
        const data = await response.json();
        setBatch(data);
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
    }
  };

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/batches/${batchId}/movements?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConditionStyles = (condition: string) => {
    switch (condition) {
      case 'good':
        return 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-300';
      case 'damaged':
        return 'bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300';
      case 'rejected':
        return 'bg-error-100 dark:bg-error-900/20 text-error-700 dark:text-error-300';
      case 'rework':
        return 'bg-info-100 dark:bg-info-900/20 text-info-700 dark:text-info-300';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getAllPhotos = () => {
    return movements.flatMap(m => m.photos || []);
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
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{batch?.batchCode || 'Loading...'}</h2>
                <p className="text-sm text-white/80">{batch?.Project.name} - {batch?.ProjectSku.skuCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'timeline'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Timeline ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'photos'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Photos ({getAllPhotos().length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Stats
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {movements.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-secondary">No movements recorded yet</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                      {movements.map((movement, index) => {
                        const isExpanded = expandedMovement === movement.id;
                        return (
                          <div key={movement.id} className="relative pl-16 pb-8">
                            {/* Timeline dot */}
                            <div className={`absolute left-3.5 w-5 h-5 rounded-full border-4 border-white dark:border-slate-800 ${
                              movement.condition === 'good' ? 'bg-success-500' :
                              movement.condition === 'damaged' ? 'bg-warning-500' :
                              movement.condition === 'rejected' ? 'bg-error-500' :
                              movement.condition === 'rework' ? 'bg-info-500' :
                              'bg-slate-500'
                            }`}></div>

                            {/* Movement card */}
                            <div className="card hover:shadow-lg transition-shadow">
                              <div className="p-4">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <MapPin className="w-4 h-4 text-primary-600" />
                                      <span className="font-semibold text-primary">
                                        {movement.Station_BatchMovement_fromStationIdToStation?.name || 'Start'} 
                                        {' → '}
                                        {movement.Station_BatchMovement_toStationIdToStation.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-secondary">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {new Date(movement.timestamp).toLocaleString()}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" />
                                        {movement.qty} units
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConditionStyles(movement.condition)}`}>
                                    {movement.condition}
                                  </span>
                                </div>

                                {/* Photos preview */}
                                {movement.photos && movement.photos.length > 0 && (
                                  <div className="flex gap-2 mb-3 overflow-x-auto">
                                    {movement.photos.slice(0, 3).map((photo, photoIndex) => (
                                      <img
                                        key={photoIndex}
                                        src={photo}
                                        alt={`Movement photo ${photoIndex + 1}`}
                                        className="w-16 h-16 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => setLightboxPhoto(photo)}
                                      />
                                    ))}
                                    {movement.photos.length > 3 && (
                                      <div className="w-16 h-16 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-xs font-medium">
                                        +{movement.photos.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Notes */}
                                {movement.notes && (
                                  <div className="mb-3">
                                    <button
                                      onClick={() => setExpandedMovement(isExpanded ? null : movement.id)}
                                      className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>Notes</span>
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {isExpanded && (
                                      <p className="mt-2 text-sm text-secondary bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                                        {movement.notes}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Operator */}
                                <div className="flex items-center gap-2 text-xs text-tertiary">
                                  <User className="w-3 h-3" />
                                  <span>Operator: {movement.operatorId}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Photos Tab */}
              {activeTab === 'photos' && (
                <div>
                  {getAllPhotos().length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-secondary">No photos attached yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {getAllPhotos().map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform shadow-md"
                          onClick={() => setLightboxPhoto(photo)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && batch && (
                <div className="space-y-6">
                  {/* Production Stats */}
                  <div className="card">
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-primary mb-4">Production Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-secondary">Target Qty</p>
                          <p className="text-2xl font-bold text-primary">{batch.targetQty}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary">Current Qty</p>
                          <p className="text-2xl font-bold text-info-600">{batch.currentQty}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary">Rejected</p>
                          <p className="text-2xl font-bold text-error-600">{batch.rejectedQty}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary">Completion</p>
                          <p className="text-2xl font-bold text-success-600">
                            {((batch.currentQty / batch.targetQty) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div className="card">
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-primary mb-4">Activity Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <MapPin className="w-8 h-8 text-primary-600" />
                          <div>
                            <p className="text-sm text-secondary">Movements</p>
                            <p className="text-xl font-bold text-primary">{batch._count.BatchMovement}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <CheckCircle2 className="w-8 h-8 text-success-600" />
                          <div>
                            <p className="text-sm text-secondary">QC Checks</p>
                            <p className="text-xl font-bold text-primary">{batch._count.QCSubmission}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <TrendingUp className="w-8 h-8 text-info-600" />
                          <div>
                            <p className="text-sm text-secondary">WIP Logs</p>
                            <p className="text-xl font-bold text-primary">{batch._count.wipLedgers}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Batch Info */}
                  <div className="card">
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-primary mb-4">Batch Information</h3>
                      <div className="space-y-3">
                        {batch.poNumber && (
                          <div className="flex justify-between">
                            <span className="text-secondary">PO Number:</span>
                            <span className="font-medium text-primary">{batch.poNumber}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-secondary">Status:</span>
                          <span className="font-medium text-primary capitalize">{batch.status.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary">Current Station:</span>
                          <span className="font-medium text-primary">{batch.Station?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary">Created:</span>
                          <span className="font-medium text-primary">{new Date(batch.createdAt).toLocaleString()}</span>
                        </div>
                        {batch.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-secondary">Completed:</span>
                            <span className="font-medium text-primary">{new Date(batch.completedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default BatchDetailModal;

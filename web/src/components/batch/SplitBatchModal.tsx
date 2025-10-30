import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, Scissors, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SubBatchInput {
  identifier: string;
  quantity: number;
  notes?: string;
}

interface SplitBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  batchId: string;
  batchCode: string;
  currentQty: number;
  projectName: string;
  skuCode: string;
}

const SplitBatchModal: React.FC<SplitBatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  batchCode,
  currentQty,
  projectName,
  skuCode
}) => {
  const [subBatches, setSubBatches] = useState<SubBatchInput[]>([
    { identifier: 'TRAY-01', quantity: 0, notes: '' },
    { identifier: 'TRAY-02', quantity: 0, notes: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalQuantity = subBatches.reduce((sum, sb) => sum + (Number(sb.quantity) || 0), 0);
  const remainingQty = currentQty - totalQuantity;
  const isValid = totalQuantity > 0 && totalQuantity <= currentQty && 
                  subBatches.every(sb => sb.identifier.trim() && Number(sb.quantity) > 0);

  const addSubBatch = () => {
    const nextNumber = subBatches.length + 1;
    setSubBatches([
      ...subBatches,
      { identifier: `TRAY-${String(nextNumber).padStart(2, '0')}`, quantity: 0, notes: '' }
    ]);
  };

  const removeSubBatch = (index: number) => {
    if (subBatches.length > 1) {
      setSubBatches(subBatches.filter((_, i) => i !== index));
    }
  };

  const updateSubBatch = (index: number, field: keyof SubBatchInput, value: string | number) => {
    const updated = [...subBatches];
    updated[index] = { ...updated[index], [field]: value };
    setSubBatches(updated);
  };

  const distributeEvenly = () => {
    const qtyPerBatch = Math.floor(currentQty / subBatches.length);
    const remainder = currentQty % subBatches.length;
    
    const updated = subBatches.map((sb, index) => ({
      ...sb,
      quantity: qtyPerBatch + (index < remainder ? 1 : 0)
    }));
    
    setSubBatches(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!isValid) {
      setError('Please fill all fields with valid quantities');
      return;
    }

    // Check for duplicate identifiers
    const identifiers = subBatches.map(sb => sb.identifier.trim().toUpperCase());
    const uniqueIdentifiers = new Set(identifiers);
    if (identifiers.length !== uniqueIdentifiers.size) {
      setError('Sub-batch identifiers must be unique');
      return;
    }

    if (totalQuantity > currentQty) {
      setError(`Total quantity (${totalQuantity}) exceeds batch quantity (${currentQty})`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/batches/${batchId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subBatches: subBatches.map(sb => ({
            identifier: sb.identifier.trim(),
            quantity: Number(sb.quantity),
            notes: sb.notes || null
          }))
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to split batch');
      }

      const result = await response.json();
      
      setSuccess(true);
      
      // Auto-close after showing success
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to split batch';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 w-full md:max-w-3xl md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Split Batch into Sub-Batches</h2>
                <p className="text-sm text-white/80">{batchCode} - {projectName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-success-50 dark:bg-success-900/20 border-b border-success-200 dark:border-success-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-600 dark:text-success-400" />
              <p className="text-sm font-medium text-success-800 dark:text-success-200">
                Successfully split batch into {subBatches.length} sub-batches!
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
            </div>
          )}

          {/* Parent Batch Info */}
          <div className="card bg-slate-50 dark:bg-slate-900">
            <div className="p-4">
              <h3 className="text-sm font-medium text-secondary mb-3">Parent Batch</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-tertiary">SKU:</span>
                  <span className="ml-2 font-medium text-primary">{skuCode}</span>
                </div>
                <div>
                  <span className="text-tertiary">Available Qty:</span>
                  <span className="ml-2 font-medium text-primary">{currentQty} units</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Summary */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-tertiary">Total Allocated</p>
                <p className={`text-2xl font-bold ${totalQuantity > currentQty ? 'text-error-600' : 'text-primary-600'}`}>
                  {totalQuantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-tertiary">Remaining</p>
                <p className={`text-2xl font-bold ${remainingQty < 0 ? 'text-error-600' : remainingQty === 0 ? 'text-success-600' : 'text-warning-600'}`}>
                  {remainingQty}
                </p>
              </div>
              <div>
                <p className="text-xs text-tertiary">Sub-Batches</p>
                <p className="text-2xl font-bold text-info-600">{subBatches.length}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={distributeEvenly}
              className="btn-secondary text-sm"
              disabled={isLoading}
            >
              Distribute Evenly
            </button>
          </div>

          {/* Sub-Batches List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-secondary">Sub-Batches (Trays/Boxes)</h3>
              <button
                type="button"
                onClick={addSubBatch}
                className="btn-ghost text-sm flex items-center gap-2"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4" />
                Add Sub-Batch
              </button>
            </div>

            {subBatches.map((subBatch, index) => (
              <div key={index} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Identifier */}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Identifier <span className="text-error-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={subBatch.identifier}
                        onChange={(e) => updateSubBatch(index, 'identifier', e.target.value.toUpperCase())}
                        placeholder="TRAY-01"
                        className="input-gradient w-full text-sm"
                        disabled={isLoading}
                        required
                      />
                      <p className="text-xs text-tertiary mt-1">
                        → {batchCode}-{subBatch.identifier || '...'}
                      </p>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Quantity <span className="text-error-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={subBatch.quantity || ''}
                        onChange={(e) => updateSubBatch(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="input-gradient w-full text-sm"
                        disabled={isLoading}
                        required
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={subBatch.notes || ''}
                        onChange={(e) => updateSubBatch(index, 'notes', e.target.value)}
                        placeholder="Optional"
                        className="input-gradient w-full text-sm"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  {subBatches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubBatch(index)}
                      className="p-2 hover:bg-error-100 dark:hover:bg-error-900/20 rounded-lg transition-colors text-error-600"
                      disabled={isLoading}
                      title="Remove sub-batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Validation Warning */}
          {totalQuantity > currentQty && (
            <div className="flex items-start gap-3 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-error-800 dark:text-error-200">
                Total quantity exceeds available quantity by {totalQuantity - currentQty} units
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 touch-target"
              disabled={isLoading || success}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1 flex items-center justify-center gap-2 touch-target"
              disabled={isLoading || !isValid || success}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Splitting...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5" />
                  <span>Split Batch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitBatchModal;

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Scan } from 'lucide-react';

interface SourceBatch {
  batchId: string;
  batchCode: string;
  skuName: string;
  availableQty: number;
  quantityUsed: number;
  error?: string;
}

interface AssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onAssemblyCreated: () => void;
}

export function AssemblyModal({ isOpen, onClose, projectId, onAssemblyCreated }: AssemblyModalProps) {
  const [sourceBatches, setSourceBatches] = useState<SourceBatch[]>([]);
  const [outputSkuId, setOutputSkuId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('');
  const [assemblyStationId, setAssemblyStationId] = useState('');
  const [notes, setNotes] = useState('');
  const [operatorId, setOperatorId] = useState('');
  
  const [availableSkus, setAvailableSkus] = useState<any[]>([]);
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanningForIndex, setScanningForIndex] = useState<number | null>(null);

  // Fetch available SKUs, stations, and batches
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen, projectId]);

  const fetchDropdownData = async () => {
    try {
      const [skusRes, stationsRes, batchesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/skus`),
        fetch(`/api/stations?projectId=${projectId}`),
        fetch(`/api/batches?projectId=${projectId}&status=active`)
      ]);

      if (skusRes.ok) setAvailableSkus(await skusRes.json());
      if (stationsRes.ok) setAvailableStations(await stationsRes.json());
      if (batchesRes.ok) {
        const batches = await batchesRes.json();
        // Filter batches with available quantity
        setAvailableBatches(batches.filter((b: any) => b.currentQty > 0));
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const addSourceBatch = () => {
    setSourceBatches([...sourceBatches, {
      batchId: '',
      batchCode: '',
      skuName: '',
      availableQty: 0,
      quantityUsed: 0
    }]);
  };

  const removeSourceBatch = (index: number) => {
    setSourceBatches(sourceBatches.filter((_, i) => i !== index));
  };

  const updateSourceBatch = (index: number, field: keyof SourceBatch, value: any) => {
    const updated = [...sourceBatches];
    updated[index] = { ...updated[index], [field]: value };

    // If batch selected, auto-fill details
    if (field === 'batchId' && value) {
      const batch = availableBatches.find(b => b.id === value);
      if (batch) {
        updated[index].batchCode = batch.batchCode;
        updated[index].skuName = batch.ProjectSku?.name || 'Unknown SKU';
        updated[index].availableQty = batch.currentQty;
      }
    }

    // Validate quantity
    if (field === 'quantityUsed') {
      const qty = parseFloat(value);
      if (isNaN(qty) || qty <= 0) {
        updated[index].error = 'Quantity must be positive';
      } else if (qty > updated[index].availableQty) {
        updated[index].error = `Exceeds available: ${updated[index].availableQty}`;
      } else {
        updated[index].error = undefined;
      }
    }

    setSourceBatches(updated);
  };

  const handleScanBatch = async (index: number) => {
    setScanningForIndex(index);
    try {
      // Trigger QR scanner (implementation depends on your scanner component)
      // For now, we'll use a simple prompt
      const scannedCode = prompt('Scan or enter batch code:');
      if (scannedCode) {
        const batch = availableBatches.find(b => b.batchCode === scannedCode);
        if (batch) {
          updateSourceBatch(index, 'batchId', batch.id);
        } else {
          alert('Batch not found or not available');
        }
      }
    } finally {
      setScanningForIndex(null);
    }
  };

  const validateForm = (): string | null => {
    if (!outputSkuId) return 'Output SKU is required';
    if (!outputQuantity || parseFloat(outputQuantity) <= 0) return 'Output quantity must be positive';
    if (!assemblyStationId) return 'Assembly station is required';
    if (!operatorId) return 'Operator ID is required';
    if (sourceBatches.length < 2) return 'At least 2 source batches are required';
    
    for (const batch of sourceBatches) {
      if (!batch.batchId) return 'All source batches must be selected';
      if (batch.quantityUsed <= 0) return 'All source batch quantities must be positive';
      if (batch.error) return batch.error;
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/batches/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          assemblyStationId,
          operatorId,
          sourceBatches: sourceBatches.map(sb => ({
            batchId: sb.batchId,
            quantityUsed: sb.quantityUsed
          })),
          outputQuantity: parseFloat(outputQuantity),
          outputSkuId,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assembly');
      }

      onAssemblyCreated();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create assembly');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSourceBatches([]);
    setOutputSkuId('');
    setOutputQuantity('');
    setAssemblyStationId('');
    setNotes('');
    setOperatorId('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">Create Assembly</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Output Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Assembly Output</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output SKU *
                </label>
                <select
                  value={outputSkuId}
                  onChange={(e) => setOutputSkuId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select SKU...</option>
                  {availableSkus.map(sku => (
                    <option key={sku.id} value={sku.id}>
                      {sku.code} - {sku.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Quantity *
                </label>
                <input
                  type="number"
                  value={outputQuantity}
                  onChange={(e) => setOutputQuantity(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assembly Station *
                </label>
                <select
                  value={assemblyStationId}
                  onChange={(e) => setAssemblyStationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Station...</option>
                  {availableStations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.code} - {station.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator ID *
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter operator ID"
                />
              </div>
            </div>
          </div>

          {/* Source Batches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Source Batches (min. 2 required)
              </h3>
              <button
                onClick={addSourceBatch}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Batch
              </button>
            </div>

            {sourceBatches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No source batches added yet. Click "Add Batch" to start.
              </div>
            ) : (
              <div className="space-y-3">
                {sourceBatches.map((batch, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Batch {index + 1}
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={batch.batchId}
                            onChange={(e) => updateSourceBatch(index, 'batchId', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Select batch...</option>
                            {availableBatches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.batchCode} - {b.ProjectSku?.name || 'Unknown'} (Qty: {b.currentQty})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleScanBatch(index)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Scan QR Code"
                          >
                            <Scan className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                        {batch.batchCode && (
                          <div className="mt-1 text-sm text-gray-600">
                            SKU: {batch.skuName} | Available: {batch.availableQty}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity Used
                        </label>
                        <input
                          type="number"
                          value={batch.quantityUsed || ''}
                          onChange={(e) => updateSourceBatch(index, 'quantityUsed', parseFloat(e.target.value))}
                          min="0"
                          max={batch.availableQty}
                          step="1"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            batch.error ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Qty"
                        />
                        {batch.error && (
                          <div className="mt-1 text-sm text-red-600">{batch.error}</div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeSourceBatch(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove batch"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || sourceBatches.length < 2}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Assembly'}
          </button>
        </div>
      </div>
    </div>
  );
}

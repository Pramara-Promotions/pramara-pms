import React, { useState, useEffect } from 'react';
import { X, Camera, Upload, MapPin, Package, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';

interface Station {
  id: number;
  name: string;
  code: string;
}

interface BatchMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  batchId: string;
  batchCode: string;
  currentStationId: number | null;
  currentQty: number;
  stations: Station[];
  autoPrintHandover?: boolean; // Auto-print handover sheet after successful movement
}

const BatchMovementModal: React.FC<BatchMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  batchCode,
  currentStationId,
  currentQty,
  stations,
  autoPrintHandover = false
}) => {
  const [toStationId, setToStationId] = useState('');
  const [quantity, setQuantity] = useState(currentQty);
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStation = stations.find(s => s.id === currentStationId);

  useEffect(() => {
    if (isOpen) {
      setToStationId('');
      setQuantity(currentQty);
      setCondition('good');
      setNotes('');
      setPhotos([]);
      setError(null);
    }
  }, [isOpen, currentQty]);

  const handlePhotoCapture = async () => {
    try {
      // Create file input for camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment' as any; // Request rear camera
      
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          // Convert to base64 for preview (in production, upload to S3/R2)
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setPhotos(prev => [...prev, base64]);
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Failed to capture photo');
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        
        for (const file of files) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setPhotos(prev => [...prev, base64]);
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!toStationId) {
      setError('Please select a destination station');
      return;
    }

    if (quantity <= 0 || quantity > currentQty) {
      setError(`Quantity must be between 1 and ${currentQty}`);
      return;
    }

    setIsLoading(true);

    try {
      // Submit movement
      const response = await fetch(`/api/batches/${batchId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStationId: parseInt(toStationId),
          quantity,
          condition,
          notes: notes || null,
          photos: photos.length > 0 ? photos : []
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to log movement');
      }

      const result = await response.json();

      // Success - optionally print handover sheet
      if (autoPrintHandover) {
        // Open handover sheet in new window for printing
        setTimeout(() => {
          const printWindow = window.open(`/api/batches/${batchId}/handover-sheet`, '_blank');
          if (printWindow) {
            printWindow.focus();
          }
        }, 500);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to log movement';
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
        className="bg-white dark:bg-slate-800 w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Log Batch Movement</h2>
                <p className="text-sm text-white/80">Batch: {batchCode}</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] md:max-h-[60vh] overflow-y-auto">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
            </div>
          )}

          {/* From Station (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              From Station
            </label>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <p className="font-medium text-primary">
                {currentStation ? `${currentStation.name} (${currentStation.code})` : 'No current station'}
              </p>
            </div>
          </div>

          {/* To Station */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              To Station <span className="text-error-600">*</span>
            </label>
            <select
              required
              value={toStationId}
              onChange={(e) => setToStationId(e.target.value)}
              className="input-gradient w-full"
              disabled={isLoading}
            >
              <option value="">Select destination station</option>
              {stations
                .filter(s => s.id !== currentStationId)
                .map(station => (
                  <option key={station.id} value={station.id}>
                    {station.name} ({station.code})
                  </option>
                ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Quantity <span className="text-error-600">*</span>
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="number"
                required
                min="1"
                max={currentQty}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="input-gradient w-full pl-11"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-tertiary mt-1">Available: {currentQty} units</p>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="input-gradient w-full"
              disabled={isLoading}
            >
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="rejected">Rejected</option>
              <option value="rework">Rework</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about this movement..."
              className="input-gradient w-full resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Photos
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handlePhotoCapture}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 touch-target"
                disabled={isLoading}
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </button>
              <button
                type="button"
                onClick={handlePhotoUpload}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 touch-target"
                disabled={isLoading}
              >
                <Upload className="w-5 h-5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-error-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                <ImageIcon className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-sm text-secondary text-center">No photos attached</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 touch-target"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1 flex items-center justify-center gap-2 touch-target"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  <span>Log Movement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchMovementModal;

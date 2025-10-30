import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, Camera, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  batchId: string;
  batchCode: string;
  currentQty: number;
  projectName: string;
  skuCode: string;
  operatorId: number;
  stations: Array<{ id: number; name: string; code: string }>;
}

const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  batchCode,
  currentQty,
  projectName,
  skuCode,
  operatorId,
  stations
}) => {
  const [formData, setFormData] = useState({
    stationId: '',
    reason: '',
    quantity: 0,
    notes: '',
    reworkRequired: false
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const rejectionReasons = [
    'Defective Material',
    'Manufacturing Defect',
    'Dimensional Error',
    'Surface Damage',
    'Wrong Color/Finish',
    'Assembly Error',
    'Quality Below Standard',
    'Contamination',
    'Incomplete Process',
    'Other'
  ];

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handlePhotoCapture = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      // Capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Convert to base64
      const photoDataURL = canvas.toDataURL('image/jpeg', 0.8);
      setPhotos(prev => [...prev, photoDataURL]);

      // Stop stream
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Failed to access camera');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.stationId) {
      setError('Please select a station');
      return;
    }

    if (!formData.reason) {
      setError('Please select a rejection reason');
      return;
    }

    if (!formData.quantity || formData.quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (formData.quantity > currentQty) {
      setError(`Rejection quantity cannot exceed current quantity (${currentQty})`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/batches/${batchId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId,
          stationId: Number(formData.stationId),
          reason: formData.reason,
          quantity: Number(formData.quantity),
          photos,
          notes: formData.notes || null,
          reworkRequired: formData.reworkRequired
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create rejection batch');
      }

      const result = await response.json();

      setSuccess(true);

      // Auto-close after showing success
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create rejection batch';
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
        className="bg-white dark:bg-slate-800 w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-error-500 to-error-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Report Rejection/Defect</h2>
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
                Rejection batch created successfully!
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
              <XCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
            </div>
          )}

          {/* Batch Info */}
          <div className="card bg-slate-50 dark:bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-secondary mb-2">Batch Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-tertiary">SKU:</span>
                <span className="ml-2 font-medium text-primary">{skuCode}</span>
              </div>
              <div>
                <span className="text-tertiary">Available:</span>
                <span className="ml-2 font-medium text-primary">{currentQty} units</span>
              </div>
            </div>
          </div>

          {/* Station */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Station <span className="text-error-600">*</span>
            </label>
            <select
              value={formData.stationId}
              onChange={(e) => handleInputChange('stationId', e.target.value)}
              className="input-gradient w-full"
              disabled={isLoading}
              required
            >
              <option value="">Select station</option>
              {stations.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </select>
          </div>

          {/* Rejection Reason */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Rejection Reason <span className="text-error-600">*</span>
            </label>
            <select
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className="input-gradient w-full"
              disabled={isLoading}
              required
            >
              <option value="">Select reason</option>
              {rejectionReasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Rejected Quantity <span className="text-error-600">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={currentQty}
              value={formData.quantity || ''}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
              className="input-gradient w-full"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-tertiary mt-1">
              Maximum: {currentQty} units
            </p>
          </div>

          {/* Rework Required */}
          <div className="flex items-center gap-3 p-4 bg-info-50 dark:bg-info-900/20 rounded-lg border border-info-200 dark:border-info-800">
            <input
              type="checkbox"
              id="reworkRequired"
              checked={formData.reworkRequired}
              onChange={(e) => handleInputChange('reworkRequired', e.target.checked)}
              className="w-5 h-5 rounded border-info-300 text-info-600 focus:ring-info-500"
              disabled={isLoading}
            />
            <label htmlFor="reworkRequired" className="text-sm font-medium text-info-800 dark:text-info-200">
              Rework Required (can be fixed and returned to production)
            </label>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Photos (Optional)
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handlePhotoCapture}
                disabled={isLoading || isCapturing}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {isCapturing ? 'Capturing...' : 'Take Photo'}
              </button>
              <label className="btn-ghost text-sm flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <Camera className="w-4 h-4" />
                Upload Photos
              </label>
            </div>

            {/* Photo Thumbnails */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={photo} 
                      alt={`Rejection ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-error-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Describe the defect or rejection reason in detail..."
              rows={3}
              className="input-gradient w-full resize-none"
              disabled={isLoading}
            />
          </div>
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
              className="btn-primary bg-error-600 hover:bg-error-700 flex-1 flex items-center justify-center gap-2 touch-target"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  <span>Report Rejection</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;

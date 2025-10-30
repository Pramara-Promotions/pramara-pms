import React, { useState } from 'react';
import { X, CheckCircle, Loader2, Camera, Trash2, CheckCircle2, XCircle, Wrench } from 'lucide-react';

interface ReworkCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  batchId: string;
  batchCode: string;
  quantity: number;
  rejectionReason: string;
  operatorId: number;
  stations: Array<{ id: number; name: string; code: string }>;
}

const ReworkCompleteModal: React.FC<ReworkCompleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  batchCode,
  quantity,
  rejectionReason,
  operatorId,
  stations
}) => {
  const [formData, setFormData] = useState({
    stationId: '',
    notes: ''
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleInputChange = (field: string, value: string) => {
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

      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const photoDataURL = canvas.toDataURL('image/jpeg', 0.8);
      setPhotos(prev => [...prev, photoDataURL]);

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

    if (!formData.stationId) {
      setError('Please select a station');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/batches/${batchId}/rework-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId,
          stationId: Number(formData.stationId),
          notes: formData.notes || null,
          photos
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete rework');
      }

      const result = await response.json();

      setSuccess(true);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete rework';
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
        className="bg-white dark:bg-slate-800 w-full md:max-w-xl md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-success-500 to-success-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Complete Rework</h2>
                <p className="text-sm text-white/80">{batchCode}</p>
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
                Rework completed successfully!
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

          {/* Rejection Info */}
          <div className="card bg-slate-50 dark:bg-slate-900 p-4">
            <h3 className="text-sm font-medium text-secondary mb-3">Rejection Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-tertiary">Reason:</span>
                <span className="font-medium text-primary">{rejectionReason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tertiary">Quantity:</span>
                <span className="font-medium text-primary">{quantity} units</span>
              </div>
            </div>
          </div>

          {/* Station */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Completion Station <span className="text-error-600">*</span>
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

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Rework Completion Photos (Optional)
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
                      alt={`Rework ${index + 1}`}
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
              Rework Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Describe the rework performed, corrective actions taken..."
              rows={4}
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
              className="btn-primary bg-success-600 hover:bg-success-700 flex-1 flex items-center justify-center gap-2 touch-target"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Complete Rework</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReworkCompleteModal;

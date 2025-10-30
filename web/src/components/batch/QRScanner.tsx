import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string, batch?: any) => void;
  onScanError?: (error: string) => void;
  onClose: () => void;
  autoNavigate?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  autoNavigate = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      setCameraError(null);
      
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use rear camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // Prevent multiple scans
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          try {
            setSuccess('QR Code scanned successfully!');
            
            // Parse the QR code data
            const qrData = JSON.parse(decodedText);
            
            if (qrData.type === 'batch') {
              // Call backend to get batch details
              const response = await fetch('/api/batches/scan-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrData: decodedText })
              });

              if (response.ok) {
                const data = await response.json();
                onScanSuccess(decodedText, data.batch);
              } else {
                throw new Error('Failed to fetch batch details');
              }
            } else {
              onScanSuccess(decodedText);
            }

            // Stop scanner after successful scan
            setTimeout(() => {
              stopScanner();
              onClose();
            }, 1000);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Invalid QR code format';
            setError(errorMsg);
            onScanError?.(errorMsg);
            hasScannedRef.current = false; // Allow retry
            setTimeout(() => setError(null), 3000);
          }
        },
        (errorMessage) => {
          // Ignore common scanning errors (too many to log)
          // Only log actual errors
        }
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start camera';
      setCameraError(errorMsg);
      setIsScanning(false);
      onScanError?.(errorMsg);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      <div className="relative w-full max-w-lg mx-4">
        {/* Close button */}
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg hover:scale-110 transition-transform"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </button>

        {/* Scanner container */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Scan Batch QR Code</h2>
                <p className="text-sm text-secondary">Position QR code within the frame</p>
              </div>
            </div>
          </div>

          {/* Scanner view */}
          <div className="relative p-4 bg-slate-900">
            <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
            
            {/* Scanning overlay */}
            {isScanning && !success && !error && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-primary-500 rounded-lg animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Status messages */}
          <div className="p-4">
            {cameraError && (
              <div className="flex items-start gap-3 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg animate-shake">
                <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-error-800 dark:text-error-200">Camera Error</p>
                  <p className="text-sm text-error-600 dark:text-error-400 mt-1">{cameraError}</p>
                  <p className="text-xs text-error-500 dark:text-error-500 mt-2">
                    Please allow camera access in your browser settings.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg animate-shake">
                <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-error-800 dark:text-error-200">Scan Error</p>
                  <p className="text-sm text-error-600 dark:text-error-400 mt-1">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg animate-bounce-in">
                <CheckCircle2 className="w-5 h-5 text-success-600 dark:text-success-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-success-800 dark:text-success-200">Success!</p>
                  <p className="text-sm text-success-600 dark:text-success-400 mt-1">{success}</p>
                </div>
              </div>
            )}

            {!cameraError && !error && !success && (
              <div className="text-center p-4">
                <p className="text-sm text-secondary">
                  {isScanning ? 'Scanning...' : 'Initializing camera...'}
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-tertiary text-center">
              📱 Tip: Hold your device steady and ensure good lighting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

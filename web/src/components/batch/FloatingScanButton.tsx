import React, { useState } from 'react';
import { ScanLine } from 'lucide-react';
import QRScanner from './QRScanner';
import BatchMovementModal from './BatchMovementModal';
import { useNavigate } from '@tanstack/react-router';

interface FloatingScanButtonProps {
  onScanSuccess?: (decodedText: string, batch?: any) => void;
  autoNavigate?: boolean;
  openMovementModal?: boolean; // New prop to control behavior
  stations?: Array<{ id: number; name: string; code: string }>;
}

const FloatingScanButton: React.FC<FloatingScanButtonProps> = ({
  onScanSuccess,
  autoNavigate = false,
  openMovementModal = true,
  stations = []
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [scannedBatch, setScannedBatch] = useState<any>(null);
  const navigate = useNavigate();

  const handleScanSuccess = (decodedText: string, batch?: any) => {
    if (onScanSuccess) {
      onScanSuccess(decodedText, batch);
    } else if (openMovementModal && batch) {
      // Open movement modal with scanned batch
      setScannedBatch(batch);
      setShowMovementModal(true);
    } else if (autoNavigate && batch) {
      // Navigate to batch detail page
      navigate({ to: `/batches/${batch.id}` });
    }
    setShowScanner(false);
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
  };

  const handleMovementSuccess = () => {
    setShowMovementModal(false);
    setScannedBatch(null);
    // Optionally refresh batch list
  };

  return (
    <>
      {/* Floating action button - visible on mobile */}
      <button
        onClick={() => setShowScanner(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 
                   p-4 btn-primary rounded-full shadow-lg
                   hover:scale-110 active:scale-95 
                   transition-all duration-300 animate-bounce-in
                   touch-target group"
        aria-label="Scan QR code"
      >
        <ScanLine className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
        <span className="sr-only">Scan Batch QR Code</span>
      </button>

      {/* Pulse ring effect */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 
                      w-16 h-16 rounded-full bg-primary-500/30 
                      animate-ping pointer-events-none" />

      {/* Scanner modal */}
      {showScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          onClose={() => setShowScanner(false)}
          autoNavigate={false}
        />
      )}

      {/* Movement modal after successful scan */}
      {showMovementModal && scannedBatch && (
        <BatchMovementModal
          isOpen={true}
          onClose={() => {
            setShowMovementModal(false);
            setScannedBatch(null);
          }}
          onSuccess={handleMovementSuccess}
          batchId={scannedBatch.id}
          batchCode={scannedBatch.batchCode}
          currentStationId={scannedBatch.currentStationId}
          currentQty={scannedBatch.currentQty}
          stations={stations}
        />
      )}
    </>
  );
};

export default FloatingScanButton;


import React from 'react';
import { X } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeDataURL: string;
  batchCode: string;
  batchId: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  qrCodeDataURL,
  batchCode,
  batchId
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="card-glass max-w-md w-full p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gradient-primary">Batch QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="flex justify-center mb-4">
          <QRCodeDisplay
            qrCodeDataURL={qrCodeDataURL}
            batchCode={batchCode}
            batchId={batchId}
            size="lg"
            showActions={true}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <p className="text-sm text-secondary text-center">
            Scan this QR code to quickly access batch details and log movements
          </p>
          <p className="text-xs text-tertiary text-center mt-2">
            Batch ID: {batchId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;

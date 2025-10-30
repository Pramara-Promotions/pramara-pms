import React from 'react';
import { Download, Printer, Share2, Maximize2, FileText } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCodeDataURL: string;
  batchCode: string;
  batchId?: string;
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
  onEnlarge?: () => void;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeDataURL,
  batchCode,
  batchId,
  size = 'md',
  showActions = true,
  onEnlarge
}) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeDataURL;
    link.download = `batch-${batchCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${batchCode}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                text-align: center;
                padding: 20px;
              }
              img {
                max-width: 400px;
                max-height: 400px;
                border: 2px solid #000;
                padding: 10px;
              }
              h2 {
                margin-top: 20px;
                font-size: 24px;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <img src="${qrCodeDataURL}" alt="Batch QR Code" />
              <h2>${batchCode}</h2>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handlePrintHandoverSheet = () => {
    if (!batchId) {
      console.error('Batch ID required for handover sheet');
      return;
    }
    
    // Open handover sheet in new window for printing
    const printWindow = window.open(`/api/batches/${batchId}/handover-sheet`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleShare = async () => {
    if ('share' in navigator) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(qrCodeDataURL);
        const blob = await response.blob();
        const file = new File([blob], `batch-${batchCode}-qr.png`, { type: 'image/png' });
        
        await navigator.share({
          title: `Batch QR Code: ${batchCode}`,
          text: `QR Code for batch ${batchCode}`,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard or download
      handleDownload();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <img
          src={qrCodeDataURL}
          alt={`QR Code for ${batchCode}`}
          className={`${sizeClasses[size]} rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-md transition-all duration-300 hover:shadow-lg`}
        />
        {onEnlarge && (
          <button
            onClick={onEnlarge}
            className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110"
            aria-label="Enlarge QR code"
          >
            <Maximize2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>
        )}
      </div>

      {showActions && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="btn-ghost flex items-center gap-2 text-sm flex-1"
              aria-label="Download QR code"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={handlePrint}
              className="btn-ghost flex items-center gap-2 text-sm flex-1"
              aria-label="Print QR code"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print QR</span>
            </button>

            {'share' in navigator && (
              <button
                onClick={handleShare}
                className="btn-ghost flex items-center gap-2 text-sm md:hidden flex-1"
                aria-label="Share QR code"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
          </div>
          
          {batchId && (
            <button
              onClick={handlePrintHandoverSheet}
              className="btn-primary flex items-center justify-center gap-2 text-sm w-full"
              aria-label="Print handover sheet"
            >
              <FileText className="w-4 h-4" />
              <span>Print Handover Sheet</span>
            </button>
          )}
        </div>
      )}

      <p className="text-sm text-secondary font-medium">{batchCode}</p>
    </div>
  );
};

export default QRCodeDisplay;

// web/src/features/auth/MFASetupModal.tsx
import { useState, useRef } from 'react';
import { MFAAPI } from '../common/api';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
  const [step, setStep] = useState<'start' | 'scan' | 'verify'>('start');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Setup data
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  // Verification
  const [verificationCode, setVerificationCode] = useState('');
  
  const backupCodesRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await MFAAPI.setup();
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setBackupCodes(response.backupCodes);
      setStep('scan');
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await MFAAPI.verify({
        token: verificationCode,
        backupCodes
      });
      
      setStep('verify');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('start');
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
    setVerificationCode('');
    setError('');
    onClose();
  };

  const handlePrintBackupCodes = () => {
    if (backupCodesRef.current) {
      const content = backupCodesRef.current.innerHTML;
      const printWindow = window.open('', '', 'width=600,height=400');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>MFA Backup Codes - Pramara PMS</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1f2937; }
                .code { font-family: monospace; font-size: 18px; padding: 8px; background: #f3f4f6; margin: 4px 0; }
                .warning { background: #fef3c7; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b; }
              </style>
            </head>
            <body>
              <h1>MFA Backup Codes - Pramara PMS</h1>
              <div class="warning">
                <strong>⚠️ Important:</strong> Save these codes in a secure location. Each code can only be used once.
              </div>
              ${content}
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                Generated: ${new Date().toLocaleString()}<br>
                If you lose access to your authenticator app, use one of these codes to log in.
              </p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = `MFA Backup Codes - Pramara PMS
Generated: ${new Date().toLocaleString()}

⚠️ IMPORTANT: Save these codes in a secure location. Each code can only be used once.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

If you lose access to your authenticator app, use one of these codes to log in.
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pramara-mfa-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'start' && 'Enable Two-Factor Authentication'}
            {step === 'scan' && 'Scan QR Code'}
            {step === 'verify' && '✓ MFA Enabled Successfully'}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Start */}
          {step === 'start' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">🔐 Enhanced Security</h3>
                <p className="text-sm text-blue-800">
                  Two-factor authentication adds an extra layer of security to your account. 
                  You'll need both your password and a code from your phone to log in.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">You'll need:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>A smartphone or tablet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>An authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>About 2 minutes to complete setup</span>
                  </li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleStartSetup}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? 'Starting...' : 'Start Setup'}
                </button>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Scan QR Code */}
          {step === 'scan' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Step 1: Scan QR Code</h3>
                <p className="text-sm text-gray-600">
                  Open your authenticator app and scan this QR code:
                </p>
                
                <div className="flex justify-center py-4 bg-gray-50 rounded-lg">
                  {qrCode && <img src={qrCode} alt="MFA QR Code" className="max-w-xs" />}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Can't scan the code?</p>
                  <p className="text-xs text-gray-600 mb-2">Enter this secret key manually:</p>
                  <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
                    {secret}
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Step 2: Verify Setup</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the 6-digit code from your authenticator app:
                  </p>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setVerificationCode(digits.slice(0, 6));
                    }}
                    placeholder="123456"
                    maxLength={6}
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Backup Codes Preview */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">📋 Backup Codes</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Save these codes now. You'll need them if you lose access to your phone.
                  </p>
                  
                  <div ref={backupCodesRef} className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <div key={i} className="font-mono text-sm bg-white px-3 py-2 rounded border border-gray-200">
                          {i + 1}. {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBackupCodes}
                      className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                      📥 Download
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintBackupCodes}
                      className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                      🖨️ Print
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable MFA'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'verify' && (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">MFA Enabled Successfully!</h3>
                <p className="text-gray-600">
                  Your account is now protected with two-factor authentication.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <p className="text-sm text-green-800">
                  <strong>Next time you log in:</strong><br />
                  You'll need both your password and a code from your authenticator app.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

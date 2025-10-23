// web/src/features/auth/MFAVerifyScreen.tsx
import { useState } from 'react';
import { MFAAPI } from '../common/api';

interface MFAVerifyScreenProps {
  tempToken: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export default function MFAVerifyScreen({ 
  tempToken, 
  onSuccess, 
  onCancel 
}: MFAVerifyScreenProps) {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter a verification code');
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await MFAAPI.verifyLogin({
        tempToken,
        totpToken: code.trim(),
        trustDevice
      });

      if (response.ok) {
        onSuccess(response.user);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setCode(''); // Clear code on error
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (useBackupCode) {
      // Backup codes are 8 characters (hex)
      setCode(value.toUpperCase().slice(0, 8));
    } else {
      // TOTP codes are 6 digits
      const digits = value.replace(/\D/g, '');
      setCode(digits.slice(0, 6));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {useBackupCode 
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'
            }
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-8 space-y-6">
          <div>
            <label htmlFor="code" className="sr-only">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              autoComplete="off"
              required
              value={code}
              onChange={handleCodeChange}
              disabled={loading}
              placeholder={useBackupCode ? 'ABC12345' : '123456'}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              style={{ letterSpacing: '0.5em' }}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex items-center">
            <input
              id="trust-device"
              name="trust-device"
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label htmlFor="trust-device" className="ml-2 block text-sm text-gray-900">
              Trust this device for 30 days
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setCode('');
                setError('');
              }}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              {useBackupCode 
                ? '← Use authenticator app instead' 
                : 'Use a backup code →'
              }
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium">Need help?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>Find the entry for "Pramara PMS"</li>
              <li>Enter the 6-digit code shown</li>
              <li>Codes refresh every 30 seconds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

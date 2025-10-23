import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../features/common/AuthProvider';

export default function MFASetup() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const setupToken = sessionStorage.getItem('mfa_setup_token');
    if (!setupToken) {
      nav({ to: '/login', replace: true });
      return;
    }
    
    // Start MFA setup
    async function startSetup() {
      try {
        const res = await fetch('/api/mfa/setup', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${setupToken}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Setup failed');
        
        setQrCode(data.qrDataUrl);
        setSecret(data.base32);
      } catch (e: any) {
        setErr(e.message || 'Failed to start MFA setup');
      }
    }
    
    startSetup();
  }, [nav]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || token.length !== 6) {
      setErr('Please enter a valid 6-digit code');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      const setupToken = sessionStorage.getItem('mfa_setup_token');
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${setupToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ base32: secret, token })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // MFA enabled successfully - clear token and refresh session
      sessionStorage.removeItem('mfa_setup_token');
      await refresh();
      nav({ to: '/', replace: true });
    } catch (e: any) {
      setErr(e.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-50 p-4'>
      <div className='max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8'>
        <div className='text-center mb-6'>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>Set Up Two-Factor Authentication</h1>
          <p className='text-slate-600'>MFA is mandatory for all accounts. Scan the QR code with your authenticator app.</p>
        </div>

        {err && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'>
            {err}
          </div>
        )}

        {qrCode ? (
          <div className='space-y-6'>
            <div className='flex flex-col md:flex-row gap-6 items-center'>
              <div className='flex-shrink-0'>
                <div className='bg-white p-4 border-2 border-slate-200 rounded-xl'>
                  <img src={qrCode} alt='MFA QR Code' className='w-48 h-48' />
                </div>
              </div>
              
              <div className='flex-1 space-y-4'>
                <div>
                  <h3 className='font-semibold text-slate-900 mb-2'>Step 1: Scan QR Code</h3>
                  <p className='text-sm text-slate-600'>
                    Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.) and scan this QR code.
                  </p>
                </div>
                
                <div>
                  <h3 className='font-semibold text-slate-900 mb-2'>Can't scan?</h3>
                  <p className='text-xs text-slate-500 mb-1'>Enter this code manually:</p>
                  <code className='block bg-slate-100 p-2 rounded text-sm font-mono break-all'>
                    {secret}
                  </code>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerify} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>
                  Step 2: Enter 6-digit code from your app
                </label>
                <input
                  type='text'
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder='123456'
                  className='w-full px-4 py-3 text-center text-2xl tracking-widest border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  maxLength={6}
                  required
                />
                <p className='mt-1 text-xs text-slate-500'>Codes refresh every 30 seconds</p>
              </div>

              <button
                type='submit'
                disabled={busy || token.length !== 6}
                className='w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {busy ? 'Verifying...' : 'Verify and Enable MFA'}
              </button>
            </form>

            <div className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
              <h4 className='font-semibold text-blue-900 mb-2'>⚠️ Important</h4>
              <ul className='text-sm text-blue-800 space-y-1'>
                <li>• Keep your authenticator app secure</li>
                <li>• MFA cannot be disabled by you (only admins can disable it)</li>
                <li>• You'll need this code every time you log in</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className='text-center py-8'>
            <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4'></div>
            <p className='text-slate-600'>Generating QR code...</p>
          </div>
        )}
      </div>
    </div>
  );
}

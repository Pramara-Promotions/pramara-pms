import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Shield, ArrowLeft } from 'lucide-react';
import { http } from '../../lib/http';
import loginBg from '../../assets/login-bg.jpg';
import logoImg from '../../assets/logo.png';

/**
 * MFA Verification Page
 * 
 * User lands here after successful email/password login if MFA is enabled.
 * Requires 6-digit TOTP code from authenticator app.
 * 
 * Features:
 * - 6-digit code input with auto-focus and auto-advance
 * - Resend code option (triggers email with backup code)
 * - Back to login button
 * - Error messages for invalid codes
 * - Loading states
 */
export default function MfaVerify() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '__root__' }) as { email?: string; tempToken?: string };
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Redirect if no temp token
  useEffect(() => {
    if (!searchParams.tempToken) {
      navigate({ to: '/login' });
    }
  }, [searchParams.tempToken, navigate]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace: clear current and move to previous
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
    
    // Arrow left/right navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Enter: submit if code complete
    if (e.key === 'Enter' && code.every(digit => digit !== '')) {
      handleVerify(code.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      
      // Auto-submit pasted code
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (codeString: string) => {
    setBusy(true);
    setError(null);

    try {
      const res = await http('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: searchParams.tempToken,
          code: codeString,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Invalid verification code');
      }

      const data = await res.json();

      // Check if password change required
      if (data.mustChangePassword) {
        navigate({ to: '/change-password', replace: true });
        return;
      }

      // Success - redirect to dashboard
      navigate({ to: '/', replace: true });
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      const res = await http('/api/auth/mfa/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: searchParams.tempToken,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to resend code');
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate({ to: '/login' });
  };

  return (
    <div
      className='relative flex min-h-screen items-center justify-center'
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className='absolute inset-0 bg-black/55' />
      
      <div className='relative z-10 w-full max-w-md rounded-2xl bg-white/85 p-8 shadow-2xl backdrop-blur'>
        {/* Header */}
        <div className='mb-6 flex flex-col items-center gap-3 text-center'>
          <img src={logoImg} alt='Pramara PMS' className='h-12 w-auto' />
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100'>
            <Shield className='h-8 w-8 text-indigo-600' />
          </div>
          <div>
            <h1 className='text-3xl font-semibold text-slate-900'>Two-Factor Authentication</h1>
            <p className='text-sm text-slate-500 mt-2'>
              Enter the 6-digit code from your authenticator app
            </p>
            {searchParams.email && (
              <p className='text-xs text-slate-400 mt-1'>{searchParams.email}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        {/* Success Message */}
        {resendSuccess && (
          <div className='mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700'>
            Verification code sent to your email
          </div>
        )}

        {/* 6-Digit Code Input */}
        <div className='mb-6'>
          <div className='flex justify-center gap-3' onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type='text'
                inputMode='numeric'
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={busy}
                className='h-14 w-12 rounded-lg border-2 border-slate-300 text-center text-2xl font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:cursor-not-allowed'
                autoComplete='off'
              />
            ))}
          </div>
        </div>

        {/* Loading Indicator */}
        {busy && (
          <div className='mb-4 text-center text-sm text-slate-600'>
            Verifying code...
          </div>
        )}

        {/* Resend Code */}
        <div className='mb-6 text-center'>
          <button
            onClick={handleResend}
            disabled={resending || resendSuccess}
            className='text-sm text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 disabled:cursor-not-allowed'
          >
            {resending ? 'Sending...' : resendSuccess ? 'Code sent!' : 'Didn\'t receive a code? Resend'}
          </button>
        </div>

        {/* Back to Login */}
        <button
          onClick={handleBackToLogin}
          className='flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to login
        </button>

        {/* Help Text */}
        <div className='mt-6 text-center text-xs text-slate-500'>
          <p>
            Lost your device?{' '}
            <a href='mailto:support@pramara.com' className='text-indigo-600 hover:text-indigo-700'>
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { UserPlus, Check, X, Eye, EyeOff } from 'lucide-react';
import { http } from '../../lib/http';
import loginBg from '../../assets/login-bg.jpg';
import logoImg from '../../assets/logo.png';

interface InviteData {
  valid: boolean;
  email: string;
  name?: string;
  inviterName: string;
  roles: string[];
}

/**
 * Accept Invitation Page
 * 
 * Public page where invited users can:
 * - View invitation details (inviter, email, roles)
 * - Set their account password
 * - Accept or decline the invitation
 * 
 * Features:
 * - Validates invitation token on load
 * - Password strength indicators
 * - Password visibility toggle
 * - Accept/Decline buttons
 * - Auto-redirect to login on success
 */
export default function AcceptInvite() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const token = params.token as string;
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  // Password validation
  const passwordErrors: string[] = [];
  if (password && password.length < 8) {
    passwordErrors.push('At least 8 characters');
  }
  if (password && !/[A-Z]/.test(password)) {
    passwordErrors.push('One uppercase letter');
  }
  if (password && !/[a-z]/.test(password)) {
    passwordErrors.push('One lowercase letter');
  }
  if (password && !/[0-9]/.test(password)) {
    passwordErrors.push('One number');
  }
  if (password && !/[^A-Za-z0-9]/.test(password)) {
    passwordErrors.push('One special character');
  }
  if (confirmPassword && password !== confirmPassword) {
    passwordErrors.push('Passwords do not match');
  }

  const isPasswordValid = password.length >= 8 && 
                          /[A-Z]/.test(password) && 
                          /[a-z]/.test(password) && 
                          /[0-9]/.test(password) && 
                          /[^A-Za-z0-9]/.test(password);
  const isFormValid = name.trim() && isPasswordValid && password === confirmPassword;

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await http(`/api/invite/${token}`, {
          method: 'GET',
        });

        if (!res.ok) {
          throw new Error('Invalid or expired invitation');
        }

        const data = await res.json();
        setInviteData(data);
        setName(data.name || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;

    setAccepting(true);
    setError(null);

    try {
      const res = await http(`/api/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, name }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }

      // Success - redirect to login
      navigate({ 
        to: '/login',
        search: { message: 'Account activated! Please log in.' }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this invitation?')) {
      return;
    }

    setDeclining(true);
    setError(null);

    try {
      // TODO: Add decline endpoint to backend
      // For now, just navigate away
      navigate({ to: '/login' });
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
    } finally {
      setDeclining(false);
    }
  };

  // Loading state
  if (loading) {
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
        <div className='relative z-10 text-white text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4'></div>
          <p>Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !inviteData) {
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
        <div className='relative z-10 w-full max-w-md rounded-2xl bg-white/85 p-8 shadow-2xl backdrop-blur text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto mb-4'>
            <X className='h-8 w-8 text-red-600' />
          </div>
          <h1 className='text-2xl font-semibold text-slate-900 mb-2'>Invalid Invitation</h1>
          <p className='text-slate-600 mb-6'>{error}</p>
          <button
            onClick={() => navigate({ to: '/login' })}
            className='w-full rounded-lg bg-slate-600 py-2.5 text-white font-medium transition hover:bg-slate-700'
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className='relative flex min-h-screen items-center justify-center py-8'
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className='absolute inset-0 bg-black/55' />
      
      <div className='relative z-10 w-full max-w-lg rounded-2xl bg-white/85 p-8 shadow-2xl backdrop-blur'>
        {/* Header */}
        <div className='mb-6 flex flex-col items-center gap-3 text-center'>
          <img src={logoImg} alt='Pramara PMS' className='h-12 w-auto' />
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100'>
            <UserPlus className='h-8 w-8 text-indigo-600' />
          </div>
          <div>
            <h1 className='text-3xl font-semibold text-slate-900'>Welcome to Pramara PMS!</h1>
            <p className='text-sm text-slate-500 mt-2'>
              You've been invited by <strong>{inviteData?.inviterName}</strong>
            </p>
          </div>
        </div>

        {/* Invitation Details */}
        <div className='mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4'>
          <dl className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <dt className='text-slate-600'>Email:</dt>
              <dd className='font-medium text-slate-900'>{inviteData?.email}</dd>
            </div>
            {inviteData?.roles && inviteData.roles.length > 0 && (
              <div className='flex justify-between'>
                <dt className='text-slate-600'>Role{inviteData.roles.length > 1 ? 's' : ''}:</dt>
                <dd className='font-medium text-slate-900'>
                  {inviteData.roles.join(', ')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        {/* Accept Form */}
        <form onSubmit={handleAccept} className='space-y-4' noValidate>
          {/* Name Input */}
          <div>
            <label className='mb-1 block text-sm font-medium text-slate-600'>
              Full Name *
            </label>
            <input
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
              value={name}
              onChange={(e) => setName(e.target.value)}
              type='text'
              placeholder='Enter your full name'
              autoComplete='name'
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className='mb-1 block text-sm font-medium text-slate-600'>
              Password *
            </label>
            <div className='relative'>
              <input
                className='w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder='Create a strong password'
                autoComplete='new-password'
                required
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700'
              >
                {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
              </button>
            </div>
            
            {/* Password Requirements */}
            {password && (
              <div className='mt-2 space-y-1 text-xs'>
                {passwordErrors.length > 0 ? (
                  passwordErrors.slice(0, 5).map((err, i) => (
                    <div key={i} className='flex items-center gap-1 text-red-600'>
                      <X className='h-3 w-3' />
                      <span>{err}</span>
                    </div>
                  ))
                ) : (
                  <div className='flex items-center gap-1 text-green-600'>
                    <Check className='h-3 w-3' />
                    <span>Password meets all requirements</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className='mb-1 block text-sm font-medium text-slate-600'>
              Confirm Password *
            </label>
            <input
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder='Re-enter your password'
              autoComplete='new-password'
              required
            />
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={handleDecline}
              disabled={declining}
              className='flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {declining ? 'Declining...' : 'Decline'}
            </button>
            <button
              type='submit'
              disabled={!isFormValid || accepting}
              className='flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {accepting ? 'Accepting...' : 'Accept & Activate'}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className='mt-6 text-center text-xs text-slate-500'>
          <p>
            Having issues?{' '}
            <a href='mailto:support@pramara.com' className='text-indigo-600 hover:text-indigo-700'>
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

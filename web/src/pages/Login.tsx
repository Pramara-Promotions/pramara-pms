// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../features/common/AuthProvider';
import { AuthAPI } from '../features/common/api';
import MFAVerifyScreen from '../features/auth/MFAVerifyScreen';
import loginBg from '../assets/login-bg.jpg';
import logoImg from '../assets/logo.png';

export default function Login() {
  const nav = useNavigate();
  const routerState = useRouterState();
  const { refresh } = useAuth();

  const [email, setEmail] = useState('admin@pramara.local');
  const [password, setPassword] = useState('ChangeMe@123');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  // MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    
    try {
      const data = await AuthAPI.login({ email, password });
      
      // Check if MFA setup is required (new users)
      if (data.requiresMfaSetup && data.tempToken) {
        // Store temp token and redirect to MFA setup
        sessionStorage.setItem('mfa_setup_token', data.tempToken);
        nav({ to: '/mfa-setup', replace: true });
        return;
      }
      
      // Check if MFA verification is required
      if (data.requiresMfa && data.tempToken) {
        setTempToken(data.tempToken);
        setShowMFA(true);
        setBusy(false);
        return;
      }
      
      // Check if user must change password
      if (data.mustChangePassword) {
        await refresh();
        nav({ to: '/change-password', replace: true });
        return;
      }
      
      // Normal login success
      await refresh();
      const from = (routerState.location.state as any)?.from?.pathname || '/';
      nav({ to: from, replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleMFASuccess = async (user: any) => {
    // MFA verified, session created
    await refresh();
    const from = (routerState.location.state as any)?.from?.pathname || '/';
    nav({ to: from, replace: true });
  };

  const handleMFACancel = () => {
    setShowMFA(false);
    setTempToken('');
    setErr(null);
  };

  // Show MFA screen if required
  if (showMFA && tempToken) {
    return (
      <MFAVerifyScreen 
        tempToken={tempToken}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />
    );
  }

  return (
    <div
      className='relative flex min-h-screen items-center justify-center'
      style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className='absolute inset-0 bg-black/55' />
      <div className='relative z-10 w-full max-w-md rounded-2xl bg-white/85 p-8 shadow-2xl backdrop-blur'>
        <div className='mb-6 flex flex-col items-center gap-3 text-center'>
          <img src={logoImg} alt='Pramara PMS' className='h-12 w-auto' />
          <div>
            <h1 className='text-3xl font-semibold text-slate-900'>Welcome back</h1>
            <p className='text-sm text-slate-500'>Sign in with your Pramara credentials to continue.</p>
          </div>
        </div>

        {err && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{err}</div>
        )}

        <form onSubmit={onSubmit} className='space-y-4' noValidate>
          <div>
            <label className='mb-1 block text-sm font-medium text-slate-600'>Email</label>
            <input
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type='email'
              autoComplete='username'
            />
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-slate-600'>Password</label>
            <input
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type='password'
              autoComplete='current-password'
            />
          </div>

          <button
            type='submit'
            disabled={busy}
            className='w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className='mt-2 text-right'>
            <a href='/forgot-password' className='text-xs text-indigo-600 hover:underline'>Forgot password?</a>
          </div>
        </form>
      </div>
    </div>
  );
}

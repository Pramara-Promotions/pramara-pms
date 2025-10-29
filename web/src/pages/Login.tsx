// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../features/common/AuthProvider';
import { http } from '../lib/http';
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await http('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Login failed (${res.status})`);
      }
      
      const loginData = await res.json();
      
      // Check if MFA is required
      if (loginData.requireMfa) {
        nav({ 
          to: '/auth/mfa-verify', 
          search: { 
            tempToken: loginData.tempToken,
            email: loginData.email 
          }
        });
        return;
      }
      
      // Check if user must change password
      if (loginData.mustChangePassword) {
        nav({ to: '/change-password', replace: true });
        return;
      }
      
      await refresh();
      const from = (routerState.location.state as any)?.from?.pathname || '/';
      nav({ to: from, replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

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
        </form>
      </div>
    </div>
  );
}

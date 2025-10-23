import React, { useState } from 'react';
import { useToast } from '../ui/toast/ToastProvider';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToastOk, showToastErr } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Failed to send reset email');
      showToastOk('If an account exists, a password reset email has been sent.');
    } catch (e: any) {
      showToastErr(e?.message || 'Failed to send reset email');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='relative flex min-h-screen items-center justify-center bg-slate-50'>
      <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl'>
        <h2 className='mb-4 text-2xl font-semibold text-slate-900 text-center'>Forgot Password?</h2>
        <p className='mb-6 text-sm text-slate-500 text-center'>Enter your email and we'll send you a password reset link.</p>
        <form onSubmit={onSubmit} className='space-y-4'>
          <input
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
            value={email}
            onChange={e => setEmail(e.target.value)}
            type='email'
            placeholder='Email address'
            required
          />
          <button
            type='submit'
            disabled={busy}
            className='w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {busy ? 'Sending…' : 'Send Reset Email'}
          </button>
        </form>
      </div>
    </div>
  );
}

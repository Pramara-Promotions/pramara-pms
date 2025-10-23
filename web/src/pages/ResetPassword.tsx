import React, { useState } from 'react';
import { useToast } from '../ui/toast/ToastProvider';
import { useNavigate, useParams } from '@tanstack/react-router';

export default function ResetPassword() {
  const params = useParams({ strict: false });
  const token = params.token;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToastOk, showToastErr } = useToast();
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return showToastErr('Password must be at least 8 characters');
    if (password !== confirmPassword) return showToastErr('Passwords do not match');
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return showToastErr('Password must contain uppercase, lowercase, number, and special character');
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, mfaCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      showToastOk('Password reset successfully. Please log in.');
      nav({ to: '/login', replace: true });
    } catch (e: any) {
      showToastErr(e?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='relative flex min-h-screen items-center justify-center bg-slate-50'>
      <div className='w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl'>
        <h2 className='mb-4 text-2xl font-semibold text-slate-900 text-center'>Reset Password</h2>
        <form onSubmit={onSubmit} className='space-y-4'>
          <input
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
            value={password}
            onChange={e => setPassword(e.target.value)}
            type='password'
            placeholder='New password'
            required
          />
          <input
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            type='password'
            placeholder='Confirm new password'
            required
          />
          <input
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
            value={mfaCode}
            onChange={e => setMfaCode(e.target.value)}
            type='text'
            placeholder='MFA code'
            required
            maxLength={6}
          />
          <button
            type='submit'
            disabled={busy}
            className='w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {busy ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

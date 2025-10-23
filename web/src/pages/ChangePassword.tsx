// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { http } from '../lib/http';
import logoImg from '../assets/logo.png';

export default function ChangePassword() {
  const nav = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErr('All fields are required');
      setBusy(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErr('New passwords do not match');
      setBusy(false);
      return;
    }

    if (newPassword.length < 8) {
      setErr('New password must be at least 8 characters');
      setBusy(false);
      return;
    }

    if (newPassword === currentPassword) {
      setErr('New password must be different from current password');
      setBusy(false);
      return;
    }

    try {
      const res = await http('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to change password (${res.status})`);
      }

      setSuccess(true);
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        nav({ to: '/', replace: true });
      }, 2000);
    } catch (e: any) {
      setErr(e?.message || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl'>
        <div className='mb-6 flex flex-col items-center gap-3 text-center'>
          <img src={logoImg} alt='Pramara PMS' className='h-12 w-auto' />
          <div>
            <h1 className='text-3xl font-semibold text-gray-900 dark:text-white'>Change Password</h1>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-2'>
              🔒 For security reasons, you must change your password before continuing.
            </p>
          </div>
        </div>

        <div className='mb-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-3'>
          <p className='text-sm text-yellow-800 dark:text-yellow-300'>
            <strong>⚠️ Password Requirements:</strong>
          </p>
          <ul className='text-xs text-yellow-700 dark:text-yellow-400 mt-2 ml-4 list-disc space-y-1'>
            <li>At least 8 characters long</li>
            <li>Must be different from your current password</li>
            <li>Avoid common passwords</li>
          </ul>
        </div>

        {err && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400'>
            {err}
          </div>
        )}

        {success && (
          <div className='mb-4 rounded-md border border-green-200 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400'>
            ✅ Password changed successfully! Redirecting...
          </div>
        )}

        <form onSubmit={onSubmit} className='space-y-4' noValidate>
          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
              Current Password
            </label>
            <input
              className='w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white dark:bg-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800'
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type='password'
              autoComplete='current-password'
              disabled={success}
            />
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
              New Password
            </label>
            <input
              className='w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white dark:bg-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type='password'
              autoComplete='new-password'
              disabled={success}
            />
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
              Confirm New Password
            </label>
            <input
              className='w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white dark:bg-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type='password'
              autoComplete='new-password'
              disabled={success}
            />
          </div>

          <button
            type='submit'
            disabled={busy || success}
            className='w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {busy ? 'Changing Password...' : success ? 'Redirecting...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

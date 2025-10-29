// web/src/features/admin/EmailSettings.tsx
import { useState, useEffect } from 'react';
import PermissionGate from '../../components/auth/PermissionGate';
import { http } from '../../lib/http';

type EmailStatus = {
  outbound: {
    configured: boolean;
    verified: boolean;
    reason: string | null;
    provider?: string;
    from?: string;
  };
  inbound: {
    enabled: boolean;
    webhook: string | null;
  };
};

export default function EmailSettings() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/email/status');
      if (!res.ok) throw new Error(`Failed to fetch email status (${res.status})`);
      const data = await res.json();
      setStatus(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load email status');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      setTestResult({ ok: false, message: 'Please enter an email address' });
      return;
    }

    try {
      setTestLoading(true);
      setTestResult(null);
      const res = await http('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setTestResult({ ok: false, message: data.error || 'Failed to send test email' });
      } else {
        setTestResult({ 
          ok: true, 
          message: data.mockEmail 
            ? 'Mock email logged (Resend not configured)' 
            : 'Test email sent successfully via Resend!' 
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message ?? 'Failed to send test email' });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading email settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate permission="SYSTEM_SETTINGS" fallback={
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to view email settings</p>
      </div>
    }>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email Settings</h2>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            ↻ Refresh Status
          </button>
        </div>

        {/* Outbound Email Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📤 Outbound Email (Resend)
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Configuration Status:</span>
              <span className={`px-3 py-1 text-xs font-medium rounded ${
                status?.outbound.configured
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {status?.outbound.configured ? 'Configured' : 'Not Configured'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Connection Status:</span>
              <span className={`px-3 py-1 text-xs font-medium rounded ${
                status?.outbound.verified
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {status?.outbound.verified ? '✓ Verified' : '✗ Not Verified'}
              </span>
            </div>

            {status?.outbound.from && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sending From:</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {status.outbound.from}
                </span>
              </div>
            )}

            {status?.outbound.reason && !status.outbound.verified && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Reason:</strong> {status.outbound.reason}
                </p>
              </div>
            )}

            {status?.outbound.configured && status?.outbound.from === 'onboarding@resend.dev' && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ℹ️ Using Resend's default sending domain. Perfect for testing! To use your own domain, verify it in your <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline font-medium">Resend dashboard</a> and update <code>FROM_EMAIL</code> in <code>.env</code>.
                </p>
              </div>
            )}

            {!status?.outbound.configured && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Setup Instructions:</strong> Add your Resend API key to <code>.env</code>:
                </p>
                <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`RESEND_API_KEY=re_your_api_key_here
# Optional: Use custom domain (must be verified in Resend)
# FROM_EMAIL=noreply@yourdomain.com
# FROM_NAME=Pramara PMS`}
                </pre>
                <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                  Get your API key at: <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">https://resend.com/api-keys</a>
                  <br />
                  Leave <code>FROM_EMAIL</code> unset to use <code>onboarding@resend.dev</code> (Resend's default)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Test Email */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ✉️ Send Test Email
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={sendTestEmail}
              disabled={testLoading || !testEmail.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {testLoading ? 'Sending...' : 'Send Test Email'}
            </button>

            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.ok
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <p className={`text-sm ${
                  testResult.ok
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {testResult.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Inbound Email Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📥 Inbound Email Processing
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`px-3 py-1 text-xs font-medium rounded ${
                status?.inbound.enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {status?.inbound.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {status?.inbound.enabled && status.inbound.webhook && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Webhook URL:</strong>
                </p>
                <code className="block mt-2 text-xs bg-gray-900 text-gray-100 p-2 rounded">
                  {window.location.origin}{status.inbound.webhook}
                </code>
              </div>
            )}

            {!status?.inbound.enabled && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Inbound email processing is currently disabled. This feature allows creating projects and handling notifications via email.
                  To enable, set <code>ENABLE_INBOUND_EMAIL=true</code> in your <code>.env</code> file.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>💡 Note:</strong> Email is used for user invitations, password resets, device alerts, and notifications. 
            Ensure SMTP is properly configured before inviting users.
          </p>
        </div>
      </div>
    </PermissionGate>
  );
}

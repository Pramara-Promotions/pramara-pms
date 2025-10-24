// web/src/features/admin/EmailSettings.tsx
import { useState, useEffect } from 'react';
import { EmailAdminAPI } from '../common/api';
import { useToast } from '../../ui/toast/ToastProvider';

export default function EmailSettings() {
  const { showToastOk, showToastErr } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    emailOutboundEnabled: false,
    emailTrainingMode: true,
    emailInboundEnabled: false,
  });
  const [inboundStatus, setInboundStatus] = useState<{enabled:boolean; imapConfigured:boolean; connected:boolean; polling:boolean} | null>(null);

  useEffect(() => {
    fetchSettings();
    // Also fetch inbound status after settings load
    (async () => {
      try {
        const status = await EmailAdminAPI.getInboundStatus?.();
        if (status) setInboundStatus(status);
      } catch {}
    })();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await EmailAdminAPI.getSettings();
      setSettings(data);
    } catch (err: any) {
      showToastErr(err.message || 'Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await EmailAdminAPI.updateSettings(settings);
      showToastOk('Email settings updated successfully');
    } catch (err: any) {
      showToastErr(err.message || 'Failed to update email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email System Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure system-wide email sending and receiving behavior
        </p>
      </div>

      {/* Training Mode Warning */}
      {settings.emailTrainingMode && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Training Mode Active</h3>
              <p className="mt-1 text-sm text-yellow-700">
                All emails are being logged but NOT actually sent. This is safe for testing and training. Disable training mode when you're ready to send real emails.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Training Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                🎓 Training Mode
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                When enabled, all email sends are logged to the database but NOT actually sent via Resend. 
                Perfect for testing workflows and training your team without spamming real inboxes.
              </p>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>All email attempts are logged in EmailLog table</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Status tracked as 'dummy_training_mode'</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Console output shows "[EMAIL] Training mode - Dummy email sent"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600">✗</span>
                  <span>No actual emails sent to recipients</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailTrainingMode')}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.emailTrainingMode ? 'bg-yellow-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.emailTrainingMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Outbound Email */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                📤 Outbound Email Sending
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enable system-wide email sending via Resend. Individual users must also have email permissions enabled.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <p className="text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> Requires RESEND_API_KEY to be set in environment variables. 
                  {settings.emailOutboundEnabled && !settings.emailTrainingMode && (
                    <span className="block mt-1 font-medium text-red-600">
                      ⚠️ Real emails will be sent to recipients!
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailOutboundEnabled')}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.emailOutboundEnabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.emailOutboundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Inbound Email */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                📥 Inbound Email Processing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enable processing of incoming emails. When enabled, the server polls your IMAP inbox and stores messages and attachments in the inbox.
              </p>
              {inboundStatus && (
                <div className="mb-3 text-sm">
                  <span className={`inline-block px-2 py-0.5 rounded border mr-2 ${inboundStatus.enabled ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-600'}`}>
                    {inboundStatus.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded border mr-2 ${inboundStatus.imapConfigured ? 'border-blue-300 text-blue-700' : 'border-amber-300 text-amber-700'}`}>
                    {inboundStatus.imapConfigured ? 'IMAP configured' : 'IMAP not configured'}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded border ${inboundStatus.connected ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-600'}`}>
                    {inboundStatus.connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              )}
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  Requires IMAP credentials (IMAP_USER, IMAP_PASSWORD, IMAP_HOST, IMAP_PORT, IMAP_TLS) to be set on the server. Status updates after Save.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailInboundEnabled')}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.emailInboundEnabled ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.emailInboundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Changes require save to take effect
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Email Logs Link */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          📊 Email Logs
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          View all email send attempts in the database:
        </p>
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 font-mono text-sm text-gray-800 dark:text-gray-200">
          SELECT id, "to", subject, status, "createdAt"<br />
          FROM "EmailLog"<br />
          ORDER BY "createdAt" DESC<br />
          LIMIT 50;
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Run this query in your database client to see email logs
        </p>
      </div>
    </div>
  );
}

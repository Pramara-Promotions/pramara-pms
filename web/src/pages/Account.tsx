// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/common/AuthProvider';
import { http } from '../lib/http';
import { MFAAPI } from '../features/common/api';
import MFASetupModal from '../features/auth/MFASetupModal';

export default function Account() {
  const { user, refresh } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  useEffect(() => {
    fetchUserDevices();
    checkMfaStatus();
  }, []);

  const fetchUserDevices = async () => {
    try {
      const res = await http('/api/devices');
      if (!res.ok) throw new Error('Failed to fetch devices');
      const data = await res.json();
      setDevices(Array.isArray(data) ? data.filter(d => d.user?.id === user?.id) : []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const checkMfaStatus = () => {
    // Check if user has MFA enabled
    setMfaEnabled(!!user?.mfaSecret && !!user?.mfaEnforcedAt);
  };

  const handleEnableMFA = () => {
    setShowMFASetup(true);
  };

  const handleMFASetupSuccess = async () => {
    await refresh();
    setMfaEnabled(true);
    alert('MFA enabled successfully! You will need your authenticator app on next login.');
  };

  const handleDisableMFA = () => {
    setShowDisableConfirm(true);
    setDisablePassword('');
    setDisableError('');
  };

  const confirmDisableMFA = async () => {
    if (!disablePassword) {
      setDisableError('Password is required');
      return;
    }

    setDisableLoading(true);
    setDisableError('');

    try {
      await MFAAPI.disable(disablePassword);
      await refresh();
      setMfaEnabled(false);
      setShowDisableConfirm(false);
      setDisablePassword('');
      alert('MFA disabled successfully');
    } catch (err: any) {
      setDisableError(err.message || 'Failed to disable MFA');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    if (!confirm('Revoke trust for this device?')) return;
    
    try {
      const res = await http(`/api/devices/${deviceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke device');
      await fetchUserDevices();
      alert('Device revoked successfully');
    } catch (error) {
      alert(error.message || 'Failed to revoke device');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h1>

      {/* User Info Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
            <p className="text-gray-900 dark:text-white">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
            <p className="text-gray-900 dark:text-white">{user?.name || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* MFA Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🔐 Multi-Factor Authentication (MFA)
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                MFA Status: {mfaEnabled ? '✅ Enabled' : '❌ Disabled'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {mfaEnabled
                  ? 'Your account is protected with two-factor authentication'
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
            <button
              onClick={mfaEnabled ? handleDisableMFA : handleEnableMFA}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mfaEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
            </button>
          </div>

          {mfaEnabled && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Tip:</strong> Keep your backup codes in a safe place. You'll need them if you lose access to your authenticator app.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Backup codes were shown when you enabled MFA. If you lost them, disable and re-enable MFA to generate new codes.
              </p>
            </div>
          )}

          {/* Disable MFA Confirmation */}
          {showDisableConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Disable Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter your password to confirm disabling MFA. Your account will be less secure.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    disabled={disableLoading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    placeholder="Enter your password"
                  />
                </div>

                {disableError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{disableError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={confirmDisableMFA}
                    disabled={disableLoading}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {disableLoading ? 'Disabling...' : 'Disable MFA'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDisableConfirm(false);
                      setDisablePassword('');
                      setDisableError('');
                    }}
                    disabled={disableLoading}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trusted Devices Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📱 Trusted Devices
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Devices you've used to sign in. You can revoke access for any device.
        </p>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-400">Loading devices...</p>
        ) : devices.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No devices found</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {device.name || 'Unnamed Device'}
                    </p>
                    {device.isTrusted && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                        Trusted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {device.browser} on {device.os} • {device.ipAddress}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Last used: {new Date(device.lastUsedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeDevice(device.id)}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded ml-4"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Alert */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong>Security Tip:</strong> Regularly review your trusted devices and revoke access for devices you no longer use.
        </p>
      </div>

      {/* MFA Setup Modal */}
      <MFASetupModal
        isOpen={showMFASetup}
        onClose={() => setShowMFASetup(false)}
        onSuccess={handleMFASetupSuccess}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../features/common/AuthProvider';
import { http } from '../lib/http';
import { Shield, Smartphone, Monitor, Trash2, Tablet, CheckCircle2 } from 'lucide-react';

type Device = {
  id: string;
  fingerprint: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  ip: string;
  trusted: boolean;
  trustUntil: string | null;
  lastUsedAt: string;
  isCurrent: boolean;
  createdAt: string;
};

export default function Account() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'devices'>('profile');
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [enablingMfa, setEnablingMfa] = useState(false);
  const [disablingMfa, setDisablingMfa] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Devices state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  // Trust device state
  const [trustDuration, setTrustDuration] = useState<7 | 30 | 90>(30);
  const [trustingDevice, setTrustingDevice] = useState(false);

  // Sessions state (same as devices for now)
  const [sessions, setSessions] = useState<Device[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    fetchMfaStatus();
    fetchDevices();
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMfaStatus = async () => {
    try {
      const res = await http('/api/auth/mfa/status');
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.mfaEnabled || false);
      }
    } catch (e) {
      console.error('Failed to fetch MFA status', e);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const res = await http('/api/auth/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error('Failed to fetch devices', e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await http('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Failed to fetch sessions', e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await http('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        throw new Error('Failed to update profile');
      }

      alert('Profile updated successfully');
    } catch (e: any) {
      alert(e?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEnableMfa = async () => {
    setEnablingMfa(true);
    try {
      const res = await http('/api/auth/mfa/setup', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to setup MFA');
      }

      const data = await res.json();
      setMfaSecret(data.secret);
      setQrCode(data.qrCode);
      setShowMfaSetup(true);
    } catch (e: any) {
      alert(e?.message || 'Failed to setup MFA');
    } finally {
      setEnablingMfa(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnablingMfa(true);

    try {
      const res = await http('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode, secret: mfaSecret }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      const data = await res.json();
      setBackupCodes(data.backupCodes || []);
      setMfaEnabled(true);
      setShowMfaSetup(false);
      setVerificationCode('');
      alert('MFA enabled successfully! Save your backup codes.');
    } catch (e: any) {
      alert(e?.message || 'Failed to verify MFA');
    } finally {
      setEnablingMfa(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will reduce your account security.')) {
      return;
    }

    setDisablingMfa(true);
    try {
      const res = await http('/api/auth/mfa/disable', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to disable MFA');
      }

      setMfaEnabled(false);
      alert('MFA disabled successfully');
    } catch (e: any) {
      alert(e?.message || 'Failed to disable MFA');
    } finally {
      setDisablingMfa(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await http('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }

      alert('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      alert(e?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device?')) {
      return;
    }

    try {
      const res = await http(`/api/auth/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to revoke device');
      }

      alert('Device revoked successfully');
      fetchDevices();
    } catch (e: any) {
      alert(e?.message || 'Failed to revoke device');
    }
  };

  const handleTrustDevice = async () => {
    setTrustingDevice(true);
    try {
      const res = await http('/api/auth/trust-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: trustDuration }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to trust device');
      }

      const data = await res.json();
      alert(data.message || 'Device trusted successfully');
      fetchSessions();
    } catch (e: any) {
      alert(e?.message || 'Failed to trust device');
    } finally {
      setTrustingDevice(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? You will be logged out from that device.')) {
      return;
    }

    try {
      const res = await http(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke session');
      }

      alert('Session revoked successfully');
      fetchSessions();
    } catch (e: any) {
      alert(e?.message || 'Failed to revoke session');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h1>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1 px-6">
            {[
              { id: 'profile' as const, label: 'Profile' },
              { id: 'security' as const, label: 'Security', icon: Shield },
              { id: 'devices' as const, label: 'Devices', icon: Monitor },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Profile Information
                </h3>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              {/* MFA Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Multi-Factor Authentication
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  {mfaEnabled ? (
                    <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                      Disabled
                    </span>
                  )}
                </div>

                {!mfaEnabled && !showMfaSetup && (
                  <button
                    onClick={handleEnableMfa}
                    disabled={enablingMfa}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {enablingMfa ? 'Setting up...' : 'Enable MFA'}
                  </button>
                )}

                {showMfaSetup && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Scan this QR code with your authenticator app
                      </p>
                      <div dangerouslySetInnerHTML={{ __html: qrCode }} className="flex justify-center mb-4" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Manual entry: {mfaSecret}
                      </p>
                    </div>

                    <form onSubmit={handleVerifyMfa} className="space-y-3">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowMfaSetup(false)}
                          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={enablingMfa || verificationCode.length !== 6}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {enablingMfa ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {mfaEnabled && backupCodes.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mt-4">
                    <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                      Backup Codes
                    </h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">
                      Save these codes in a safe place. Each can be used once if you lose access to your authenticator.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-2 rounded border border-yellow-200 dark:border-yellow-700">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mfaEnabled && (
                  <button
                    onClick={handleDisableMfa}
                    disabled={disablingMfa}
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {disablingMfa ? 'Disabling...' : 'Disable MFA'}
                  </button>
                )}
              </div>

              {/* Password Change Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Change Password
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>

              {/* Trust Device Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Trust This Device
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Skip MFA verification on this device for a specified duration
                </p>
                <div className="flex items-end gap-4 max-w-md">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Trust Duration
                    </label>
                    <select
                      value={trustDuration}
                      onChange={(e) => setTrustDuration(Number(e.target.value) as 7 | 30 | 90)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>
                  <button
                    onClick={handleTrustDevice}
                    disabled={trustingDevice}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {trustingDevice ? 'Trusting...' : 'Trust Device'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Active Sessions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Manage devices and sessions that have accessed your account
              </p>

              {loadingSessions ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No active sessions found</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          {session.deviceType === 'mobile' ? (
                            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : session.deviceType === 'tablet' ? (
                            <Tablet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {session.deviceName}
                            </p>
                            {session.isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded">
                                <CheckCircle2 className="h-3 w-3" />
                                Current
                              </span>
                            )}
                            {session.trusted && session.trustUntil && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                                <Shield className="h-3 w-3" />
                                Trusted
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            IP: {session.ip}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Last active: {new Date(session.lastUsedAt).toLocaleString()}
                          </p>
                          {session.trusted && session.trustUntil && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Trusted until: {new Date(session.trustUntil).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Revoke session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

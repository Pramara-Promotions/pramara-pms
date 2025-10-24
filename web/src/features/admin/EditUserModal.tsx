// web/src/features/admin/EditUserModal.tsx
import { useState, useEffect } from 'react';
import { http } from '../../lib/http';

type Department = { id: string; name: string };
type Role = { id: string; name: string };

type User = {
  id: string;
  email: string;
  name?: string;
  status: string;
  isActive: boolean;
  department?: { id: string; name: string };
  roles?: ({ id: string; name: string } | string)[];
  mfaSecret?: string;
  mfaEnforcedAt?: string;
  trustDeviceDuration?: number;
  auditRetentionDays?: number;
  emailOutboundEnabled?: boolean;
  emailTrainingMode?: boolean;
};

type EditUserModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditUserModal({ isOpen, user, onClose, onSuccess }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'ACTIVE',
    isActive: true,
    departmentId: '',
    roleIds: [] as string[],
    trustDeviceDuration: 30,
    auditRetentionDays: 90,
    emailOutboundEnabled: false,
    emailTrainingMode: false,
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetMethod, setPasswordResetMethod] = useState<'email' | 'manual' | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email,
        status: user.status,
        isActive: user.isActive,
        departmentId: user.department?.id || '',
        roleIds: user.roles?.map(r => typeof r === 'string' ? r : r.id) || [],
        trustDeviceDuration: user.trustDeviceDuration || 30,
        auditRetentionDays: user.auditRetentionDays || 90,
        emailOutboundEnabled: user.emailOutboundEnabled || false,
        emailTrainingMode: user.emailTrainingMode || false,
      });
      fetchDepartmentsAndRoles();
    }
  }, [isOpen, user]);

  const fetchDepartmentsAndRoles = async () => {
    try {
      const [deptRes, rolesRes] = await Promise.all([
        http('/api/departments'),
        http('/api/admin/roles'),
      ]);
      
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData);
      }
      
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles || rolesData);
      }
    } catch (e) {
      console.error('Failed to load departments/roles', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Update basic user info
      const updateRes = await http(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || null,
          status: formData.status,
          isActive: formData.isActive,
          departmentId: formData.departmentId || null,
          trustDeviceDuration: formData.trustDeviceDuration,
          auditRetentionDays: formData.auditRetentionDays,
          emailOutboundEnabled: formData.emailOutboundEnabled,
          emailTrainingMode: formData.emailTrainingMode,
        }),
      });

      if (!updateRes.ok) {
        const data = await updateRes.json();
        throw new Error(data.error || 'Failed to update user');
      }

      // Update role assignments
      // First, get current roles
      const currentRoleIds = user.roles?.map(r => typeof r === 'string' ? r : r.id) || [];
      const rolesToAdd = formData.roleIds.filter(id => !currentRoleIds.includes(id));
      const rolesToRemove = currentRoleIds.filter(id => !formData.roleIds.includes(id));

      // Remove roles
      for (const roleId of rolesToRemove) {
        await http(`/api/users/${user.id}/roles/${roleId}`, { method: 'DELETE' });
      }

      // Add roles
      for (const roleId of rolesToAdd) {
        await http(`/api/users/${user.id}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId }),
        });
      }

      // Success
      onSuccess();
      onClose();
      setShowPasswordReset(false);
      setNewPassword('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user) return;

    if (passwordResetMethod === 'email') {
      // Send system-generated password via email
      setResettingPassword(true);
      try {
        const res = await http(`/api/admin/users/${user.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'email' }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to reset password');
        }

        alert('A new password has been sent to the user\'s email address');
        setShowPasswordReset(false);
        setPasswordResetMethod(null);
      } catch (e: any) {
        alert(e?.message ?? 'Failed to reset password');
      } finally {
        setResettingPassword(false);
      }
    } else if (passwordResetMethod === 'manual') {
      // Generate temporary password for manual sharing
      setResettingPassword(true);
      try {
        const res = await http(`/api/admin/users/${user.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'manual' }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to generate password');
        }

        const data = await res.json();
        setGeneratedPassword(data.temporaryPassword);
        alert('Temporary password generated! Please share it securely with the user.');
      } catch (e: any) {
        alert(e?.message ?? 'Failed to generate password');
      } finally {
        setResettingPassword(false);
      }
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit User
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email (Read-only) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {/* Active Toggle */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Account is active (can log in)
                </span>
              </label>
            </div>

            {/* Department */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Roles */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Roles
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                {roles.map(role => (
                  <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.roleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* MFA Settings Section */}
            <div className="mb-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                🔐 Multi-Factor Authentication (MFA)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      MFA Status: {' '}
                      <span className="font-medium">
                        {!user?.mfaSecret ? (
                          '❌ Disabled'
                        ) : user.mfaSecret === 'PENDING_SETUP' ? (
                          '⏳ Pending Setup'
                        ) : (
                          '✅ Enabled'
                        )}
                      </span>
                    </p>
                    {user?.mfaEnforcedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {user.mfaSecret === 'PENDING_SETUP' 
                          ? `Enforced: ${new Date(user.mfaEnforcedAt).toLocaleDateString()} • User must set up on next login`
                          : `Enforced: ${new Date(user.mfaEnforcedAt).toLocaleDateString()}`
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!user?.mfaSecret ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Enable MFA for this user? They will be required to set it up on next login.')) {
                            try {
                              const res = await http(`/api/admin/users/${user?.id}/mfa`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ enabled: true }),
                              });
                              if (res.ok) {
                                alert('MFA enabled successfully. User will be prompted to set up MFA on next login.');
                                onSuccess(); // Refresh parent list
                                onClose();   // Close modal so it refreshes when reopened
                              } else {
                                const data = await res.json();
                                throw new Error(data.error || 'Failed to enable MFA');
                              }
                            } catch (err: any) {
                              alert(err.message || 'Failed to enable MFA');
                            }
                          }
                        }}
                        className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Enable MFA
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Disable MFA for this user? They will NOT be required to use 2FA on next login.')) {
                            try {
                              const res = await http(`/api/admin/users/${user?.id}/disable-mfa`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                              });
                              if (res.ok) {
                                alert('MFA disabled successfully. User can now login without 2FA.');
                                onSuccess(); // Refresh parent list
                                onClose();   // Close modal so it refreshes when reopened
                              } else {
                                const data = await res.json();
                                throw new Error(data.error || 'Failed to disable MFA');
                              }
                            } catch (err: any) {
                              alert(err.message || 'Failed to disable MFA');
                            }
                          }
                        }}
                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Disable MFA
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Force Logout */}
                <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Force logout ${user?.name || user?.email}? This will invalidate all their active sessions and devices.`)) {
                        try {
                          const res = await http(`/api/admin/users/${user?.id}/force-logout`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          if (res.ok) {
                            alert('User has been logged out from all devices and sessions.');
                            onSuccess(); // Refresh parent list
                            onClose();   // Close modal
                          } else {
                            const data = await res.json();
                            throw new Error(data.error || 'Failed to force logout');
                          }
                        } catch (err: any) {
                          alert(err.message || 'Failed to force logout');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Force Logout from All Devices
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    This will immediately invalidate all active sessions and trusted devices for this user.
                  </p>
                </div>
              </div>
            </div>

            {/* Session Settings Section */}
            <div className="mb-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                🕐 Session & Device Settings
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trust Device Duration (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.trustDeviceDuration || 30}
                    onChange={(e) => setFormData({ ...formData, trustDeviceDuration: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How many days should devices remain trusted before requiring re-authentication.
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Audit Log Retention (days)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="365"
                    value={formData.auditRetentionDays || 90}
                    onChange={(e) => setFormData({ ...formData, auditRetentionDays: Math.max(15, parseInt(e.target.value) || 90) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="90"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How many days of audit logs this user can view. Minimum 15 days (security policy).
                  </p>
                </div>
              </div>
            </div>

            {/* Email Settings Section */}
            <div className="mb-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                📧 Email Settings
              </h3>
              <div className="space-y-4">
                {/* Email Outbound Enabled */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.emailOutboundEnabled}
                        onChange={(e) => setFormData({ ...formData, emailOutboundEnabled: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow Outbound Emails
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                      User can send emails (invitation, notifications, etc.). System-wide setting must also be enabled.
                    </p>
                  </div>
                  {formData.emailOutboundEnabled ? (
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Training Mode Toggle */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.emailTrainingMode}
                        onChange={(e) => setFormData({ ...formData, emailTrainingMode: e.target.checked })}
                        className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Training Mode (This User Only)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                      All emails for this user will be logged but NOT sent. Use for testing without spamming real recipients.
                    </p>
                  </div>
                  {formData.emailTrainingMode ? (
                    <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Training
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Production
                    </span>
                  )}
                </div>

                {/* Warning if training mode is ON */}
                {formData.emailTrainingMode && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      <strong>⚠️ Training Mode Active:</strong> This user's emails will be logged to the database but NOT delivered to recipients. Check EmailLog table to view logged emails.
                    </p>
                  </div>
                )}

                {/* Info about system-wide setting */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>ℹ️ Note:</strong> User-level training mode overrides system settings. System-wide training mode can be configured in Admin Panel → Email Settings.
                  </p>
                </div>
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="mb-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => setShowPasswordReset(!showPasswordReset)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showPasswordReset ? '▼ Hide Password Reset' : '▶ Reset Password'}
              </button>
              
              {showPasswordReset && (
                <div className="mt-4 space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                      <strong>Security Note:</strong> Users should reset their password via MFA (if enabled).
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Use admin reset only when user has lost access to MFA and/or email.
                    </p>
                  </div>

                  {/* Reset Method Selection */}
                  {!passwordResetMethod && !generatedPassword && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Choose Reset Method:
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => setPasswordResetMethod('email')}
                        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium text-left flex items-start space-x-3"
                      >
                        <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="font-semibold">Email New Password</div>
                          <div className="text-xs text-green-100 mt-1">
                            System generates secure password and emails it to user. User must change on first login.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPasswordResetMethod('manual')}
                        className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium text-left flex items-start space-x-3"
                      >
                        <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <div>
                          <div className="font-semibold">Generate Temporary Password</div>
                          <div className="text-xs text-orange-100 mt-1">
                            For users without email access. Password shown once. User must change on first login. Admin notified.
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Email Method Confirmation */}
                  {passwordResetMethod === 'email' && !generatedPassword && (
                    <div className="space-y-3">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          ⚠️ <strong>Confirm Action:</strong> A system-generated password will be sent to <strong>{user.email}</strong>
                        </p>
                        <ul className="text-xs text-yellow-700 dark:text-yellow-400 mt-2 ml-4 list-disc space-y-1">
                          <li>User will receive email with new password</li>
                          <li>User must change password on first login</li>
                          <li>Security alert banner shown for 7 days</li>
                          <li>Admin will be notified of this action</li>
                        </ul>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          disabled={resettingPassword}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {resettingPassword ? 'Sending Email...' : 'Confirm & Send Email'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPasswordResetMethod(null)}
                          disabled={resettingPassword}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual Method Confirmation */}
                  {passwordResetMethod === 'manual' && !generatedPassword && (
                    <div className="space-y-3">
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-sm text-red-800 dark:text-red-300">
                          🔒 <strong>High Security Alert:</strong> Manual password sharing
                        </p>
                        <ul className="text-xs text-red-700 dark:text-red-400 mt-2 ml-4 list-disc space-y-1">
                          <li>Password will be shown ONLY ONCE</li>
                          <li>You must share it securely with the user</li>
                          <li>User must change password immediately on login</li>
                          <li>Security alert banner shown for 7 days</li>
                          <li>Admin notified of non-MFA recovery</li>
                        </ul>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          disabled={resettingPassword}
                          className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {resettingPassword ? 'Generating...' : 'Generate Temporary Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPasswordResetMethod(null)}
                          disabled={resettingPassword}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Generated Password Display */}
                  {generatedPassword && (
                    <div className="space-y-3">
                      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-700 rounded-lg p-4">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                          ✅ Temporary Password Generated
                        </p>
                        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-3 mb-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Password (copy now):</p>
                          <code className="text-lg font-mono text-gray-900 dark:text-white select-all">
                            {generatedPassword}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPassword);
                            alert('Password copied to clipboard!');
                          }}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium mb-2"
                        >
                          📋 Copy to Clipboard
                        </button>
                        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                          ⚠️ Save this now! It will not be shown again.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedPassword('');
                          setPasswordResetMethod(null);
                          setShowPasswordReset(false);
                        }}
                        className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
                      >
                        Done - Close Reset Section
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

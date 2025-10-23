// web/src/features/admin/TemporaryPermissionsModal.tsx
import { useState, useEffect } from 'react';
import { http } from '../../lib/http';

interface Permission {
  code: string;
  name: string;
  description?: string | null;
  module: string;
}

interface TemporaryPermission {
  id: string;
  permissionCode: string;
  startDate: string;
  endDate: string;
  status: string;
  reason?: string | null;
  grantedBy: string;
  createdAt: string;
}

interface TemporaryPermissionsModalProps {
  isOpen: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TemporaryPermissionsModal({
  isOpen,
  userId,
  userName,
  onClose,
  onSuccess,
}: TemporaryPermissionsModalProps) {
  const [activeTab, setActiveTab] = useState<'grant' | 'view'>('view');
  
  // View existing permissions
  const [tempPermissions, setTempPermissions] = useState<TemporaryPermission[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  
  // Grant new permission
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermission, setSelectedPermission] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTempPermissions();
      fetchAllPermissions();
      
      // Set default start date to now
      const now = new Date();
      setStartDate(now.toISOString().slice(0, 16));
      
      // Set default end date to 7 days from now
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setEndDate(weekLater.toISOString().slice(0, 16));
    }
  }, [isOpen, userId]);

  const fetchTempPermissions = async () => {
    try {
      setLoadingPerms(true);
      const res = await http(`/api/users/${userId}/temp-permissions`);
      if (!res.ok) throw new Error('Failed to fetch temporary permissions');
      const data = await res.json();
      setTempPermissions(data);
    } catch (err: any) {
      console.error('Error fetching temp permissions:', err);
    } finally {
      setLoadingPerms(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const res = await http('/api/permissions');
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      setAllPermissions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      setAllPermissions([]);
    }
  };

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPermission) {
      setError('Please select a permission');
      return;
    }

    if (!endDate) {
      setError('End date is required');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setError('End date must be after start date');
      return;
    }

    try {
      setGranting(true);

      const res = await http(`/api/users/${userId}/temp-permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionCode: selectedPermission,
          startDate,
          endDate,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to grant permission');
      }

      // Reset form
      setSelectedPermission('');
      setReason('');
      const now = new Date();
      setStartDate(now.toISOString().slice(0, 16));
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setEndDate(weekLater.toISOString().slice(0, 16));

      // Refresh list and switch to view tab
      fetchTempPermissions();
      setActiveTab('view');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to grant permission');
    } finally {
      setGranting(false);
    }
  };

  const handleRevokePermission = async (tempPermId: string) => {
    if (!confirm('Are you sure you want to revoke this temporary permission?')) {
      return;
    }

    try {
      const res = await http(`/api/temp-permissions/${tempPermId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke permission');
      }

      fetchTempPermissions();
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke permission');
    }
  };

  const handleClose = () => {
    if (!granting) {
      setError(null);
      setActiveTab('view');
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group permissions by module - with safety check
  const permissionsByModule = (Array.isArray(allPermissions) ? allPermissions : []).reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string, endDate: string) => {
    const isExpired = new Date(endDate) < new Date();
    const displayStatus = isExpired && status === 'ACTIVE' ? 'EXPIRED' : status;

    const colors = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      REVOKED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[displayStatus as keyof typeof colors] || colors.EXPIRED}`}>
        {displayStatus}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Temporary Permissions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              for {userName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={granting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Current Permissions
          </button>
          <button
            onClick={() => setActiveTab('grant')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'grant'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Grant New Permission
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* View Tab */}
          {activeTab === 'view' && (
            <div className="space-y-3">
              {loadingPerms ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : tempPermissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No temporary permissions found
                </div>
              ) : (
                tempPermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {perm.permissionCode}
                        </h4>
                        {perm.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {perm.reason}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(perm.status, perm.endDate)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>Start: {formatDateTime(perm.startDate)}</div>
                      <div>End: {formatDateTime(perm.endDate)}</div>
                    </div>
                    {perm.status === 'ACTIVE' && new Date(perm.endDate) > new Date() && (
                      <button
                        onClick={() => handleRevokePermission(perm.id)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Grant Tab */}
          {activeTab === 'grant' && (
            <form onSubmit={handleGrantPermission} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Permission <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={granting}
                  required
                >
                  <option value="">Select a permission</option>
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <optgroup key={module} label={module}>
                      {perms.map((perm) => (
                        <option key={perm.code} value={perm.code}>
                          {perm.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={granting}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={granting}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this temporary permission needed?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={granting}
                  maxLength={500}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={granting}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting || !selectedPermission || !endDate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {granting ? 'Granting...' : 'Grant Permission'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

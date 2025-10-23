// web/src/features/admin/UserManagement.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../common/AuthProvider';
import PermissionGate from '../../components/auth/PermissionGate';
import InviteUserModal from './InviteUserModal';
import EditUserModal from './EditUserModal';
import TemporaryPermissionsModal from './TemporaryPermissionsModal';
import { http } from '../../lib/http';
import { useToast } from '../../ui/toast/ToastProvider';

type User = {
  id: string;
  email: string;
  name?: string;
  status: string;
  isActive: boolean;
  mfaSecret?: string;
  mfaEnforcedAt?: string;
  trustDeviceDuration?: number;
  auditRetentionDays?: number;
  department?: { id: string; name: string };
  roles?: ({ id: string; name: string } | string)[];
  createdAt?: string;
};

export default function UserManagement() {
  const { hasPermission } = useAuth();
  const { showToastOk, showToastErr } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userForTempPerms, setUserForTempPerms] = useState<User | null>(null);
  
  // Bulk operations
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<'role' | 'delete' | null>(null);
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [availableRoles, setAvailableRoles] = useState<{id: string; name: string}[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/admin/users');
      if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);
      const data = await res.json();
      setUsers(data.users || data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await http('/api/roles');
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setAvailableRoles(data);
    } catch (e: any) {
      console.error('Failed to load roles:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || colors.INACTIVE}`}>
        {status}
      </span>
    );
  };

  const handleEdit = (user: User) => {
    setUserToEdit(user);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      const res = await http(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      // Success - refresh user list and close modal
      await fetchUsers();
      setUserToDelete(null);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setUserToDelete(null);
  };

  const handleResendInvitation = async (user: User) => {
    if (!confirm(`Resend invitation email to ${user.email}?`)) {
      return;
    }

    try {
      const res = await http(`/api/admin/users/${user.id}/resend-invitation`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resend invitation');
      }

      const data = await res.json();
      showToastOk(`Invitation email sent to ${user.email}`);
      await fetchUsers();
    } catch (e: any) {
      showToastErr(e?.message ?? 'Failed to resend invitation');
    }
  };

  const handleDisableMFA = async (user: User) => {
    if (!confirm(`⚠️ DISABLE MFA for ${user.email}?\n\nThis will remove two-factor authentication from this account. They will need to set it up again.\n\nThis action should only be done in exceptional circumstances.`)) {
      return;
    }

    try {
      const res = await http(`/api/admin/users/${user.id}/disable-mfa`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to disable MFA');
      }

      showToastOk(`MFA disabled for ${user.email}`);
      await fetchUsers();
    } catch (e: any) {
      showToastErr(e?.message ?? 'Failed to disable MFA');
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const handleBulkRoleAssignment = async () => {
    if (!bulkRoleId || selectedUsers.size === 0) {
      alert('Please select a role and users');
      return;
    }

    try {
      setBulkProcessing(true);
      const promises = Array.from(selectedUsers).map(userId =>
        http(`/api/users/${userId}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId: bulkRoleId }),
        })
      );

      await Promise.all(promises);
      
      setSelectedUsers(new Set());
      setBulkAction(null);
      setBulkRoleId('');
      setShowBulkActions(false);
      fetchUsers();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to assign roles');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkProcessing(true);
      const promises = Array.from(selectedUsers).map(userId =>
        http(`/api/admin/users/${userId}`, { method: 'DELETE' })
      );

      await Promise.all(promises);
      
      setSelectedUsers(new Set());
      setBulkAction(null);
      setShowBulkActions(false);
      fetchUsers();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete users');
    } finally {
      setBulkProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">Error: {error}</p>
          <button
            onClick={fetchUsers}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Users</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {users.length} total users {selectedUsers.size > 0 && `• ${selectedUsers.size} selected`}
          </p>
        </div>
        <div className="flex space-x-3">
          {selectedUsers.size > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Bulk Actions ({selectedUsers.size})
            </button>
          )}
          <PermissionGate permission="USER_CREATE">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Invite User
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedUsers.size > 0 && (
        <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Bulk Actions ({selectedUsers.size} users selected)
          </h3>
          <div className="flex flex-wrap gap-3">
            <PermissionGate permission="USER_EDIT">
              <button
                onClick={() => setBulkAction('role')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
              >
                Assign Role
              </button>
            </PermissionGate>
            <PermissionGate permission="USER_DELETE">
              <button
                onClick={() => setBulkAction('delete')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
              >
                Delete Selected
              </button>
            </PermissionGate>
            <button
              onClick={() => {
                setSelectedUsers(new Set());
                setShowBulkActions(false);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Clear Selection
            </button>
          </div>

          {/* Bulk Action Forms */}
          {bulkAction === 'role' && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Role to Assign
              </label>
              <div className="flex space-x-3">
                <select
                  value={bulkRoleId}
                  onChange={(e) => setBulkRoleId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={bulkProcessing}
                >
                  <option value="">Choose a role...</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkRoleAssignment}
                  disabled={!bulkRoleId || bulkProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {bulkProcessing ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  onClick={() => setBulkAction(null)}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {bulkAction === 'delete' && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                Are you sure you want to delete {selectedUsers.size} user(s)? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {bulkProcessing ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => setBulkAction(null)}
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                MFA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => toggleSelectUser(user.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name || 'No name'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.department?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(user.roles) && user.roles.length > 0 ? (
                      user.roles.map((role) => {
                        const key = typeof role === 'string' ? role : role.id || role.name;
                        const label = typeof role === 'string' ? role : role.name;
                        return (
                          <span
                            key={String(key)}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded"
                          >
                            {label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No roles</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.mfaSecret && user.mfaEnforcedAt ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full flex items-center gap-1 w-fit">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Enabled
                    </span>
                  ) : user.mfaSecret ? (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded-full">
                      Pending
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <PermissionGate permission="USER_EDIT">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                    >
                      Edit
                    </button>
                    {user.status === 'PENDING' && (
                      <button 
                        onClick={() => handleResendInvitation(user)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                        title="Resend invitation email"
                      >
                        Resend Invite
                      </button>
                    )}
                    {user.mfaSecret && user.mfaEnforcedAt && (
                      <button 
                        onClick={() => handleDisableMFA(user)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 mr-3"
                        title="Disable MFA for this user (Admin only)"
                      >
                        Disable MFA
                      </button>
                    )}
                    <button 
                      onClick={() => setUserForTempPerms(user)}
                      className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 mr-3"
                      title="Manage temporary permissions"
                    >
                      Temp Perms
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="USER_DELETE">
                    <button 
                      onClick={() => handleDeleteClick(user)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={fetchUsers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={!!userToEdit}
        user={userToEdit}
        onClose={() => setUserToEdit(null)}
        onSuccess={fetchUsers}
      />

      {/* Temporary Permissions Modal */}
      <TemporaryPermissionsModal
        isOpen={!!userForTempPerms}
        userId={userForTempPerms?.id || ''}
        userName={userForTempPerms?.name || userForTempPerms?.email || ''}
        onClose={() => setUserForTempPerms(null)}
        onSuccess={fetchUsers}
      />

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Delete User
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{userToDelete.name || userToDelete.email}</strong>?
              This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

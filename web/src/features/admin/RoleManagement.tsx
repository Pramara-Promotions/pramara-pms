// web/src/features/admin/RoleManagement.tsx
import { useState, useEffect } from 'react';
import PermissionGate from '../../components/auth/PermissionGate';
import CreateRoleModal from './CreateRoleModal';
import EditRoleModal from './EditRoleModal';
import { http } from '../../lib/http';

type Role = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  permissions: string[];
  userCount?: number;
  createdAt?: string;
};

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/roles');
      if (!res.ok) throw new Error(`Failed to fetch roles (${res.status})`);
      const data = await res.json();
      setRoles(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    
    setDeleting(true);
    try {
      const res = await http(`/api/roles/${roleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete role');
      }

      await fetchRoles();
      setRoleToDelete(null);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading roles...</div>
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Roles</h2>
        <PermissionGate permission="ROLE_CREATE">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Create Role
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {role.name}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                role.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {role.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {role.description || 'No description'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {role.permissions?.length || 0} permissions
            </p>
            <div className="flex items-center justify-between text-sm space-x-2">
              <span className="text-gray-500 dark:text-gray-400">
                {role.userCount || 0} users
              </span>
              <div className="flex space-x-2">
                <PermissionGate permission="ROLE_EDIT">
                  <button 
                    onClick={() => setRoleToEdit(role)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Edit
                  </button>
                </PermissionGate>
                <PermissionGate permission="ROLE_DELETE">
                  <button 
                    onClick={() => handleDeleteClick(role)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                    disabled={role.name === 'Super Admin'}
                  >
                    Delete
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No roles found</p>
        </div>
      )}

      {/* Modals */}
      <CreateRoleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchRoles}
      />

      <EditRoleModal
        isOpen={!!roleToEdit}
        role={roleToEdit}
        onClose={() => setRoleToEdit(null)}
        onSuccess={fetchRoles}
      />

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Delete Role
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the role <strong>{roleToDelete.name}</strong>?
              {roleToDelete.userCount && roleToDelete.userCount > 0 ? (
                <span className="block mt-2 text-red-600 dark:text-red-400">
                  This role is assigned to {roleToDelete.userCount} user(s). They will lose these permissions.
                </span>
              ) : null}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRoleToDelete(null)}
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
                {deleting ? 'Deleting...' : 'Delete Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

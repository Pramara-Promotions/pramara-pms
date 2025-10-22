// web/src/features/admin/RoleManagement.tsx
import { useState, useEffect } from 'react';
import PermissionGate from '../../components/auth/PermissionGate';
import { http } from '../../lib/http';

type Role = {
  id: string;
  name: string;
  description?: string;
  status: string;
  _count?: { users: number };
  createdAt?: string;
};

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/admin/roles');
      if (!res.ok) throw new Error(`Failed to fetch roles (${res.status})`);
      const data = await res.json();
      setRoles(data.roles || data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load roles');
    } finally {
      setLoading(false);
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
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
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
                {role.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {role.description || 'No description'}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {role._count?.users || 0} users
              </span>
              <PermissionGate permission="ROLE_EDIT">
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  Edit
                </button>
              </PermissionGate>
            </div>
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No roles found</p>
        </div>
      )}
    </div>
  );
}

// web/src/features/admin/DepartmentManagement.tsx
import { useState, useEffect } from 'react';
import PermissionGate from '../../components/auth/PermissionGate';
import { http } from '../../lib/http';

type Department = {
  id: string;
  name: string;
  description?: string;
  _count?: { users: number };
};

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/departments');
      if (!res.ok) throw new Error(`Failed to fetch departments (${res.status})`);
      const data = await res.json();
      setDepartments(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading departments...</div>
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Departments</h2>
        <PermissionGate permission="USER_CREATE">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            + Create Department
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {dept.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {dept.description || 'No description'}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {dept._count?.users || 0} members
              </span>
              <PermissionGate permission="USER_EDIT">
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  Edit
                </button>
              </PermissionGate>
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No departments found</p>
        </div>
      )}
    </div>
  );
}

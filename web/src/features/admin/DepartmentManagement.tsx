// web/src/features/admin/DepartmentManagement.tsx
import { useState, useEffect } from 'react';
import PermissionGate from '../../components/auth/PermissionGate';
import { http } from '../../lib/http';
import CreateDepartmentModal from './CreateDepartmentModal';
import EditDepartmentModal from './EditDepartmentModal';

type Department = {
  id: string;
  name: string;
  description?: string | null;
  _count?: { users: number };
};

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department);
  };

  const handleDeleteConfirm = async () => {
    if (!departmentToDelete) return;

    try {
      setDeleting(true);
      const res = await http(`/api/departments/${departmentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete department');
      }

      setDepartmentToDelete(null);
      fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete department');
    } finally {
      setDeleting(false);
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
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
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
              <div className="flex space-x-2">
                <PermissionGate permission="USER_EDIT">
                  <button 
                    onClick={() => setDepartmentToEdit(dept)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Edit
                  </button>
                </PermissionGate>
                <PermissionGate permission="USER_DELETE">
                  <button 
                    onClick={() => handleDeleteClick(dept)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    Delete
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No departments found</p>
        </div>
      )}

      {/* Modals */}
      <CreateDepartmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchDepartments}
      />

      <EditDepartmentModal
        isOpen={!!departmentToEdit}
        department={departmentToEdit}
        onClose={() => setDepartmentToEdit(null)}
        onSuccess={fetchDepartments}
      />

      {/* Delete Confirmation Modal */}
      {departmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Delete Department
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the department <strong>{departmentToDelete.name}</strong>?
              {departmentToDelete._count && departmentToDelete._count.users > 0 ? (
                <span className="block mt-2 text-red-600 dark:text-red-400">
                  This department has {departmentToDelete._count.users} member(s). Please reassign them first.
                </span>
              ) : null}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDepartmentToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting || (departmentToDelete._count && departmentToDelete._count.users > 0)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

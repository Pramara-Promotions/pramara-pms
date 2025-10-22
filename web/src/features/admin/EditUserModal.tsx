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
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email,
        status: user.status,
        isActive: user.isActive,
        departmentId: user.department?.id || '',
        roleIds: user.roles?.map(r => typeof r === 'string' ? r : r.id) || [],
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
    if (!user || !newPassword) return;

    setResettingPassword(true);
    try {
      const res = await http(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      alert('Password reset successfully');
      setShowPasswordReset(false);
      setNewPassword('');
    } catch (e: any) {
      alert(e?.message ?? 'Failed to reset password');
    } finally {
      setResettingPassword(false);
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
                <div className="mt-3 space-y-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={!newPassword || resettingPassword}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {resettingPassword ? 'Resetting...' : 'Reset Password'}
                  </button>
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

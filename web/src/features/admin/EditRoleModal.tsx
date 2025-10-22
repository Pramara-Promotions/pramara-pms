// web/src/features/admin/EditRoleModal.tsx
import { useState, useEffect } from 'react';
import { http } from '../../lib/http';

type Permission = {
  code: string;
  label: string;
};

type PermissionsByModule = {
  [module: string]: Permission[];
};

type Role = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
};

type EditRoleModalProps = {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditRoleModal({ isOpen, role, onClose, onSuccess }: EditRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || [],
      });
      fetchPermissions();
    }
  }, [isOpen, role]);

  const fetchPermissions = async () => {
    try {
      const res = await http('/api/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissionsByModule(data.byModule || {});
      }
    } catch (e) {
      console.error('Failed to load permissions', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setLoading(true);
    setError(null);

    try {
      const res = await http(`/api/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      // Success
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (code: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(code)
        ? prev.permissions.filter(p => p !== code)
        : [...prev.permissions, code],
    }));
  };

  const handleModuleSelectAll = (module: string, checked: boolean) => {
    const moduleCodes = permissionsByModule[module]?.map(p => p.code) || [];
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...moduleCodes])]
        : prev.permissions.filter(p => !moduleCodes.includes(p)),
    }));
  };

  const isModuleSelected = (module: string) => {
    const moduleCodes = permissionsByModule[module]?.map(p => p.code) || [];
    return moduleCodes.length > 0 && moduleCodes.every(code => formData.permissions.includes(code));
  };

  const isSuperAdmin = role?.name === 'Super Admin';

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Role: {role.name}
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

          {/* Super Admin Warning */}
          {isSuperAdmin && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ Super Admin role name cannot be changed. Permissions can still be modified.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Role Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                required
                disabled={isSuperAdmin}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., Project Manager"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this role..."
              />
            </div>

            {/* Permissions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Permissions
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-96 overflow-y-auto">
                {Object.entries(permissionsByModule).map(([module, permissions]) => (
                  <div key={module} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{module}</span>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isModuleSelected(module)}
                          onChange={(e) => handleModuleSelectAll(module, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Select All</span>
                      </label>
                    </div>
                    <div className="p-4 space-y-2">
                      {permissions.map(perm => (
                        <label key={perm.code} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(perm.code)}
                            onChange={() => handlePermissionToggle(perm.code)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">{perm.label}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">({perm.code})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Selected: {formData.permissions.length} permissions
              </p>
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

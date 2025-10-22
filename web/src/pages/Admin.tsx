import { useState } from 'react';
import { useAuth } from '../features/common/AuthProvider';
import RoleGate from '../components/auth/RoleGate';
import UserManagement from '../features/admin/UserManagement';
import RoleManagement from '../features/admin/RoleManagement';
import DepartmentManagement from '../features/admin/DepartmentManagement';
import DeviceManagement from '../features/admin/DeviceManagement';
import AuditLogViewer from '../features/admin/AuditLogViewer';

type TabType = 'users' | 'roles' | 'departments' | 'devices' | 'audit';

export default function Admin() {
  const { isSuperAdmin, hasAnyPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Check if user has any admin permissions
  const hasAdminAccess = isSuperAdmin() || hasAnyPermission(
    'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE',
    'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE',
    'AUDIT_VIEW'
  );

  if (!hasAdminAccess) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600">You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; permission?: string | string[]; requireSuperAdmin?: boolean }[] = [
    { id: 'users', label: 'Users', permission: 'USER_VIEW' },
    { id: 'roles', label: 'Roles', permission: 'ROLE_VIEW' },
    { id: 'departments', label: 'Departments', permission: 'USER_VIEW' },
    { id: 'devices', label: 'Devices', requireSuperAdmin: true },
    { id: 'audit', label: 'Audit Logs', permission: 'AUDIT_VIEW' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'departments':
        return <DepartmentManagement />;
      case 'devices':
        return <DeviceManagement />;
      case 'audit':
        return <AuditLogViewer />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage users, roles, departments, and system settings
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 px-6">
          {tabs.map((tab) => {
            // Check if user has access to this tab
            const hasTabAccess = tab.requireSuperAdmin 
              ? isSuperAdmin() 
              : tab.permission 
                ? hasAnyPermission(...(Array.isArray(tab.permission) ? tab.permission : [tab.permission]))
                : true;

            if (!hasTabAccess) return null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}

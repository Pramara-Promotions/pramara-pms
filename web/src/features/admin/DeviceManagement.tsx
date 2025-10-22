// web/src/features/admin/DeviceManagement.tsx
import { useState, useEffect } from 'react';
import RoleGate from '../../components/auth/RoleGate';
import { http } from '../../lib/http';

type Device = {
  id: string;
  fingerprint: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  ipAddress?: string;
  isTrusted: boolean;
  lastUsedAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
};

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/devices');
      if (!res.ok) throw new Error(`Failed to fetch devices (${res.status})`);
      const data = await res.json();
      setDevices(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke access for this device?')) return;
    
    try {
      const res = await http(`/api/devices/${deviceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke device');
      await fetchDevices();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to revoke device');
    }
  };

  const handleForceLogout = async (deviceId: string) => {
    if (!confirm('Force logout this device?')) return;
    
    try {
      const res = await http(`/api/devices/${deviceId}/logout`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to logout device');
      await fetchDevices();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to logout device');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading devices...</div>
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
    <RoleGate requireSuperAdmin fallback={
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">Only Super Admins can manage devices</p>
      </div>
    }>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {devices.length} active devices
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {device.user?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {device.user?.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {device.deviceName || 'Unnamed Device'}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {device.browser} on {device.os}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {device.ipAddress || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(device.lastUsedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      device.isTrusted
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {device.isTrusted ? 'Trusted' : 'Untrusted'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleForceLogout(device.id)}
                      className="text-orange-600 hover:text-orange-900 dark:text-orange-400 mr-3"
                    >
                      Logout
                    </button>
                    <button
                      onClick={() => handleRevokeDevice(device.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {devices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No devices found</p>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}

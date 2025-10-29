// web/src/features/admin/AuditLogViewer.tsx
import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import PermissionGate from '../../components/auth/PermissionGate';
import { http } from '../../lib/http';

type AuditLog = {
  id: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  isFlagged: boolean;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    // Check if banner was dismissed in this session
    return sessionStorage.getItem('auditBannerDismissed') === 'true';
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = filter === 'flagged' ? '/api/audit-logs/flagged' : '/api/audit-logs';
      const res = await http(endpoint);
      if (!res.ok) throw new Error(`Failed to fetch audit logs (${res.status})`);
      const data = await res.json();
      
      // Map backend structure to frontend model
      const rawLogs = data.logs || data;
      const mappedLogs: AuditLog[] = Array.isArray(rawLogs) ? rawLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        details: log.meta || log.details || log.changes,
        ipAddress: log.ip || log.ipAddress,
        userAgent: log.userAgent,
        isFlagged: log.flagged || log.isFlagged || false,
        createdAt: log.createdAt,
        user: log.actor || log.user,
      })) : [];
      
      setLogs(mappedLogs);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem('auditBannerDismissed', 'true');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading audit logs...</div>
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
    <PermissionGate permission="AUDIT_VIEW" fallback={
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to view audit logs</p>
      </div>
    }>
      <div className="p-6">
        {/* Retention Policy Banner */}
        {!bannerDismissed && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Audit Log Retention Policy
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Audit logs are automatically retained for <strong>15 days</strong> from the date of creation.
                After this period, logs are permanently deleted to comply with data retention policies.
                If you need to retain logs for longer periods, please export them regularly.
              </p>
            </div>
            <button
              onClick={handleDismissBanner}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Audit Logs</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setFilter('flagged')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'flagged'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              🚩 Flagged Only
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      log.isFlagged ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.user?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.user?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {log.action}
                      </div>
                      {log.details && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {JSON.stringify(log.details).substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.isFlagged && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded">
                          🚩 Flagged
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}

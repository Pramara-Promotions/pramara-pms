// web/src/features/common/PermissionRequestManagement.tsx
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import PermissionGate from '../../components/auth/PermissionGate';
import { http } from '../../lib/http';

interface PermissionRequest {
  id: string;
  userId: string;
  permissionCode: string;
  reason: string;
  duration?: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  response?: string | null;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

interface Permission {
  code: string;
  name: string;
  description?: string | null;
  module: string;
}

export default function PermissionRequestManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  
  // Create request modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermission, setSelectedPermission] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7');
  const [creating, setCreating] = useState(false);
  
  // Review request
  const [reviewingRequest, setReviewingRequest] = useState<PermissionRequest | null>(null);
  const [reviewResponse, setReviewResponse] = useState('');
  const [isTemporary, setIsTemporary] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  const isAdmin = hasPermission('USER_EDIT');

  useEffect(() => {
    fetchRequests();
    if (isAdmin) {
      fetchAllPermissions();
    }
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusParam = filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await http(`/api/permission-requests${statusParam}`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const res = await http('/api/permissions');
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      setAllPermissions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      setAllPermissions([]);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPermission || !reason.trim()) {
      alert('Please select a permission and provide a reason');
      return;
    }

    try {
      setCreating(true);

      const res = await http('/api/permission-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionCode: selectedPermission,
          reason: reason.trim(),
          duration: duration ? parseInt(duration) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create request');
      }

      setShowCreateModal(false);
      setSelectedPermission('');
      setReason('');
      setDuration('7');
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!reviewingRequest) return;

    try {
      setReviewing(true);

      const res = await http(`/api/permission-requests/${reviewingRequest.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          response: reviewResponse.trim() || undefined,
          temporary: approved ? isTemporary : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to review request');
      }

      setReviewingRequest(null);
      setReviewResponse('');
      setIsTemporary(true);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to review request');
    } finally {
      setReviewing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  // Group permissions by module - with safety check
  const permissionsByModule = (Array.isArray(allPermissions) ? allPermissions : []).reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Permission Requests
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          + Request Permission
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">Error: {error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No requests found</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {request.permissionCode}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Requested by: <strong>{request.user.name || request.user.email}</strong>
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <strong>Reason:</strong> {request.reason}
              </p>

              {request.duration && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Requested duration: {request.duration} days
                </p>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Requested: {formatDate(request.requestedAt)}
              </p>

              {request.reviewedAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Reviewed: {formatDate(request.reviewedAt)}
                </p>
              )}

              {request.response && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <strong>Response:</strong> {request.response}
                </p>
              )}

              {isAdmin && request.status === 'PENDING' && (
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => setReviewingRequest(request)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                  >
                    Review
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Request Permission
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Permission <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={creating}
                  required
                >
                  <option value="">Select a permission</option>
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <optgroup key={module} label={module}>
                      {perms.map((perm) => (
                        <option key={perm.code} value={perm.code}>
                          {perm.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you need this permission?"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                  disabled={creating}
                  required
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={creating}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank for permanent access
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {creating ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Review Request
              </h3>
              <button
                onClick={() => setReviewingRequest(null)}
                disabled={reviewing}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">User:</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {reviewingRequest.user.name || reviewingRequest.user.email}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Permission:</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {reviewingRequest.permissionCode}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reason:</p>
                <p className="text-gray-900 dark:text-white">{reviewingRequest.reason}</p>
              </div>

              {reviewingRequest.duration && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Requested Duration:</p>
                  <p className="text-gray-900 dark:text-white">{reviewingRequest.duration} days</p>
                </div>
              )}

              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    checked={isTemporary}
                    onChange={(e) => setIsTemporary(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Grant as temporary permission
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Response (optional)
                </label>
                <textarea
                  value={reviewResponse}
                  onChange={(e) => setReviewResponse(e.target.value)}
                  placeholder="Add a note for the user"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  disabled={reviewing}
                  maxLength={500}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => handleReview(false)}
                  disabled={reviewing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {reviewing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleReview(true)}
                  disabled={reviewing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {reviewing ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

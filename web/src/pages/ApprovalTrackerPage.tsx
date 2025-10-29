import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';

interface Approval {
  id: string;
  title: string;
  approvalType: string;
  status: string;
  dueDate: string;
  expectedDate: string;
  bufferDays: number;
  isOverdue: boolean;
  isAtRisk: boolean;
  Project: { projectCode: string; projectName: string };
  contactPerson?: string;
  contactEmail?: string;
}

export default function ApprovalTrackerPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [bufferStatus, setBufferStatus] = useState<any>({});
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchApprovals(),
        fetchBufferStatus(),
        fetchSummary()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovals = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('approvalType', filterType);
      
      const response = await apiGet(`/api/approvals?${params}`);
      setApprovals(response.approvals || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    }
  };

  const fetchBufferStatus = async () => {
    try {
      const response = await apiGet('/api/approvals/analytics/buffer-status');
      setBufferStatus(response);
    } catch (error) {
      console.error('Error fetching buffer status:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiGet('/api/approvals/dashboard/summary');
      setSummary(response);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiPost(`/api/approvals/${id}/approve`, { notes: 'Approved' });
      fetchData();
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve');
    }
  };

  const handleSendReminder = async (id: string) => {
    try {
      await apiPost(`/api/approvals/${id}/reminders`, { channel: 'email' });
      alert('Reminder sent successfully');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder');
    }
  };

  const getBufferColor = (bufferDays: number, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-600';
    if (bufferDays < 2) return 'bg-red-500';
    if (bufferDays < 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Approval Tracker</h1>
        <p className="text-gray-600 mt-1">Monitor approvals, buffers, and send reminders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Pending</div>
          <div className="text-2xl font-bold text-gray-900">{summary.byStatus?.pending || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Overdue</div>
          <div className="text-2xl font-bold text-red-600">{summary.overdueCount || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Critical</div>
          <div className="text-2xl font-bold text-orange-600">{bufferStatus.summary?.critical || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">At Risk</div>
          <div className="text-2xl font-bold text-yellow-600">{bufferStatus.summary?.atRisk || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Healthy</div>
          <div className="text-2xl font-bold text-green-600">{bufferStatus.summary?.healthy || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="overridden">Overridden</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="customer_signoff">Customer Sign-off</option>
              <option value="vendor_delivery">Vendor Delivery</option>
              <option value="certification">Certification</option>
              <option value="internal">Internal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buffer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approvals.map(approval => (
                <tr key={approval.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getBufferColor(approval.bufferDays, approval.isOverdue)}`}></div>
                      <span className={`font-bold ${
                        approval.isOverdue ? 'text-red-600' :
                        approval.bufferDays < 2 ? 'text-red-600' :
                        approval.bufferDays < 5 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {approval.isOverdue ? 'OVERDUE' : `${approval.bufferDays}d`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{approval.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{approval.Project.projectCode}</div>
                    <div className="text-sm text-gray-500">{approval.Project.projectName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {approval.approvalType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{approval.contactPerson || '-'}</div>
                    <div className="text-xs text-gray-500">{approval.contactEmail || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(approval.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                      approval.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      approval.status === 'overridden' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {approval.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {approval.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleSendReminder(approval.id)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Remind
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {approvals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No approvals found
        </div>
      )}
    </div>
  );
}

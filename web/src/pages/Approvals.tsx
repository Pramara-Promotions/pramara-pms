import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Approval {
  id: string;
  type: string;
  requestedBy: string;
  requestedAt: string;
  respondedBy?: string;
  respondedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  bufferDays?: number;
  ragColor?: 'red' | 'yellow' | 'green';
  comments?: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [bufferReport, setBufferReport] = useState<Approval[]>([]);
  const [view, setView] = useState<'pending' | 'buffer' | 'history'>('pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApprovals();
    loadBufferReport();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/approvals`, { withCredentials: true });
      setApprovals(res.data as Approval[]);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBufferReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/approvals/buffer-report`, {
        withCredentials: true
      });
      setBufferReport(res.data as Approval[]);
    } catch (error) {
      console.error('Failed to load buffer report:', error);
    }
  };

  const handleSendReminder = async (approvalId: string) => {
    try {
      await axios.post(
        `${API_BASE}/approvals/${approvalId}/remind`,
        {},
        { withCredentials: true }
      );
      alert('Reminder sent successfully');
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRAGColor = (color?: string) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const completedApprovals = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-sm text-gray-600">Track approval requests, buffer monitoring, and reminders</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 font-medium text-sm">
            Send All Reminders
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            New Request
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingApprovals.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Red Zone</div>
          <div className="text-2xl font-bold text-red-600">
            {bufferReport.filter((a) => a.ragColor === 'red').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Yellow Zone</div>
          <div className="text-2xl font-bold text-yellow-600">
            {bufferReport.filter((a) => a.ragColor === 'yellow').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600 mb-1">Green Zone</div>
          <div className="text-2xl font-bold text-green-600">
            {bufferReport.filter((a) => a.ragColor === 'green').length}
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => setView('buffer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'buffer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Buffer Report
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              view === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading approvals...
        </div>
      )}

      {/* Pending Approvals View */}
      {!loading && view === 'pending' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Requested By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Requested At</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Buffer Days</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No pending approvals.
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((approval) => (
                  <tr key={approval.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{approval.type}</td>
                    <td className="px-4 py-3 text-gray-600">{approval.requestedBy}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(approval.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getRAGColor(approval.ragColor)}`}></span>
                        <span className="font-mono">{approval.bufferDays || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(approval.status)}`}>
                        {approval.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSendReminder(approval.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                      >
                        Remind
                      </button>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Buffer Report View */}
      {!loading && view === 'buffer' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-900">Buffer Day Report (Sorted by Urgency)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Requested By</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Buffer Days</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bufferReport.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No approval requests with buffer data.
                  </td>
                </tr>
              ) : (
                bufferReport.map((approval, idx) => (
                  <tr key={approval.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <div className={`w-8 h-8 rounded-full ${getRAGColor(approval.ragColor)} flex items-center justify-center text-white font-bold text-xs mx-auto`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{approval.type}</td>
                    <td className="px-4 py-3 text-gray-600">{approval.requestedBy}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-bold ${
                        approval.ragColor === 'red' ? 'text-red-600' :
                        approval.ragColor === 'yellow' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {approval.bufferDays} days
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(approval.status)}`}>
                        {approval.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Expedite
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* History View */}
      {!loading && view === 'history' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Requested By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Responded By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Responded At</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Comments</th>
              </tr>
            </thead>
            <tbody>
              {completedApprovals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No completed approvals.
                  </td>
                </tr>
              ) : (
                completedApprovals.map((approval) => (
                  <tr key={approval.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{approval.type}</td>
                    <td className="px-4 py-3 text-gray-600">{approval.requestedBy}</td>
                    <td className="px-4 py-3 text-gray-600">{approval.respondedBy || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {approval.respondedAt ? new Date(approval.respondedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(approval.status)}`}>
                        {approval.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{approval.comments || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


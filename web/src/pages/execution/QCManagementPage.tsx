import { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';

interface QCSubmission {
  id: number;
  projectId: number;
  stationId: number | null;
  batchCode: string | null;
  submissionDate: string;
  inspectorId: string;
  sampleSize: number;
  passedQty: number | null;
  failedQty: number | null;
  defectQty: number | null;
  result: string;
  status: string;
  inspectorNotes: string | null;
  approverNotes: string | null;
  approvedAt: string | null;
  createdAt: string;
  project: { id: number; name: string };
  station: { id: number; name: string; code: string } | null;
  inspector: { id: string; name: string };
  approver: { id: string; name: string } | null;
  _count: { defects: number };
}

interface QCAnalytics {
  totalSubmissions: number;
  byResult: Record<string, number>;
  byStatus: Record<string, number>;
  quality: {
    totalChecked: number;
    totalPassed: number;
    totalFailed: number;
    totalDefects: number;
    passRate: number;
    avgSampleSize: number;
  };
}

const QCManagementPage = () => {
  const [submissions, setSubmissions] = useState<QCSubmission[]>([]);
  const [analytics, setAnalytics] = useState<QCAnalytics | null>(null);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [stations, setStations] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<QCSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    stationId: '',
    batchCode: '',
    submissionDate: new Date().toISOString().split('T')[0],
    inspectorId: '',
    sampleSize: 0,
    passedQty: 0,
    failedQty: 0,
    defectQty: 0,
    result: 'pending',
    inspectorNotes: '',
  });

  const resultOptions = [
    { value: 'pass', label: 'Pass', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { value: 'fail', label: 'Fail', icon: XCircle, color: 'text-red-600 bg-red-100' },
    { value: 'conditional', label: 'Conditional', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
    { value: 'pending', label: 'Pending', icon: Clock, color: 'text-gray-600 bg-gray-100' },
  ];

  const statusOptions = [
    { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  ];

  useEffect(() => {
    fetchSubmissions();
    fetchAnalytics();
    fetchProjects();
    fetchStations();
    fetchUsers();
  }, [projectFilter, statusFilter, resultFilter]);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.append('projectId', projectFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (resultFilter) params.append('result', resultFilter);

      const res = await fetch(`/api/qc-submissions?${params}`, { credentials: 'include' });
      if (res.ok) setSubmissions(await res.json());
    } catch (error) {
      console.error('Error fetching QC submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.append('projectId', projectFilter);

      const res = await fetch(`/api/qc-submissions/analytics/summary?${params}`, { credentials: 'include' });
      if (res.ok) setAnalytics(await res.json());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?status=active', { credentials: 'include' });
      if (res.ok) setProjects(await res.json());
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchStations = async () => {
    try {
      const res = await fetch('/api/stations', { credentials: 'include' });
      if (res.ok) setStations(await res.json());
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = selectedSubmission ? `/api/qc-submissions/${selectedSubmission.id}` : '/api/qc-submissions';
      const method = selectedSubmission ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchSubmissions();
        fetchAnalytics();
      } else {
        alert('Failed to save QC submission');
      }
    } catch (error) {
      console.error('Error saving QC submission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (submissionId: number) => {
    if (!confirm('Approve this QC submission?')) return;
    
    try {
      const res = await fetch(`/api/qc-submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approverNotes: 'Approved' }),
      });

      if (res.ok) {
        fetchSubmissions();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleReject = async (submissionId: number) => {
    const notes = prompt('Reason for rejection:');
    if (!notes) return;
    
    try {
      const res = await fetch(`/api/qc-submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approverNotes: notes }),
      });

      if (res.ok) {
        fetchSubmissions();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      stationId: '',
      batchCode: '',
      submissionDate: new Date().toISOString().split('T')[0],
      inspectorId: '',
      sampleSize: 0,
      passedQty: 0,
      failedQty: 0,
      defectQty: 0,
      result: 'pending',
      inspectorNotes: '',
    });
    setSelectedSubmission(null);
  };

  const handleEdit = (submission: QCSubmission) => {
    setSelectedSubmission(submission);
    setFormData({
      projectId: submission.projectId.toString(),
      stationId: submission.stationId?.toString() || '',
      batchCode: submission.batchCode || '',
      submissionDate: submission.submissionDate.split('T')[0],
      inspectorId: submission.inspectorId,
      sampleSize: submission.sampleSize,
      passedQty: submission.passedQty || 0,
      failedQty: submission.failedQty || 0,
      defectQty: submission.defectQty || 0,
      result: submission.result,
      inspectorNotes: submission.inspectorNotes || '',
    });
    setIsModalOpen(true);
  };

  const getResultConfig = (result: string) => {
    return resultOptions.find(r => r.value === result) || resultOptions[3];
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="text-blue-600" size={32} />
            QC Management
          </h1>
          <p className="text-gray-600 mt-1">Quality control inspections and approvals</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Inspection
        </button>
      </div>

      {analytics && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Inspections</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalSubmissions}</p>
              </div>
              <Eye className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pass Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.quality.passRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Passed</p>
                <p className="text-2xl font-bold text-green-600">{analytics.quality.totalPassed}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Failed</p>
                <p className="text-2xl font-bold text-red-600">{analytics.quality.totalFailed}</p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Defects</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.quality.totalDefects}</p>
              </div>
              <AlertTriangle className="text-orange-600" size={32} />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Results</option>
          {resultOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No QC submissions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const resultConfig = getResultConfig(submission.result);
            const statusConfig = getStatusConfig(submission.status);
            const ResultIcon = resultConfig.icon;
            return (
              <div key={submission.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${resultConfig.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                        <ResultIcon className={resultConfig.color.split(' ')[0]} size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{submission.project.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${resultConfig.color}`}>
                            {resultConfig.label}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Inspector: {submission.inspector.name} • {new Date(submission.submissionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-4 mb-4">
                  {submission.batchCode && (
                    <div>
                      <p className="text-gray-600 text-sm">Batch</p>
                      <p className="font-medium">{submission.batchCode}</p>
                    </div>
                  )}
                  {submission.station && (
                    <div>
                      <p className="text-gray-600 text-sm">Station</p>
                      <p className="font-medium">{submission.station.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600 text-sm">Sample Size</p>
                    <p className="font-medium">{submission.sampleSize}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Passed</p>
                    <p className="font-medium text-green-600">{submission.passedQty || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Failed</p>
                    <p className="font-medium text-red-600">{submission.failedQty || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Defects</p>
                    <p className="font-medium text-orange-600">{submission.defectQty || 0}</p>
                  </div>
                </div>

                {submission.inspectorNotes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 mb-1">Inspector Notes:</p>
                    <p className="text-sm text-gray-700">{submission.inspectorNotes}</p>
                  </div>
                )}

                {submission.approverNotes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-600 mb-1">Approver Notes:</p>
                    <p className="text-sm text-gray-700">{submission.approverNotes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(submission)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    View Details
                  </button>
                  {submission.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleApprove(submission.id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                      >
                        <ThumbsUp size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(submission.id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <ThumbsDown size={16} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{selectedSubmission ? 'Edit' : 'New'} QC Inspection</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Project *</label>
                    <select required value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Station</label>
                    <select value={formData.stationId} onChange={(e) => setFormData({ ...formData, stationId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Station</option>
                      {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Batch Code</label>
                    <input type="text" value={formData.batchCode} onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="BATCH-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Inspection Date *</label>
                    <input required type="date" value={formData.submissionDate} onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Inspector *</label>
                    <select required value={formData.inspectorId} onChange={(e) => setFormData({ ...formData, inspectorId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Inspector</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sample Size *</label>
                    <input required type="number" min="1" value={formData.sampleSize} onChange={(e) => setFormData({ ...formData, sampleSize: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Passed Qty</label>
                    <input type="number" min="0" value={formData.passedQty} onChange={(e) => setFormData({ ...formData, passedQty: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Failed Qty</label>
                    <input type="number" min="0" value={formData.failedQty} onChange={(e) => setFormData({ ...formData, failedQty: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Defect Qty</label>
                    <input type="number" min="0" value={formData.defectQty} onChange={(e) => setFormData({ ...formData, defectQty: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Result *</label>
                    <select required value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {resultOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Inspector Notes</label>
                    <textarea value={formData.inspectorNotes} onChange={(e) => setFormData({ ...formData, inspectorNotes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : selectedSubmission ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QCManagementPage;

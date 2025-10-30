import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { listProjects } from '../../lib/services/projects';
import { listPPS, createPPS, updatePPS, approvePPS, rejectPPS, deletePPS } from '../../lib/services/preproduction';

interface PPSApproval {
  id: string;
  projectId: number;
  ppsCode: string;
  documentName: string;
  documentUrl: string | null;
  version: string;
  submittedAt: string;
  reviewers: Reviewer[];
  currentStage: string;
  requiresChanges: boolean;
  changeRequests: ChangeRequest[] | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  status: string;
  notes: string | null;
  project: {
    id: number;
    code: string;
    name: string;
  };
  submitter: {
    id: string;
    name: string;
  };
  approver: {
    id: string;
    name: string;
  } | null;
  rejector: {
    id: string;
    name: string;
  } | null;
}

interface Reviewer {
  userId: string;
  name: string;
  role: string;
  reviewed: boolean;
  reviewedAt?: string;
  comments?: string;
}

interface ChangeRequest {
  id: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  resolved: boolean;
}

interface Project {
  id: number;
  code: string;
  name: string;
}

const PPSPage = () => {
  const [ppsApprovals, setPpsApprovals] = useState<PPSApproval[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPPS, setEditingPPS] = useState<PPSApproval | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPPS, setSelectedPPS] = useState<PPSApproval | null>(null);

  const [formData, setFormData] = useState({
    projectId: '',
    ppsCode: '',
    documentName: '',
    documentUrl: '',
    version: '1.0',
    notes: '',
  });

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: Clock },
    { value: 'in_review', label: 'In Review', color: 'bg-blue-100 text-blue-800', icon: Clock },
    { value: 'changes_requested', label: 'Changes Requested', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    { value: 'superseded', label: 'Superseded', color: 'bg-purple-100 text-purple-800', icon: Clock },
  ];

  const stageOptions = [
    { value: 'submission', label: 'Submission' },
    { value: 'technical_review', label: 'Technical Review' },
    { value: 'management_review', label: 'Management Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  useEffect(() => {
    fetchProjects();
    fetchPPSApprovals();
  }, [selectedProjectId, statusFilter, stageFilter]);

  const fetchProjects = async () => {
    try {
      const rows = await listProjects();
      setProjects(rows || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchPPSApprovals = async () => {
    setIsLoading(true);
    try {
      const rows = await listPPS({ projectId: selectedProjectId, status: statusFilter });
      setPpsApprovals(rows || []);
    } catch (error) {
      console.error('Error fetching PPS approvals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingPPS) {
        await updatePPS(editingPPS.id, formData);
      } else {
        await createPPS(formData);
      }
      setIsModalOpen(false);
      setEditingPPS(null);
      resetForm();
      fetchPPSApprovals();
    } catch (error) {
      console.error('Error saving PPS:', error);
      alert('Failed to save PPS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const effectiveDate = prompt('Enter effective date (YYYY-MM-DD):');
    const expiryDate = prompt('Enter expiry date (YYYY-MM-DD) (optional):');
    
    if (!effectiveDate) return;

    try {
      await approvePPS(id, JSON.stringify({ effectiveDate, expiryDate: expiryDate || null }));
      fetchPPSApprovals();
    } catch (error) {
      console.error('Error approving PPS:', error);
      alert('Failed to approve PPS');
    }
  };

  const handleReject = async (id: string) => {
    const rejectionReason = prompt('Enter rejection reason:');
    if (!rejectionReason) return;

    try {
      await rejectPPS(id, rejectionReason);
      fetchPPSApprovals();
    } catch (error) {
      console.error('Error rejecting PPS:', error);
      alert('Failed to reject PPS');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PPS approval?')) return;

    try {
      await deletePPS(id);
      fetchPPSApprovals();
    } catch (error) {
      console.error('Error deleting PPS approval:', error);
      alert('Failed to delete PPS approval');
    }
  };

  const handleEdit = (pps: PPSApproval) => {
    setEditingPPS(pps);
    setFormData({
      projectId: pps.projectId.toString(),
      ppsCode: pps.ppsCode,
      documentName: pps.documentName,
      documentUrl: pps.documentUrl || '',
      version: pps.version,
      notes: pps.notes || '',
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      ppsCode: '',
      documentName: '',
      documentUrl: '',
      version: '1.0',
      notes: '',
    });
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const getStageLabel = (stage: string) => {
    return stageOptions.find(s => s.value === stage)?.label || stage;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PPS Approvals</h1>
          <p className="text-gray-600 mt-1">Pre-Production Sample approval workflow</p>
        </div>
        <button
          onClick={() => {
            setEditingPPS(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Submit PPS
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stage
          </label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stages</option>
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PPS..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* PPS List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading PPS approvals...</div>
        ) : ppsApprovals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No PPS approvals found. Click "Submit PPS" to create one.</p>
          </div>
        ) : (
          ppsApprovals.map((pps) => {
            const statusConfig = getStatusConfig(pps.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={pps.id} className="bg-white rounded-lg shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{pps.ppsCode}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusConfig.color}`}>
                          <StatusIcon size={16} />
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-gray-600">{pps.documentName}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Project: {pps.project.code} • Version: {pps.version} • Stage: {getStageLabel(pps.currentStage)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(pps.status === 'pending' || pps.status === 'in_review') && (
                        <>
                          <button
                            onClick={() => handleApprove(pps.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(pps.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(pps)}
                        className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(pps.id)}
                        className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mb-4">
                    <div className="flex items-center">
                      {stageOptions.map((stage, index) => {
                        const isActive = stage.value === pps.currentStage;
                        const isPassed = stageOptions.findIndex(s => s.value === pps.currentStage) > index;
                        
                        return (
                          <div key={stage.value} className="flex items-center flex-1">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              isActive ? 'bg-blue-600 text-white' :
                              isPassed ? 'bg-green-600 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                              {isPassed ? <CheckCircle size={16} /> : index + 1}
                            </div>
                            {index < stageOptions.length - 1 && (
                              <div className={`flex-1 h-1 mx-2 ${
                                isPassed ? 'bg-green-600' : 'bg-gray-300'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex mt-2">
                      {stageOptions.map((stage, index) => (
                        <div key={stage.value} className="flex-1 text-xs text-center text-gray-600">
                          {stage.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Submitted By</p>
                      <p className="font-medium">{pps.submitter.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(pps.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {pps.approver && (
                      <div>
                        <p className="text-sm text-gray-600">Approved By</p>
                        <p className="font-medium">{pps.approver.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(pps.approvedAt!).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {pps.rejector && (
                      <div>
                        <p className="text-sm text-gray-600">Rejected By</p>
                        <p className="font-medium">{pps.rejector.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(pps.rejectedAt!).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {pps.effectiveDate && (
                      <div>
                        <p className="text-sm text-gray-600">Effective Date</p>
                        <p className="font-medium">
                          {new Date(pps.effectiveDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {pps.expiryDate && (
                      <div>
                        <p className="text-sm text-gray-600">Expiry Date</p>
                        <p className="font-medium text-orange-600">
                          {new Date(pps.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Document Link */}
                  {pps.documentUrl && (
                    <div className="mb-4">
                      <a
                        href={pps.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        <FileText size={16} />
                        View Document
                      </a>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {pps.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
                      <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{pps.rejectionReason}</p>
                    </div>
                  )}

                  {/* Change Requests */}
                  {pps.requiresChanges && pps.changeRequests && Array.isArray(pps.changeRequests) && pps.changeRequests.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
                      <p className="text-sm font-medium text-yellow-800 mb-2">Change Requests:</p>
                      <ul className="space-y-1">
                        {pps.changeRequests.map((request: ChangeRequest, idx: number) => (
                          <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                            <span className="text-yellow-600 mt-0.5">•</span>
                            <div>
                              <p>{request.description}</p>
                              <p className="text-xs text-yellow-600">
                                Requested by {request.requestedBy} on {new Date(request.requestedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reviewers */}
                  {pps.reviewers && Array.isArray(pps.reviewers) && pps.reviewers.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Reviewers:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pps.reviewers.map((reviewer: Reviewer, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              reviewer.reviewed ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {reviewer.reviewed ? <CheckCircle size={16} /> : <Clock size={16} />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{reviewer.name}</p>
                              <p className="text-xs text-gray-600">{reviewer.role}</p>
                              {reviewer.reviewed && reviewer.reviewedAt && (
                                <p className="text-xs text-gray-500">
                                  Reviewed on {new Date(reviewer.reviewedAt).toLocaleDateString()}
                                </p>
                              )}
                              {reviewer.comments && (
                                <p className="text-xs text-gray-600 mt-1">{reviewer.comments}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {pps.notes && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-600">{pps.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingPPS ? 'Edit PPS Approval' : 'Submit New PPS'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project *
                    </label>
                    <select
                      required
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={editingPPS !== null}
                    >
                      <option value="">Select Project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} - {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PPS Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ppsCode}
                      onChange={(e) => setFormData({ ...formData, ppsCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="PPS-001"
                      disabled={editingPPS !== null}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.documentName}
                      onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Pre-Production Sample Specification"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Version
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document URL
                    </label>
                    <input
                      type="url"
                      value={formData.documentUrl}
                      onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingPPS(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : editingPPS ? 'Update PPS' : 'Submit PPS'}
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

export default PPSPage;

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle, Link as LinkIcon, FileText, User, Save, ArrowRight } from 'lucide-react';

interface WorkflowStage {
  id: string;
  name: string;
  order: number;
  status: string;
  dependencies: string[];
  approverType?: string;
  approverId?: string | null;
  responsibleId?: string | null;
  bufferDays: number;
  requiredDocs: string[];
  materialIds: string[];
  SubStages?: WorkflowStage[];
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function WorkflowBuilderPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [blockedStages, setBlockedStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  
  const [formData, setFormData] = useState<Partial<WorkflowStage>>({
    name: '',
    order: 0,
    approverType: 'internal',
    bufferDays: 2,
    dependencies: [],
    requiredDocs: [],
    materialIds: [],
    status: 'not-started'
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchStages();
      fetchBlockedStages();
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await apiGet('/api/projects');
      setProjects(response || []);
      if (response && response.length > 0) {
        setSelectedProjectId(response[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    if (!selectedProjectId) return;
    
    try {
      const response = await apiGet(`/api/workflow/stages?projectId=${selectedProjectId}`);
      setStages(response.stages || []);
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  };

  const fetchBlockedStages = async () => {
    if (!selectedProjectId) return;
    
    try {
      const response = await apiGet(`/api/workflow/projects/${selectedProjectId}/blocked`);
      setBlockedStages(response.blocked || []);
    } catch (error) {
      console.error('Error fetching blocked stages:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        projectId: parseInt(selectedProjectId),
        name: formData.name,
        order: formData.order || 0,
        approverType: formData.approverType,
        approverId: formData.approverId,
        responsibleId: formData.responsibleId,
        bufferDays: formData.bufferDays || 2,
        dependencies: formData.dependencies || [],
        requiredDocs: formData.requiredDocs || [],
        materialIds: formData.materialIds || []
      };

      if (editingStage) {
        await apiPut(`/api/workflow/stages/${editingStage.id}`, payload);
      } else {
        await apiPost('/api/workflow/stages', payload);
      }
      
      setShowModal(false);
      resetForm();
      fetchStages();
      fetchBlockedStages();
    } catch (error) {
      console.error('Error saving stage:', error);
      alert('Failed to save stage');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stage?')) return;
    
    try {
      await apiDelete(`/api/workflow/stages/${id}`);
      fetchStages();
    } catch (error) {
      console.error('Error deleting stage:', error);
      alert('Failed to delete stage');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiPost(`/api/workflow/stages/${id}/approve`, {});
      fetchStages();
      fetchBlockedStages();
      alert('Stage approved successfully!');
    } catch (error) {
      console.error('Error approving stage:', error);
      alert('Failed to approve stage');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      order: 0,
      approverType: 'internal',
      bufferDays: 2,
      dependencies: [],
      requiredDocs: [],
      materialIds: [],
      status: 'not-started'
    });
    setEditingStage(null);
  };

  const openEditModal = (stage: WorkflowStage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      order: stage.order,
      approverType: stage.approverType || 'internal',
      approverId: stage.approverId,
      responsibleId: stage.responsibleId,
      bufferDays: stage.bufferDays,
      dependencies: stage.dependencies || [],
      requiredDocs: stage.requiredDocs || [],
      materialIds: stage.materialIds || [],
      status: stage.status
    });
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading workflow builder...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workflow Builder</h1>
        <p className="text-gray-600 mt-1">Define stages, dependencies, and approvals</p>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode} - {p.projectName}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Add Stage
            </button>
          </div>
        </div>
      </div>

      {/* Blocked Stages Alert */}
      {blockedStages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-red-900 mb-3">🚫 Blocked Stages ({blockedStages.length})</h2>
          <div className="space-y-2">
            {blockedStages.map((stage: any) => (
              <div key={stage.id} className="bg-white rounded p-3 border">
                <div className="font-medium text-gray-900">{stage.name}</div>
                <div className="text-sm text-red-600 mt-1">
                  Blocked by: {stage.blockers.map((b: any) => b.name).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stages List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Workflow Timeline ({stages.length} stages)
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {stages.sort((a, b) => a.order - b.order).map((stage, index) => (
            <div key={stage.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  {/* Stage Number Circle */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      stage.status === 'completed' ? 'bg-green-500' :
                      stage.status === 'in-progress' ? 'bg-blue-500' :
                      stage.status === 'blocked' ? 'bg-red-500' : 'bg-gray-400'
                    }`}>
                      {stage.order}
                    </div>
                    {index < stages.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-300 mt-2" />
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{stage.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(stage.status)}`}>
                        {stage.status === 'not-started' && <Clock className="w-3 h-3 inline mr-1" />}
                        {stage.status === 'in-progress' && <Clock className="w-3 h-3 inline mr-1" />}
                        {stage.status === 'completed' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {stage.status === 'blocked' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                        {stage.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Approver:</span> 
                        <span>{stage.approverType || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Buffer:</span> 
                        <span>{stage.bufferDays} days</span>
                      </div>
                      {stage.dependencies && stage.dependencies.length > 0 && (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">Dependencies:</span> 
                          <span>{stage.dependencies.length} stage(s)</span>
                        </div>
                      )}
                      {stage.requiredDocs && stage.requiredDocs.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">Documents:</span> 
                          <span>{stage.requiredDocs.length} required</span>
                        </div>
                      )}
                    </div>

                    {/* Required Documents List */}
                    {stage.requiredDocs && stage.requiredDocs.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {stage.requiredDocs.map((doc, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Sub-stages */}
                    {stage.SubStages && stage.SubStages.length > 0 && (
                      <div className="mt-3 ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                        {stage.SubStages.map(sub => (
                          <div key={sub.id} className="text-sm text-gray-600 flex items-center gap-2">
                            <span className="font-medium">{sub.name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(sub.status)}`}>
                              {sub.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  {stage.status === 'not-started' || stage.status === 'in-progress' ? (
                    <button
                      onClick={() => handleApprove(stage.id)}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  ) : null}
                  <button
                    onClick={() => openEditModal(stage)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {stages.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No stages defined. Click "Add Stage" to get started.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                {editingStage ? 'Edit Stage' : 'Add New Stage'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Stage Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g., Molding, Spray Painting"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Order *</label>
                    <input
                      type="number"
                      required
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="1, 2, 3..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium mb-1">
                      <User className="w-4 h-4" /> Approver Type
                    </label>
                    <select
                      value={formData.approverType}
                      onChange={(e) => setFormData({ ...formData, approverType: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="internal">Internal</option>
                      <option value="client">Client</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium mb-1">
                      <Clock className="w-4 h-4" /> Buffer Days
                    </label>
                    <input
                      type="number"
                      value={formData.bufferDays}
                      onChange={(e) => setFormData({ ...formData, bufferDays: Number(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Approver Person</label>
                    <select
                      value={formData.approverId || ''}
                      onChange={(e) => setFormData({ ...formData, approverId: e.target.value || undefined })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select Approver</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Responsible Person</label>
                    <select
                      value={formData.responsibleId || ''}
                      onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value || undefined })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select Responsible</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-sm font-medium mb-1">
                    <LinkIcon className="w-4 h-4" /> Dependencies
                  </label>
                  <div className="border rounded p-3 max-h-32 overflow-y-auto">
                    {stages.filter(s => s.id !== editingStage?.id).length === 0 ? (
                      <p className="text-sm text-gray-500">No other stages available</p>
                    ) : (
                      stages.filter(s => s.id !== editingStage?.id).map(stage => (
                        <label key={stage.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.dependencies?.includes(stage.id)}
                            onChange={(e) => {
                              const newDeps = e.target.checked
                                ? [...(formData.dependencies || []), stage.id]
                                : (formData.dependencies || []).filter(id => id !== stage.id);
                              setFormData({ ...formData, dependencies: newDeps });
                            }}
                          />
                          <span className="text-sm">#{stage.order} {stage.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-sm font-medium mb-1">
                    <FileText className="w-4 h-4" /> Required Documents
                  </label>
                  <input
                    type="text"
                    value={formData.requiredDocs?.join(', ') || ''}
                    onChange={(e) => setFormData({ ...formData, requiredDocs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter documents separated by commas"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., BOM, Technical Drawing, Quality Report</p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingStage ? 'Update Stage' : 'Create Stage'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

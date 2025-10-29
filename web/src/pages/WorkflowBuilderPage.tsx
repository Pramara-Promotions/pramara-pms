import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

interface WorkflowStage {
  id: string;
  name: string;
  order: number;
  status: string;
  dependencies: string[];
  approverType?: string;
  bufferDays: number;
  SubStages?: WorkflowStage[];
}

export default function WorkflowBuilderPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [blockedStages, setBlockedStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    order: '',
    approverType: 'internal',
    bufferDays: '2',
    dependencies: [] as string[]
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
        order: parseInt(formData.order),
        approverType: formData.approverType,
        bufferDays: parseInt(formData.bufferDays),
        dependencies: formData.dependencies
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
      order: '',
      approverType: 'internal',
      bufferDays: '2',
      dependencies: []
    });
    setEditingStage(null);
  };

  const openEditModal = (stage: WorkflowStage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      order: stage.order.toString(),
      approverType: stage.approverType || 'internal',
      bufferDays: stage.bufferDays.toString(),
      dependencies: stage.dependencies || []
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
          <h2 className="font-bold text-lg">Workflow Stages</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {stages.sort((a, b) => a.order - b.order).map(stage => (
            <div key={stage.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-400 font-bold">#{stage.order}</span>
                    <h3 className="font-bold text-lg text-gray-900">{stage.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(stage.status)}`}>
                      {stage.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Approver:</span> {stage.approverType || '-'}
                    </div>
                    <div>
                      <span className="font-medium">Buffer:</span> {stage.bufferDays} days
                    </div>
                    {stage.dependencies && stage.dependencies.length > 0 && (
                      <div>
                        <span className="font-medium">Dependencies:</span> {stage.dependencies.length}
                      </div>
                    )}
                  </div>
                  
                  {stage.SubStages && stage.SubStages.length > 0 && (
                    <div className="mt-3 ml-6 space-y-2">
                      {stage.SubStages.map(sub => (
                        <div key={sub.id} className="text-sm text-gray-600 flex items-center gap-2">
                          <span>└─</span>
                          <span>{sub.name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(sub.status)}`}>
                            {sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  {stage.status === 'not-started' || stage.status === 'in-progress' ? (
                    <button
                      onClick={() => handleApprove(stage.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                  ) : null}
                  <button
                    onClick={() => openEditModal(stage)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(stage.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingStage ? 'Edit Stage' : 'Add New Stage'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="1, 2, 3..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Approver Type</label>
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
                  <label className="block text-sm font-medium mb-1">Buffer Days</label>
                  <input
                    type="number"
                    value={formData.bufferDays}
                    onChange={(e) => setFormData({ ...formData, bufferDays: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingStage ? 'Update' : 'Create'}
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

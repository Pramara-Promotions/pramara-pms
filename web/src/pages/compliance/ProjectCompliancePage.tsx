import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileCheck, AlertTriangle, CheckCircle, Clock, Lock } from 'lucide-react';

interface ProjectCompliance {
  id: string;
  projectId: string;
  project: { id: string; name: string };
  complianceType: string;
  complianceName: string;
  required: boolean;
  priority: string;
  status: string;
  requiredBy: string | null;
  certificationBody: string | null;
  blocksProduction: boolean;
  blocksShipment: boolean;
  requirements: Array<{ id: string; description: string; status: string }>;
  documents: Array<{ id: string; documentName: string; status: string }>;
  labTests: Array<{ id: string; testName: string; result: string }>;
  createdAt: string;
}

const ProjectCompliancePage = () => {
  const [compliances, setCompliances] = useState<ProjectCompliance[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompliance, setEditingCompliance] = useState<ProjectCompliance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    complianceType: 'certification',
    complianceName: '',
    required: true,
    priority: 'medium',
    requiredBy: '',
    certificationBody: '',
    blocksProduction: false,
    blocksShipment: false,
    notes: '',
  });

  const complianceTypes = [
    { value: 'certification', label: 'Certification (GRS, GOTS, etc.)' },
    { value: 'testing', label: 'Product Testing' },
    { value: 'audit', label: 'Audit' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchProjects();
    fetchCompliances();
  }, [projectFilter, statusFilter]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?status=active', { credentials: 'include' });
      if (res.ok) setProjects(await res.json());
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCompliances = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.append('projectId', projectFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/compliance/project-compliance?${params}`, { credentials: 'include' });
      if (res.ok) setCompliances(await res.json());
    } catch (error) {
      console.error('Error fetching compliances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = editingCompliance 
        ? `/api/compliance/project-compliance/${editingCompliance.id}`
        : '/api/compliance/project-compliance';
      const method = editingCompliance ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingCompliance(null);
        resetForm();
        fetchCompliances();
      } else {
        alert('Failed to save compliance');
      }
    } catch (error) {
      console.error('Error saving compliance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this compliance requirement?')) return;
    try {
      const res = await fetch(`/api/compliance/project-compliance/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchCompliances();
    } catch (error) {
      console.error('Error deleting compliance:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      complianceType: 'certification',
      complianceName: '',
      required: true,
      priority: 'medium',
      requiredBy: '',
      certificationBody: '',
      blocksProduction: false,
      blocksShipment: false,
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle };
      case 'in_progress': return { color: 'bg-blue-100 text-blue-800', label: 'In Progress', icon: Clock };
      case 'blocked': return { color: 'bg-red-100 text-red-800', label: 'Blocked', icon: AlertTriangle };
      default: return { color: 'bg-gray-100 text-gray-800', label: 'Not Started', icon: Clock };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="text-blue-600" size={32} />
            Project Compliance
          </h1>
          <p className="text-gray-600 mt-1">Track compliance requirements for each project</p>
        </div>
        <button
          onClick={() => { setEditingCompliance(null); resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Requirement
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
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
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : compliances.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileCheck size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No compliance requirements found</p>
          </div>
        ) : (
          compliances.map((comp) => {
            const status = getStatusBadge(comp.status);
            const StatusIcon = status.icon;
            return (
              <div key={comp.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{comp.complianceName}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={16} />
                        {status.label}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(comp.priority)}`}>
                        {comp.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{comp.project.name}</p>
                    <div className="flex gap-4 mt-2">
                      {comp.blocksProduction && (
                        <span className="text-sm text-red-600 flex items-center gap-1">
                          <Lock size={14} />
                          Blocks Production
                        </span>
                      )}
                      {comp.blocksShipment && (
                        <span className="text-sm text-red-600 flex items-center gap-1">
                          <Lock size={14} />
                          Blocks Shipment
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { 
                      setEditingCompliance(comp); 
                      setFormData({
                        projectId: comp.projectId,
                        complianceType: comp.complianceType,
                        complianceName: comp.complianceName,
                        required: comp.required,
                        priority: comp.priority,
                        requiredBy: comp.requiredBy || '',
                        certificationBody: comp.certificationBody || '',
                        blocksProduction: comp.blocksProduction,
                        blocksShipment: comp.blocksShipment,
                        notes: ''
                      }); 
                      setIsModalOpen(true); 
                    }} className="p-2 border rounded hover:bg-gray-50">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(comp.id)} className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium capitalize">{comp.complianceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Required By</p>
                    <p className="font-medium">{comp.requiredBy ? new Date(comp.requiredBy).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requirements</p>
                    <p className="font-medium">{comp.requirements.length} items</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Documents</p>
                    <p className="font-medium">{comp.documents.length} files</p>
                  </div>
                </div>

                {comp.certificationBody && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    <FileCheck size={16} />
                    Certification Body: {comp.certificationBody}
                  </div>
                )}

                {comp.requirements.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Requirements:</p>
                    <div className="space-y-2">
                      {comp.requirements.map(req => (
                        <div key={req.id} className="flex items-center gap-2 text-sm">
                          {req.status === 'completed' ? (
                            <CheckCircle size={16} className="text-green-600" />
                          ) : (
                            <Clock size={16} className="text-gray-400" />
                          )}
                          <span className={req.status === 'completed' ? 'text-gray-900' : 'text-gray-600'}>
                            {req.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingCompliance ? 'Edit' : 'Add'} Compliance Requirement</h2>
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
                    <label className="block text-sm font-medium mb-2">Type *</label>
                    <select required value={formData.complianceType} onChange={(e) => setFormData({ ...formData, complianceType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {complianceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority *</label>
                    <select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input required type="text" value={formData.complianceName} onChange={(e) => setFormData({ ...formData, complianceName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="GRS Certification" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Required By</label>
                    <input type="date" value={formData.requiredBy} onChange={(e) => setFormData({ ...formData, requiredBy: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Certification Body</label>
                    <input type="text" value={formData.certificationBody} onChange={(e) => setFormData({ ...formData, certificationBody: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.required} onChange={(e) => setFormData({ ...formData, required: e.target.checked })} className="rounded" />
                      <span className="text-sm font-medium">Required</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.blocksProduction} onChange={(e) => setFormData({ ...formData, blocksProduction: e.target.checked })} className="rounded" />
                      <span className="text-sm font-medium">Blocks Production</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.blocksShipment} onChange={(e) => setFormData({ ...formData, blocksShipment: e.target.checked })} className="rounded" />
                      <span className="text-sm font-medium">Blocks Shipment</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingCompliance(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : editingCompliance ? 'Update' : 'Create'}
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

export default ProjectCompliancePage;

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileText, CheckCircle, AlertTriangle, Clock, BookOpen, Users } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface ProjectPolicy {
  id: string;
  projectId: number;
  project: { id: number; name: string };
  policyType: string;
  policyTitle: string;
  policyDescription: string;
  version: string;
  effectiveDate: string;
  expiryDate: string | null;
  status: string;
  documentUrl: string | null;
  responsible: { id: string; name: string; email: string };
  reviewFrequency: number | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  trainingRequired: boolean;
  trainingCompletedBy: string[];
  approvalHistory: any[];
  createdAt: string;
}

const ProjectPoliciesPage = () => {
  const [policies, setPolicies] = useState<ProjectPolicy[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ProjectPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    policyType: 'quality',
    policyTitle: '',
    policyDescription: '',
    version: '1.0',
    effectiveDate: '',
    expiryDate: '',
    documentUrl: '',
    responsiblePerson: '',
    reviewFrequency: 365,
    trainingRequired: false,
    trainingDocUrl: '',
    notes: '',
  });

  const policyTypes = [
    { value: 'quality', label: 'Quality' },
    { value: 'safety', label: 'Safety' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'social', label: 'Social Compliance' },
    { value: 'compliance', label: 'Regulatory Compliance' },
  ];

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchPolicies();
  }, [projectFilter, statusFilter, typeFilter]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?status=active', { credentials: 'include' });
      if (res.ok) setProjects(await res.json());
    } catch (error) {
      console.error('Error fetching projects:', error);
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

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.append('projectId', projectFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('policyType', typeFilter);

      const res = await fetch(`/api/project-policies?${params}`, { credentials: 'include' });
      if (res.ok) setPolicies(await res.json());
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = editingPolicy 
        ? `/api/project-policies/${editingPolicy.id}`
        : '/api/project-policies';
      const method = editingPolicy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingPolicy(null);
        resetForm();
        fetchPolicies();
      } else {
        alert('Failed to save policy');
      }
    } catch (error) {
      console.error('Error saving policy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm('Activate this policy?')) return;
    try {
      const res = await fetch(`/api/project-policies/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: 'Policy activated' })
      });
      if (res.ok) fetchPolicies();
    } catch (error) {
      console.error('Error activating policy:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this policy?')) return;
    try {
      const res = await fetch(`/api/project-policies/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchPolicies();
    } catch (error) {
      console.error('Error deleting policy:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      policyType: 'quality',
      policyTitle: '',
      policyDescription: '',
      version: '1.0',
      effectiveDate: '',
      expiryDate: '',
      documentUrl: '',
      responsiblePerson: '',
      reviewFrequency: 365,
      trainingRequired: false,
      trainingDocUrl: '',
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircle };
      case 'draft': return { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Clock };
      case 'inactive': return { color: 'bg-yellow-100 text-yellow-800', label: 'Inactive', icon: AlertTriangle };
      case 'superseded': return { color: 'bg-red-100 text-red-800', label: 'Superseded', icon: AlertTriangle };
      default: return { color: 'bg-gray-100 text-gray-800', label: status, icon: Clock };
    }
  };

  const getDaysUntilReview = (nextReviewDate: string | null) => {
    if (!nextReviewDate) return null;
    return Math.ceil((new Date(nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={32} />
            Project Policies
          </h1>
          <p className="text-gray-600 mt-1">Define and manage project-specific policies</p>
        </div>
        <button
          onClick={() => { setEditingPolicy(null); resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Policy
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Types</option>
          {policyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="superseded">Superseded</option>
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No policies found</p>
          </div>
        ) : (
          policies.map((policy) => {
            const status = getStatusBadge(policy.status);
            const StatusIcon = status.icon;
            const daysUntilReview = getDaysUntilReview(policy.nextReviewDate);
            return (
              <div key={policy.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{policy.policyTitle}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={16} />
                        {status.label}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {policy.policyType}
                      </span>
                      <span className="text-sm text-gray-600">v{policy.version}</span>
                    </div>
                    <p className="text-gray-600 mt-1">{policy.project.name}</p>
                  </div>
                  <div className="flex gap-2">
                    {policy.status === 'draft' && (
                      <button onClick={() => handleActivate(policy.id)} className="p-2 border border-green-300 text-green-600 rounded hover:bg-green-50">
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button onClick={() => { 
                      setEditingPolicy(policy); 
                      setFormData({
                        projectId: policy.projectId.toString(),
                        policyType: policy.policyType,
                        policyTitle: policy.policyTitle,
                        policyDescription: policy.policyDescription,
                        version: policy.version,
                        effectiveDate: policy.effectiveDate.split('T')[0],
                        expiryDate: policy.expiryDate?.split('T')[0] || '',
                        documentUrl: policy.documentUrl || '',
                        responsiblePerson: policy.responsible.id,
                        reviewFrequency: policy.reviewFrequency || 365,
                        trainingRequired: policy.trainingRequired,
                        trainingDocUrl: '',
                        notes: ''
                      }); 
                      setIsModalOpen(true); 
                    }} className="p-2 border rounded hover:bg-gray-50">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(policy.id)} className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-4">{policy.policyDescription}</p>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Effective Date</p>
                    <p className="font-medium">{new Date(policy.effectiveDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Responsible</p>
                    <p className="font-medium">{policy.responsible.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Review</p>
                    <p className="font-medium">
                      {policy.nextReviewDate ? (
                        <>
                          {new Date(policy.nextReviewDate).toLocaleDateString()}
                          {daysUntilReview && daysUntilReview <= 30 && (
                            <span className="ml-2 text-orange-600">({daysUntilReview}d)</span>
                          )}
                        </>
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Training</p>
                    <p className="font-medium">
                      {policy.trainingRequired ? (
                        <span className="flex items-center gap-1">
                          <BookOpen size={16} />
                          {policy.trainingCompletedBy?.length || 0} completed
                        </span>
                      ) : 'Not required'}
                    </p>
                  </div>
                </div>

                {policy.expiryDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-yellow-50 p-3 rounded mb-3">
                    <Clock size={16} />
                    Expires: {new Date(policy.expiryDate).toLocaleDateString()}
                  </div>
                )}

                {policy.documentUrl && (
                  <a href={policy.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                    <FileText size={16} />
                    View Policy Document
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingPolicy ? 'Edit' : 'Add'} Policy</h2>
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
                    <label className="block text-sm font-medium mb-2">Policy Type *</label>
                    <select required value={formData.policyType} onChange={(e) => setFormData({ ...formData, policyType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {policyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Version *</label>
                    <input required type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Policy Title *</label>
                    <input required type="text" value={formData.policyTitle} onChange={(e) => setFormData({ ...formData, policyTitle: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Quality Control Standards" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Description *</label>
                    <textarea required value={formData.policyDescription} onChange={(e) => setFormData({ ...formData, policyDescription: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Effective Date *</label>
                    <input required type="date" value={formData.effectiveDate} onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiry Date</label>
                    <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Responsible Person *</label>
                    <select required value={formData.responsiblePerson} onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Person</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Review Frequency (days)</label>
                    <input type="number" value={formData.reviewFrequency} onChange={(e) => setFormData({ ...formData, reviewFrequency: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Policy Document URL</label>
                    <input type="url" value={formData.documentUrl} onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.trainingRequired} onChange={(e) => setFormData({ ...formData, trainingRequired: e.target.checked })} className="rounded" />
                      <span className="text-sm font-medium">Training Required</span>
                    </label>
                  </div>
                  {formData.trainingRequired && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">Training Document URL</label>
                      <input type="url" value={formData.trainingDocUrl} onChange={(e) => setFormData({ ...formData, trainingDocUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingPolicy(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : editingPolicy ? 'Update' : 'Create'}
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

export default ProjectPoliciesPage;

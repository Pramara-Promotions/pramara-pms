import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Upload, FileImage, Clock, CheckCircle, XCircle } from 'lucide-react';

interface PackagingDesign {
  id: string;
  projectId: number;
  designCode: string;
  designName: string;
  packagingType: string;
  dimensions: string | null;
  material: string | null;
  printingMethod: string | null;
  colors: number | null;
  designFileUrl: string | null;
  mockupFileUrl: string | null;
  supplierName: string | null;
  unitCost: number | null;
  moq: number | null;
  status: string;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  feedback: string | null;
  revisionNumber: number;
  project: {
    id: number;
    code: string;
    name: string;
  };
  submitter: {
    id: string;
    name: string;
  };
  reviewer: {
    id: string;
    name: string;
  } | null;
  approver: {
    id: string;
    name: string;
  } | null;
  _count: {
    revisions: number;
  };
}

interface Project {
  id: number;
  code: string;
  name: string;
}

const PackagingPage = () => {
  const [designs, setDesigns] = useState<PackagingDesign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<PackagingDesign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [formData, setFormData] = useState({
    projectId: '',
    designCode: '',
    designName: '',
    packagingType: 'box',
    dimensions: '',
    material: '',
    printingMethod: 'offset',
    colors: '',
    designFileUrl: '',
    mockupFileUrl: '',
    supplierName: '',
    unitCost: '',
    moq: '',
  });

  const statusOptions = [
    { value: 'concept', label: 'Concept', color: 'bg-gray-100 text-gray-800', icon: Clock },
    { value: 'design', label: 'Design', color: 'bg-blue-100 text-blue-800', icon: Clock },
    { value: 'sampling', label: 'Sampling', color: 'bg-purple-100 text-purple-800', icon: Clock },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    { value: 'production', label: 'Production', color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle },
  ];

  const packagingTypes = [
    'box', 'blister', 'polybag', 'master_carton', 'display', 'sleeve', 'wrapper', 'label'
  ];

  const printingMethods = [
    'offset', 'flexo', 'digital', 'screen', 'gravure', 'letterpress'
  ];

  useEffect(() => {
    fetchProjects();
    fetchDesigns();
  }, [selectedProjectId, statusFilter, typeFilter]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchDesigns = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('projectId', selectedProjectId);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('packagingType', typeFilter);

      const res = await fetch(`/api/pre-production/packaging?${params}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDesigns(data);
      }
    } catch (error) {
      console.error('Error fetching designs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingDesign
        ? `/api/pre-production/packaging/${editingDesign.id}`
        : '/api/pre-production/packaging';
      
      const method = editingDesign ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingDesign(null);
        resetForm();
        fetchDesigns();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save design');
      }
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Failed to save design');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (id: string) => {
    const feedback = prompt('Enter review feedback:');
    if (!feedback) return;

    try {
      const res = await fetch(`/api/pre-production/packaging/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ feedback }),
      });

      if (res.ok) {
        fetchDesigns();
      } else {
        alert('Failed to submit review');
      }
    } catch (error) {
      console.error('Error reviewing design:', error);
      alert('Failed to submit review');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this design?')) return;

    try {
      const res = await fetch(`/api/pre-production/packaging/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        fetchDesigns();
      } else {
        alert('Failed to approve design');
      }
    } catch (error) {
      console.error('Error approving design:', error);
      alert('Failed to approve design');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      const res = await fetch(`/api/pre-production/packaging/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        fetchDesigns();
      } else {
        alert('Failed to delete design');
      }
    } catch (error) {
      console.error('Error deleting design:', error);
      alert('Failed to delete design');
    }
  };

  const handleEdit = (design: PackagingDesign) => {
    setEditingDesign(design);
    setFormData({
      projectId: design.projectId.toString(),
      designCode: design.designCode,
      designName: design.designName,
      packagingType: design.packagingType,
      dimensions: design.dimensions || '',
      material: design.material || '',
      printingMethod: design.printingMethod || 'offset',
      colors: design.colors?.toString() || '',
      designFileUrl: design.designFileUrl || '',
      mockupFileUrl: design.mockupFileUrl || '',
      supplierName: design.supplierName || '',
      unitCost: design.unitCost?.toString() || '',
      moq: design.moq?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      designCode: '',
      designName: '',
      packagingType: 'box',
      dimensions: '',
      material: '',
      printingMethod: 'offset',
      colors: '',
      designFileUrl: '',
      mockupFileUrl: '',
      supplierName: '',
      unitCost: '',
      moq: '',
    });
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Packaging Design</h1>
          <p className="text-gray-600 mt-1">Manage packaging designs and approvals</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => {
              setEditingDesign(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            New Design
          </button>
        </div>
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
            Type
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {packagingTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ').toUpperCase()}
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
              placeholder="Search designs..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading designs...</div>
      ) : designs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileImage size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No designs found. Click "New Design" to create one.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => {
            const statusConfig = getStatusConfig(design.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={design.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                {/* Mockup Image */}
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  {design.mockupFileUrl ? (
                    <img
                      src={design.mockupFileUrl}
                      alt={design.designName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileImage size={64} className="text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{design.designCode}</h3>
                      <p className="text-sm text-gray-600">{design.designName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                      <StatusIcon size={14} />
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p><span className="font-medium">Type:</span> {design.packagingType.replace('_', ' ')}</p>
                    <p><span className="font-medium">Project:</span> {design.project.code}</p>
                    {design.supplierName && (
                      <p><span className="font-medium">Supplier:</span> {design.supplierName}</p>
                    )}
                    {design.unitCost && (
                      <p><span className="font-medium">Cost:</span> ${design.unitCost}</p>
                    )}
                  </div>

                  {design.feedback && (
                    <div className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                      <span className="font-medium">Feedback:</span> {design.feedback}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {design.status === 'design' && (
                      <button
                        onClick={() => handleReview(design.id)}
                        className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Review
                      </button>
                    )}
                    {(design.status === 'sampling' || design.status === 'design') && (
                      <button
                        onClick={() => handleApprove(design.id)}
                        className="flex-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(design)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(design.id)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {designs.map((design) => {
                const statusConfig = getStatusConfig(design.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={design.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {design.designCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{design.designName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {design.packagingType.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{design.project.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusConfig.color}`}>
                        <StatusIcon size={14} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{design.supplierName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {design.status === 'design' && (
                          <button
                            onClick={() => handleReview(design.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Review
                          </button>
                        )}
                        {(design.status === 'sampling' || design.status === 'design') && (
                          <button
                            onClick={() => handleApprove(design.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(design)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(design.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingDesign ? 'Edit Design' : 'Create New Design'}
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
                      disabled={editingDesign !== null}
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
                      Design Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designCode}
                      onChange={(e) => setFormData({ ...formData, designCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="PKG-001"
                      disabled={editingDesign !== null}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Design Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designName}
                      onChange={(e) => setFormData({ ...formData, designName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Premium Gift Box"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Packaging Type *
                    </label>
                    <select
                      required
                      value={formData.packagingType}
                      onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {packagingTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="L x W x H"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material
                    </label>
                    <input
                      type="text"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Cardboard, Plastic, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Printing Method
                    </label>
                    <select
                      value={formData.printingMethod}
                      onChange={(e) => setFormData({ ...formData, printingMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {printingMethods.map((method) => (
                        <option key={method} value={method}>
                          {method.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Colors
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.colors}
                      onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Name
                    </label>
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Packaging Supplier Co."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MOQ (Minimum Order Quantity)
                    </label>
                    <input
                      type="number"
                      value={formData.moq}
                      onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1000"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Design File URL
                    </label>
                    <input
                      type="url"
                      value={formData.designFileUrl}
                      onChange={(e) => setFormData({ ...formData, designFileUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mockup Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.mockupFileUrl}
                      onChange={(e) => setFormData({ ...formData, mockupFileUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingDesign(null);
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
                    {isLoading ? 'Saving...' : editingDesign ? 'Update Design' : 'Create Design'}
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

export default PackagingPage;

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, FileText } from 'lucide-react';
import { listProjects } from '../../lib/services/projects';
import { listMolds, createMold, updateMold, deleteMold } from '../../lib/services/preproduction';

interface Mold {
  id: string;
  projectId: number;
  moldCode: string;
  moldName: string;
  supplierName: string | null;
  cavities: number;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  cost: number | null;
  location: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: number;
    code: string;
    name: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    trials: number;
  };
}

interface Project {
  id: number;
  code: string;
  name: string;
}

const MoldsPage = () => {
  const [molds, setMolds] = useState<Mold[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMold, setEditingMold] = useState<Mold | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    moldCode: '',
    moldName: '',
    supplierName: '',
    cavities: 1,
    material: '',
    dimensions: '',
    weight: '',
    cost: '',
    location: '',
    notes: '',
  });

  const statusOptions = [
    { value: 'designing', label: 'Designing', color: 'bg-blue-100 text-blue-800' },
    { value: 'manufacturing', label: 'Manufacturing', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'testing', label: 'Testing', color: 'bg-purple-100 text-purple-800' },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-orange-100 text-orange-800' },
  ];

  useEffect(() => {
    fetchProjects();
    fetchMolds();
  }, [selectedProjectId, statusFilter, searchQuery]);

  const fetchProjects = async () => {
    try {
      const rows = await listProjects();
      setProjects(rows || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchMolds = async () => {
    setIsLoading(true);
    try {
      const rows = await listMolds({ projectId: selectedProjectId, status: statusFilter, search: searchQuery });
      setMolds(rows || []);
    } catch (error) {
      console.error('Error fetching molds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingMold) {
        await updateMold(editingMold.id, formData);
      } else {
        await createMold(formData);
      }
      setIsModalOpen(false);
      setEditingMold(null);
      resetForm();
      fetchMolds();
    } catch (error) {
      console.error('Error saving mold:', error);
      alert('Failed to save mold');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mold?')) return;

    try {
      await deleteMold(id);
      fetchMolds();
    } catch (error) {
      console.error('Error deleting mold:', error);
      alert('Failed to delete mold');
    }
  };

  const handleEdit = (mold: Mold) => {
    setEditingMold(mold);
    setFormData({
      projectId: mold.projectId.toString(),
      moldCode: mold.moldCode,
      moldName: mold.moldName,
      supplierName: mold.supplierName || '',
      cavities: mold.cavities,
      material: mold.material || '',
      dimensions: mold.dimensions || '',
      weight: mold.weight?.toString() || '',
      cost: mold.cost?.toString() || '',
      location: mold.location || '',
      notes: mold.notes || '',
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      moldCode: '',
      moldName: '',
      supplierName: '',
      cavities: 1,
      material: '',
      dimensions: '',
      weight: '',
      cost: '',
      location: '',
      notes: '',
    });
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mold Management</h1>
          <p className="text-gray-600 mt-1">Track molds, trials, and approvals</p>
        </div>
        <button
          onClick={() => {
            setEditingMold(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Mold
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or name..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mold Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mold Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cavities
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trials
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  Loading molds...
                </td>
              </tr>
            ) : molds.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No molds found. Click "Add Mold" to create one.
                </td>
              </tr>
            ) : (
              molds.map((mold) => (
                <tr key={mold.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{mold.moldCode}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{mold.moldName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{mold.project.code}</div>
                    <div className="text-xs text-gray-500">{mold.project.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{mold.supplierName || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{mold.cavities}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(mold.status)}`}>
                      {mold.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <FileText size={16} className="text-gray-400" />
                      {mold._count.trials}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.location.href = `/preprod/trials?moldId=${mold.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Trials"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(mold)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(mold.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingMold ? 'Edit Mold' : 'Create New Mold'}
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
                      disabled={editingMold !== null}
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
                      Mold Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.moldCode}
                      onChange={(e) => setFormData({ ...formData, moldCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="M-001"
                      disabled={editingMold !== null}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mold Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.moldName}
                      onChange={(e) => setFormData({ ...formData, moldName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Product Component Mold"
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
                      placeholder="Acme Mold Co."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cavities *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.cavities}
                      onChange={(e) => setFormData({ ...formData, cavities: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      placeholder="Steel, Aluminum, etc."
                    />
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
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Warehouse A, Rack 5"
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
                      setEditingMold(null);
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
                    {isLoading ? 'Saving...' : editingMold ? 'Update Mold' : 'Create Mold'}
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

export default MoldsPage;

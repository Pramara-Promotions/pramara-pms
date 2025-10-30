import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, CheckCircle, AlertTriangle, FileCheck, Download } from 'lucide-react';
import { listMaterialCompliance, createMaterialCompliance, updateMaterialCompliance, approveMaterialCompliance, deleteMaterialCompliance } from '../../lib/services/compliance';

interface MaterialCompliance {
  id: string;
  materialName: string;
  materialType: string;
  supplierName: string;
  complianceType: string;
  certificateNumber: string;
  certificateFileUrl: string | null;
  purchaseInvoiceNumber: string;
  purchaseInvoiceUrl: string | null;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchaseDate: string;
  remainingQuantity: number;
  traceable: boolean;
  status: string;
  verifiedBy: { id: string; name: string } | null;
  verifiedAt: string | null;
  createdAt: string;
}

const MaterialCompliancePage = () => {
  const [materials, setMaterials] = useState<MaterialCompliance[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialCompliance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');

  const [formData, setFormData] = useState({
    materialName: '',
    materialType: '',
    supplierName: '',
    complianceType: 'GRS',
    certificateNumber: '',
    certificateFileUrl: '',
    purchaseInvoiceNumber: '',
    purchaseInvoiceUrl: '',
    purchaseQuantity: 0,
    purchaseUnit: 'kg',
    purchaseDate: '',
    remainingQuantity: 0,
    traceable: true,
    notes: '',
  });

  const complianceTypes = ['GRS', 'GOTS', 'OEKO-TEX', 'BCI', 'FSC', 'Organic', 'Recycled', 'Other'];
  const materialTypes = ['Fabric', 'Yarn', 'Accessories', 'Packaging', 'Other'];
  const units = ['kg', 'meters', 'yards', 'pieces', 'rolls'];

  useEffect(() => {
    fetchMaterials();
  }, [statusFilter, complianceFilter]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const rows = await listMaterialCompliance({ status: statusFilter });
      setMaterials(rows || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingMaterial) {
        await updateMaterialCompliance(editingMaterial.id, formData);
      } else {
        await createMaterialCompliance(formData);
      }
      setIsModalOpen(false);
      setEditingMaterial(null);
      resetForm();
      fetchMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Failed to save material');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    if (!confirm('Verify this material compliance?')) return;
    try {
      await approveMaterialCompliance(id);
      fetchMaterials();
    } catch (error) {
      console.error('Error verifying material:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    try {
      await deleteMaterialCompliance(id);
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      materialName: '',
      materialType: '',
      supplierName: '',
      complianceType: 'GRS',
      certificateNumber: '',
      certificateFileUrl: '',
      purchaseInvoiceNumber: '',
      purchaseInvoiceUrl: '',
      purchaseQuantity: 0,
      purchaseUnit: 'kg',
      purchaseDate: '',
      remainingQuantity: 0,
      traceable: true,
      notes: '',
    });
  };

  const getStatusBadge = (material: MaterialCompliance) => {
    if (!material.traceable) return { color: 'bg-red-100 text-red-800', label: 'Not Traceable', icon: AlertTriangle };
    if (material.status === 'verified') return { color: 'bg-green-100 text-green-800', label: 'Verified', icon: CheckCircle };
    if (material.remainingQuantity <= 0) return { color: 'bg-gray-100 text-gray-800', label: 'Depleted', icon: Package };
    return { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Verification', icon: AlertTriangle };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-blue-600" size={32} />
            Material Compliance
          </h1>
          <p className="text-gray-600 mt-1">Track certified materials with traceability</p>
        </div>
        <button
          onClick={() => { setEditingMaterial(null); resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Material
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <select
          value={complianceFilter}
          onChange={(e) => setComplianceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Compliance Types</option>
          {complianceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending Verification</option>
          <option value="depleted">Depleted</option>
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No materials found</p>
          </div>
        ) : (
          materials.map((material) => {
            const status = getStatusBadge(material);
            const StatusIcon = status.icon;
            return (
              <div key={material.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{material.materialName}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={16} />
                        {status.label}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {material.complianceType}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{material.supplierName} • {material.materialType}</p>
                  </div>
                  <div className="flex gap-2">
                    {material.status === 'pending' && (
                      <button onClick={() => handleVerify(material.id)} className="p-2 border border-green-300 text-green-600 rounded hover:bg-green-50">
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button onClick={() => { 
                      setEditingMaterial(material); 
                      setFormData({
                        materialName: material.materialName,
                        materialType: material.materialType,
                        supplierName: material.supplierName,
                        complianceType: material.complianceType,
                        certificateNumber: material.certificateNumber,
                        certificateFileUrl: material.certificateFileUrl || '',
                        purchaseInvoiceNumber: material.purchaseInvoiceNumber,
                        purchaseInvoiceUrl: material.purchaseInvoiceUrl || '',
                        purchaseQuantity: material.purchaseQuantity,
                        purchaseUnit: material.purchaseUnit,
                        purchaseDate: material.purchaseDate.split('T')[0],
                        remainingQuantity: material.remainingQuantity,
                        traceable: material.traceable,
                        notes: ''
                      }); 
                      setIsModalOpen(true); 
                    }} className="p-2 border rounded hover:bg-gray-50">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(material.id)} className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Certificate #</p>
                    <p className="font-medium">{material.certificateNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Purchase Invoice</p>
                    <p className="font-medium">{material.purchaseInvoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Purchased</p>
                    <p className="font-medium">{material.purchaseQuantity} {material.purchaseUnit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Remaining</p>
                    <p className="font-medium">{material.remainingQuantity} {material.purchaseUnit}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Purchase Date</p>
                    <p className="font-medium">{new Date(material.purchaseDate).toLocaleDateString()}</p>
                  </div>
                  {material.verifiedBy && (
                    <div>
                      <p className="text-sm text-gray-600">Verified By</p>
                      <p className="font-medium">{material.verifiedBy.name} on {new Date(material.verifiedAt!).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {material.certificateFileUrl && (
                    <a href={material.certificateFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                      <FileCheck size={16} />
                      Certificate
                    </a>
                  )}
                  {material.purchaseInvoiceUrl && (
                    <a href={material.purchaseInvoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100">
                      <Download size={16} />
                      Invoice
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingMaterial ? 'Edit' : 'Add'} Material</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Material Name *</label>
                    <input required type="text" value={formData.materialName} onChange={(e) => setFormData({ ...formData, materialName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Recycled Polyester Fabric" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Material Type *</label>
                    <select required value={formData.materialType} onChange={(e) => setFormData({ ...formData, materialType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {materialTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Compliance Type *</label>
                    <select required value={formData.complianceType} onChange={(e) => setFormData({ ...formData, complianceType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {complianceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Supplier Name *</label>
                    <input required type="text" value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Certificate Number *</label>
                    <input required type="text" value={formData.certificateNumber} onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Certificate URL</label>
                    <input type="url" value={formData.certificateFileUrl} onChange={(e) => setFormData({ ...formData, certificateFileUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Purchase Invoice # *</label>
                    <input required type="text" value={formData.purchaseInvoiceNumber} onChange={(e) => setFormData({ ...formData, purchaseInvoiceNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Invoice URL</label>
                    <input type="url" value={formData.purchaseInvoiceUrl} onChange={(e) => setFormData({ ...formData, purchaseInvoiceUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Purchase Date *</label>
                    <input required type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unit *</label>
                    <select required value={formData.purchaseUnit} onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Purchase Quantity *</label>
                    <input required type="number" step="0.01" value={formData.purchaseQuantity} onChange={(e) => setFormData({ ...formData, purchaseQuantity: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Remaining Quantity *</label>
                    <input required type="number" step="0.01" value={formData.remainingQuantity} onChange={(e) => setFormData({ ...formData, remainingQuantity: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.traceable} onChange={(e) => setFormData({ ...formData, traceable: e.target.checked })} className="rounded" />
                      <span className="text-sm font-medium">Traceable (Supplier is certified for this material type)</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingMaterial(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : editingMaterial ? 'Update' : 'Create'}
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

export default MaterialCompliancePage;

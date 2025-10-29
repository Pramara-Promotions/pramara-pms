import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

interface Material {
  id: string;
  name: string;
  type: string;
  unit: string;
  stockQty: number;
  reservedQty: number;
  availableQty: number;
  minStock: number;
  reorderPoint: number;
  costPerUnit: number;
  lowStock: boolean;
  needsReorder: boolean;
}

interface Reservation {
  id: string;
  materialId: string;
  Material: { name: string; unit: string };
  reservedQty: number;
  reservedFor: string;
  status: string;
  createdAt: string;
}

interface Alert {
  materialId: string;
  name: string;
  type: string;
  stockQty: number;
  minStock: number;
  reorderPoint: number;
}

export default function MaterialDashboardPage() {
  const navigate = useNavigate();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [alerts, setAlerts] = useState<{ lowStock: Alert[]; needsReorder: Alert[]; expiringSoon: any[] }>({
    lowStock: [],
    needsReorder: [],
    expiringSoon: []
  });
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'receive' | 'adjust' | 'reserve'>('receive');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  const [formData, setFormData] = useState({
    qty: '',
    lotNumber: '',
    supplier: '',
    expiryDate: '',
    reason: '',
    dailyPlanId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMaterials(),
        fetchAlerts(),
        fetchSummary()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await apiGet('/api/materials');
      setMaterials(response.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await apiGet('/api/materials/alerts/summary');
      setAlerts(response);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiGet('/api/materials/dashboard/summary');
      setSummary(response);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleReceive = async () => {
    if (!selectedMaterial) return;
    
    try {
      await apiPost(`/api/materials/${selectedMaterial.id}/receive`, {
        qty: parseFloat(formData.qty),
        lotNumber: formData.lotNumber || undefined,
        supplier: formData.supplier || undefined,
        expiryDate: formData.expiryDate || undefined
      });
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error receiving material:', error);
      alert('Failed to receive material');
    }
  };

  const handleAdjust = async () => {
    if (!selectedMaterial) return;
    
    try {
      await apiPost(`/api/materials/${selectedMaterial.id}/adjust`, {
        qty: parseFloat(formData.qty),
        reason: formData.reason
      });
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adjusting material:', error);
      alert('Failed to adjust material');
    }
  };

  const resetForm = () => {
    setFormData({
      qty: '',
      lotNumber: '',
      supplier: '',
      expiryDate: '',
      reason: '',
      dailyPlanId: ''
    });
    setSelectedMaterial(null);
  };

  const openModal = (type: 'receive' | 'adjust' | 'reserve', material: Material) => {
    setModalType(type);
    setSelectedMaterial(material);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading materials dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Materials Dashboard</h1>
        <p className="text-gray-600 mt-1">Inventory management, reservations, and alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Materials</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalMaterials || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold text-green-600">₹{(summary.totalValue || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Low Stock Items</div>
          <div className="text-2xl font-bold text-orange-600">{summary.lowStockCount || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active Reservations</div>
          <div className="text-2xl font-bold text-blue-600">{summary.activeReservations || 0}</div>
        </div>
      </div>

      {/* Alerts Section */}
      {(alerts.lowStock.length > 0 || alerts.needsReorder.length > 0 || alerts.expiringSoon.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-red-900 mb-3 flex items-center gap-2">
            <span>⚠️</span> Material Alerts
          </h2>
          
          {alerts.lowStock.length > 0 && (
            <div className="mb-2">
              <span className="font-medium text-red-800">Low Stock ({alerts.lowStock.length}):</span>
              <span className="text-red-700 ml-2">
                {alerts.lowStock.map(a => a.name).join(', ')}
              </span>
            </div>
          )}
          
          {alerts.needsReorder.length > 0 && (
            <div className="mb-2">
              <span className="font-medium text-orange-800">Needs Reorder ({alerts.needsReorder.length}):</span>
              <span className="text-orange-700 ml-2">
                {alerts.needsReorder.map(a => a.name).join(', ')}
              </span>
            </div>
          )}
          
          {alerts.expiringSoon.length > 0 && (
            <div>
              <span className="font-medium text-yellow-800">Expiring Soon ({alerts.expiringSoon.length}):</span>
              <span className="text-yellow-700 ml-2">
                {alerts.expiringSoon.map((a: any) => a.materialName).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Materials Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Materials Inventory</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {materials.map(material => (
                <tr key={material.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{material.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{material.type}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium">{material.stockQty}</span>
                    <span className="text-gray-500 text-sm ml-1">{material.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">{material.reservedQty}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${material.lowStock ? 'text-red-600' : 'text-green-600'}`}>
                      {material.availableQty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{material.minStock}</td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{material.costPerUnit}</td>
                  <td className="px-4 py-3">
                    {material.needsReorder ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Reorder</span>
                    ) : material.lowStock ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Low</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openModal('receive', material)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Receive
                      </button>
                      <button
                        onClick={() => openModal('adjust', material)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Adjust
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {modalType === 'receive' && 'Receive Material'}
                {modalType === 'adjust' && 'Adjust Inventory'}
                {modalType === 'reserve' && 'Reserve Material'}
              </h2>
              
              <div className="mb-4">
                <div className="font-medium text-gray-900">{selectedMaterial.name}</div>
                <div className="text-sm text-gray-500">Current Stock: {selectedMaterial.stockQty} {selectedMaterial.unit}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder={modalType === 'adjust' ? '+/- quantity' : 'Quantity'}
                  />
                </div>

                {modalType === 'receive' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Lot Number</label>
                      <input
                        type="text"
                        value={formData.lotNumber}
                        onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Supplier</label>
                      <input
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </>
                )}

                {modalType === 'adjust' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason *</label>
                    <textarea
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 mt-4 border-t">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={modalType === 'receive' ? handleReceive : handleAdjust}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {modalType === 'receive' ? 'Receive' : 'Adjust'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

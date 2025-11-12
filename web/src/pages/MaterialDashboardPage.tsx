import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { HelpCircle, TrendingUp, Package, AlertTriangle } from 'lucide-react';

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
      const qty = parseFloat(formData.qty);
      const totalCost = qty * selectedMaterial.costPerUnit;

      const response = await apiPost(`/api/materials/${selectedMaterial.id}/receive`, {
        qty,
        lotNumber: formData.lotNumber || undefined,
        supplier: formData.supplier || undefined,
        expiryDate: formData.expiryDate || undefined,
        projectId: formData.dailyPlanId || undefined
      });

      // Check if budget approval is required
      if (response.requiresApproval) {
        alert(
          `Budget Approval Required\n\n` +
          `Total cost: ₹${totalCost.toLocaleString()}\n` +
          `This purchase exceeds the approval threshold and requires authorization.\n\n` +
          `Approval request has been created. You'll be notified once it's reviewed.`
        );
        setShowModal(false);
        resetForm();
        return;
      }

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Materials & Inventory</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor stock levels, manage reservations, and track material consumption across all projects
        </p>
        <div className="mt-3 flex gap-3 text-sm">
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Available: In stock and ready to use
          </span>
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
            Reserved: Allocated to projects
          </span>
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            Low Stock: Below minimum threshold
          </span>
        </div>
      </div>

      {/* Getting Started Guide - Show when no materials */}
      {materials.length === 0 && !loading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Package className="text-blue-600 dark:text-blue-400 w-10 h-10" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">Getting Started with Materials Management</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Add Materials</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">Register all raw materials, components, and supplies used in production</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Set Stock Levels</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">Define minimum stock and reorder points to get low stock alerts automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Receive Deliveries</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">Use "Receive" button to log incoming material deliveries with lot numbers and suppliers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-sm">4</div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Track Consumption</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">Material usage is automatically tracked through production entries and reservations</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> Configure materials in Admin → Materials section before starting production
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 group hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Materials</div>
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                Total number of unique material types registered in the system
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalMaterials || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unique material types</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 group hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                Combined value of all materials currently in stock (Stock Qty × Cost Per Unit)
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{(summary.totalValue || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inventory worth</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 group hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</div>
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                Materials with available quantity below the minimum stock threshold
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.lowStockCount || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Require attention</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 group hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Reservations</div>
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                Materials currently allocated to active projects or daily plans
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.activeReservations || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pending allocations</div>
        </div>
      </div>

      {/* Stock Level Explanation */}
      {materials.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Understanding Stock Levels
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white dark:bg-gray-700 rounded p-3">
              <div className="font-semibold text-green-700 dark:text-green-400 mb-1">Stock Quantity</div>
              <p className="text-gray-600 dark:text-gray-300">Total physical quantity in warehouse. This is your actual on-hand inventory.</p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded p-3">
              <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1">Reserved Quantity</div>
              <p className="text-gray-600 dark:text-gray-300">Amount allocated to projects/plans. Reserved but not yet consumed.</p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded p-3">
              <div className="font-semibold text-orange-700 dark:text-orange-400 mb-1">Available Quantity</div>
              <p className="text-gray-600 dark:text-gray-300">Stock minus Reserved. This is what you can still allocate to new projects.</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Formula:</strong> Available = Stock - Reserved |
              <strong className="ml-2">Reorder Point:</strong> System alerts when Available drops below this threshold
            </p>
          </div>
        </div>
      )}

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">Materials Inventory</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hover over column headers for explanations</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Material</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase group relative">
                  <span className="flex items-center justify-end gap-1">
                    Stock
                    <HelpCircle className="w-3 h-3 cursor-help" />
                  </span>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Total physical quantity in warehouse
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase group relative">
                  <span className="flex items-center justify-end gap-1">
                    Reserved
                    <HelpCircle className="w-3 h-3 cursor-help" />
                  </span>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Quantity allocated to active projects
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase group relative">
                  <span className="flex items-center justify-end gap-1">
                    Available
                    <HelpCircle className="w-3 h-3 cursor-help" />
                  </span>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Stock minus Reserved - what can be allocated
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase group relative">
                  <span className="flex items-center justify-end gap-1">
                    Min Stock
                    <HelpCircle className="w-3 h-3 cursor-help" />
                  </span>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Minimum quantity before low stock alert
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cost/Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
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
                      <div className="relative group/btn">
                        <button
                          onClick={() => openModal('receive', material)}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Receive
                        </button>
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-32 bg-gray-900 text-white text-xs rounded p-1 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-10">
                          Log incoming delivery
                        </div>
                      </div>
                      <div className="relative group/btn">
                        <button
                          onClick={() => openModal('adjust', material)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Adjust
                        </button>
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-32 bg-gray-900 text-white text-xs rounded p-1 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-10">
                          Manual correction
                        </div>
                      </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                {modalType === 'receive' && 'Receive Material'}
                {modalType === 'adjust' && 'Adjust Inventory'}
                {modalType === 'reserve' && 'Reserve Material'}
              </h2>

              {modalType === 'receive' && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                  <p className="text-blue-800 dark:text-blue-200">
                    Use this to log materials received from suppliers. Stock quantity will increase by the amount entered.
                  </p>
                </div>
              )}

              {modalType === 'adjust' && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm">
                  <p className="text-orange-800 dark:text-orange-200">
                    Manual adjustments for physical count corrections, damaged goods, or other discrepancies. Use negative values to decrease stock.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <div className="font-medium text-gray-900 dark:text-white">{selectedMaterial.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Stock: {selectedMaterial.stockQty} {selectedMaterial.unit}</div>
              </div>              <div className="space-y-4">
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

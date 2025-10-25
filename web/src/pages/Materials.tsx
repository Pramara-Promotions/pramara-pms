import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Material {
  id: string;
  name: string;
  type: string;
  unit: string;
  stockQty: number;
  reservedQty: number;
  minStock?: number;
  costPerUnit?: number;
  supplier?: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, [filter]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter === 'low') params.lowStock = 'true';
      
      const res = await axios.get(`${API_BASE}/materials`, { 
        params,
        withCredentials: true 
      });
      setMaterials(res.data as Material[]);
    } catch (error) {
      console.error('Failed to load materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (material: Material) => {
    const available = material.stockQty - material.reservedQty;
    if (material.minStock && available < material.minStock) return 'low';
    if (available < 10) return 'critical';
    return 'ok';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'resin': return 'bg-purple-100 text-purple-800';
      case 'paint': return 'bg-blue-100 text-blue-800';
      case 'thinner': return 'bg-orange-100 text-orange-800';
      case 'masterbatch': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materials</h1>
          <p className="text-sm text-gray-600">Manage inventory, track stock levels, and monitor reservations</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          Add Material
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Materials
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'low'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setFilter('resin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'resin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Resin
          </button>
          <button
            onClick={() => setFilter('paint')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'paint'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Paint
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading materials...
        </div>
      )}

      {/* Materials Table */}
      {!loading && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Material</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Reserved</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Available</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Supplier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No materials found. Add your first material to get started.
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  const available = material.stockQty - material.reservedQty;
                  const status = getStockStatus(material);
                  
                  return (
                    <tr key={material.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{material.name}</div>
                        <div className="text-xs text-gray-500">Unit: {material.unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(material.type)}`}>
                          {material.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{material.stockQty.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-orange-600">{material.reservedQty.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{available.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {status === 'ok' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Critical'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{material.supplier || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Scan, Send, Truck, Box } from 'lucide-react';

interface Batch {
  id: string;
  batchCode: string;
  currentQty: number;
  ProjectSku: {
    code: string;
    name: string;
  };
}

interface Lot {
  id: number;
  lotCode: string;
  poNumber: string | null;
  customerPO: string | null;
  batchCount: number;
  totalQuantity: number;
  cartonCount: number;
  palletCount: number;
  status: string;
  shippingDestination: string | null;
  packedAt: string;
  shippedAt: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  Project: {
    name: string;
  };
  Station: {
    name: string;
  };
}

export default function LotPackingPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [lotBatches, setLotBatches] = useState<Batch[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [customerPO, setCustomerPO] = useState('');
  const [packingStationId, setPackingStationId] = useState('');
  const [packingOperators, setPackingOperators] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [cartonCount, setCartonCount] = useState('');
  const [palletCount, setPalletCount] = useState('');
  const [shippingDestination, setShippingDestination] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchStations();
    fetchLots();
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchAvailableBatches();
    }
  }, [projectId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      if (response.ok) {
        const data = await response.json();
        setStations(data.filter((s: any) => s.type === 'packing' || s.type === 'shipping'));
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchAvailableBatches = async () => {
    try {
      const response = await fetch(`/api/batches?projectId=${projectId}&status=completed`);
      if (response.ok) {
        const data = await response.json();
        // Filter batches not already in a lot
        const available = data.filter((b: any) => !b.lotId && b.currentQty > 0);
        setAvailableBatches(available);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchLots = async () => {
    try {
      const response = await fetch('/api/lots');
      if (response.ok) {
        const data = await response.json();
        setLots(data.lots || data);
      }
    } catch (error) {
      console.error('Error fetching lots:', error);
    }
  };

  const toggleBatchSelection = (batchId: string) => {
    setSelectedBatchIds(prev =>
      prev.includes(batchId)
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const handleCreateLot = async () => {
    if (!projectId || !packingStationId || selectedBatchIds.length === 0) {
      setError('Project, packing station, and at least one batch are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          poNumber,
          customerPO,
          packingStationId: parseInt(packingStationId),
          packingOperators: packingOperators ? packingOperators.split(',').map(s => s.trim()) : [],
          batchIds: selectedBatchIds,
          cartonCount: parseInt(cartonCount) || 0,
          palletCount: parseInt(palletCount) || 0,
          shippingDestination
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create lot');
      }

      // Reset form
      setSelectedBatchIds([]);
      setPoNumber('');
      setCustomerPO('');
      setCartonCount('');
      setPalletCount('');
      setShippingDestination('');
      setPackingOperators('');
      setIsCreating(false);

      // Refresh lists
      fetchLots();
      fetchAvailableBatches();
    } catch (err: any) {
      setError(err.message || 'Failed to create lot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLot = async (lot: Lot) => {
    setSelectedLot(lot);
    try {
      const response = await fetch(`/api/lots/${lot.id}`);
      if (response.ok) {
        const data = await response.json();
        setLotBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching lot details:', error);
    }
  };

  const handleShipLot = async (lotId: number) => {
    const trackingNumber = prompt('Enter tracking number (optional):');
    const carrier = prompt('Enter carrier (optional):');

    try {
      const response = await fetch(`/api/lots/${lotId}/ship`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippedDate: new Date().toISOString(),
          trackingNumber,
          carrier
        })
      });

      if (response.ok) {
        fetchLots();
        setSelectedLot(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to ship lot');
      }
    } catch (error) {
      alert('Failed to ship lot');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Box className="text-purple-600" size={32} />
            Lot Packing & Shipping
          </h1>
          <p className="text-gray-600 mt-1">Pack batches into lots for shipping</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {isCreating ? <Trash2 size={20} /> : <Plus size={20} />}
          {isCreating ? 'Cancel' : 'Create New Lot'}
        </button>
      </div>

      {/* Create Lot Form */}
      {isCreating && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">New Lot</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Packing Station *
              </label>
              <select
                value={packingStationId}
                onChange={(e) => setPackingStationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select station...</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="PO-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer PO
              </label>
              <input
                type="text"
                value={customerPO}
                onChange={(e) => setCustomerPO(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="CUST-PO-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Packing Operators (comma-separated)
              </label>
              <input
                type="text"
                value={packingOperators}
                onChange={(e) => setPackingOperators(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="John Doe, Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Destination
              </label>
              <input
                type="text"
                value={shippingDestination}
                onChange={(e) => setShippingDestination(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="123 Main St, City, State"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carton Count
              </label>
              <input
                type="number"
                value={cartonCount}
                onChange={(e) => setCartonCount(e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pallet Count
              </label>
              <input
                type="number"
                value={palletCount}
                onChange={(e) => setPalletCount(e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">
              Select Batches ({selectedBatchIds.length} selected)
            </h3>
            {!projectId ? (
              <p className="text-gray-500">Select a project to see available batches</p>
            ) : availableBatches.length === 0 ? (
              <p className="text-gray-500">No completed batches available for packing</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {availableBatches.map(batch => (
                  <div
                    key={batch.id}
                    onClick={() => toggleBatchSelection(batch.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedBatchIds.includes(batch.id)
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{batch.batchCode}</p>
                        <p className="text-sm text-gray-600">{batch.ProjectSku.name}</p>
                        <p className="text-sm text-gray-600">Qty: {batch.currentQty}</p>
                      </div>
                      {selectedBatchIds.includes(batch.id) && (
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsCreating(false)}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateLot}
              disabled={isLoading || selectedBatchIds.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Lot'}
            </button>
          </div>
        </div>
      )}

      {/* Lots List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lots.map(lot => (
          <div
            key={lot.id}
            onClick={() => handleViewLot(lot)}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-5 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{lot.lotCode}</h3>
                <p className="text-sm text-gray-600">{lot.Project.name}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                lot.status === 'shipped' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {lot.status}
              </span>
            </div>

            {lot.poNumber && (
              <p className="text-sm text-gray-600 mb-2">PO: {lot.poNumber}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <p className="text-gray-600">Batches</p>
                <p className="font-bold">{lot.batchCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Qty</p>
                <p className="font-bold">{lot.totalQuantity}</p>
              </div>
              <div>
                <p className="text-gray-600">Cartons</p>
                <p className="font-bold">{lot.cartonCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Pallets</p>
                <p className="font-bold">{lot.palletCount}</p>
              </div>
            </div>

            {lot.shippingDestination && (
              <p className="text-xs text-gray-600 mb-2">📍 {lot.shippingDestination}</p>
            )}

            <div className="text-xs text-gray-500">
              Packed: {new Date(lot.packedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Lot Detail Modal */}
      {selectedLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedLot.lotCode}</h2>
                <p className="text-gray-600">{selectedLot.Project.name}</p>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-bold">{selectedLot.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Batches</p>
                  <p className="font-bold">{selectedLot.batchCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Quantity</p>
                  <p className="font-bold">{selectedLot.totalQuantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Station</p>
                  <p className="font-bold">{selectedLot.Station.name}</p>
                </div>
              </div>

              {selectedLot.poNumber && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">PO Number</p>
                  <p className="font-bold">{selectedLot.poNumber}</p>
                </div>
              )}

              <h3 className="text-lg font-bold mb-3">Batches in Lot</h3>
              <div className="space-y-2 mb-6">
                {lotBatches.map(batch => (
                  <div key={batch.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold">{batch.batchCode}</p>
                        <p className="text-sm text-gray-600">{batch.ProjectSku.name}</p>
                      </div>
                      <p className="font-bold">Qty: {batch.currentQty}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedLot.shippedAt && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-bold text-green-800">Shipped</p>
                  <p className="text-sm text-green-700">Date: {new Date(selectedLot.shippedAt).toLocaleDateString()}</p>
                  {selectedLot.trackingNumber && (
                    <p className="text-sm text-green-700">Tracking: {selectedLot.trackingNumber}</p>
                  )}
                  {selectedLot.carrier && (
                    <p className="text-sm text-green-700">Carrier: {selectedLot.carrier}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setSelectedLot(null)}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              {selectedLot.status === 'packed' && (
                <button
                  onClick={() => handleShipLot(selectedLot.id)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700"
                >
                  <Truck className="w-5 h-5" />
                  Mark as Shipped
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

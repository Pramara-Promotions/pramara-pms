import React, { useState, useEffect } from 'react';
import { 
  Package, 
  QrCode, 
  Printer, 
  Split, 
  MoveRight, 
  AlertTriangle, 
  Trash2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  Download,
  Layers
} from 'lucide-react';

interface Batch {
  id: string;
  batchNumber: string;
  productName: string;
  quantity: number;
  unit: string;
  status: 'active' | 'completed' | 'rejected';
  currentStation?: string;
  qrCode?: string;
  parentBatchId?: string;
  subBatches?: Batch[];
  movements?: BatchMovement[];
  createdAt: string;
}

interface BatchMovement {
  id: string;
  fromStation: string;
  toStation: string;
  quantity: number;
  movedBy: string;
  timestamp: string;
  notes?: string;
}

interface RejectionRecord {
  id: string;
  batchId: string;
  batchNumber: string;
  reason: string;
  quantity: number;
  rejectedBy: string;
  rejectedAt: string;
  binLocation: string;
}

export function BatchTrackingPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rejections, setRejections] = useState<RejectionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showTraceabilityModal, setShowTraceabilityModal] = useState(false);
  
  const [newBatch, setNewBatch] = useState({
    productName: '',
    quantity: 0,
    unit: 'pcs',
    currentStation: ''
  });

  const [splitData, setSplitData] = useState({
    numSubBatches: 2,
    quantities: [] as number[]
  });

  const [moveData, setMoveData] = useState({
    toStation: '',
    quantity: 0,
    notes: ''
  });

  const [rejectData, setRejectData] = useState({
    reason: '',
    quantity: 0,
    binLocation: ''
  });

  useEffect(() => {
    fetchBatches();
    fetchRejections();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches');
      const data = await response.json();
      setBatches(data);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const fetchRejections = async () => {
    try {
      const response = await fetch('/api/batches/rejections');
      const data = await response.json();
      setRejections(data);
    } catch (error) {
      console.error('Failed to fetch rejections:', error);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBatch)
      });
      
      if (response.ok) {
        await fetchBatches();
        setShowCreateModal(false);
        setNewBatch({ productName: '', quantity: 0, unit: 'pcs', currentStation: '' });
      }
    } catch (error) {
      console.error('Failed to create batch:', error);
    }
  };

  const handlePrintHandoverSheet = (batch: Batch) => {
    // Generate and print handover sheet with QR code
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch Handover Sheet - ${batch.batchNumber}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .qr-code { text-align: center; margin: 30px 0; }
            .qr-code img { width: 200px; height: 200px; }
            .details { margin: 20px 0; }
            .details table { width: 100%; border-collapse: collapse; }
            .details td { padding: 10px; border: 1px solid #ddd; }
            .details td:first-child { font-weight: bold; width: 30%; background: #f5f5f5; }
            .signature { margin-top: 50px; }
            .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 50px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Batch Handover Sheet</h1>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="qr-code">
            <img src="${batch.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${batch.batchNumber}`}" alt="QR Code" />
            <h2>${batch.batchNumber}</h2>
          </div>
          
          <div class="details">
            <table>
              <tr>
                <td>Product Name</td>
                <td>${batch.productName}</td>
              </tr>
              <tr>
                <td>Batch Number</td>
                <td>${batch.batchNumber}</td>
              </tr>
              <tr>
                <td>Quantity</td>
                <td>${batch.quantity} ${batch.unit}</td>
              </tr>
              <tr>
                <td>Current Station</td>
                <td>${batch.currentStation || 'Not assigned'}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td>${batch.status}</td>
              </tr>
              <tr>
                <td>Created</td>
                <td>${new Date(batch.createdAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div class="signature">
            <p><strong>Received By:</strong></p>
            <div class="signature-line"></div>
            <p>Name: ___________________ Date: ___________</p>
          </div>
          
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">Print</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSplitBatch = async () => {
    if (!selectedBatch) return;
    
    try {
      const response = await fetch(`/api/batches/${selectedBatch.id}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantities: splitData.quantities
        })
      });
      
      if (response.ok) {
        await fetchBatches();
        setShowSplitModal(false);
        setSplitData({ numSubBatches: 2, quantities: [] });
        setSelectedBatch(null);
      }
    } catch (error) {
      console.error('Failed to split batch:', error);
    }
  };

  const handleMoveBatch = async () => {
    if (!selectedBatch) return;
    
    try {
      const response = await fetch(`/api/batches/${selectedBatch.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveData)
      });
      
      if (response.ok) {
        await fetchBatches();
        setShowMoveModal(false);
        setMoveData({ toStation: '', quantity: 0, notes: '' });
        setSelectedBatch(null);
      }
    } catch (error) {
      console.error('Failed to move batch:', error);
    }
  };

  const handleRejectBatch = async () => {
    if (!selectedBatch) return;
    
    try {
      const response = await fetch(`/api/batches/${selectedBatch.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectData)
      });
      
      if (response.ok) {
        await fetchBatches();
        await fetchRejections();
        setShowRejectModal(false);
        setRejectData({ reason: '', quantity: 0, binLocation: '' });
        setSelectedBatch(null);
      }
    } catch (error) {
      console.error('Failed to reject batch:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBatches = batches.filter(batch =>
    batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8" />
            Batch Tracking System
          </h1>
          <p className="text-gray-600 mt-1">Complete traceability from raw materials to finished products</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Batch
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by batch number or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan QR
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Batches</p>
              <p className="text-2xl font-bold text-gray-900">{batches.filter(b => b.status === 'active').length}</p>
            </div>
            <Package className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{batches.filter(b => b.status === 'completed').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{batches.filter(b => b.status === 'rejected').length}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Sub-batches</p>
              <p className="text-2xl font-bold text-gray-900">{batches.filter(b => b.parentBatchId).length}</p>
            </div>
            <Layers className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Batch #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Station</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No batches found. Create your first batch to get started.
                  </td>
                </tr>
              ) : (
                filteredBatches.map(batch => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{batch.batchNumber}</span>
                        {batch.parentBatchId && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Sub</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{batch.productName}</td>
                    <td className="px-4 py-3 text-gray-900">{batch.quantity} {batch.unit}</td>
                    <td className="px-4 py-3 text-gray-600">{batch.currentStation || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(batch.status)}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePrintHandoverSheet(batch)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Print Handover Sheet"
                        >
                          <Printer className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setShowSplitModal(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Split Batch"
                        >
                          <Split className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setShowMoveModal(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Move Batch"
                        >
                          <MoveRight className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setShowRejectModal(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Reject Batch"
                        >
                          <AlertTriangle className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setShowTraceabilityModal(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="View Traceability"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6" />
              Create New Batch
            </h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newBatch.productName}
                  onChange={(e) => setNewBatch({ ...newBatch, productName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    value={newBatch.quantity}
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit *</label>
                  <select
                    value={newBatch.unit}
                    onChange={(e) => setNewBatch({ ...newBatch, unit: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Starting Station</label>
                <input
                  type="text"
                  value={newBatch.currentStation}
                  onChange={(e) => setNewBatch({ ...newBatch, currentStation: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Receiving Area"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Additional modals for Split, Move, Reject, and Traceability would go here */}
      {/* For brevity, showing structure only */}
    </div>
  );
}

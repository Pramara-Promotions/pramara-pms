import { useState, useEffect } from 'react';
import { listProjects } from '../../lib/services/projects';
import { listWipTransactions, createWipTransaction, cancelWipTransaction, getWipBalanceSummary } from '../../lib/services/wip';
import { Plus, Package, TrendingUp, TrendingDown, BarChart3, Search } from 'lucide-react';

interface WIPTransaction {
  id: string;
  projectId: number;
  project: { id: number; name: string };
  stationId: number | null;
  station: { id: number; name: string; code: string } | null;
  batch: { id: string; batchCode: string } | null;
  transactionDate: string;
  transactionType: string;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  fromLocation: string | null;
  toLocation: string | null;
  qualityStatus: string | null;
  balanceQuantity: number | null;
  status: string;
  operator: { id: string; name: string } | null;
  creator: { id: string; name: string };
}

interface WIPBalance {
  itemCode: string;
  itemDescription: string;
  unit: string;
  currentBalance: number;
  totalInput: number;
  totalOutput: number;
  totalScrap: number;
}

const WIPLedgerPage = () => {
  const [transactions, setTransactions] = useState<WIPTransaction[]>([]);
  const [balances, setBalances] = useState<WIPBalance[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'transactions' | 'balance'>('balance');
  const [projectFilter, setProjectFilter] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    stationId: '',
    batchId: '',
    transactionType: 'input',
    itemCode: '',
    itemDescription: '',
    quantity: 0,
    unit: 'pcs',
    fromLocation: '',
    toLocation: '',
    operationCode: '',
    qualityStatus: 'pass',
    remarks: '',
  });

  const transactionTypes = [
    { value: 'input', label: 'Input', icon: TrendingUp, color: 'text-green-600' },
    { value: 'output', label: 'Output', icon: TrendingDown, color: 'text-blue-600' },
    { value: 'transfer', label: 'Transfer', icon: Package, color: 'text-purple-600' },
    { value: 'adjustment', label: 'Adjustment', icon: BarChart3, color: 'text-orange-600' },
    { value: 'scrap', label: 'Scrap', icon: TrendingDown, color: 'text-red-600' },
  ];

  const units = ['pcs', 'kg', 'meters', 'yards', 'rolls', 'boxes'];

  useEffect(() => {
    fetchProjects();
    if (viewMode === 'balance') {
      fetchBalances();
    } else {
      fetchTransactions();
    }
  }, [viewMode, projectFilter]);

  const fetchProjects = async () => {
    try {
      const rows = await listProjects();
      setProjects(rows || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const rows = await listWipTransactions({ projectId: projectFilter, itemCode: itemSearch });
      setTransactions(rows || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalances = async () => {
    setIsLoading(true);
    try {
      const rows = await getWipBalanceSummary({ projectId: projectFilter });
      setBalances(rows || []);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createWipTransaction(formData);
      {
        setIsModalOpen(false);
        resetForm();
        if (viewMode === 'balance') {
          fetchBalances();
        } else {
          fetchTransactions();
        }
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      stationId: '',
      batchId: '',
      transactionType: 'input',
      itemCode: '',
      itemDescription: '',
      quantity: 0,
      unit: 'pcs',
      fromLocation: '',
      toLocation: '',
      operationCode: '',
      qualityStatus: 'pass',
      remarks: '',
    });
  };

  const getTransactionIcon = (type: string) => {
    const txType = transactionTypes.find(t => t.value === type);
    return txType ? { Icon: txType.icon, color: txType.color } : { Icon: Package, color: 'text-gray-600' };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-blue-600" size={32} />
            WIP Ledger
          </h1>
          <p className="text-gray-600 mt-1">Track work-in-progress inventory movements</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Transaction
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex gap-2 border rounded-lg p-1">
          <button
            onClick={() => setViewMode('balance')}
            className={`px-4 py-2 rounded ${viewMode === 'balance' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Current Balance
          </button>
          <button
            onClick={() => setViewMode('transactions')}
            className={`px-4 py-2 rounded ${viewMode === 'transactions' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Transaction History
          </button>
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {viewMode === 'transactions' && (
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search item code..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
      ) : viewMode === 'balance' ? (
        <div className="space-y-4">
          {balances.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No WIP balances found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Input</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Output</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scrap</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balances.map((balance) => (
                    <tr key={balance.itemCode} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{balance.itemCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{balance.itemDescription}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-green-600 font-medium">
                          +{balance.totalInput.toFixed(2)} {balance.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-blue-600 font-medium">
                          -{balance.totalOutput.toFixed(2)} {balance.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-red-600 font-medium">
                          -{balance.totalScrap.toFixed(2)} {balance.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xl font-bold ${balance.currentBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {balance.currentBalance.toFixed(2)} {balance.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const { Icon, color } = getTransactionIcon(tx.transactionType);
              return (
                <div key={tx.id} className="bg-white rounded-lg shadow p-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                      <Icon className={color} size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">{tx.itemCode}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${color.replace('text-', 'bg-').replace('-600', '-100')} ${color}`}>
                              {tx.transactionType.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-1">{tx.itemDescription}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {tx.project.name} • {new Date(tx.transactionDate).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {tx.transactionType === 'input' ? '+' : tx.transactionType === 'output' || tx.transactionType === 'scrap' ? '-' : ''}
                            {tx.quantity} {tx.unit}
                          </p>
                          {tx.balanceQuantity !== null && (
                            <p className="text-sm text-gray-600 mt-1">
                              Balance: {tx.balanceQuantity.toFixed(2)} {tx.unit}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        {tx.station && (
                          <div>
                            <p className="text-gray-600">Station</p>
                            <p className="font-medium">{tx.station.name}</p>
                          </div>
                        )}
                        {tx.batch && (
                          <div>
                            <p className="text-gray-600">Batch</p>
                            <p className="font-medium">{tx.batch.batchCode}</p>
                          </div>
                        )}
                        {tx.qualityStatus && (
                          <div>
                            <p className="text-gray-600">Quality</p>
                            <p className={`font-medium ${tx.qualityStatus === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.qualityStatus.toUpperCase()}
                            </p>
                          </div>
                        )}
                        {tx.operator && (
                          <div>
                            <p className="text-gray-600">Operator</p>
                            <p className="font-medium">{tx.operator.name}</p>
                          </div>
                        )}
                      </div>

                      {(tx.fromLocation || tx.toLocation) && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                          {tx.fromLocation && <span>From: <strong>{tx.fromLocation}</strong></span>}
                          {tx.fromLocation && tx.toLocation && <span>→</span>}
                          {tx.toLocation && <span>To: <strong>{tx.toLocation}</strong></span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">New WIP Transaction</h2>
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
                    <label className="block text-sm font-medium mb-2">Transaction Type *</label>
                    <select required value={formData.transactionType} onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {transactionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality Status</label>
                    <select value={formData.qualityStatus} onChange={(e) => setFormData({ ...formData, qualityStatus: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                      <option value="pending">Pending</option>
                      <option value="rework">Rework</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Item Code *</label>
                    <input required type="text" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="ITEM-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unit *</label>
                    <select required value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Item Description *</label>
                    <input required type="text" value={formData.itemDescription} onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quantity *</label>
                    <input required type="number" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Operation Code</label>
                    <input type="text" value={formData.operationCode} onChange={(e) => setFormData({ ...formData, operationCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">From Location</label>
                    <input type="text" value={formData.fromLocation} onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">To Location</label>
                    <input type="text" value={formData.toLocation} onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Remarks</label>
                    <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Creating...' : 'Create Transaction'}
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

export default WIPLedgerPage;

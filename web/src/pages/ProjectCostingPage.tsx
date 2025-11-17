import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { apiGet, apiPost } from '../lib/api';
import { useProjectContextSafe } from './projects/ProjectContext';

interface CostComponent {
  id: number;
  category: 'material' | 'labor' | 'overhead' | 'tooling';
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface PricingTier {
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
  margin: number;
}

interface ProjectCosting {
  id: number;
  projectId: number;
  version: number;
  calculatedAt: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalToolingCost: number;
  totalCost: number;
  unitCost: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  Project?: {
    id: number;
    code: string;
    name: string;
    quantity: number;
  };
  components?: CostComponent[];
  pricingTiers?: PricingTier[];
}

interface Project {
  id: number;
  code: string;
  name: string;
  quantity: number;
}

export default function ProjectCostingPage() {
  const projectContext = useProjectContextSafe();
  const [costings, setCostings] = useState<ProjectCosting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // Page-level state
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedCostings, setSelectedCostings] = useState<number[]>([]);
  const [marginConfig, setMarginConfig] = useState<any>({
    tierMargins: [
      { minQty: 0, maxQty: 1000, margin: 30 },
      { minQty: 1000, maxQty: 5000, margin: 25 },
      { minQty: 5000, maxQty: 10000, margin: 20 },
      { minQty: 10000, maxQty: null, margin: 15 },
    ],
  });
  const [compareMode, setCompareMode] = useState(false);
    const [showMarginModal, setShowMarginModal] = useState(false);
    const [applyingMargin, setApplyingMargin] = useState(false);
    const [marginError, setMarginError] = useState<string|null>(null);

    // Open margin modal
    const openMarginModal = () => {
      setMarginError(null);
      setShowMarginModal(true);
    };

  // Costing approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [costingToApprove, setCostingToApprove] = useState<number | null>(null);

    // Apply margin rules to costing
    const handleApplyMargin = async (costingId: string) => {
      setApplyingMargin(true);
      setMarginError(null);
      try {
        const res = await fetch(`/api/costing/${costingId}/apply-margins`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        if (json.error) {
          setMarginError(json.error);
        } else {
          setShowMarginModal(false);
          await fetchCostings();
        }
      } catch (err) {
        setMarginError('Failed to apply margin rules');
      } finally {
        setApplyingMargin(false);
      }
    };

    // Cost Template Modal State
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [applyingTemplates, setApplyingTemplates] = useState(false);
    const [templateError, setTemplateError] = useState<string|null>(null);
    const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
    const [templateOptions, setTemplateOptions] = useState<any[]>([]);

    // Open template modal
    const openTemplateModal = () => {
      setShowTemplateModal(true);
      setTemplateError(null);
      // Load templates for selection
      loadTemplates();
    };

    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/cost-templates', { credentials: 'include' });
        const json = await res.json();
        setTemplateOptions(Array.isArray(json.templates) ? json.templates : []);
      } catch (e) {
        console.error('Failed to load templates', e);
        setTemplateError('Failed to load templates');
      }
    };

    // Expanded costing for modals
    const [expandedCostingId, setExpandedCostingId] = useState<number|null>(null);

    // Apply cost templates to costing
    const handleApplyTemplates = async (costingId: string) => {
      setApplyingTemplates(true);
      setTemplateError(null);
      try {
        const res = await fetch(`/api/cost-templates/apply`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ costingId, templateIds: selectedTemplates }),
        });
        const json = await res.json();
        if (json.error) {
          setTemplateError(json.error);
        } else {
          setShowTemplateModal(false);
          await fetchCostings();
        }
      } catch (err) {
        setTemplateError('Failed to apply templates');
      } finally {
        setApplyingTemplates(false);
      }
    };

  // Auto-set project from context if available
  useEffect(() => {
    if (projectContext) {
      setSelectedProjectId(projectContext.id);
    }
  }, [projectContext]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCostings(), fetchProjects()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostings = async () => {
    try {
      const response = await apiGet('/api/costing/all');
      setCostings(response.costings || []);
    } catch (error) {
      console.error('Error fetching costings:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await apiGet('/api/projects');
      setProjects(response || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleCalculateCosting = async () => {
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }

    setCalculating(true);
    try {
      const response = await apiPost('/api/costing/calculate', {
        projectId: selectedProjectId,
        marginConfig,
      });

      if (response.success) {
        alert('✅ Costing calculated successfully!');
        await fetchCostings();
        // Auto-expand the newly created costing
        if (response.costing?.id) {
          setExpandedCostingId(response.costing.id);
        }
      } else {
        alert(`❌ Calculation failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error calculating costing:', error);
      alert(`❌ Failed to calculate costing: ${error.message || 'Unknown error'}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmitForApproval = async (costingId: number) => {
    if (!confirm('Submit this costing for approval?')) {
      return;
    }

    try {
      const response = await apiPost(`/api/costing/${costingId}/submit`, {});
      
      if (response.success) {
        alert('✅ Costing submitted for approval');
        await fetchCostings();
      } else {
        alert(`❌ Submission failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error submitting costing:', error);
      alert(`❌ Failed to submit: ${error.message || 'Unknown error'}`);
    }
  };

  const handleApprovalAction = async () => {
    if (!costingToApprove) return;

    if (approvalAction === 'reject' && !approvalComments.trim()) {
      alert('Please provide rejection comments');
      return;
    }

    try {
      const response = await apiPost(`/api/costing/${costingToApprove}/approval`, {
        action: approvalAction,
        comments: approvalComments,
      });

      if (response.success) {
        alert(`✅ Costing ${approvalAction}ed successfully`);
        setShowApprovalModal(false);
        setCostingToApprove(null);
        setApprovalComments('');
        await fetchCostings();
      } else {
        alert(`❌ Action failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error processing approval:', error);
      alert(`❌ Failed to process: ${error.message || 'Unknown error'}`);
    }
  };

  const openApprovalModal = (costingId: number, action: 'approve' | 'reject') => {
    setCostingToApprove(costingId);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const toggleCompareSelection = (costingId: number) => {
    setSelectedCostings(prev =>
      prev.includes(costingId)
        ? prev.filter(id => id !== costingId)
        : [...prev, costingId]
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      material: '📦',
      labor: '👷',
      overhead: '🏭',
      tooling: '🔧',
    };
    return icons[category as keyof typeof icons] || '📊';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      material: 'bg-blue-100 text-blue-800',
      labor: 'bg-purple-100 text-purple-800',
      overhead: 'bg-orange-100 text-orange-800',
      tooling: 'bg-green-100 text-green-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateVariance = (baseCosting: ProjectCosting, compareCosting: ProjectCosting) => {
    return {
      totalCost: ((compareCosting.totalCost - baseCosting.totalCost) / baseCosting.totalCost) * 100,
      material: ((compareCosting.totalMaterialCost - baseCosting.totalMaterialCost) / baseCosting.totalMaterialCost) * 100,
      labor: ((compareCosting.totalLaborCost - baseCosting.totalLaborCost) / baseCosting.totalLaborCost) * 100,
      overhead: ((compareCosting.totalOverheadCost - baseCosting.totalOverheadCost) / baseCosting.totalOverheadCost) * 100,
      tooling: ((compareCosting.totalToolingCost - baseCosting.totalToolingCost) / baseCosting.totalToolingCost) * 100,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading costing dashboard...</div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const compareCostings = selectedCostings.map(id => costings.find(c => c.id === id)!).filter(Boolean);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Margin Rule Apply Modal */}
      {showMarginModal && expandedCostingId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-blue-700 mb-4">Apply Margin Rules</h2>
            <div className="mb-3 text-sm text-gray-700">Apply active margin rules to this costing. Pricing tiers will be updated.</div>
            {marginError && <div className="text-red-600 text-sm mb-2">{marginError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowMarginModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                disabled={applyingMargin}
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyMargin(String(expandedCostingId))}
                className={`flex-1 px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors ${applyingMargin ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={applyingMargin}
              >
                {applyingMargin ? 'Applying…' : 'Apply Margin Rules'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cost Template Apply Modal */}
      {showTemplateModal && expandedCostingId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-blue-700 mb-4">Apply Cost Templates</h2>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Templates</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templateOptions.length === 0 ? (
                  <div className="text-gray-500 text-sm">No templates available</div>
                ) : (
                  templateOptions.map(t => (
                    <label key={t.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(t.id)}
                        onChange={e => {
                          setSelectedTemplates(sel =>
                            e.target.checked
                              ? [...sel, t.id]
                              : sel.filter(id => id !== t.id)
                          );
                        }}
                        className="accent-blue-600 w-4 h-4 rounded"
                      />
                      <span className="font-medium text-sm text-gray-800">{t.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{t.category}</span>
                      <span className="text-xs text-gray-500">{t.unit || '—'}</span>
                      <span className="text-xs text-gray-500">{t.defaultValue != null ? `₹${t.defaultValue}` : '—'}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            {templateError && <div className="text-red-600 text-sm mb-2">{templateError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                disabled={applyingTemplates}
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyTemplates(String(expandedCostingId))}
                className={`flex-1 px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors ${applyingTemplates ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={applyingTemplates}
              >
                {applyingTemplates ? 'Applying…' : 'Apply Templates'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Project Costing</h1>
        <p className="text-gray-600 mt-1">
          Calculate costs from BOM, workflow, and apply margin rules
        </p>
      </div>
      {/* Calculation Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Calculate New Costing
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
          {!projectContext && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} ({p.quantity} units)
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProject && (
            <div className="bg-green-50 p-3 rounded-md">
              <div className="text-xs text-green-600 font-medium mb-1">Order Quantity</div>
              <div className="text-sm font-semibold text-green-900">
                {selectedProject.quantity.toLocaleString()} units
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleCalculateCosting}
              disabled={!selectedProjectId || calculating}
              className={`w-full px-6 py-2 rounded-md font-medium transition-colors ${
                !selectedProjectId || calculating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {calculating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Calculating...
                </span>
              ) : (
                '💰 Calculate Costing'
              )}
            </button>
          </div>
        </div>

        {/* Margin Configuration */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Margin Configuration</h3>
            <button
              onClick={() => {
                const expanded = document.getElementById('margin-config');
                if (expanded) {
                  expanded.style.display = expanded.style.display === 'none' ? 'block' : 'none';
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Toggle
            </button>
          </div>
          <div id="margin-config" style={{ display: 'none' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {marginConfig.tierMargins.map((tier, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-600 mb-1">
                    {tier.minQty.toLocaleString()} - {tier.maxQty ? tier.maxQty.toLocaleString() : '∞'} units
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tier.margin}
                      onChange={(e) => {
                        const newConfig = { ...marginConfig };
                        newConfig.tierMargins[idx].margin = Number(e.target.value);
                        setMarginConfig(newConfig);
                      }}
                      className="w-20 border rounded px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-gray-700">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Compare Mode Toggle */}
      {costings.length > 1 && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedCostings([]);
            }}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              compareMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {compareMode ? '✓ Compare Mode Active' : '⚖️ Enable Compare Mode'}
          </button>
          {compareMode && selectedCostings.length >= 2 && (
            <span className="text-sm text-gray-600">
              {selectedCostings.length} costings selected for comparison
            </span>
          )}
        </div>
      )}

      {/* Comparison View */}
      {compareMode && compareCostings.length >= 2 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 border-b bg-blue-50">
            <h2 className="font-bold text-lg">Costing Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  {compareCostings.map(costing => (
                    <th key={costing.id} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      v{costing.version}
                      <div className="text-xs text-gray-400 normal-case">{formatDateTime(costing.calculatedAt)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium">Total Cost</td>
                  {compareCostings.map((costing, idx) => (
                    <td key={costing.id} className="px-4 py-3 text-right">
                      <div className="font-bold text-lg">{formatCurrency(costing.totalCost, costing.currency)}</div>
                      {idx > 0 && (
                        <div className={`text-xs ${calculateVariance(compareCostings[0], costing).totalCost >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calculateVariance(compareCostings[0], costing).totalCost > 0 ? '+' : ''}
                          {calculateVariance(compareCostings[0], costing).totalCost.toFixed(2)}%
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3">Material Cost</td>
                  {compareCostings.map((costing, idx) => (
                    <td key={costing.id} className="px-4 py-3 text-right">
                      {formatCurrency(costing.totalMaterialCost, costing.currency)}
                      {idx > 0 && (
                        <div className={`text-xs ${calculateVariance(compareCostings[0], costing).material >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calculateVariance(compareCostings[0], costing).material > 0 ? '+' : ''}
                          {calculateVariance(compareCostings[0], costing).material.toFixed(2)}%
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3">Labor Cost</td>
                  {compareCostings.map((costing, idx) => (
                    <td key={costing.id} className="px-4 py-3 text-right">
                      {formatCurrency(costing.totalLaborCost, costing.currency)}
                      {idx > 0 && (
                        <div className={`text-xs ${calculateVariance(compareCostings[0], costing).labor >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calculateVariance(compareCostings[0], costing).labor > 0 ? '+' : ''}
                          {calculateVariance(compareCostings[0], costing).labor.toFixed(2)}%
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3">Overhead Cost</td>
                  {compareCostings.map((costing, idx) => (
                    <td key={costing.id} className="px-4 py-3 text-right">
                      {formatCurrency(costing.totalOverheadCost, costing.currency)}
                      {idx > 0 && (
                        <div className={`text-xs ${calculateVariance(compareCostings[0], costing).overhead >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calculateVariance(compareCostings[0], costing).overhead > 0 ? '+' : ''}
                          {calculateVariance(compareCostings[0], costing).overhead.toFixed(2)}%
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3">Tooling Cost</td>
                  {compareCostings.map((costing, idx) => (
                    <td key={costing.id} className="px-4 py-3 text-right">
                      {formatCurrency(costing.totalToolingCost, costing.currency)}
                      {idx > 0 && (
                        <div className={`text-xs ${calculateVariance(compareCostings[0], costing).tooling >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {calculateVariance(compareCostings[0], costing).tooling > 0 ? '+' : ''}
                          {calculateVariance(compareCostings[0], costing).tooling.toFixed(2)}%
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Unit Cost</td>
                  {compareCostings.map(costing => (
                    <td key={costing.id} className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(costing.unitCost, costing.currency)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Costings List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-lg">Project Costings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Historical costing calculations and pricing
          </p>
        </div>

        {costings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">No costings calculated yet</p>
            <p className="text-sm mt-1">Select a project and click "Calculate Costing" to start</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {costings.map(costing => {
              const isExpanded = expandedCostingId === costing.id;

              return (
                <div key={costing.id} className="hover:bg-gray-50">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {compareMode && (
                            <input
                              type="checkbox"
                              checked={selectedCostings.includes(costing.id)}
                              onChange={() => toggleCompareSelection(costing.id)}
                              className="w-5 h-5 text-blue-600 rounded"
                            />
                          )}
                          <h3 className="font-semibold text-lg text-gray-900">
                            {costing.Project?.code || `Project #${costing.projectId}`}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(costing.status)}`}>
                            {costing.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            v{costing.version}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <div className="text-xs text-blue-600 mb-1">Material</div>
                            <div className="font-bold text-blue-900">{formatCurrency(costing.totalMaterialCost, costing.currency)}</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded">
                            <div className="text-xs text-purple-600 mb-1">Labor</div>
                            <div className="font-bold text-purple-900">{formatCurrency(costing.totalLaborCost, costing.currency)}</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded">
                            <div className="text-xs text-orange-600 mb-1">Overhead</div>
                            <div className="font-bold text-orange-900">{formatCurrency(costing.totalOverheadCost, costing.currency)}</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded">
                            <div className="text-xs text-green-600 mb-1">Tooling</div>
                            <div className="font-bold text-green-900">{formatCurrency(costing.totalToolingCost, costing.currency)}</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded border-2 border-gray-300">
                            <div className="text-xs text-gray-600 mb-1">Total</div>
                            <div className="font-bold text-xl text-gray-900">{formatCurrency(costing.totalCost, costing.currency)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="text-gray-500">Unit Cost:</span>
                          <span className="font-bold text-green-600 text-lg">{formatCurrency(costing.unitCost, costing.currency)}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-500">Calculated {formatDateTime(costing.calculatedAt)}</span>
                          {costing.approvedAt && <span className="text-gray-500">• Approved {formatDateTime(costing.approvedAt)}</span>}
                        </div>

                        {costing.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <strong>Rejection Reason:</strong> {costing.rejectionReason}
                          </div>
                        )}

                        {costing.notes && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <strong>Notes:</strong> {costing.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Link
                          to={{ to: '/planning/costing/pnl' as any, search: { costingId: String(costing.id) } } as any}
                          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-200 transition-colors"
                        >
                          📊 View P&L
                        </Link>
                        {costing.status === 'draft' && (
                          <>
                            <button
                              onClick={() => { setExpandedCostingId(costing.id); openMarginModal(); }}
                              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-md border border-blue-300 hover:bg-blue-200 transition-colors ml-2"
                            >
                              📈 Apply Margin Rules
                            </button>
                            <button
                              onClick={() => handleSubmitForApproval(costing.id)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                            >
                              📤 Submit
                            </button>
                            <button
                              onClick={() => { setExpandedCostingId(costing.id); openTemplateModal(); }}
                              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-md border border-blue-300 hover:bg-blue-200 transition-colors ml-2"
                            >
                              🧩 Apply Templates
                            </button>
                          </>
                        )}
                        {costing.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => openApprovalModal(costing.id, 'approve')}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => openApprovalModal(costing.id, 'reject')}
                              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setExpandedCostingId(isExpanded ? null : costing.id)}
                          className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-100 transition-colors"
                        >
                          {isExpanded ? '▲ Hide' : '▼ Details'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 border-t pt-4">
                        {/* Cost Components */}
                        {costing.components && costing.components.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold text-sm text-gray-700 mb-3">Cost Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {costing.components.map(component => (
                                <div key={component.id} className="bg-gray-50 rounded p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{getCategoryIcon(component.category)}</span>
                                      <div>
                                        <div className="font-medium text-sm">{component.description}</div>
                                        <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${getCategoryColor(component.category)}`}>
                                          {component.category}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-gray-900">{formatCurrency(component.totalCost, costing.currency)}</div>
                                      <div className="text-xs text-gray-500">
                                        {component.quantity} × {formatCurrency(component.unitCost, costing.currency)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pricing Tiers */}
                        {costing.pricingTiers && costing.pricingTiers.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-3">Pricing Tiers</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              {costing.pricingTiers.map((tier, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                  <div className="text-xs text-green-700 font-medium mb-2">
                                    {tier.minQty.toLocaleString()} - {tier.maxQty ? tier.maxQty.toLocaleString() : '∞'} units
                                  </div>
                                  <div className="text-2xl font-bold text-green-900 mb-1">
                                    {formatCurrency(tier.pricePerUnit, costing.currency)}
                                  </div>
                                  <div className="text-xs text-green-600">
                                    {tier.margin}% margin
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className={`text-2xl font-bold mb-4 ${approvalAction === 'approve' ? 'text-green-600' : 'text-red-600'}`}>
                {approvalAction === 'approve' ? 'Approve Costing' : 'Reject Costing'}
              </h2>
              <p className="text-gray-600 mb-4">
                {approvalAction === 'approve'
                  ? 'Approve this costing calculation? The pricing will be finalized.'
                  : 'Please provide a reason for rejecting this costing.'}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalAction === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                  placeholder={approvalAction === 'approve'
                    ? 'Optional approval notes...'
                    : 'E.g., Material costs are too high, please review BOM...'}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setCostingToApprove(null);
                    setApprovalComments('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalAction}
                  disabled={approvalAction === 'reject' && !approvalComments.trim()}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                    approvalAction === 'reject' && !approvalComments.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : approvalAction === 'approve'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Confirm {approvalAction === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

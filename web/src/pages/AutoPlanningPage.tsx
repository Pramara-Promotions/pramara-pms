import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiGet, apiPost } from '../lib/api';
import { useProjectContextSafe } from './projects/ProjectContext';

interface DailyPlanGeneration {
  id: number;
  projectId: number;
  version: number;
  generatedAt: string;
  validFrom: string;
  validUntil: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  totalCapacityUsed: number;
  estimatedCompletionDate: string | null;
  notes: string | null;
  Project?: {
    id: number;
    code: string;
    name: string;
    cutoffDate: string | null;
  };
  dailyPlanStationsAuto?: DailyPlanStationAuto[];
}

interface DailyPlanStationAuto {
  id: number;
  planId: number;
  projectId: number;
  skuId: number;
  stationId: number;
  date: string;
  plannedQuantity: number;
  allocatedMachines: number;
  machineIds: number[];
  estimatedCapacity: number;
  sku?: { skuName: string };
  station?: { stationName: string };
}

interface Project {
  id: number;
  code: string;
  name: string;
  cutoffDate: string | null;
}

export default function AutoPlanningPage() {
  const projectContext = useProjectContextSafe();
  // Check URL params for projectId
  const urlParams = new URLSearchParams(window.location.search);
  const urlProjectId = urlParams.get('projectId');
  
  const [plans, setPlans] = useState<DailyPlanGeneration[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    urlProjectId ? parseInt(urlProjectId) : null
  );
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [planToReject, setPlanToReject] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Auto-set project from context or URL params if available
  useEffect(() => {
    if (projectContext) {
      setSelectedProjectId(projectContext.id);
    } else if (urlProjectId) {
      setSelectedProjectId(parseInt(urlProjectId));
    }
  }, [projectContext, urlProjectId]);

  useEffect(() => {
    fetchData();
  }, []);

  // Live updates via WebSocket for auto-planning events
  useEffect(() => {
    const wsUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    const s = io(wsUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });
    setSocket(s);

    const onGenerated = async (_evt: any) => {
      // Reload plans when a new plan is generated
      await fetchPlans();
    };
    const onApproved = async (_evt: any) => {
      await fetchPlans();
    };
    const onRejected = async (_evt: any) => {
      await fetchPlans();
    };

    s.on('auto-plan:generated', onGenerated);
    s.on('auto-plan:approved', onApproved);
    s.on('auto-plan:rejected', onRejected);

    return () => {
      s.off('auto-plan:generated', onGenerated);
      s.off('auto-plan:approved', onApproved);
      s.off('auto-plan:rejected', onRejected);
      s.disconnect();
      setSocket(null);
    };
  }, []);

  // Join/leave project room when selection changes
  useEffect(() => {
    if (!socket) return;
    let prevProjectId: number | null = null;
    // Leave previous on cleanup
    return () => {
      if (socket && prevProjectId) {
        socket.emit('leave:project', prevProjectId);
      }
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    // Emit join for current project
    if (selectedProjectId) {
      socket.emit('join:project', selectedProjectId);
    }
    return () => {
      if (selectedProjectId) {
        socket.emit('leave:project', selectedProjectId);
      }
    };
  }, [socket, selectedProjectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPlans(), fetchProjects()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await apiGet('/api/auto-planning/plans');
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
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

  const handleGeneratePlan = async () => {
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiPost('/api/auto-planning/generate', {
        projectId: selectedProjectId,
      });

      if (response.success) {
        alert('✅ Daily plan generated successfully! Review and approve below.');
        await fetchPlans();
        // Auto-expand the newly created plan
        if (response.plan?.id) {
          setExpandedPlanId(response.plan.id);
        }
      } else {
        alert(`❌ Generation failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error generating plan:', error);
      alert(`❌ Failed to generate plan: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprovePlan = async (planId: number) => {
    if (!confirm('Approve this plan? This will create resource allocations and lock machines.')) {
      return;
    }

    try {
      const response = await apiPost(`/api/auto-planning/approve/${planId}`, {});
      
      if (response.success) {
        alert('✅ Plan approved successfully! Resource allocations created.');
        await fetchPlans();
      } else {
        alert(`❌ Approval failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error approving plan:', error);
      alert(`❌ Failed to approve plan: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRejectPlan = async () => {
    if (!planToReject || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const response = await apiPost(`/api/auto-planning/reject/${planToReject}`, {
        reason: rejectionReason,
      });

      if (response.success) {
        alert('Plan rejected successfully');
        setShowRejectModal(false);
        setPlanToReject(null);
        setRejectionReason('');
        await fetchPlans();
      } else {
        alert(`❌ Rejection failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error rejecting plan:', error);
      alert(`❌ Failed to reject plan: ${error.message || 'Unknown error'}`);
    }
  };

  const openRejectModal = (planId: number) => {
    setPlanToReject(planId);
    setShowRejectModal(true);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  const groupStationsByDate = (stations: DailyPlanStationAuto[]) => {
    const grouped: Record<string, DailyPlanStationAuto[]> = {};
    stations.forEach(station => {
      const date = formatDate(station.date);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(station);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading auto-planning dashboard...</div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Daily Planning</h1>
        <p className="text-gray-600 mt-1">
          System-generated daily plans with backward scheduling from cutoff date
        </p>
      </div>

      {/* Plan Generation Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate New Plan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Hide project selector when inside project context or URL has projectId */}
          {!projectContext && !urlProjectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show project info when in project context or from URL */}
          {(projectContext || (urlProjectId && selectedProject)) && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <div className="text-xs text-blue-600 font-medium mb-1">Selected Project</div>
              <div className="text-sm font-semibold text-blue-900">
                {projectContext ? `${projectContext.code} - ${projectContext.name}` : 
                 selectedProject ? `${selectedProject.code} - ${selectedProject.name}` : 'Loading...'}
              </div>
            </div>
          )}

          {selectedProject && (
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="text-xs text-blue-600 font-medium mb-1">Cutoff Date</div>
              <div className="text-sm font-semibold text-blue-900">
                {formatDate(selectedProject.cutoffDate)}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleGeneratePlan}
              disabled={!selectedProjectId || generating}
              className={`w-full px-6 py-2 rounded-md font-medium transition-colors ${
                !selectedProjectId || generating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                '🚀 Generate Auto Plan'
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          💡 The system will automatically calculate daily assignments based on BOM, capacity, and cutoff date
        </div>
      </div>

      {/* Generated Plans List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-lg">Generated Plans</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve system-generated daily plans
          </p>
        </div>

        {plans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium">No plans generated yet</p>
            <p className="text-sm mt-1">Select a project and click "Generate Auto Plan" to start</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {plans.map(plan => {
              const isExpanded = expandedPlanId === plan.id;
              const groupedStations = plan.dailyPlanStationsAuto ? groupStationsByDate(plan.dailyPlanStationsAuto) : {};

              return (
                <div key={plan.id} className="hover:bg-gray-50">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {plan.Project?.code || `Project #${plan.projectId}`}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(plan.status)}`}>
                            {plan.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            v{plan.version}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Valid From:</span>
                            <span className="ml-2 font-medium">{formatDate(plan.validFrom)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Valid Until:</span>
                            <span className="ml-2 font-medium">{formatDate(plan.validUntil)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Capacity:</span>
                            <span className="ml-2 font-medium">{plan.totalCapacityUsed?.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Est. Completion:</span>
                            <span className="ml-2 font-medium">{formatDate(plan.estimatedCompletionDate)}</span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Generated {formatDateTime(plan.generatedAt)}
                          {plan.approvedAt && ` • Approved ${formatDateTime(plan.approvedAt)}`}
                          {plan.rejectedAt && ` • Rejected ${formatDateTime(plan.rejectedAt)}`}
                        </div>

                        {plan.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <strong>Rejection Reason:</strong> {plan.rejectionReason}
                          </div>
                        )}

                        {plan.notes && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <strong>Notes:</strong> {plan.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        {plan.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => handleApprovePlan(plan.id)}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(plan.id)}
                              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                          className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-100 transition-colors"
                        >
                          {isExpanded ? '▲ Hide' : '▼ Details'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && plan.dailyPlanStationsAuto && plan.dailyPlanStationsAuto.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold text-sm text-gray-700 mb-3">Daily Station Assignments</h4>
                        <div className="space-y-4">
                          {Object.entries(groupedStations).map(([date, stations]) => (
                            <div key={date} className="bg-gray-50 rounded-lg p-3">
                              <div className="font-medium text-sm text-gray-700 mb-2">📅 {date}</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {stations.map(station => (
                                  <div key={station.id} className="bg-white border rounded p-3">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <div className="font-medium text-sm">{station.station?.stationName || 'Unknown Station'}</div>
                                        <div className="text-xs text-gray-500">{station.sku?.skuName || `SKU #${station.skuId}`}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-blue-600">{station.plannedQuantity}</div>
                                        <div className="text-xs text-gray-500">units</div>
                                      </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600">
                                      <span>🔧 {station.allocatedMachines} machines</span>
                                      <span>⚡ {station.estimatedCapacity} cap</span>
                                    </div>
                                    {station.machineIds.length > 0 && (
                                      <div className="mt-2 text-xs text-gray-500">
                                        Machine IDs: {station.machineIds.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Reject Plan</h2>
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting this plan. This will help improve future plan generation.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={4}
                  placeholder="E.g., Insufficient capacity for SKU-001, Machine M-05 unavailable due to maintenance..."
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setPlanToReject(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectPlan}
                  disabled={!rejectionReason.trim()}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                    !rejectionReason.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

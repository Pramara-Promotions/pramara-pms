import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GitBranch, Play, CheckCircle, AlertTriangle, Clock, Workflow, ShieldCheck, ShieldAlert } from 'lucide-react';
import { listProjects } from '../../lib/services/projects';
import { listProcessFlows, createProcessFlow, updateProcessFlow, activateProcessFlow, deleteProcessFlow } from '../../lib/services/preproduction';
import { useProjectContext } from '../../hooks';
import { PageHeader } from '../../components';
import ContextualTaskReminder from '../../components/ContextualTaskReminder';
import TemplateSuggestionModal from '../../components/TemplateSuggestionModal';

interface ProcessFlow {
  id: string;
  projectId: number;
  project: { id: number; name: string };
  flowName: string;
  flowDescription: string;
  version: string;
  status: string;
  isTemplate: boolean;
  totalOperations: number;
  estimatedDuration: number | null;
  creator: { id: string; name: string };
  operations: ProcessOperation[];
  createdAt: string;
}

interface ProcessOperation {
  id: string;
  operationName: string;
  operationCode: string;
  sequence: number;
  stationId: number | null;
  station: { id: number; name: string; code: string } | null;
  estimatedTime: number | null;
  standardOutput: number | null;
  isParallel: boolean;
  isCriticalPath: boolean;
  subOperations: SubOperation[];
}

interface SubOperation {
  id: string;
  subOperationName: string;
  subOperationCode: string;
  sequence: number;
  estimatedTime: number | null;
  isOptional: boolean;
}

const ProcessFlowsPage = () => {
  const projectContext = useProjectContext();
  const [flows, setFlows] = useState<ProcessFlow[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [stations, setStations] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [selectedFlow, setSelectedFlow] = useState<ProcessFlow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ProcessFlow | null>(null);
  const [editingOperation, setEditingOperation] = useState<ProcessOperation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pendingOperationName, setPendingOperationName] = useState('');
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<null | {
    ok: boolean;
    errors: Array<{ code: string; message: string; operationId?: string; operationName?: string }>;
    warnings: Array<{ code: string; message: string; operationId?: string; operationName?: string }>;
  }>(null);

  // Auto-set project filter from context if available
  useEffect(() => {
    if (projectContext.projectId) {
      setProjectFilter(String(projectContext.projectId));
      setFormData(prev => ({ ...prev, projectId: String(projectContext.projectId) }));
    }
  }, [projectContext.projectId]);

  const [formData, setFormData] = useState({
    projectId: '',
    flowName: '',
    flowDescription: '',
    version: '1.0',
    isTemplate: false,
    notes: '',
  });

  const [operationFormData, setOperationFormData] = useState({
    operationName: '',
    operationCode: '',
    sequence: 1,
    stationId: '',
    estimatedTime: 0,
    standardOutput: 0,
    isParallel: false,
    isCriticalPath: false,
    description: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchFlows();
    fetchStations();
  }, [projectFilter, statusFilter]);

  const fetchProjects = async () => {
    try {
      const rows = await listProjects();
      setProjects(rows || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      if (!response.ok) throw new Error('Failed to fetch stations');
      const data = await response.json();
      setStations(data || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchFlows = async () => {
    setIsLoading(true);
    try {
      const rows = await listProcessFlows({ projectId: projectFilter, status: statusFilter });
      setFlows(rows || []);
    } catch (error) {
      console.error('Error fetching flows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateResources = async () => {
    if (!selectedFlow) return;
    setValidationLoading(true);
    setValidationResult(null);
    try {
      const resp = await fetch('/api/auto-planning/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedFlow.projectId, processFlowId: selectedFlow.id })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Validation failed');
      }
      setValidationResult({
        ok: !!data?.ok,
        errors: Array.isArray(data?.errors) ? data.errors : [],
        warnings: Array.isArray(data?.warnings) ? data.warnings : []
      });
    } catch (e: any) {
      alert(e?.message || 'Validation failed');
    } finally {
      setValidationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingFlow) {
        await updateProcessFlow(editingFlow.id, formData);
      } else {
        await createProcessFlow(formData);
      }
      setIsModalOpen(false);
      setEditingFlow(null);
      resetForm();
      fetchFlows();
    } catch (error) {
      console.error('Error saving flow:', error);
      alert('Failed to save flow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm('Activate this process flow?')) return;
    try {
      await activateProcessFlow(id);
      fetchFlows();
    } catch (error) {
      console.error('Error activating flow:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this process flow?')) return;
    try {
      await deleteProcessFlow(id);
      fetchFlows();
      if (selectedFlow?.id === id) setSelectedFlow(null);
    } catch (error) {
      console.error('Error deleting flow:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      flowName: '',
      flowDescription: '',
      version: '1.0',
      isTemplate: false,
      notes: '',
    });
  };

  const resetOperationForm = () => {
    setOperationFormData({
      operationName: '',
      operationCode: '',
      sequence: selectedFlow ? selectedFlow.operations.length + 1 : 1,
      stationId: '',
      estimatedTime: 0,
      standardOutput: 0,
      isParallel: false,
      isCriticalPath: false,
      description: ''
    });
    setEditingOperation(null);
  };

  const handleOpenOperationModal = () => {
    resetOperationForm();
    // Show template suggestion modal first if operation has a name
    if (operationFormData.operationName) {
      setPendingOperationName(operationFormData.operationName);
      setIsTemplateModalOpen(true);
    } else {
      setIsOperationModalOpen(true);
    }
  };

  const handleOperationNameChange = (name: string) => {
    setOperationFormData({ ...operationFormData, operationName: name });

    // If there's a meaningful name (3+ chars), show template suggestion
    if (name.length >= 3) {
      setPendingOperationName(name);
      setIsTemplateModalOpen(true);
      setIsOperationModalOpen(false); // Close operation modal temporarily
    }
  };

  const handleOperationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlow) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/process-flows/${selectedFlow.id}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: operationFormData.operationName,
          operationCode: operationFormData.operationCode,
          sequence: operationFormData.sequence,
          stationId: operationFormData.stationId ? parseInt(operationFormData.stationId) : null,
          estimatedTime: operationFormData.estimatedTime || null,
          standardOutput: operationFormData.standardOutput || null,
          isParallel: operationFormData.isParallel,
          isCriticalPath: operationFormData.isCriticalPath,
          description: operationFormData.description || null
        })
      });

      if (!response.ok) throw new Error('Failed to create operation');

      setIsOperationModalOpen(false);
      resetOperationForm();
      await fetchFlows();

      // Refresh selected flow
      const updatedFlows = await listProcessFlows({ projectId: projectFilter, status: statusFilter });
      const updatedFlow = updatedFlows.find(f => f.id === selectedFlow.id);
      if (updatedFlow) setSelectedFlow(updatedFlow);
    } catch (error) {
      console.error('Error creating operation:', error);
      alert('Failed to create operation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTemplate = async (templateId: string) => {
    if (!selectedFlow) return;

    try {
      const response = await fetch('/api/process-templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          processFlowId: selectedFlow.id
        })
      });

      if (!response.ok) throw new Error('Failed to apply template');

      // Close modals and refresh
      setIsTemplateModalOpen(false);
      setIsOperationModalOpen(false);
      setPendingOperationName('');
      resetOperationForm();
      await fetchFlows();

      // Refresh selected flow
      const updatedFlows = await listProcessFlows({ projectId: projectFilter, status: statusFilter });
      const updatedFlow = updatedFlows.find(f => f.id === selectedFlow.id);
      if (updatedFlow) setSelectedFlow(updatedFlow);

      alert('Template applied successfully! Operations have been created.');
    } catch (error) {
      console.error('Error applying template:', error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const handleSkipTemplate = () => {
    // Close template modal and go back to manual operation creation
    setIsTemplateModalOpen(false);
    setIsOperationModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircle };
      case 'draft': return { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Clock };
      case 'inactive': return { color: 'bg-yellow-100 text-yellow-800', label: 'Inactive', icon: AlertTriangle };
      default: return { color: 'bg-gray-100 text-gray-800', label: status, icon: Clock };
    }
  };

  const calculateTotalDuration = (operations: ProcessOperation[]) => {
    return operations.reduce((acc, op) => acc + (op.estimatedTime || 0), 0);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Workflow className="text-blue-600" size={32} />
            Process Flow Builder
          </h1>
          <p className="text-gray-600 mt-1">Design and manage production workflows</p>
        </div>
        <button
          onClick={() => { setEditingFlow(null); resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Flow
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Hide project filter when inside project context */}
        {!projectContext && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-3 py-2 border border-gray-300 rounded-lg ${projectContext ? 'col-span-2' : ''}`}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Flow List */}
        <div className="col-span-5 space-y-4">
          {isLoading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">Loading...</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Workflow size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No process flows found</p>
            </div>
          ) : (
            flows.map((flow) => {
              const status = getStatusBadge(flow.status);
              const StatusIcon = status.icon;
              const totalDuration = calculateTotalDuration(flow.operations);
              return (
                <div
                  key={flow.id}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${selectedFlow?.id === flow.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedFlow(flow)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{flow.flowName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-600">v{flow.version}</span>
                      </div>
                      <p className="text-sm text-gray-600">{flow.project.name}</p>
                    </div>
                    <div className="flex gap-1">
                      {flow.status === 'draft' && (
                        <button onClick={(e) => { e.stopPropagation(); handleActivate(flow.id); }} className="p-1.5 border border-green-300 text-green-600 rounded hover:bg-green-50">
                          <Play size={14} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setEditingFlow(flow); setFormData({ projectId: flow.projectId.toString(), flowName: flow.flowName, flowDescription: flow.flowDescription, version: flow.version, isTemplate: flow.isTemplate, notes: '' }); setIsModalOpen(true); }} className="p-1.5 border rounded hover:bg-gray-50">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(flow.id); }} className="p-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Operations</p>
                      <p className="font-medium">{flow.totalOperations}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Duration</p>
                      <p className="font-medium">{totalDuration ? `${totalDuration}m` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Type</p>
                      <p className="font-medium">{flow.isTemplate ? 'Template' : 'Project'}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Flow Details & Diagram */}
        <div className="col-span-7">
          {selectedFlow ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedFlow.flowName}</h2>
                <p className="text-gray-600">{selectedFlow.flowDescription}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <GitBranch size={20} />
                    Operations Flow ({selectedFlow.operations.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedFlow.operations.length > 0 && (
                      <button
                        onClick={handleOpenOperationModal}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Add Operation
                      </button>
                    )}
                    <button
                      onClick={handleValidateResources}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                      disabled={validationLoading}
                      title="Validate assigned stations/machines and capacity"
                    >
                      {validationLoading ? (
                        <Clock size={16} />
                      ) : validationResult?.errors?.length ? (
                        <ShieldAlert size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      {validationLoading ? 'Validating...' : 'Validate Resources'}
                    </button>
                  </div>
                </div>

                {selectedFlow.operations.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No operations defined yet</p>
                    <button
                      onClick={handleOpenOperationModal}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add First Operation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedFlow.operations.map((op, idx) => (
                      <div key={op.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                            {op.sequence}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900">{op.operationName}</h4>
                              <span className="text-sm text-gray-600">({op.operationCode})</span>
                              {op.isCriticalPath && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                  Critical
                                </span>
                              )}
                              {op.isParallel && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                  Parallel
                                </span>
                              )}
                              <div className="ml-auto">
                                <ContextualTaskReminder
                                  context={{
                                    module: 'Process Operations',
                                    projectId: selectedFlow.projectId,
                                    processId: selectedFlow.id,
                                    operationId: op.id,
                                    contextUrl: window.location.pathname,
                                    contextTitle: `${selectedFlow.flowName} - ${op.operationName}`,
                                    contextDescription: `Operation: ${op.operationName} (${op.operationCode}) at ${op.station?.name || 'Unassigned Station'}`
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                              <div>
                                <p className="text-gray-600">Station</p>
                                <p className="font-medium">{op.station?.name || 'Not assigned'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Time</p>
                                <p className="font-medium">{op.estimatedTime ? `${op.estimatedTime}m` : '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Output</p>
                                <p className="font-medium">{op.standardOutput ? `${op.standardOutput}/hr` : '-'}</p>
                              </div>
                            </div>

                            {validationResult && (
                              <div className="mt-2">
                                {validationResult.errors.filter(e => e.operationId === op.id || e.operationName === op.operationName).length > 0 ? (
                                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                                    <ShieldAlert size={16} />
                                    <span className="text-sm font-medium">Errors:</span>
                                    <ul className="ml-2 list-disc">
                                      {validationResult.errors
                                        .filter(e => e.operationId === op.id || e.operationName === op.operationName)
                                        .map((e, i) => (
                                          <li key={`err-${op.id}-${i}`} className="text-sm">{e.message}</li>
                                        ))}
                                    </ul>
                                  </div>
                                ) : validationResult.warnings.filter(w => w.operationId === op.id || w.operationName === op.operationName).length > 0 ? (
                                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    <AlertTriangle size={16} />
                                    <span className="text-sm font-medium">Warnings:</span>
                                    <ul className="ml-2 list-disc">
                                      {validationResult.warnings
                                        .filter(w => w.operationId === op.id || w.operationName === op.operationName)
                                        .map((w, i) => (
                                          <li key={`warn-${op.id}-${i}`} className="text-sm">{w.message}</li>
                                        ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                                    <ShieldCheck size={16} />
                                    <span className="text-sm">No issues detected</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {op.subOperations.length > 0 && (
                              <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-2">
                                {op.subOperations.map((sub) => (
                                  <div key={sub.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                                      {sub.sequence}
                                    </div>
                                    <span className="text-gray-700">{sub.subOperationName}</span>
                                    {sub.isOptional && (
                                      <span className="text-xs text-gray-500">(Optional)</span>
                                    )}
                                    {sub.estimatedTime && (
                                      <span className="text-xs text-gray-500">{sub.estimatedTime}m</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Flow Statistics</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-700 mb-1">Total Operations</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedFlow.totalOperations}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm text-green-700 mb-1">Est. Duration</p>
                    <p className="text-2xl font-bold text-green-900">{calculateTotalDuration(selectedFlow.operations)}m</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-purple-700 mb-1">Parallel Ops</p>
                    <p className="text-2xl font-bold text-purple-900">{selectedFlow.operations.filter(o => o.isParallel).length}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-sm text-red-700 mb-1">Critical Path</p>
                    <p className="text-2xl font-bold text-red-900">{selectedFlow.operations.filter(o => o.isCriticalPath).length}</p>
                  </div>
                </div>
                {validationResult && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                        <ShieldAlert size={16} /> Errors ({validationResult.errors.length})
                      </p>
                      {validationResult.errors.length === 0 ? (
                        <p className="text-sm text-gray-600 mt-1">None</p>
                      ) : (
                        <ul className="mt-2 list-disc ml-4 text-sm text-red-800">
                          {validationResult.errors.map((e, i) => (
                            <li key={`e-${i}`}>{e.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded p-3">
                      <p className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                        <AlertTriangle size={16} /> Warnings ({validationResult.warnings.length})
                      </p>
                      {validationResult.warnings.length === 0 ? (
                        <p className="text-sm text-gray-600 mt-1">None</p>
                      ) : (
                        <ul className="mt-2 list-disc ml-4 text-sm text-amber-800">
                          {validationResult.warnings.map((w, i) => (
                            <li key={`w-${i}`}>{w.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Workflow size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Select a process flow to view details</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingFlow ? 'Edit' : 'New'} Process Flow</h2>
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
                    <label className="block text-sm font-medium mb-2">Flow Name *</label>
                    <input required type="text" value={formData.flowName} onChange={(e) => setFormData({ ...formData, flowName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Standard Assembly Flow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Version *</label>
                    <input required type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea value={formData.flowDescription} onChange={(e) => setFormData({ ...formData, flowDescription: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.isTemplate} onChange={(e) => setFormData({ ...formData, isTemplate: e.target.checked })} className="rounded" />
                      <span className="text-sm font-medium">Save as Template (reusable across projects)</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingFlow(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : editingFlow ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isOperationModalOpen && selectedFlow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{editingOperation ? 'Edit' : 'Add'} Operation</h2>
              <p className="text-gray-600 mb-6">Flow: {selectedFlow.flowName}</p>
              <form onSubmit={handleOperationSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Operation Name *</label>
                    <input
                      required
                      type="text"
                      value={operationFormData.operationName}
                      onChange={(e) => handleOperationNameChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Injection Molding, Spray Painting"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 We'll suggest templates if available for this operation
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Operation Code *</label>
                    <input
                      required
                      type="text"
                      value={operationFormData.operationCode}
                      onChange={(e) => setOperationFormData({ ...operationFormData, operationCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., OP-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sequence *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={operationFormData.sequence}
                      onChange={(e) => setOperationFormData({ ...operationFormData, sequence: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Station</label>
                    <select
                      value={operationFormData.stationId}
                      onChange={(e) => setOperationFormData({ ...operationFormData, stationId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">No Station Assigned</option>
                      {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Time (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={operationFormData.estimatedTime}
                      onChange={(e) => setOperationFormData({ ...operationFormData, estimatedTime: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Standard Output (units/hour)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={operationFormData.standardOutput}
                      onChange={(e) => setOperationFormData({ ...operationFormData, standardOutput: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={operationFormData.description}
                      onChange={(e) => setOperationFormData({ ...operationFormData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Detailed description of the operation..."
                    />
                  </div>
                  <div className="col-span-2 flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={operationFormData.isParallel}
                        onChange={(e) => setOperationFormData({ ...operationFormData, isParallel: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Can Run in Parallel</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={operationFormData.isCriticalPath}
                        onChange={(e) => setOperationFormData({ ...operationFormData, isCriticalPath: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Critical Path Operation</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setIsOperationModalOpen(false); resetOperationForm(); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : editingOperation ? 'Update Operation' : 'Add Operation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Template Suggestion Modal */}
      {isTemplateModalOpen && selectedFlow && (
        <TemplateSuggestionModal
          isOpen={isTemplateModalOpen}
          operationName={pendingOperationName}
          processFlowId={selectedFlow.id}
          onAccept={handleAcceptTemplate}
          onSkip={handleSkipTemplate}
          onClose={() => {
            setIsTemplateModalOpen(false);
            setPendingOperationName('');
          }}
        />
      )}
    </div>
  );
};

export default ProcessFlowsPage;

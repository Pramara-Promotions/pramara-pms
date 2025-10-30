// web/src/pages/workflow/WorkflowBuilderPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Workflow,
  Plus,
  Save,
  Play,
  Copy,
  Trash2,
  Settings,
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { http } from '../../lib/http';

interface WorkflowStage {
  id: string;
  name: string;
  type: 'start' | 'process' | 'decision' | 'end';
  duration?: number;
  stationId?: number;
  dependencies: string[];
  position: { x: number; y: number };
}

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  stages: WorkflowStage[];
  createdAt: string;
  isActive: boolean;
}

export default function WorkflowBuilderPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedStage, setDraggedStage] = useState<WorkflowStage | null>(null);
  const [connections, setConnections] = useState<Array<{ from: string; to: string }>>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [templateName, setTemplateName] = useState('New Workflow');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setStages(selectedTemplate.stages);
      setTemplateName(selectedTemplate.name);
      updateConnections(selectedTemplate.stages);
    }
  }, [selectedTemplate]);

  async function loadTemplates() {
    try {
      const res = await http('/api/workflows/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  function updateConnections(stageList: WorkflowStage[]) {
    const conns: Array<{ from: string; to: string }> = [];
    stageList.forEach((stage) => {
      stage.dependencies.forEach((depId) => {
        conns.push({ from: depId, to: stage.id });
      });
    });
    setConnections(conns);
  }

  function addStage(type: WorkflowStage['type']) {
    const newStage: WorkflowStage = {
      id: `stage-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Stage`,
      type,
      dependencies: [],
      position: { x: 50, y: 50 + stages.length * 100 }
    };

    if (type === 'process') {
      newStage.duration = 60; // Default 60 minutes
    }

    setStages([...stages, newStage]);
  }

  function updateStage(stageId: string, updates: Partial<WorkflowStage>) {
    setStages(
      stages.map((stage) =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      )
    );

      if (updates.dependencies !== undefined) {
      updateConnections(
        stages.map((s) =>
            s.id === stageId ? { ...s, dependencies: updates.dependencies || [] } : s
        )
      );
    }
  }

  function deleteStage(stageId: string) {
    if (!confirm('Delete this stage?')) return;

    // Remove dependencies referencing this stage
    const updatedStages = stages
      .filter((s) => s.id !== stageId)
      .map((s) => ({
        ...s,
        dependencies: s.dependencies.filter((d) => d !== stageId)
      }));

    setStages(updatedStages);
    updateConnections(updatedStages);
    if (selectedStage === stageId) {
      setSelectedStage(null);
    }
  }

  function handleDragStart(stage: WorkflowStage) {
    setIsDragging(true);
    setDraggedStage(stage);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!draggedStage || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    updateStage(draggedStage.id, {
      position: { x: Math.max(0, Math.min(95, x)), y: Math.max(0, Math.min(95, y)) }
    });

    setIsDragging(false);
    setDraggedStage(null);
  }

  async function saveTemplate() {
    if (stages.length === 0) {
      alert('Add at least one stage before saving.');
      return;
    }

    try {
      const payload = {
        name: templateName,
        description: `Workflow with ${stages.length} stages`,
        stages
      };

      const method = selectedTemplate ? 'PUT' : 'POST';
      const url = selectedTemplate
        ? `/api/workflows/templates/${selectedTemplate.id}`
        : '/api/workflows/templates';

      const res = await http(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Template saved successfully!');
        await loadTemplates();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template.');
    }
  }

  function createNewTemplate() {
    setSelectedTemplate(null);
    setStages([]);
    setTemplateName('New Workflow');
    setSelectedStage(null);
  }

  async function duplicateTemplate(template: WorkflowTemplate) {
    try {
      const res = await http(`/api/workflows/templates/${template.id}/duplicate`, {
        method: 'POST'
      });

      if (res.ok) {
        await loadTemplates();
        alert('Template duplicated successfully!');
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      alert('Failed to duplicate template.');
    }
  }

  const selectedStageData = stages.find((s) => s.id === selectedStage);

  const getStageIcon = (type: WorkflowStage['type']) => {
    switch (type) {
      case 'start':
        return <Play size={16} />;
      case 'process':
        return <Settings size={16} />;
      case 'decision':
        return <GitBranch size={16} />;
      case 'end':
        return <CheckCircle size={16} />;
    }
  };

  const getStageColor = (type: WorkflowStage['type']) => {
    switch (type) {
      case 'start':
        return 'bg-green-500';
      case 'process':
        return 'bg-blue-500';
      case 'decision':
        return 'bg-yellow-500';
      case 'end':
        return 'bg-red-500';
    }
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Workflow className="text-indigo-600" size={32} />
          Process Workflow Builder
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Design and manage production process workflows visually
        </p>
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={createNewTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
          >
            <Plus size={18} />
            New Workflow
          </button>

          <button
            onClick={saveTemplate}
            disabled={stages.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            Save Template
          </button>

          {isEditingName ? (
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditingName(true)}
              className="px-3 py-2 border border-transparent hover:border-gray-300 dark:hover:border-slate-600 rounded-lg cursor-pointer"
            >
              <span className="font-semibold text-gray-900 dark:text-white">{templateName}</span>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {stages.length} stages
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Stage Palette */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Stages
              </h2>
            </div>

            <div className="p-4 space-y-3">
              <button
                onClick={() => addStage('start')}
                className="w-full flex items-center gap-3 p-3 border-2 border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
              >
                <div className="p-2 bg-green-500 text-white rounded">
                  <Play size={16} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Start Stage</span>
              </button>

              <button
                onClick={() => addStage('process')}
                className="w-full flex items-center gap-3 p-3 border-2 border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              >
                <div className="p-2 bg-blue-500 text-white rounded">
                  <Settings size={16} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Process Stage</span>
              </button>

              <button
                onClick={() => addStage('decision')}
                className="w-full flex items-center gap-3 p-3 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-colors"
              >
                <div className="p-2 bg-yellow-500 text-white rounded">
                  <GitBranch size={16} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Decision Stage</span>
              </button>

              <button
                onClick={() => addStage('end')}
                className="w-full flex items-center gap-3 p-3 border-2 border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <div className="p-2 bg-red-500 text-white rounded">
                  <CheckCircle size={16} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">End Stage</span>
              </button>
            </div>
          </div>

          {/* Templates List */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow mt-6">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Saved Templates
              </h2>
            </div>

            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                  No templates yet
                </p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className={`
                      p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        selectedTemplate?.id === template.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300'
                      }
                    `}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {template.stages.length} stages
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateTemplate(template);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Workflow Canvas
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Drag stages to reposition. Click to select and configure.
              </p>
            </div>

            <div
              ref={canvasRef}
              className="relative bg-gray-50 dark:bg-slate-900 h-[700px] overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {/* Grid background */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute w-full border-t border-gray-400"
                    style={{ top: `${i * 5}%` }}
                  />
                ))}
                {[...Array(20)].map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute h-full border-l border-gray-400"
                    style={{ left: `${i * 5}%` }}
                  />
                ))}
              </div>

              {/* Connections (SVG lines) */}
              <svg className="absolute inset-0 pointer-events-none">
                {connections.map((conn, idx) => {
                  const fromStage = stages.find((s) => s.id === conn.from);
                  const toStage = stages.find((s) => s.id === conn.to);
                  if (!fromStage || !toStage || !canvasRef.current) return null;

                  const rect = canvasRef.current.getBoundingClientRect();
                  const x1 = (fromStage.position.x / 100) * rect.width + 60;
                  const y1 = (fromStage.position.y / 100) * rect.height + 30;
                  const x2 = (toStage.position.x / 100) * rect.width + 60;
                  const y2 = (toStage.position.y / 100) * rect.height + 30;

                  return (
                    <g key={idx}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-indigo-400 dark:text-indigo-600"
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    className="fill-indigo-400 dark:fill-indigo-600"
                  >
                    <polygon points="0 0, 10 3, 0 6" />
                  </marker>
                </defs>
              </svg>

              {/* Stages */}
              {stages.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Workflow size={64} className="text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Add stages from the palette to start building your workflow
                    </p>
                  </div>
                </div>
              ) : (
                stages.map((stage) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={() => handleDragStart(stage)}
                    onClick={() => setSelectedStage(stage.id)}
                    className={`
                      absolute cursor-move transition-all
                      ${selectedStage === stage.id ? 'z-10 scale-105' : 'z-0'}
                    `}
                    style={{
                      left: `${stage.position.x}%`,
                      top: `${stage.position.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div
                      className={`
                        p-4 rounded-lg shadow-lg border-4 bg-white dark:bg-slate-800 min-w-[120px]
                        ${
                          selectedStage === stage.id
                            ? 'border-indigo-500'
                            : 'border-gray-300 dark:border-slate-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 ${getStageColor(stage.type)} text-white rounded`}>
                          {getStageIcon(stage.type)}
                        </div>
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {stage.name}
                        </span>
                      </div>

                      {stage.duration && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Clock size={12} />
                          {stage.duration} min
                        </div>
                      )}

                      {stage.dependencies.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          {stage.dependencies.length} dependency(ies)
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow sticky top-6">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stage Properties
              </h2>
            </div>

            <div className="p-4">
              {!selectedStageData ? (
                <div className="text-center py-8">
                  <AlertCircle size={48} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Select a stage to edit its properties
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stage Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stage Name
                    </label>
                    <input
                      type="text"
                      value={selectedStageData.name}
                      onChange={(e) =>
                        updateStage(selectedStageData.id, { name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Duration (for process stages) */}
                  {selectedStageData.type === 'process' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={selectedStageData.duration || 0}
                        onChange={(e) =>
                          updateStage(selectedStageData.id, {
                            duration: parseInt(e.target.value) || 0
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Dependencies */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dependencies
                    </label>
                    <div className="space-y-2">
                      {stages
                        .filter((s) => s.id !== selectedStageData.id)
                        .map((stage) => (
                          <label key={stage.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedStageData.dependencies.includes(stage.id)}
                              onChange={(e) => {
                                const deps = e.target.checked
                                  ? [...selectedStageData.dependencies, stage.id]
                                  : selectedStageData.dependencies.filter((d) => d !== stage.id);
                                updateStage(selectedStageData.id, { dependencies: deps });
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {stage.name}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Delete Stage */}
                  <button
                    onClick={() => deleteStage(selectedStageData.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete Stage
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

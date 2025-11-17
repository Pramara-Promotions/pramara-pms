import React, { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Users,
  Clock,
  Target,
  Brain,
  BarChart3,
  Layers,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Settings
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priority: 'high' | 'medium' | 'low';
  progress: number;
  stages: ProjectStage[];
  resources: ResourceAllocation[];
}

interface ProjectStage {
  id: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  duration: number;
  dependencies: string[];
  assignedWorkers: number;
  requiredWorkers: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
}

interface ResourceAllocation {
  resourceId: string;
  resourceName: string;
  allocatedHours: number;
  availableHours: number;
  conflictsWith: string[];
}

interface AISuggestion {
  id: string;
  type: 'schedule_adjustment' | 'resource_reallocation' | 'buffer_optimization' | 'priority_change';
  title: string;
  description: string;
  reasoning: string;
  impact: {
    costSavings?: number;
    timeReduction?: number;
    riskMitigation?: string;
  };
  affected: {
    projects: string[];
    stages: string[];
    resources: string[];
  };
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface ConflictZone {
  resourceId: string;
  resourceName: string;
  conflictingProjects: { projectId: string; projectName: string; stageName: string }[];
  startDate: string;
  endDate: string;
  severity: 'critical' | 'warning' | 'minor';
}

export function AdaptivePlanningDashboard() {
  // Optional project scope: from ?projectId=... or /projects/:id path
  const projectId = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('projectId');
      if (q) return q;
      const m = window.location.pathname.match(/\/projects\/(\d+)/);
      return m?.[1] || '';
    } catch {
      return '';
    }
  })();
  const [projects, setProjects] = useState<Project[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [conflicts, setConflicts] = useState<ConflictZone[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [viewMode, setViewMode] = useState<'gantt' | 'timeline' | 'resources'>('gantt');
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(true);
  const [learningInsights, setLearningInsights] = useState({
    acceptanceRate: 0,
    avgTimeSaved: 0,
    avgCostSaved: 0,
    totalSuggestionsProcessed: 0
  });

  useEffect(() => {
    fetchProjects();
    fetchAISuggestions();
    fetchConflicts();
    fetchLearningInsights();
  }, [projectId]);

  const fetchProjects = async () => {
    try {
      const qs = projectId ? `?projectId=${projectId}` : '';
      const response = await fetch(`/api/planning/projects${qs}`);
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchAISuggestions = async () => {
    try {
      const qs = projectId ? `?projectId=${projectId}` : '';
      const response = await fetch(`/api/planning/ai-suggestions${qs}`);
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    }
  };

  const fetchConflicts = async () => {
    try {
      const qs = projectId ? `?projectId=${projectId}` : '';
      const response = await fetch(`/api/planning/conflicts${qs}`);
      const data = await response.json();
      setConflicts(data);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    }
  };

  const fetchLearningInsights = async () => {
    try {
      const qs = projectId ? `?projectId=${projectId}` : '';
      const response = await fetch(`/api/planning/learning-insights${qs}`);
      const data = await response.json();
      setLearningInsights(data);
    } catch (error) {
      console.error('Failed to fetch learning insights:', error);
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/planning/ai-suggestions/${suggestionId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await fetchAISuggestions();
        await fetchProjects();
        await fetchConflicts();
        await fetchLearningInsights();
      }
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string, reason: string) => {
    try {
      const response = await fetch(`/api/planning/ai-suggestions/${suggestionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        await fetchAISuggestions();
        await fetchLearningInsights();
      }
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'schedule_adjustment': return Calendar;
      case 'resource_reallocation': return Users;
      case 'buffer_optimization': return Target;
      case 'priority_change': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'minor': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            Adaptive Planning Dashboard
          </h1>
          <p className="text-gray-600 mt-1">AI-powered multi-project optimization with intelligent recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg shadow border">
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-4 py-2 rounded-l-lg ${viewMode === 'gantt' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 ${viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('resources')}
              className={`px-4 py-2 rounded-r-lg ${viewMode === 'resources' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowOptimizationPanel(!showOptimizationPanel)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            {showOptimizationPanel ? 'Hide' : 'Show'} AI Suggestions
          </button>
        </div>
      </div>

      {/* Learning Insights Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <h3 className="font-bold text-gray-900">System Learning Performance</h3>
              <p className="text-sm text-gray-600">Based on {learningInsights.totalSuggestionsProcessed} processed suggestions</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{learningInsights.acceptanceRate}%</p>
              <p className="text-xs text-gray-600">Acceptance Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{learningInsights.avgTimeSaved}h</p>
              <p className="text-xs text-gray-600">Avg Time Saved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">${learningInsights.avgCostSaved}k</p>
              <p className="text-xs text-gray-600">Avg Cost Saved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Projects & Timeline */}
        <div className={`${showOptimizationPanel ? 'col-span-8' : 'col-span-12'} space-y-6`}>
          {/* Resource Conflicts Alert */}
          {conflicts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h2 className="font-bold text-lg">Resource Conflicts Detected ({conflicts.length})</h2>
              </div>
              <div className="space-y-2">
                {conflicts.slice(0, 3).map(conflict => (
                  <div key={conflict.resourceId} className={`border rounded p-3 ${getConflictSeverityColor(conflict.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{conflict.resourceName}</p>
                        <p className="text-sm mt-1">
                          Conflicts: {conflict.conflictingProjects.map(p => p.projectName).join(', ')}
                        </p>
                        <p className="text-xs mt-1">
                          {new Date(conflict.startDate).toLocaleDateString()} - {new Date(conflict.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-white rounded text-xs font-bold uppercase">
                        {conflict.severity}
                      </span>
                    </div>
                  </div>
                ))}
                {conflicts.length > 3 && (
                  <button className="text-sm text-blue-600 hover:underline">
                    View all {conflicts.length} conflicts
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Gantt Chart / Timeline View */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Multi-Project Timeline
              </h2>
              <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <Settings className="w-4 h-4" />
                Configure View
              </button>
            </div>
            
            {viewMode === 'gantt' && (
              <div className="p-6 overflow-x-auto">
                {projects.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    No projects to display. Create a project to see the timeline.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map(project => (
                      <div key={project.id} className="border rounded-lg p-4 hover:border-blue-300 transition">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)}`} />
                            <h3 className="font-bold text-gray-900">{project.name}</h3>
                            <span className="text-sm text-gray-600">
                              {new Date(project.startDate).toLocaleDateString()} → {new Date(project.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">{project.progress}%</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Project Stages */}
                        <div className="ml-6 space-y-2">
                          {project.stages.map(stage => (
                            <div key={stage.id} className="flex items-center gap-3 text-sm">
                              <div className={`w-2 h-2 rounded-full ${
                                stage.status === 'completed' ? 'bg-green-500' :
                                stage.status === 'in-progress' ? 'bg-blue-500' :
                                stage.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'
                              }`} />
                              <span className="flex-1">{stage.name}</span>
                              <span className="text-gray-500">{stage.duration} days</span>
                              <div className="flex items-center gap-1 text-gray-600">
                                <Users className="w-3 h-3" />
                                <span>{stage.assignedWorkers}/{stage.requiredWorkers}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - AI Suggestions */}
        {showOptimizationPanel && (
          <div className="col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden sticky top-6">
              <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI Recommendations ({pendingSuggestions.length})
                </h2>
                <p className="text-sm text-gray-600 mt-1">Intelligent optimization suggestions</p>
              </div>
              
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {pendingSuggestions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p>All caught up!</p>
                    <p className="text-sm mt-1">No pending suggestions at the moment.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {pendingSuggestions.map(suggestion => {
                      const Icon = getSuggestionIcon(suggestion.type);
                      return (
                        <div key={suggestion.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 mb-1">{suggestion.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                              
                              {/* Reasoning */}
                              <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-gray-700">
                                <span className="font-medium">Reasoning:</span> {suggestion.reasoning}
                              </div>
                              
                              {/* Impact Metrics */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {suggestion.impact.timeReduction && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    -{suggestion.impact.timeReduction}h
                                  </span>
                                )}
                                {suggestion.impact.costSavings && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    ${suggestion.impact.costSavings}k saved
                                  </span>
                                )}
                              </div>
                              
                              {/* Confidence Score */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>Confidence</span>
                                  <span>{suggestion.confidence}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-purple-600 h-1.5 rounded-full"
                                    style={{ width: `${suggestion.confidence}%` }}
                                  />
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptSuggestion(suggestion.id)}
                                  className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center justify-center gap-1"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectSuggestion(suggestion.id, 'manual_override')}
                                  className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center justify-center gap-1"
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

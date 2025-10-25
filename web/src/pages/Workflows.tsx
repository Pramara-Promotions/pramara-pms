import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Project {
  id: string;
  name: string;
  code: string;
}

interface WorkflowStage {
  id: string;
  projectId: string;
  name: string;
  sequence: number;
  requiresQc: boolean;
  requiresApproval: boolean;
  estimatedDuration?: number;
  status: string;
  _count?: {
    tasks: number;
  };
}

interface WorkflowTask {
  id: string;
  stageId: string;
  name: string;
  description?: string;
  sequence: number;
  estimatedHours?: number;
  status: string;
}

export default function WorkflowsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadStages();
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedStage) {
      loadTasks();
    }
  }, [selectedStage]);

  const loadProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`, { withCredentials: true });
      setProjects(res.data as Project[]);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadStages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/workflows/stages`, {
        params: { projectId: selectedProject },
        withCredentials: true
      });
      setStages(res.data as WorkflowStage[]);
    } catch (error) {
      console.error('Failed to load stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/workflows/tasks`, {
        params: { stageId: selectedStage },
        withCredentials: true
      });
      setTasks(res.data as WorkflowTask[]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-gray-600">Manage workflow stages, tasks, dependencies, and documents</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          Add Stage
        </button>
      </div>

      {/* Project Selector */}
      <div className="bg-white rounded-lg border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">
          Loading workflow stages...
        </div>
      )}

      {/* Stages Table */}
      {!loading && selectedProject && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-900">Workflow Stages</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Sequence</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Stage Name</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Tasks</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Duration (hrs)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Requirements</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No workflow stages found. Add your first stage to get started.
                  </td>
                </tr>
              ) : (
                stages.map((stage) => (
                  <tr
                    key={stage.id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selectedStage === stage.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedStage(stage.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-medium">
                        {stage.sequence}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{stage.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                        {stage._count?.tasks || 0} tasks
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-gray-600">
                      {stage.estimatedDuration || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {stage.requiresQc && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            QC
                          </span>
                        )}
                        {stage.requiresApproval && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Approval
                          </span>
                        )}
                        {!stage.requiresQc && !stage.requiresApproval && (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stage.status)}`}>
                        {stage.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tasks Table */}
      {selectedStage && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Stage Tasks</h2>
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
              Add Task
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Seq</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Task Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Est. Hours</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No tasks found for this stage.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{task.sequence}</td>
                    <td className="px-4 py-3 font-medium">{task.name}</td>
                    <td className="px-4 py-3 text-gray-600">{task.description || '-'}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-600">
                      {task.estimatedHours || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// web/src/pages/projects/ProjectsList.tsx
// @ts-nocheck

/****************************************************
 * [LMK-10] IMPORTS
 ****************************************************/
import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useToast } from "../../ui/toast/ToastProvider";
import { useAuth } from "../../features/common/AuthProvider";
import { http } from "../../lib/http";
import ProjectCard from "../../components/projects/ProjectCard";
import { Plus, Search, Filter, Grid, List, TrendingUp, Users, CheckCircle, AlertTriangle, Clock, Star } from "lucide-react";

/****************************************************
 * [LMK-20] TYPES
 ****************************************************/
type ProjectHealth = {
  score: number;
  status: 'healthy' | 'at-risk' | 'critical';
  attentionItemCount: number;
};

type Project = { 
  id: number; 
  code: string; 
  name: string;
  description?: string;
  cutoffDate?: string;
  quantity?: number;
  budget?: number;
  budgetSpent?: number;
  health?: ProjectHealth;
};

/****************************************************
 * [LMK-30] CONSTANTS / HELPERS
 ****************************************************/
// Use centralized http helper which resolves API base and handles auth/refresh

/****************************************************
 * [LMK-40] COMPONENT
 ****************************************************/
export default function ProjectsList() {
  const navigate = useNavigate();
  const { showToastOk, showToastErr } = useToast(); // use global toast only
  const { user, hasRole, hasAnyRole, isSuperAdmin, hasPermission } = useAuth();

  // Determine user's view level
  const isAdmin = isSuperAdmin() || hasRole('Admin');
  const isManager = isAdmin || hasRole('Manager') || hasPermission('project:manage');
  const isWorker = !isAdmin && !isManager;

  // [LMK-41] Data/edit state
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewFilter, setViewFilter] = useState<'all' | 'assigned' | 'my-tasks'>(
    isWorker ? 'my-tasks' : 'all'
  );
  
  // Pinned projects stored in localStorage
  const [pinnedProjectIds, setPinnedProjectIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('pinnedProjects');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  // Recently viewed projects
  const [recentlyViewed, setRecentlyViewed] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newName, setNewName] = useState("");

  // [LMK-42] Load projects with health
  async function load() {
    console.log('[ProjectsList] Starting load...');
    try {
      setLoading(true);
      setError(null);
      // For workers, only load projects with their assigned tasks
      const endpoint = isWorker 
        ? `/api/projects?includeHealth=true&assignedTo=${user?.id}`
        : `/api/projects?includeHealth=true`;
      
      const res = await http(endpoint, { headers: { Accept: "application/json" } });
      console.log('[ProjectsList] API response status:', res.status);
      if (res.status === 401) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const txt = await res.text();
      console.log('[ProjectsList] Response text:', txt.substring(0, 200));
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      if (txt.trim().startsWith("<"))
        throw new Error("Got HTML instead of JSON (check VITE_API_URL / proxy)");
      const data = JSON.parse(txt);
      console.log('[ProjectsList] Loaded projects:', data.length);
      setItems(data);
    } catch (e: any) {
      const msg = e?.message || "Failed to load projects";
      console.error('[ProjectsList] Load error:', e);
      setError(msg);
      showToastErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    console.log('[ProjectsList] Component mounted, calling load()');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [LMK-43] Filter projects
  const filteredProjects = items.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply view filter
    let matchesView = true;
    if (viewFilter === 'assigned') {
      matchesView = project.health && project.health.attentionItemCount > 0; // Projects with user's tasks
    } else if (viewFilter === 'my-tasks') {
      matchesView = project.health && project.health.attentionItemCount > 0; // Projects with tasks assigned to user
    }
    
    if (statusFilter === 'all') return matchesSearch && matchesView;
    if (statusFilter === 'healthy') return matchesSearch && matchesView && project.health?.status === 'healthy';
    if (statusFilter === 'at-risk') return matchesSearch && matchesView && project.health?.status === 'at-risk';
    if (statusFilter === 'critical') return matchesSearch && matchesView && project.health?.status === 'critical';
    
    return matchesSearch && matchesView;
  });
  
  // Separate pinned and unpinned projects
  const pinnedProjects = filteredProjects.filter(p => pinnedProjectIds.includes(p.id));
  const unpinnedProjects = filteredProjects.filter(p => !pinnedProjectIds.includes(p.id));
  
  // Projects needing attention (for personalized section)
  const projectsNeedingAttention = unpinnedProjects.filter(p => 
    p.health?.attentionItemCount && p.health.attentionItemCount > 0 ||
    p.health?.status === 'critical' ||
    p.health?.status === 'at-risk'
  ).slice(0, 3);
  
  // Your active projects (recently updated or viewed)
  const activeProjects = unpinnedProjects
    .filter(p => !projectsNeedingAttention.find(ap => ap.id === p.id))
    .filter(p => recentlyViewed.includes(p.id))
    .slice(0, 3);

  // Calculate quick stats
  const stats = {
    total: items.length,
    healthy: items.filter(p => p.health?.status === 'healthy').length,
    atRisk: items.filter(p => p.health?.status === 'at-risk').length,
    critical: items.filter(p => p.health?.status === 'critical').length,
    avgHealth: items.length > 0 
      ? Math.round(items.reduce((sum, p) => sum + (p.health?.score || 0), 0) / items.length)
      : 0
  };
  
  // Toggle pin functionality
  function togglePin(projectId: number) {
    setPinnedProjectIds(prev => {
      const updated = prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      localStorage.setItem('pinnedProjects', JSON.stringify(updated));
      return updated;
    });
  }
  
  // Track project view
  function trackProjectView(projectId: number) {
    setRecentlyViewed(prev => {
      const updated = [projectId, ...prev.filter(id => id !== projectId)].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      return updated;
    });
  }

  // [LMK-44] Edit helpers
  function startEdit(p: Project) {
    setEditId(p.id);
    setName(p.name);
    setCode(p.code);
  }
  function cancelEdit() {
    setEditId(null);
    setName("");
    setCode("");
  }

  // [LMK-44] Save edit
  async function saveEdit() {
    if (!editId) return;
    try {
      const res = await http(`/api/projects/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, code }),
      });
      if (!res.ok) throw new Error(`Update project failed (${res.status})`);
      await load();
      cancelEdit();
      showToastOk("Project updated.");
    } catch (e: any) {
      showToastErr(e?.message || "Update project failed");
    }
  }

  // [LMK-45] Create
  async function createProject() {
    const label = newName.trim();
    if (!label) return;
    try {
      const res = await http(`/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ 
          name: label, 
          code: `TEMP-${Date.now()}`,
          quantity: 0  // Default quantity for new projects
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setNewName("");
      await load();
      showToastOk(`Project "${label}" created.`);
    } catch (e: any) {
      showToastErr(e?.message || "Create project failed");
    }
  }

  // [LMK-46] Delete
  async function removeProject(p: Project) {
    if (!confirm(`Delete project “${p.name}”? This cannot be undone.`)) return;
    try {
      const res = await http(`/api/projects/${p.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setItems((list) => list.filter((x) => x.id !== p.id)); // optimistic
      showToastOk(`Project “${p.name}” deleted successfully.`);
    } catch (e: any) {
      showToastErr(e?.message || "Delete project failed");
    }
  }

  /****************************************************
   * [LMK-50] RENDER
   ****************************************************/
  console.log('[ProjectsList] Rendering - loading:', loading, 'items:', items.length, 'error:', error);
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={32} />
            {isAdmin ? 'All Projects' : isManager ? 'My Projects' : 'My Tasks'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAdmin 
              ? 'Manage and monitor all projects' 
              : isManager 
                ? 'Monitor your assigned projects and team progress'
                : 'View and manage your assigned tasks'}
          </p>
        </div>
        {(isAdmin || isManager) && (
          <button
            onClick={() => navigate({ to: "/projects/new" })}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
            New Project
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Healthy</p>
              <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full ring-4 ring-green-500/20" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">At Risk</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
            </div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full ring-4 ring-yellow-500/20" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-500/20" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow p-4 text-white">
          <p className="text-white/80 text-sm">Avg Health</p>
          <p className="text-3xl font-bold">{stats.avgHealth}</p>
          <p className="text-white/60 text-xs mt-1">out of 100</p>
        </div>
      </div>

      {/* Role-Specific Quick Actions */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={20} />
            Admin Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate({ to: "/projects/new" })}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <Plus size={24} className="mb-2" />
              <p className="font-medium">Create Project</p>
              <p className="text-sm text-white/80">Start a new project</p>
            </button>
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <Users size={24} className="mb-2" />
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-white/80">View all users & roles</p>
            </button>
            <button
              onClick={() => setStatusFilter('critical')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <AlertTriangle size={24} className="mb-2" />
              <p className="font-medium">Critical Projects</p>
              <p className="text-sm text-white/80">{stats.critical} need attention</p>
            </button>
          </div>
        </div>
      )}

      {isManager && !isAdmin && (
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} />
            Manager Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setViewFilter('assigned')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <Users size={24} className="mb-2" />
              <p className="font-medium">My Projects</p>
              <p className="text-sm text-white/80">View assigned projects</p>
            </button>
            <button
              onClick={() => setStatusFilter('at-risk')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <AlertTriangle size={24} className="mb-2" />
              <p className="font-medium">At-Risk Projects</p>
              <p className="text-sm text-white/80">{stats.atRisk} need review</p>
            </button>
            <button
              onClick={() => navigate({ to: "/projects/reports" })}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <TrendingUp size={24} className="mb-2" />
              <p className="font-medium">View Reports</p>
              <p className="text-sm text-white/80">Team performance</p>
            </button>
          </div>
        </div>
      )}

      {isWorker && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} />
            My Tasks Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setViewFilter('my-tasks')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <Clock size={24} className="mb-2" />
              <p className="font-medium">Active Tasks</p>
              <p className="text-sm text-white/80">View your current tasks</p>
            </button>
            <button
              onClick={() => navigate({ to: "/tasks/completed" })}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all"
            >
              <CheckCircle size={24} className="mb-2" />
              <p className="font-medium">Completed</p>
              <p className="text-sm text-white/80">View finished tasks</p>
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex gap-2">
          {/* View Filter (Manager/Worker) */}
          {(isManager || isWorker) && (
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              {isManager && (
                <>
                  <option value="all">All Projects</option>
                  <option value="assigned">My Projects</option>
                </>
              )}
              {isWorker && (
                <option value="my-tasks">My Tasks</option>
              )}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="healthy">🟢 Healthy</option>
            <option value="at-risk">🟡 At Risk</option>
            <option value="critical">🔴 Critical</option>
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
          </button>
        </div>
      </div>

      {/* [LMK-52] Error banner */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* [LMK-53] Edit strip */}
      {editId && (
        <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 flex items-center gap-3">
          <input
            className="w-64 rounded-lg border px-3 py-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-80 rounded-lg border px-3 py-2"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            onClick={saveEdit}
            className="ml-auto rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700"
          >
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="rounded-lg border px-3 py-2 hover:bg-gray-50 dark:border-neutral-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* [LMK-54] Projects Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-6" />
              <div className="space-y-3">
                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <TrendingUp size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No projects match your filters' : 'No projects yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by creating your first project'}
          </p>
          {!searchQuery && statusFilter === 'all' && (isAdmin || isManager) && (
            <button
              onClick={() => navigate({ to: "/projects/new" })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={20} />
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Projects Section */}
          {pinnedProjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="text-yellow-500 fill-yellow-500" size={20} />
                  Pinned Projects
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {pinnedProjects.length} pinned
                </span>
              </div>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }>
                {pinnedProjects.map((project) => (
                  <div key={project.id} className="relative group">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(project.id); }}
                      className="absolute top-3 right-3 z-10 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-md hover:scale-110 transition-transform"
                      title="Unpin project"
                    >
                      <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    </button>
                    <ProjectCard
                      project={project}
                      onClick={() => { trackProjectView(project.id); navigate({ to: `/projects/${project.id}` }); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Needing Attention Section */}
          {projectsNeedingAttention.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={20} />
                  Projects Needing Attention
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {projectsNeedingAttention.length} require action
                </span>
              </div>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }>
                {projectsNeedingAttention.map((project) => (
                  <div key={project.id} className="relative group">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(project.id); }}
                      className="absolute top-3 right-3 z-10 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-md hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                      title="Pin project"
                    >
                      <Star className="text-gray-400 hover:text-yellow-500" size={16} />
                    </button>
                    <ProjectCard
                      project={project}
                      onClick={() => { trackProjectView(project.id); navigate({ to: `/projects/${project.id}` }); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your Active Projects Section */}
          {activeProjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="text-indigo-500" size={20} />
                  Your Active Projects
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {activeProjects.length} recently viewed
                </span>
              </div>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }>
                {activeProjects.map((project) => (
                  <div key={project.id} className="relative group">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(project.id); }}
                      className="absolute top-3 right-3 z-10 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-md hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                      title="Pin project"
                    >
                      <Star className="text-gray-400 hover:text-yellow-500" size={16} />
                    </button>
                    <ProjectCard
                      project={project}
                      onClick={() => { trackProjectView(project.id); navigate({ to: `/projects/${project.id}` }); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Other Projects Section */}
          {unpinnedProjects.filter(p => 
            !projectsNeedingAttention.find(ap => ap.id === p.id) &&
            !activeProjects.find(ap => ap.id === p.id)
          ).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  All Projects
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {unpinnedProjects.filter(p => 
                    !projectsNeedingAttention.find(ap => ap.id === p.id) &&
                    !activeProjects.find(ap => ap.id === p.id)
                  ).length} projects
                </span>
              </div>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }>
                {unpinnedProjects
                  .filter(p => 
                    !projectsNeedingAttention.find(ap => ap.id === p.id) &&
                    !activeProjects.find(ap => ap.id === p.id)
                  )
                  .map((project) => (
                    <div key={project.id} className="relative group">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(project.id); }}
                        className="absolute top-3 right-3 z-10 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-md hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                        title="Pin project"
                      >
                        <Star className="text-gray-400 hover:text-yellow-500" size={16} />
                      </button>
                      <ProjectCard
                        project={project}
                        onClick={() => { trackProjectView(project.id); navigate({ to: `/projects/${project.id}` }); }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {!loading && filteredProjects.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredProjects.length} of {items.length} projects
        </div>
      )}
    </div>
  );
}

// web/src/pages/projects/ProjectShell.tsx
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { http } from "../../lib/http";
import { ProjectProvider } from "./ProjectContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask } from "../../lib/services/tasks";

type Project = {
  id: number;
  code: string;
  name: string;
  status?: string | null; // kept for display if present
};

// Resolve API base; falls back to localhost for direct dev calls
// http helper resolves base and credentials

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function TabLink({
  to,
  label,
  currentPath,
}: {
  to: string;
  label: string;
  currentPath: string;
}) {
  const active = normalizePath(currentPath) === normalizePath(to);
  return (
    <Link
      to={to}
      className={[
        "px-3 py-2 rounded-md text-sm font-medium",
        active
          ? "bg-indigo-600 text-white"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-800",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function ProjectShell() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const projectId = useMemo(() => Number(id), [id]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0); // drives re-fetch
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await http(`/api/projects/${projectId}`, { headers: { Accept: "application/json" } });
        if (res.status === 401) {
          navigate({ to: "/login", replace: true });
          return;
        }
        const text = await res.text();
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        if (text.trim().startsWith("<")) throw new Error("Got HTML instead of JSON (check API URL / proxy).");
        const data = JSON.parse(text) as Project;
        if (alive) setProject(data);
      } catch (e: any) {
        if (alive) setError(e?.message || "Failed to load project");
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (Number.isFinite(projectId)) run();
    return () => {
      alive = false;
    };
  }, [projectId, navigate, refreshTick]); // include refreshTick

  if (!Number.isFinite(projectId)) {
    return (
      <div className="p-6 text-red-600">
        Invalid project id in URL. Use <code>/projects/123</code>.
      </div>
    );
  }

  const basePath = `/projects/${projectId}`;
  const tabs = [
    { label: "Overview", path: basePath },
    { label: "SKUs", path: `${basePath}/skus` },
    { label: "Board", path: `${basePath}/board` },
    { label: "Files", path: `${basePath}/files` },
    { label: "Planning", path: `${basePath}/planning` },
    { label: "Compliance", path: `${basePath}/compliance` },
    { label: "Pre Production", path: `${basePath}/preprod` },
    { label: "Execution", path: `${basePath}/execution` },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 dark:bg-neutral-900 dark:text-neutral-100">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200 dark:bg-neutral-900/70 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/projects" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
                ← All projects
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-semibold">
                    {project?.name || (loading ? "Loading…" : "Project")}
                  </h1>
                  {project?.status && (
                    <span className="text-xs rounded-full px-2 py-0.5 border border-gray-300 text-gray-600 dark:border-neutral-700 dark:text-gray-300">
                      {project.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {project?.code}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="hidden sm:inline-flex rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                onClick={() => alert("Share — coming soon")}
              >
                Share
              </button>
              <button
                className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700"
                onClick={() => setIsAddTaskModalOpen(true)}
              >
                Add task
              </button>
              <button
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                onClick={() => setRefreshTick((t) => t + 1)}
                title="Refresh"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex items-center gap-2 overflow-auto pb-1">
            {tabs.map((tab) => (
              <TabLink
                key={tab.path}
                to={tab.path}
                label={tab.label}
                currentPath={pathname}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
            {error}
          </div>
        )}
        {loading && !project ? (
          <div className="text-sm text-gray-500">Loading project…</div>
        ) : (
          <ProjectProvider value={project}>
            <Outlet />
          </ProjectProvider>
        )}
      </main>

      <footer className="mt-8 border-t border-gray-200 dark:border-neutral-800 py-4 text-sm text-gray-500 dark:text-neutral-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Pramara PMS
        </div>
      </footer>

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <AddTaskModal
          projectId={projectId}
          onClose={() => setIsAddTaskModalOpen(false)}
          onSuccess={() => {
            setIsAddTaskModalOpen(false);
            setRefreshTick((t) => t + 1);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />
      )}
    </div>
  );
}

// Add Task Modal Component
function AddTaskModal({
  projectId,
  onClose,
  onSuccess
}: {
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
    section: 'Pre_Prod',
    assignee: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch users on mount
  React.useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const res = await http('/api/admin/users', { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const search = userSearch.toLowerCase();
    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.id?.toLowerCase().includes(search)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Task name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        projectId,
        name: formData.name,
        title: formData.name,
        description: formData.description || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        priority: formData.priority,
        status: formData.status,
        section: formData.section,
        assignee: formData.assignee || undefined,
      };

      await createTask(payload);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Task</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Task Name *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="e.g., Complete design mockups"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Additional details..."
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Section
                </label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  <option value="Pre_Prod">Pre Production</option>
                  <option value="Production">Production</option>
                  <option value="Post_Prod">Post Production</option>
                  <option value="QC">Quality Control</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Assign To
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Search by name, email, or ID..."
                  disabled={loading}
                />

                {/* Selected User Display */}
                {formData.assignee && !showUserDropdown && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm flex items-center gap-1">
                      {users.find(u => u.id === formData.assignee)?.name || formData.assignee}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, assignee: '' });
                          setUserSearch('');
                        }}
                        className="hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}

                {/* User Dropdown */}
                {showUserDropdown && userSearch && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {loadingUsers ? (
                      <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                        Loading users...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No users found
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, assignee: user.id });
                            setUserSearch(user.name || user.email);
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                          {user.department && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {user.department.name}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Click outside to close dropdown */}
              {showUserDropdown && (
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowUserDropdown(false)}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

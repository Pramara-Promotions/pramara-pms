// web/src/pages/projects/ProjectShell.tsx
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { http } from "../../lib/http";
import { ProjectProvider } from "./ProjectContext";

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
    { label: "List", path: `${basePath}/list` },
    { label: "Board", path: `${basePath}/board` },
    { label: "Messages", path: `${basePath}/messages` },
    { label: "Files", path: `${basePath}/files` },
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
                onClick={() => alert("Add task — coming soon")}
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
    </div>
  );
}

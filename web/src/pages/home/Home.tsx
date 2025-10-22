// @ts-nocheck
/****************************************************
 * [LMK-HOME-01] IMPORTS
 ****************************************************/
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { http } from "../../lib/http";

/****************************************************
 * [LMK-HOME-02] TYPES
 ****************************************************/
type Project = { id: number; name: string; code: string };

/****************************************************
 * [LMK-HOME-03] UTIL
 ****************************************************/
async function getProjects() {
  const res = await http("/api/projects");
  if (!res.ok) return [] as any[];
  return res.json();
}

/****************************************************
 * [LMK-HOME-04] COMPONENT
 ****************************************************/
export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rows = await getProjects();
        setProjects(Array.isArray(rows) ? rows : []);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const recent = useMemo(() => projects.slice(0, 6), [projects]);

  /****************************************************
   * [LMK-HOME-05] RENDER
   ****************************************************/
  return (
    <div className="space-y-6">
      {/* Greeting + toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 className="text-2xl font-semibold mt-1">Good day!</h1>
        </div>
        {/* No project creation button here */}
      </div>

      {/* Two columns like Asana: left “My tasks”, right “Projects” */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My tasks card (placeholder for now) */}
        <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800">
          <div className="flex items-center justify-between p-4">
            <h2 className="font-medium">My tasks</h2>
            <div className="text-xs text-gray-500">Upcoming · Overdue · Completed</div>
          </div>
          <div className="border-t dark:border-neutral-800">
            <div className="p-4 text-sm text-gray-500">
              No tasks assigned yet. This will show your upcoming tasks.
            </div>
          </div>
        </div>

        {/* Projects card */}
        <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800">
          <div className="flex items-center justify-between p-4">
            <h2 className="font-medium">Projects</h2>
            {/* No create button here */}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
            {/* Recent projects only, no create card */}
            {loading ? (
              <div className="col-span-2 sm:col-span-2 text-sm text-gray-500">
                Loading…
              </div>
            ) : recent.length === 0 ? (
              <div className="col-span-2 sm:col-span-2 text-sm text-gray-500">
                You don’t have any projects yet.
              </div>
            ) : (
              recent.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="rounded-lg border p-4 hover:bg-gray-50 dark:border-neutral-700"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.code}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick insights (high-level snapshot placeholder) */}
      <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4">
        <h3 className="font-medium mb-2">This week at a glance</h3>
        <div className="text-sm text-gray-500">
          Simple summary tiles/charts can live here (e.g., “Open SKUs”, “POs missing files”).
        </div>
      </div>
    </div>
  );
}